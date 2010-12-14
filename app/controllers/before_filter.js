var m = require('../../lib/models.js');

global.before_filter = {
    loadAdmin: function (req, res, next) {
        if (!req.session) {
            next(new Error('Session required'));
            return;
        }
        m.Admin.find(req.session.fb.user_id, function (not_found) {
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
        m.User.find(req.session.fb.user_id, function (not_found) {
            if (not_found) {
                throw new Error('User should be here');
            }
            req.user = this;
            global.before_filter.loadPlayer(req, res, next);
        });
    },
    loadPlayer: function (req, res, next) {
        var game_type = 'reversi';
        console.log('loadPlayer');
        var complete = function () {
            if (req.player && req.leaderboard) {
                next();
            }
        };
        req.user.get_player(game_type, function (player) {
            console.log('get player callback');
            req.player = player;
            complete();
        });
        req.user.get_leaderboard(game_type, function (lb) {
            req.leaderboard = lb;
            complete();
        });
    }
}
