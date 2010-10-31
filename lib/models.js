exports.Player = function () {
};
exports.Player.attributes = {
    game_id: 'int'
};

exports.Game = function (type) {
    var rules = require('./games/' + type);
};
exports.Game.attributes = {
    type: 'string'
};

require('./db').mix_persistence_methods(exports);
