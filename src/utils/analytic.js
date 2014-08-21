define([
    "hr/utils"
], function(_) {
    var pkg = node.require("../package.json");
    var Mixpanel = node.require('mixpanel');
    var mixpanel = Mixpanel.init('7e730719b2cfbbbcfc3a3df873641a08');

    var track = function(e, data) {
        console.log("track", e);
        mixpanel.track("editor."+e, _.extend(data || {}, {
            'version': pkg.version,
            'platform': process.platform,
            'arch': process.arch
        }));
    };

    track("start");

    return {
        track: track
    };
});