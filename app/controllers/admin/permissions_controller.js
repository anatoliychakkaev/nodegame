var m = require('../../../lib/models.js');

var ctl = {
    render: {
        layout: 'admin'
    },
    index: function (req, next) {
        m.Admin.all_instances(function (admins) {
            next('render', {admins: admins});
        });
    },
    create: function (req, next) {
        function done () {
            next('redirect');
        }
        global.facebooker.get(req.body.fb_id, false, function (info) {
            if (info && info.id) {
                m.Admin.find_or_create(info.id, function () {
                    this.update_attribute('info', info, done);
                });
            } else {
                done();
            }
        });
    },
    new: function (req, next) {
        next();
    },
    destroy: function (req, next) {
        m.Admin.find(req.params.id, function (err) {
            if (err) {
                next('send', 'alert("Could not find admin")');
            } else {
                this.destroy(function () {
                    next('send', '$("tr[data-admin-id=' + req.params.id + ']").remove();');
                });
            }
        });
    }
};

module.exports = ctl;
