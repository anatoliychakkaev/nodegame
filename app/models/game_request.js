function GameRequest() {

};

GameRequest.attributes =
{   sender: 'user'
,   receiver: 'user'
,   state: 'string'
,   type: 'string'
};

GameRequest.prototype = {
    initialize: function () {
        if (!this.state) {
            this.state = 'pending';
        }
    },
    accept: function (user, callback) {
        var request = this;
        user.load_player(request.type, function () {
            // restriction: only one game of each type at the moment
            if (this.game_id) {
                throw new Error('Only one game of each type at the moment');
            } else {
                this.join_new_game(request.type, function () {
                    request.update_attribute('state', 'accepted', function () {
                        // notify requester
                        callback();
                    });
                });
            }
        });
    }
};

exports.GameRequest = GameRequest;
