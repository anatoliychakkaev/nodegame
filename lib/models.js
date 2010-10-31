var redis_lib = require('../vendor/redis-node-client/lib/redis-client.js'),
    sys = require("sys"),
    INT, STRING, BOOL, DATETIME;

redis_lib.debugMode = false;
var redis = redis_lib.createClient();

exports.debugMode = true;
exports.useCache = false;

exports.Player = function () { };
exports.Player.attributes = {
    game_id: INT
};

exports.Game = function (type) {
    var rules = require('./games/' + type);
};
exports.Game.attributes = {
    type: STRING
};

function cast_type_from_db(model, attr, data) {
    switch (exports[model].attributes[attr]) {
        case INT:
        data = parseInt(data, 10);
        break;
        case DATETIME: 
        data = new Date(data);
        break;
        case STRING:
        data = data.toString();
        break;
    }
    return data;
}

function add_persistence_methods(Model, model_name) {
    Model.prototype.create = function (callback) {
        if (exports.debugMode)
            sys.debug("[create new " + model_name + "]");

        var self = this;
        redis.incr('ids:' + model, function (err, id) {
            if (!err) {
                if (exports.debugMode)
                    sys.debug("[fetched next id for " + model_name + ":" + id + "]");
                self.id = id;
                callback(id);
            } else if (exports.debugMode) {
                sys.debug('[can not fetch next id for ' + model_name + ']');
            }
        });
    };

    // define accessors for each attribute
    for (var attr in Model.attributes) {
        Model.prototype[attr] = function accessor(value, callback) {
            var self = this;

            // setter
            if (typeof value !== 'undefined' && typeof value !== 'function') {
                if (exports.debugMode) {
                    sys.debug('[called set method ' + attr + ' of ' + model_name + ']');
                }
                if (accessor.cache) {
                    accessor.cache[this.id] = value;
                }
                redis.hset(model_name.toLowerCase() + ':' + this.id, attr, value.toString(), callback);
                return;
            }

            // getter
            if (exports.debugMode) {
                sys.debug('[called get method ' + attr + ' of ' + model_name + ']');
            }

            if (accessor.cache && typeof accessor.cache[this.id] !== 'undefined') {
                if (exports.debugMode) {
                    sys.debug('[using cached value]');
                }
                value(null, accessor.cache[this.id]);
            } else {
                if (exports.debugMode) {
                    sys.debug('[fetch value from storage]');
                }
                redis.hget(model_name.toLowerCase() + ':' + this.id, attr, function (err, data) {
                    if (!err) {
                        data = cast_type_from_db(model_name, attr, data);
                        if (accessor.cache) {
                            accessor.cache[self.id] = data;
                        }
                        if (value) {
                            value(err, null);
                        }
                    }
                });
            }
        };
        if (exports.useCache) {
            Model.prototype[attr].cache = {};
        }
    }

    // define object batch loader
    Model.prototype.load = function (id, callback) {
        if (exports.debugMode) {
            sys.debug('[fetch hash from storage]');
        }
        var self = this;
        this.id = id;
        redis.hgetall(model_name.toLowerCase() + ':' + id, function (err, hash) {
            if (!err) {
                var data = {};
                for (var attr in hash) {
                    data[attr] = cast_type_from_db(model_name, attr, hash[attr]);
                    if (self[attr].cache) {
                        self[attr].cache[id] = data[attr];
                    }
                }
                self.attributes = data;
            }
            if (typeof callback == 'function') callback(err, data);
        });
    };
}
// add persistence methods for all models
for (var model in exports) {
    if (typeof exports[model] == 'function') {
        add_persistence_methods(exports[model], model);
    }
}

function load(model_name, id, callback) {
    redis.hgetall(model_name + ':' + id, callback);
};
