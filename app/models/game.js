/**
 * Class Game
 **/
function Game() { };

Game.attributes = 
{   type:     'string'
,   color:    'string'
,   position: 'string'
,   starter:  'player'
,   cached_starter: 'json'
,   opponent: 'player'
,   cached_opponent: 'json'
,   phase: 'int'
};

/**
 * Static class methods
 **/

Game.find_free_or_create = function (params, callback) {

    function create_game() {
        exports.Game.create(params, function () {
            callback.apply(this);
        });
    }

    this.connection.rpop('wait:' + params.type, function (err, value) {
        if (value) {
            exports.Game.find(value, function (err) {
                if (err) {
                    create_game();
                } else {
                    callback.apply(this);
                }
            });
        } else {
            create_game();
        }
    });
};


/**
 * Instance methods
 **/
Game.prototype = {
    initialize: function () {
        if (this.type) {
            var game = require('../../lib/games/' + this.type);
            if (!this.color) {
                this.color = 'b';
            }
            this.game = new game.createGame(this);
        }
        if (typeof this.phase == 'undefined') {
            this.phase = 0;
        }
    },
    join: function (player, callback) {
        var self = this;
        if (this.starter) {
            console.log('Клиент ' + player.id + ' присоединяется к игре вторым');
            self.set_opponent(player, function () {
                player.update_attribute('color', 'w', callback);
            });
        } else {
            self.set_starter(player, function () {
                player.update_attribute('color', 'b', callback);
            });
        }
    },
    player_ready: function (player) {
        var self = this;
        if (player.id == this.starter && this.phase === 0) {
            // push game to waiting queue
            this.connection.lpush('wait:' + this.type, this.id);
            this.update_attribute('phase', 1);
        } else if (player.id == this.opponent && this.phase == 1) {
            console.log('Уведомляем ожидающего клиента ' + self.starter + ' что началась игра: ');
            this.update_attribute('phase', 2);
            self.connection.publish('player:' + self.starter + ':channel',
                JSON.stringify({
                    action: 'opponent_connected',
                    user: this.cached_opponent
                })
            );
        }
    },
    set_starter: function (player, callback) {
        generic_user_setter(this, 'starter', player, callback);
    },
    set_opponent: function (player, callback) {
        generic_user_setter(this, 'opponent', player, callback);
    },
    state: function (player) {
        if (!this.opponent) return 'wait_opponent';
        if (this.game.board.terminal_board) return 'end_game';
        if (this.color == player.color) {
            return 'move';
        } else {
            return 'wait';
        }
    },
    boardToJSON: function () {
        return JSON.stringify(this.game.board.position);
    },
    move: function (player, coords, callback) {
        var game = this;
        var pwned = game.game.pwned_by();
        if (this.game.move(coords)) {
            this.position = this.boardToJSON();
            this.color = this.game.pwned_by();
            this.save(function () {
                game.connection.publish('player:' +
                    (
                        pwned != player.color ?
                        player.id :
                        (
                            player.id == game.opponent ?
                            game.starter :
                            game.opponent
                        )
                    ) + ':channel', JSON.stringify({
                        action: 'move',
                        coords: coords
                    })
                );
                if (game.game.board.terminal_board) {
                    var response = JSON.stringify({action: 'end', info: game.game.board.board_stats});
                    game.connection.publish('player:' + this.opponent + ':channel', response);
                    game.connection.publish('player:' + this.starter  + ':channel', response);
                }
            });
        }
    },
    player_connected: function (player) {
    },
    player_disconnected: function (player) {
    }
};

/**
 * Private methods
 **/

function generic_user_setter(game, role, player, callback) {
    game.update_attribute(role, player.id, function () {
        player.get('user', function (user) {
            game.update_attribute('cached_' + role, user.public_params(), function () {
                callback.call(game);
            });
        });
    });
}

exports.Game = Game;
