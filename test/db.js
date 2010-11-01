var models = {
    Player: function Player(game_id) {
        this.game_id = game_id;

        Player.attributes = {
            game_id: 'int'
        }
    }
}

require('../lib/db').mix_persistence_methods(models);

models.useCache = true;
models.debugMode = false;

exports['should create player'] = function (test) {

    test.expect(4);

    models.Player.create(15, function (id) {

        test.strictEqual(this.game_id, 15,
        'Parameter passed to constructor should be applied');

        test.ok(this.constructor === models.Player,
        'User should have id');

        test.ok(this.id,
        'User should have id');

        test.ok(id,
        'Newly created id should pass to callback');

        test.done();
    });
};

exports['should load player when it exists'] = function (test) {

    test.expect(3);

    models.Player.create(function (id) {
        var player_id = id;
        this.update_attribute('game_id', 11, function () {
            models.Player.find(player_id, function (err) {

                test.ok(!err,
                'Error should not be raised');

                test.ok(this.game_id == 11,
                'Game id should be updated');

                test.ok(this.constructor === models.Player,
                'Callback called on object\'s context');

                test.done();
            });
        });
    });
};

exports['should not load player when it not exists'] = function (test) {

    test.expect(2);

    models.Player.find(0, function (err) {
        test.ok(this.constructor != models.Player,
        'Should be null');

        test.ok(err,
        'Should be error');

        test.done();
    });
};

exports['should save all attributes'] = function (test) {

    test.expect(2);

    models.Player.create(function (player_id) {
        this.game_id = 77;
        this.save(function (err) {
            test.ok(!err, 'No errors required');

            models.Player.find(player_id, function (err) {
                test.strictEqual(this.game_id, 77,
                'Attribute value should be stored');

                test.done();
            });
        });
    });
};

exports['should reload attributes'] = function (test) {

    test.expect(2);

    models.Player.create(function (player_id) {
        this.update_attribute('game_id', 100, function (err) {
            this.game_id = 0;
            this.reload(function (err) {
                test.ok(!err, 'No errors required');

                test.strictEqual(this.game_id, 100,
                'Correct value should be restored');
                test.done();
            });
        });
    });
};
