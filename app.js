
/**
 * Module dependencies.
 */

var express = require('express'),
    app = module.exports = express.createServer(),
    RedisStore = require('connect-redis'),
    store = new RedisStore,
    facebooker = require('./lib/facebooker.js'),
    io = require('socket.io');

var session_key = 'connect.sidw';

// Configuration

app.configure(function(){
    app.use(express.staticProvider(__dirname + '/public'));
    app.set('views', __dirname + '/app/views');
    app.use(express.cookieDecoder());
    app.use(express.session({ store: store, key: session_key }));
    app.use(facebooker.connect);
    app.use(express.bodyDecoder());
    app.use(express.methodOverride());
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

// Routes

app.get('/',     facebooker.check_connection, c.loadUser, c.index);
//app.get('/wait', c.loadUser, c.wait);
//app.get('/move', c.loadUser, c.move);

// Only listen on $ node app.js

if (!module.parent) {
    app.listen(parseInt(process.ARGV[2], 10) || 4321);
    //var utils = require('connect/utils');
    console.log("Express server listening on port %d", app.address().port)

    var socket = io.listen(app);

    socket.on('connection', function(client){
        var player;
        function authorize(session_hash) {
            console.log('client connected');
            store.get(session_hash, function (err, session) {
                client.request.session = session;
                c.loadUser(client.request, client, function () {
                    player = client.request.player;
                    if (player) {
                        player.connect(client);
                    } else {
                        throw new Error('Player not defined');
                    }
                });
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
            console.log('client ' + player.id + ' disconnected');
            player.disconnect();
        });
    });
}

