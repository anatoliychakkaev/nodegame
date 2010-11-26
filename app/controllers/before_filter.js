var m = require('../../lib/models.js');

global.before_filter = {
    loadAdmin: function (req, res, next) {
        if (!req.session) {
            next(new Error('Session required'));
            return;
        }
        m.Admin.find(req.session.fb.user.id, function (not_found) {
            if (not_found) {
                res.redirect('/');
            } else {
                next();
            }
        });
    },
    loadUser: function (req, res, next) {
        if (!req.session) {
            throw new Error('Session required');
        }
        m.User.find(req.session.fb.user.id, function (not_found) {
            if (not_found) {
                throw new Error('User should be here');
            }
            req.user = this;
            global.before_filter.loadPlayer(req, res, next);
        });
    },
    loadPlayer: function (req, res, next) {
        if (!req.user.player['reversi']) {
            m.Player.create({user: req.session.fb.user.id}, function () {
                var player = this;
                req.player = player;
                req.user.set_player('reversi', player, function () {
                    player.loadGame('reversi', next);
                });
            });
        } else {
            m.Player.find(req.user.player['reversi'], function (err) {
                if (!err) {
                    console.log('HERO');
                    console.log(req.user.player);
                    console.log(this);
                    req.player = this;
                    console.log(global.client);
                    this.loadGame('reversi', next);
                } else {
                    throw new Error('Could not load user with id ' + req.session.player_id);
                }
            });
        }
    }
}
