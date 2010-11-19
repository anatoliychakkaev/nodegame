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
    },
    join: function (player, callback) {
        var self = this;
        if (this.starter) {
            console.log('Клиент ' + player.id + ' присоединяется к игре вторым');
            self.set_opponent(player, function () {
                player.update_attribute('color', 'w', callback);
                console.log('Уведомляем ожидающего клиента ' + self.starter + ' что началась игра: ');
                self.connection.publish('player:' + self.starter + ':channel',
                    JSON.stringify({
                        action: 'opponent_connected',
                        user: this.cached_opponent
                    })
                );
            });
        } else {
            // push game to waiting queue
            self.connection.lpush('wait:' + this.type, this.id);
            self.set_starter(player, function () {
                player.update_attribute('color', 'b', callback);
            });
        }
    },
    set_starter: function (player, callback) {
        this.generic_user_setter('starter', player, callback);
    },
    set_opponent: function (player, callback) {
        this.generic_user_setter('opponent', player, callback);
    },
    generic_user_setter: function (role, player, callback) {
        var self = this;
        self.update_attribute(role, player.id, function () {
            player.get('user', function (user) {
                self.update_attribute('cached_' + role, user.public_params(), function () {
                    callback.call(self);
                });
            });
        });
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
    }
};

exports.Game = Game;
