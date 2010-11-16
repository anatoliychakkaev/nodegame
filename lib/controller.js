var m = require('./models.js');

module.exports = {
    loadUser: function (req, res, next) {
        if (!req.session) {
            next(new Error('Session required'));
            return;
        }
        console.log('session is ok');
            console.log(req.session);
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
        res.render('index.jade', { locals: {
            title: 'Reversi game',
            player: req.player,
            user: req.session.fb.user,
            opponent: {id: 1, name: 'name'},
            secret: req.cookies['connect.sidw']
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
