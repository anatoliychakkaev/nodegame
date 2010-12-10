var m = require('./models.js'),
crypto = require('crypto');

function base64_url_decode(input) {
    input = input.replace('-', '+').replace('_', '/');
    var decoded = (new Buffer(input, 'base64')).toString('binary');
    console.log(decoded);
    return decoded;
}
function parse_signed_request(signed_request, secret) {
    var sr = signed_request.split('.'),
    encoded_sig = sr[0],
    payload = sr[1];

    // decode the data
    var sig = base64_url_decode(encoded_sig);
    var data = JSON.parse(base64_url_decode(payload), true);

    if (data['algorithm'] !== 'HMAC-SHA256') {
        console.log('Unknown algorithm. Expected HMAC-SHA256');
        return false;
    }

    // check sig
    var hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    var expected_sig = hmac.digest();

    console.log(sig);
    console.log(expected_sig);
    if (sig !== expected_sig) {
        console.log('Bad Signed JSON signature!');
        return false;
    }

    return data;
}

function top_redirect_to(url, res) {
    res.send('<html><head><script type="text/javascript">window.top.location.href = "' + url + '";</script><noscript><meta http-equiv="refresh" content="0;url=' + url + '" /><meta http-equiv="window-target" content="_top" /></noscript></head></html>');
}

var offline_mode = false;
var api_key = 'f4f7be55dfbc4d5993ccb2c7d0332c5b';
var api_secret = '4dc12a8bd95523275aec2179aeab28df';
var canvas_name = 'nodegame';
var api_host = 'graph.facebook.com';
var api_base_url = 'https://graph.facebook.com/oauth/';
var h = (new Date).getHours();
var d = (new Date).getDay();
var redirect_uri = h >= 21 || h < 11 || d == 6 || d === 0 ? 'http://webdesk.homelinux.org:1602/' : 'http://ts.flatsoft.com:4602/';
var canvas_url = 'http://apps.facebook.com/' + canvas_name;

function get(path, params, callback, req, res) {
    if (params && params.access_token && (!req || !res)) {
        throw new Error('Expected req and res params when secured query');
    }
    var facebook = require('http').createClient(443, api_host, true),
    serialized_params = serialize(params);
    request = facebook.request('GET', path + (serialized_params ? '?' + serialize(params) : ''),
        {host: api_host}
    );
    request.on('response', function (response) {
        var data = '';
        response.on('data', function (chunk) {
            console.log('middle of response');
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
                console.log(obj);
                req.session.fb = false;
                reauthorize(res);
                break;
            }
        });
    });
    request.end();
}

exports.get = get;

function reauthorize (res) {
    top_redirect_to(api_base_url + 'authorize?' +
    serialize({
        client_id: api_key,
        redirect_uri: redirect_uri,
        scope: 'user_online_presence,friends_online_presence,email'
    }),
    res
);
}

exports.connect = function connect (req, res, next) {
    if (offline_mode) {
        req.session.fb = {access_token: 'offline', user: {id: 1, name: 'John Doe'}};
        req.just_connected = true;
    }
    if (req.query.signed_request) {
        // TODO decode user id from signed request
        // http://developers.facebook.com/docs/authentication/canvas
        var data = parse_signed_request(req.query.signed_request, api_secret);
        if (data) {
            req.session.fb = req.session.fb || {};
            req.session.fb.access_token = data.oauth_token;
            req.session.fb.user = {id: data.user_id};
        }
    }
    if (req.session.fb) {
        m.User.find(req.session.fb.user.id, function (not_found) {
            if (not_found) {
                console.log('not found');
                retrieve_info(req, res, next);
            } else {
                req.user = this;
                next();
            }
        });
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
            retrieve_info(req, res, function () {
                res.redirect(canvas_url);
            });
        });
    } else {
        reauthorize(res);
    }
};

function retrieve_info (req, res, callback) {
    console.log('retrieve_info');
    get('/me', {access_token: req.session.fb.access_token}, function (data) {
        req.just_connected = true;
        req.session.fb.user = data;
        m.User.find_or_create(req.session.fb.user.id, function (err) {
            this.update_attribute('info', req.session.fb.user, function () {
                req.user = this;
                get('/me/friends', {access_token: req.session.fb.access_token}, function (data) {
                    req.user.update_attribute('friends', data.data, callback);
                }, req, res);
            });
        });
    }, req, res);
}

exports.check_connection = function (req, res, next) {
    console.log('check connection');
    if (offline_mode) {
        next();
        return;
    }
    if (typeof req.just_connected == 'undefined') {
        retrieve_info(req, res, next);
    } else {
        console.log('connection is ok');
        next();
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
