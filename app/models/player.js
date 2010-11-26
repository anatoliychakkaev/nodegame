function Player() { };

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
            socket.send(message.toString());
        });
        player.game.player_connected(player);
        player.ready_to_play();
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
            exports.Game.find_free_or_create({type: type}, function () {
                player.join(this, callback);
            });
        }
    },
    join: function (game, callback) {
        this.update_attribute('game_id', game.id, function () {
            this.game = game;
            game.join(this, callback);
        });
    },
    ready_to_play: function () {
        this.game.player_ready(this);
    }
};

exports.Player = Player;
