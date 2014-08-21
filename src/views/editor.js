define([
    "hr/hr",
    "hr/dom",
    "ace",
    "core/settings",
    "utils/dialogs",
    "text!resources/templates/editor.html"
], function(hr, $, ace, settings, dialogs, templateFile) {
    var aceconfig = ace.require("ace/config");
    aceconfig.set("basePath", "static/ace");

    var textAction = function(before, after) {
        return function() {
            if (this.editor.selection.isEmpty()) {
                this.editor.insert(before+after);
                this.editor.selection.moveCursorBy(0, -(after.length));
            } else {
                var c = this.editor.session.getTextRange(this.editor.getSelectionRange());
                this.editor.session.replace(this.editor.getSelectionRange(), before+c+after);
            }

            this.editor.focus();
        };
    };

    var textInteractiveAction = function(title, fields, getter) {
        return function() {
            var that = this;

            dialogs.fields(title, fields)
            .then(getter.bind(this))
            .then(function(o) {
                return textAction(o[0], o[1]).call(that);
            })
            .fail(function(err) {
                console.error(err);
            })
        };
    };


    var Editor = hr.View.extend({
        className: "book-section editor",
        template: templateFile,
        events: {
            "click .action-save": "doSave",
            "click .action-text-bold": textAction("**", "**"),
            "click .action-text-italic": textAction("*", "*"),
            "click .action-text-strikethrough": textAction("~~", "~~"),
            "click .action-text-title-1": textAction("# ", "\n"),
            "click .action-text-title-2": textAction("## ", "\n"),
            "click .action-text-title-3": textAction("### ", "\n"),
            "click .action-text-title-4": textAction("#### ", "\n"),
            "click .action-text-list-ul": textAction("* ", "\n"),
            "click .action-text-list-ol": textAction("1. ", "\n"),
            "click .action-text-code": textAction("```\n", "```\n"),
            "click .action-text-table": textInteractiveAction("Add a table", {
                "rows": {
                    'label': "Rows",
                    'type': "number",
                    'default': 2
                },
                "columns": {
                    'label': "Columns",
                    'type': "number",
                    'default': 2
                }
            }, function(info) {
                var before = "";
                var after = "";

                for (var y = 0; y <= info.rows; y++) {
                    var line = "|";

                    for (var x = 0; x < info.columns; x++) {
                        line = line + (y == 1 ? " -- |": " "+x+":"+y+" |");
                    }

                    before = before+line+"\n";
                }

                return [after, before]
            }),
            "click .action-text-link": textInteractiveAction("Add a link", {
                "href": {
                    'label': "Link",
                    'type': "text",
                    'default': "http://"
                }
            }, function(info) {
                return ["[", "]("+info.href+")"];
            }),
            "click .action-text-image": textInteractiveAction("Add an image", {
                "href": {
                    'label': "Link",
                    'type': "text",
                    'default': "http://"
                }
            }, function(info) {
                return ["![", "]("+info.href+")"];
            }),
            "click .action-help": "doOpenHelp"
        },

        initialize: function() {
            Editor.__super__.initialize.apply(this, arguments);

            this.book = this.parent;

            this.$editor = $("<div>", {'class': "editor"});
            this.$editor.appendTo(this.$el);

            this.ignoreChange = false;

            this.editor = ace.edit(this.$editor.get(0));

            this.editor.on("change", function() {
                if (this.ignoreChange || !this.book.currentArticle) return;

                var content = this.editor.getValue();
                this.book.writeArticle(this.book.currentArticle, content);
            }.bind(this));

            this.editor.setTheme({
                'isDark': false,
                'cssClass': "ace-tm",
                'cssText': ""
            });
            this.editor.getSession().setMode("ace/mode/markdown");
            this.editor.setOption("showGutter", false);
            this.editor.setShowPrintMargin(false);
            this.editor.setHighlightActiveLine(false);
            this.editor.session.setUseWrapMode(true);
            this.editor.commands.addCommand({
                name: 'save',
                bindKey: {
                    win: 'Ctrl-S',
                    mac: 'Command-S'
                },
                exec: function(editor) {
                    this.doSave();
                }.bind(this),
                readOnly: false
            });

            this.editor.renderer.scrollBarV.element.addEventListener("scroll",  _.throttle(function(e) {
                var h = this.scrollTop();
                var th = this.$(".content").height();
                if (this.parent.preview.autoScroll) this.parent.preview.scrollTop((h*100)/th);
            }, 50).bind(this));

            this.on("grid:layout", function() {
                this.editor.resize();
                this.editor.renderer.updateFull();
            }, this);

            this.listenTo(this.book, "article:open", this.onArticleChange);
            this.listenTo(this.book, "article:state", this.onArticleState);
            this.listenTo(this.book, "article:save", this.onArticleSave);
            this.listenTo(settings, "change:wordWrap", this.updateEditorOptions);
            this.listenTo(settings, "change:editorFontSize", this.updateEditorOptions);

            this.updateEditorOptions();
        },

        updateEditorOptions: function() {
            var wordWrap = settings.get("wordWrap");
            var editorFontSize = settings.get("editorFontSize");

            if (wordWrap == "off") {
                this.editor.session.setUseWrapMode(false);
            } else {
                wordWrap = wordWrap == "free" ? null : Number(wordWrap);
                this.editor.session.setUseWrapMode(true);
                this.editor.session.setWrapLimitRange(wordWrap, wordWrap);
            }

            this.editor.setFontSize(editorFontSize);
        },

        scrollTop: function() {
            return $(this.editor.renderer.scrollBarV.element).scrollTop();
        },

        finish: function() {
            this.$editor.appendTo(this.$(".content"));
            return Editor.__super__.finish.apply(this, arguments);
        },

        // When the user opens another article
        onArticleChange: function(article) {
            var that = this;

            this.book.readArticle(article)
            .then(function(content) {
                var state = that.book.getArticleState(article);
                that.onArticleState(article, state.saved);

                that.ignoreChange = true;
                that.editor.setValue(content);
                that.editor.gotoLine(0);
                that.ignoreChange = false;
            }, dialogs.error);
        },

        // When the state of the current article change
        onArticleState: function(article, state) {
            if (article.get("path") != this.book.currentArticle.get("path")) return;
            this.$(".action-save").toggleClass("disabled", state);
            this.$(".action-save").toggleClass("btn-warning", !state);
        },

        // Update editor if article has been normalized
        onArticleSave: function(article, content) {
            var pos = this.editor.getCursorPosition();

            // We need to have line to calculate new positions
            // and ensure they don't "overflow"
            var lines = content.split('\n');

            // Next positions
            var y = Math.min(pos.row, lines.length-1);
            var x = Math.min(pos.column, Math.max(lines[y].length, 0));

            this.ignoreChange = true;
            this.editor.setValue(content, 1);
            this.editor.moveCursorTo(y, x);
            this.ignoreChange = false;
        },

        // Save the article
        doSave: function(e) {
            if (e) e.preventDefault();
            this.book.saveArticle(this.book.currentArticle);
        },

        // Open the help about markdown
        doOpenHelp: function() {
            node.gui.Shell.openExternal("https://www.gitbook.io/book/gitbookio/markdown");
        }
    });

    return Editor;
});