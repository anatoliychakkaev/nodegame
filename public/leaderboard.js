// fetch online friends
$(function () {
    setInterval(function () {
        FB.api({
            method: 'fql.query',
            query: "SELECT uid, online_presence FROM user WHERE online_presence IN ('active', 'idle') AND uid IN ( SELECT uid2 FROM friend WHERE uid1 = 1643427443)"
        }, function () {
            console.log(arguments);
        });
    }, 5 * 60000);
});
