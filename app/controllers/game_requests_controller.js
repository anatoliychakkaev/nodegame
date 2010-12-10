var m = require('../../lib/models.js');

module.exports = {
    create: function (req, next) {
        // TODO: add dashboard counter
        var me = req.user;
        m.GameRequest.create(function () {
            this.sender = me;
            this.receiver = req.query.user_id;
            this.save(function () {
                next('send', 'OK');
            });
        });
    },
    accept: function (req, next) {
        m.GameRequest.find(req.params.id, function (err) {
            var request = this;
            if (!err) {
                request.accept(req.user, function () {
                    next('redirect', '/');
                });
            }
        });
    },
    decline: function (req, next) {
        request.update_attribute('state', 'declined', function () {
            next();
        });
    }
};
