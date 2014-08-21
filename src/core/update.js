define([
    "hr/promise"
], function(Q) {
    var request = node.require("request");
    var semver = node.require("semver");
    var pkg = node.require("../package.json");
    var gitbookPkg = node.require("gitbook/package.json");

    var isAvailable = function() {
        var d = Q.defer();
        request({
            url: "https://raw.github.com/GitbookIO/editor/master/package.json",
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (body && body.version && semver.gt(body.version, pkg.version)) {
                    d.resolve(body.version);
                } else {
                    d.reject(new Error("no updates"));
                }
            } else {
                d.reject(error);
            }
        });
        return d.promise;
    };

    return {
        isAvailable: isAvailable,
        version: pkg.version,
        gitbook: {
            version: gitbookPkg.version
        }
    };
});