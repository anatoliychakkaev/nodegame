var m = require('../../../lib/models.js');

module.exports = {
    render: {
        layout: 'admin'
    },
    index: function (req, next) {
        next();
    },
    find: function (req, next) {
        m.User.find(req.query.fb_id, function () {
            next('render', {user: this});
        });
    }
};
