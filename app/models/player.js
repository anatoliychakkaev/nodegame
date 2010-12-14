function Player() { };
Player.INITIAL_SCORE = 1000;

Player.attributes = {
    game_id: 'int',
    color: 'string',
    user: 'user',
    score: 'int'
};

Player.prototype = {
    connect: function (socket) {
        var player = this;
        player.pubsub_client = exports.Player.redis.createClient();
        player.channel = 'player:' + player.id + ':channel';
        console.log('client #', player.id, 'subscribed to channel', this.channel);
        player.pubsub_client.subscribeTo(player.channel, function (channel, message) {
            console.log('publish to channel', player.channel, 'detected by subscriber', player.id);
            console.log(arguments);
            try {
                socket.send(message.toString());
            } catch(e) {
                console.log(e);
            }
        });
        if (player.game) {
            player.game.player_connected(player);
            player.ready_to_play();
        }
    },
    update_score: function (win) {
        var player = this;
        if (typeof player.score === 'undefined') {
            player.score = Player.INITIAL_SCORE;
        }
        var multiplier = win ? 1 : -1;
        player.score += multiplier * 20;
        player.update_attribute('score', player.score);
        exports.Game.find(player.game_id, function (err) {
            if (!err) {
                Player.connection.set('score:' + player.user + ':' + this.type, player.score);
            } else {
                throw err;
            }
        });
    },
    disconnect: function () {
        // free database connection
        this.pubsub_client.unsubscribeFrom(this.channel);
        this.pubsub_client.close();
        // notify game
        this.game.player_disconnected(this);
    },
    perform: function (message) {
        console.log('player', this.id, 'perform');
        console.log(message);
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
        var player = this;
        if (player.game_id) {
            exports.Game.find(player.game_id, function () {
                player.game = this;
                if (!this.game) {
                    player.game_id = false;
                    player.loadGame(type, callback);
                    return;
                }
                // check if game is over
                if (this.game.board.terminal_board) {
                    // detach game
                    player.update_attribute('game_id', 0, function () {
                        // load new game
                        player.loadGame(type, callback);
                    });
                } else {
                    console.log('gotcha');
                    callback();
                }
            });
        } else {
            // throw new Error('Game not exists');
            // do not create new game here
        }
    },
    load_random_game: function (type, callback) {
        var player = this;
        if (this.game_id) {
            this.loadGame(type, callback);
        } else {
            exports.Game.find_free_or_create({type: type}, function () {
                player.join(this, callback);
            });
        }
    },
    join_new_game: function (type, callback) {
        var player = this;
        exports.Game.create(function () {
            this.update_attribute('type', type, function () {
                player.join(this, callback);
            });
        });
    },
    join: function (game, callback) {
        this.update_attribute('game_id', game.id, function () {
            this.game = game;
            game.join(this, callback);
        });
    },
    ready_to_play: function () {
        this.game.player_ready(this);
    },
    leave_game: function (callback) {
        this.update_attribute('game_id', 0, callback);
    }
};

exports.Player = Player;
