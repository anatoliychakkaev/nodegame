var redis = require('../vendor/redis-node-client/lib/redis-client.js').createClient();

exports.load = function (model_name, id, callback) {
    redis.hgetall(model_name + ':' + id, callback);
};

exports.save = function (model_name, id, attributes) {
    var key = model_name + ':' + id, name;
    for (var name in attributes) {
        redis.hset(key, name, attributes[name]);
    }
}
