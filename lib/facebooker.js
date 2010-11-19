var m = require('./models.js');

function top_redirect_to(url, res) {
    res.send('<html><head><script type="text/javascript">window.top.location.href = "' + url + '";</script><noscript><meta http-equiv="refresh" content="0;url=' + url + '" /><meta http-equiv="window-target" content="_top" /></noscript></head></html>');
}

var offline_mode = false;
var api_key = 'f4f7be55dfbc4d5993ccb2c7d0332c5b';
var api_secret = '4dc12a8bd95523275aec2179aeab28df';
var canvas_name = 'nodegame';
var api_host = 'graph.facebook.com';
var api_base_url = 'https://graph.facebook.com/oauth/';
var d = (new Date).getHours();
var redirect_uri = d > 21 || d < 11 ? 'http://webdesk.homelinux.org:1602/' : 'http://ts.flatsoft.com:4602/';
var canvas_url = 'http://apps.facebook.com/' + canvas_name;

function get(path, params, callback, req, res) {
    var facebook = require('http').createClient(443, api_host, true);
    request = facebook.request('GET', path + '?' + serialize(params),
        {Host: api_host}
    );
    request.end();
    request.on('response', function (response) {
        var data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function () {
            try {
                var obj = JSON.parse(data);
            } catch(e) {
                callback(data);
                return;
            }
            if (obj && !obj.error) {
                callback(obj);
                return;
            }
            switch (obj.error.type) {
                case "OAuthException":
                    req.session.fb = false;
                    reauthorize(res);
                break;
            }
        });
    });
}

function reauthorize (res) {
    top_redirect_to(api_base_url + 'authorize?' +
        serialize({
            client_id: api_key,
            redirect_uri: redirect_uri
        }),
        res
    );
}

exports.connect = function (req, res, next) {
    if (offline_mode) {
        req.session.fb = {access_token: 'offline', user: {id: 1, name: 'John Doe'}};
        req.just_connected = true;
    }
    if (req.session.fb) {
        next();
        return;
    }
    if (req.query.code) {
        get('/oauth/access_token', {
                client_id: api_key,
                redirect_uri: redirect_uri,
                client_secret: api_secret,
                code:  req.query.code
            }, function (data) {
                var access_token = data.split('=')[1];
                req.just_connected = true;
                req.session.fb = {access_token: access_token};
                get('/me', {access_token: access_token}, function (data) {
                    req.session.fb.user = data;
                    m.User.find_or_create(req.session.fb.user.id, function (err) {
                        this.update_attribute('info', req.session.fb.user, function () {
                            res.redirect(canvas_url);
                        });
                    });
                });
            }
        );
    } else {
        reauthorize(res);
    }
};

exports.check_connection = function (req, res, next) {
    if (offline_mode) {
        next();
        return;
    }
    if (typeof req.just_connected == 'undefined') {
        get('/me', {access_token: req.session.fb.access_token}, function (user) {
            req.session.fb.user = user;
            next();
        }, req, res);
    }
};

function serialize (hash, join_with) {
    join_with = join_with || '&';
    var s = [];
    for (var i in hash) {
        s.push(i + '=' + hash[i]);
    }
    return s.join(join_with);
}
