exports.User = function () { };
exports.User.attributes = {
    info: 'json'
};

exports.Player = function () { };
exports.Player.attributes = {
    game_id: 'int',
    color: 'string',
    user: 'user'
};

exports.Player.prototype = {
    connect: function (socket) {
        var player = this;
        player.pubsub_client = exports.Player.redis.createClient();
        player.channel = 'player:' + player.id + ':channel';
        console.log('client #', player.id, 'subscribed to channel', this.channel);
        player.pubsub_client.subscribeTo(player.channel, function (channel, message) {
            console.log('publish to channel', player.channel, 'detected by subscriber', player.id);
            socket.send(message.toString());
        });
    },
    disconnect: function () {
        console.log('free channel', this.channel);
        this.pubsub_client.unsubscribeFrom(this.channel);
        console.log('close connection to database');
        this.pubsub_client.close();
    },
    perform: function (message) {
        console.log('player', this.id, 'perform');
        var player = this;
        switch (message.action) {
            case 'move':
                this.game.reload(function () {
                    this.move(player, message.coords);
                });
            break;
            default:
                console.log(message);
            break;
        }
    },
    loadGame: function loadGame(type, callback) {
        var user = this;
        if (this.game_id) {
            exports.Game.find(this.game_id, function () {
                user.game = this;
                if (this.game.board.terminal_board) {
                    user.update_attribute('game_id', 0, function () {
                        user.loadGame(type, callback);
                    });
                } else {
                    callback();
                }
            });
        } else {
            exports.Game.find_free_or_create({type: type}, function () {
                user.join(this, callback);
            });
        }
    },
    join: function (game, callback) {
        this.update_attribute('game_id', game.id, function () {
            this.game = game;
            game.join(this, callback);
        });
    }
};

exports.User = function () { };
exports.User.attributes = {
    info: 'json'
};

exports.Game = function () { };
exports.Game.attributes = {
    type: 'string',
    color: 'string',
    position: 'string',
    starter: 'int',
    opponent: 'int'
};
exports.Game.find_free_or_create = function (params, callback) {

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
exports.Game.prototype = {
    initialize: function () {
        if (this.type) {
            var game = require('./games/' + this.type);
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
            this.update_attribute('opponent', player.id, function () {
                player.get('user', function (user) {
                    console.log('Уведомляем ожидающего клиента ' + self.starter + ' что началась игра: ');
                    self.connection.publish('player:' + self.starter + ':channel',
                        JSON.stringify({
                            action: 'opponent_connected',
                            user: user.to_hash ? user.to_hash() : user
                        })
                    );
                });
                player.update_attribute('color', 'w', callback);
            });
        } else {
            // push game to waiting queue
            this.connection.lpush('wait:' + this.type, this.id);
            this.update_attribute('starter', player.id, function () {
                player.update_attribute('color', 'b', callback);
            });
        }
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

require('../vendor/orm/lib/orm.js').mix_persistence_methods(exports);
