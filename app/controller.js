var m = require('../lib/models.js');

module.exports = {
    loadUser: function (req, res, next) {
        if (!req.session) {
            next(new Error('Session required'));
            return;
        }
        m.User.find(req.session.fb.user.id, function () {
            req.user = this;
            module.exports.loadPlayer(req, res, next);
        });
    },
    loadPlayer: function (req, res, next) {
        console.log('req.user = ');
        console.log(req.user);
        if (!req.session.player_id) {
            m.Player.create({user: req.session.fb.user.id}, function () {
                req.session.player_id = this.id;
                req.player = this;
                this.loadGame('reversi', next);
            });
        } else {
            m.Player.find(req.session.player_id, function (err) {
                if (!err) {
                    req.player = this;
                    this.loadGame('reversi', next);
                } else {
                    next(new Error('Could not load user with id ' + req.session.player_id));
                }
            });
        }
    },
    index: function (req, res) {
        console.log(req.just_connected ? 'just connected' : 'not just connected');
        res.render('index.jade', { locals:
            {   title: 'Reversi game'
            ,   player: req.player
            ,   user: req.session.fb.user
            ,   opponent: req.player.game.cached_opponent
            ,   starter: req.player.game.cached_starter
            ,   secret: req.cookies['connect.sidw']
            }
        });
    },
    wait: function (req, res) {
        req.player.game.wait(req.player, function (what) {
            global.socket_clients[req.player.id].send(what);
        });
    },
    move: function (req, res) {
        req.player.game.move(req.player, req.query.coords, function (what) {
            global.socket_clients[req.player.id].send(what);
        });
    }
};
