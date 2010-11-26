var m = require('../lib/models.js');

module.exports = {
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
