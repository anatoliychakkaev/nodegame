function User() {

};

User.attributes = {
    info: 'json',
    player: 'json'
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
    }
};

exports.User = User;
