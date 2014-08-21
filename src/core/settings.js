define([
    "hr/hr",
    "utils/dialogs"
], function(hr, dialogs) {
    var key = "GitBookEditorSettings";
    var SettingsModel = hr.Model.extend({
        defaults: {
            autoFileManagement: true,
            normalizeWhitespace: true,
            normalizeEof: true,
            wordWrap: "free",
            editorFontSize: "100%",
            host: "https://www.gitbook.io"
        },
        getStateFromStorage: function (){
            this.set(hr.Storage.get(key));
        },
        setStateToStorage: function (){
            hr.Storage.set(key, this.toJSON());
        },
        dialog: function() {
            var that = this;
            return dialogs.fields("Advanced Settings", [
                {
                    autoFileManagement: {
                        label: "Auto file management",
                        type: "checkbox"
                    },
                },
                {
                    normalizeWhitespace: {
                        label: "Normalize whitespace",
                        type: "checkbox"
                    },
                    normalizeEof: {
                        label: "Normalize end-of-line",
                        type: "checkbox"
                    },
                    wordWrap: {
                        label: "Soft Wrap",
                        type: "select",
                        options: {
                            "free": "Free",
                            "off": "Off",
                            "80": "80 chars",
                            "40": "40 chars"
                        }
                    }
                },
                {
                    editorFontSize: {
                        label: "Editor font size",
                        type: "select",
                        options: {
                            "75%": "Small",
                            "100%": "Normal",
                            "150%": "Large",
                            "200%": "Larger"
                        }
                    }
                },
                {
                    username: {
                        label: "Username",
                        type: "text"
                    },
                    token: {
                        label: "Token",
                        type: "text"
                    },
                    host: {
                        label: "Host",
                        type: "text"
                    }
                }
            ], that.toJSON())
            .then(function(values) {
                that.set(values);
                that.setStateToStorage();
            });
        }
    });

    var settings = new SettingsModel({}, {});
    settings.getStateFromStorage();

    return settings;
});