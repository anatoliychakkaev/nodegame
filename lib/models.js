exports.Player = function () { };
exports.Player.prototype.loadGame = function loadGame(type, callback) {
    var user = this;
    if (this.game_id) {
        exports.Game.find(this.game_id, function () {
            user.game = this;
        });
    } else {
        exports.Game.create(type, function () {
            user.join(this, callback);
        });
    }
};

exports.Player.prototype.join = function (game, callback) {
    this.update_attribute('game_id', game.id, function () {
        game.join(this, callback);
    });
};

exports.Player.attributes = {
    game_id: 'int'
};

exports.Game = function (type) {
    GameRules = require('./games/' + type);
    this.rules = new GameRules(this);
};
exports.Game.prototype.join = function (player, callback) {
    if (this.starter) {
        // notify starter and callback()
    } else {
        this.update_attribute('starter', player.id, function () {
            // subscribe to this game joining channel and callback()
        });
    }
};
exports.Game.attributes = {
    type: 'string',
    starter: 'int',
    opponent: 'int'
};

require('./db').mix_persistence_methods(exports);
