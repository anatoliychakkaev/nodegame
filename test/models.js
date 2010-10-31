var models = require('../lib/models.js');

models.useCache = true;
models.debugMode = false;

exports.playerCreation = function (test, done) {
    //test.expect(2);
    var user = new models.Player(), reached = false;
    user.create(function (id) {
        test.ok(user.id, 'User should have id');
        test.ok(id, 'Newly created id should pass to callback');
        player_id = id;
        reached = true;
    });
    done(function () {
        test.ok(reached);
    });
};

exports.playerLoading = function (test, done) {
    //test.expect(2);
    var user = new models.Player(), reached = false;
    user.create(function (id) {
        var player_id = id;
        user.game_id(11, function () {
            var u = new models.Player();
            u.load(player_id, function (err, data) {
                test.ok(!err);
                test.ok(data.game_id == 11);
                reached = true;
            });
        });
    });
    done(function () {
        test.ok(reached);
    });
};
