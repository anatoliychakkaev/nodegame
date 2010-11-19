function Player() {
};
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

exports.Player = Player;
