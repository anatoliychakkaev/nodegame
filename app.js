
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer(),
    RedisStore = require('connect-redis'),
    models = require('./lib/models.js');

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use(express.cookieDecoder());
  app.use(express.session({ store: new RedisStore }));
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

var loadUser = function (req, res, next) {
    if (!req.session.player_id) {
        models.Player.create(function () {
            req.session.player_id = this.id;
            global.user = this;
            this.loadGame('reversi', next);
        });
    } else {
        models.Player.find(req.session.player_id, function (err) {
            if (!err) {
                global.user = this;
                this.loadGame('reversi', next);
            } else {
                next(new Error('Could not load user with id ' + req.session.player_id));
            }
        });
    }
};

app.get('/', loadUser, function(req, res){
  res.render('index.jade', {
    locals: {
        title: 'Express'
    }
  });
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000);
  console.log("Express server listening on port %d", app.address().port)
}
