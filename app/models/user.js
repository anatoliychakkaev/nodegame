function User() {

};

User.attributes =
{   info: 'json'
,   player: 'json'
,   friends: 'json'
};

User.prototype = {
    initialize: function () {
        if (!this.player) {
            this.player = {};
        }
    },
    public_params: function () {
        return {
            id: this.id,
            name: this.info.name
        };
    },
    set_player: function(game_type, player, callback) {
        if (!this.player) {
            this.player = {};
        }
        this.player[game_type] = player.id;
        this.update_attribute('player', this.player, callback);
    },
    get_player: function (game_type, callback) {
        var user = this;
        if (user.player[game_type]) {
            exports.Player.find(user.player[game_type], function (err) {
                var player = this;
                if (!err) {
                    player.loadGame(game_type, function () {
                        callback(player);
                    });
                } else {
                    throw new Error('Could not load user with id ' + user.player[game_typer]);
                }
            });
        } else {
            exports.Player.create({user: user.id}, function () {
                var player = this;
                user.set_player(game_type, player, function () {
                    player.loadGame(game_type, function () {
                        callback(player);
                    });
                });
            });
        }
    },
    get_leaderboard: function (game_type, callback) {
        var self = this;
        User.connection.get('leaderboard:' + this.id + ':' + game_type, function (err, lb) {
            if (!err && lb) {
                callback(JSON.parse(lb.toString()));
            } else {
                self.build_leaderboard(game_type, callback);
            }
        });
    },
    build_leaderboard: function (game_type, callback) {
        var me = this;
        var friends = this.friends;
        counter = 0;
        var lb = [];
        friends.push({id: me.id, name: me.info.name});
        for (var i in friends) {
            (function (i) {
                counter += 1;
                User.connection.get('score:' + friends[i].id + ':' + game_type, function (err, score) {
                    counter -= 1;
                    if (!err && score) {
                        lb.push({score: parseInt(score.toString(), 10), id: friends[i].id, name: friends[i].name});
                    }
                    if (counter === 0) {
                        lb = lb.sort(function (a, b) { return parseFloat(a.score) - parseFloat(b.score)});
                        var max = lb.length;
                        for (var j in lb) {
                            lb[j].position = max - parseInt(j, 10);
                            lb[j].me = lb[j].id == me.id;
                        }
                        callback(lb);
                    }
                });
            })(i);
        }
    }
};

exports.User = User;
