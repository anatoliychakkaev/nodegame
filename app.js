
/**
 * Module dependencies.
 */

var express = require('express'),
    app = module.exports = express.createServer(),
    RedisStore = require('connect-redis'),
    store = new RedisStore,
    facebooker = require('./lib/facebooker.js'),
    io = require('socket.io');

global.facebooker = facebooker;

var session_key = 'connect.sidw';

// Configuration

app.configure(function(){
    app.use(express.staticProvider(__dirname + '/public'));
    //app.use(express.logger());
    app.set('views', __dirname + '/app/views');
    app.use(express.cookieDecoder());
    app.use(express.session({ store: store, key: session_key }));
    app.use(express.bodyDecoder());
    app.use(express.methodOverride());
    app.use(facebooker.connect);
    app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Controller

var c = require('./app/controller.js');
var create_routes = require('./lib/routing.js').create_routes;

// Routes

console.log(global.before_filter);
app.get('/',     facebooker.check_connection, global.before_filter.loadUser, c.index);
create_routes(app, 'admin/permissions',
    {   'GET  /': 'index'
    ,   'POST /': 'create'
    ,   'GET  /new': 'new'
    ,   'DELETE  /:id/destroy': 'destroy'
    ,   'POST /update': 'update'
    ,   'GET  /edit/:id': 'edit'
    ,   'GET  /:id': 'show'
},
'loadAdmin'
);

create_routes(app, 'game_requests', {
    'POST /': 'create',
    'GET /:id/accept': 'accept',
    'GET /:id/decline': 'decline'
}, 'loadUser');

create_routes(app, 'admin/users',
{   '/': 'index'
,   'GET /find': 'find'
},
'loadAdmin'
);


// Only listen on $ node app.js

if (!module.parent) {
    app.listen(parseInt(process.ARGV[2], 10) || 4321);
    //var utils = require('connect/utils');
    console.log("Express server listening on port %d", app.address().port)

    var socket = io.listen(app);

    socket.on('connection', function(client){
        var player;
        var request = {};

        function authorize(session_hash) {
            console.log('client connected');
            store.get(session_hash, function (err, session) {
                if (err) {
                    client.send({action: 'restart_session'});
                    console.log('restart session');
                } else {
                    request.session = session;
                    global.before_filter.loadUser(request, client, function () {
                        player = request.player;
                        if (player) {
                            player.connect(client);
                        } else {
                            console.log(arguments);
                            throw new Error('Player is not defined');
                        }
                    });
                }
            });
        };
        client.on('message', function(msg){
            if (msg.action == 'authorize') {
                authorize(msg.secret);
            } else {
                player.perform(msg);
            }
        });
        client.on('disconnect', function(){
            if (player) {
                console.log('client ' + player.id + ' disconnected');
                player.disconnect();
            }
        });
    });
}

