function User() {

};

User.attributes = {
    info: 'json'
};

User.prototype.public_params = function () {
    return {
        id: this.id,
        name: this.info.name
    };
};

exports.User = User;
