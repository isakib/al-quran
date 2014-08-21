define([
    "hr/hr",
    "hr/promise",
    "utils/normalize",
    "utils/loading",
    "utils/dialogs",
    "utils/normalize",
    "models/article",
    "models/book",
    "core/server",
    "core/settings",
    "views/grid",
    "views/summary",
    "views/editor",
    "views/preview"
], function(hr, Q, normalize, loading, dialogs, normalize, Article, Book, server, settings, Grid, Summary, Editor, Preview) {
    var generate = node.require("gitbook").generate,
        normalizeFilename = node.require("normall").filename,
        dirname = node.require("path").dirname;
    var gui = node.gui;

    var BookView = hr.View.extend({
        className: "book",
        defaults: {
            base: null
        },

        initialize: function() {
            BookView.__super__.initialize.apply(this, arguments);

            this.model = this.model || new Book({}, {
                base: this.options.base
            });
            this.editorSettings = settings;

            // Map article path -> content
            this.articles = {};
            this.currentArticle = null;

            this.grid = new Grid({
                columns: 3
            }, this);
            this.grid.appendTo(this);

            // Summary
            this.summary = new Summary({}, this);
            this.summary.update();
            this.grid.addView(this.summary, {width: 20});

            // Editor
            this.editor = new Editor({}, this);
            this.editor.update();
            this.grid.addView(this.editor);

            // Preview
            this.preview = new Preview({}, this);
            this.preview.update();
            this.grid.addView(this.preview);

            // Languages menu
            this.listenTo(this.model, "change:langs", this.updateLanguagesMenu);
            this.listenTo(this.model, "change:lang", function() {
                return loading.show(this.updateContent(), "Switching to language '"+this.model.get("lang.lang")+"' ...");
            });
            this.listenTo(this.model, "set:lang", this.updateLanguagesMenu);
            this.updateLanguagesMenu();

            loading.show(this.updateContent(), "Loading book content ...");
        },

        // Update all content
        updateContent: function() {
            var that = this;

            return this.summary.load()
            .then(function() {
                return that.openReadme();
            });
        },

        // Update languages menu
        updateLanguagesMenu: function() {
            var that = this;
            var submenu = new gui.Menu();
            var currentLang = this.model.get("lang");

            _.chain(this.model.get("langs"))
            .map(function(lang) {
                return new gui.MenuItem({
                    label: lang.title,
                    type: "checkbox",
                    checked: currentLang.lang == lang.lang,
                    click: function () {
                        that.model.set("lang", lang);
                    }
                });
            })
            .each(submenu.append.bind(submenu));
            this.parent.langsMenu.submenu = submenu;
        },

        // Build the book (website)
        buildBook: function(params, options) {
            var that = this;

            var p = generate.folder(_.extend(params || {}, {
                input: this.model.root()
            }));

            return loading.show(p, "Building website ...");
        },

        // Generate a file (pdf or ebook)
        buildBookFile: function(format, params) {
            var that = this;

            var filename = "book."+format;

            dialogs.saveAs(filename)
            .then(function(_path) {
                var p = generate.file(_.extend(params || {}, {
                    extension: format,
                    input: that.model.root(),
                    output: _path,
                    generator: "ebook"
                }))

                return loading.show(p, "Building ebook ("+format+") ...")
                .then(_.constant(_path));
            })
            .then(function(_path) {
                node.gui.Shell.showItemInFolder(_path);
            }, dialogs.error);
        },

        // Refresh preview
        refreshPreviewServer: function() {
            var that = this;
            console.log("start server on ", this.model.root());

            return server.stop()
            .then(function() {
                return loading.show(that.buildBook(), "Preparing website for preview ...");
            })
            .then(function(options) {
                return server.start(options.output)
            })
            .then(function() {
                server.open();
            }, dialogs.error);
        },

        // Ask user to set a cover picture
        setCover: function() {
            var that = this;

            return dialogs.file()
            .then(function(coverFile) {
                var d = Q.defer();

                var canvas = $("<canvas>")[0];
                canvas.width = 1800;
                canvas.height = 2360;

                var ctx = canvas.getContext("2d");
                var img = $("<img>", {
                    src: "file://"+coverFile,
                });
                img = img[0];
                img.onload = function () {
                    ctx.drawImage(img, 0, 0, 1800, 2360);
                    var imgBig = canvas.toDataURL("image/jpeg");

                    canvas.width = 200;
                    canvas.height = 262;
                    ctx.drawImage(img, 0, 0, 200, 262);
                    var imgSmall = canvas.toDataURL("image/jpeg");

                    d.resolve({
                        big: imgBig,
                        small: imgSmall
                    });
                };
                img.onerror = function(err) {
                    d.reject(err);
                };

                return d.promise;
            })
            .then(function(img) {
                return Q.all([
                    that.model.write("cover.jpg", normalize.dataTobuffer(img.big)),
                    that.model.write("cover_small.jpg", normalize.dataTobuffer(img.small))
                ]);
            })
            .fail(dialogs.alert);
        },

        // Open a specific article
        openArticle: function(article) {
            var that = this;

            var path = article.get("path");

            var normalize = function(path){
                path = path.replace(".md","").split("/");
                for (var i = 0; i < path.length; i++) {
                    path[i] = normalizeFilename(path[i]);
                };
                if (path[path.length -1] === "readme"){
                    path[path.length -1] = "README";
                }
                path = path.join("/") + ".md";
                return path;
            };

            var updateArticlePath = function(path) {
                if (!that.model.isValidPath(path)) return Q.reject(new Error("Invalid path for saving this article, need to be on the book repository."));
                path = that.model.contentVirtualPath(path);
                article.set("path", normalize(path));
                return Q();
            };

            var doOpen = function() {
                that.currentArticle = article;
                that.trigger("article:open", article);
                that.triggerArticleState(article);

                that.toggleArticlesClass(article, "active");

                return Q();
            };

            var doSaveAndOpen = function() {
                return Q()
                .then(function(){
                    if (path && that.editorSettings.get("autoFileManagement")){
                        article.set("path", normalize(path));
                        return Q();
                    }else{
                        return dialogs.saveAs(article.get("title")+".md", that.model.contentRoot())
                        .then(updateArticlePath);
                    }

                })
                // Check if it's going to overwrite anything
                .then(function overwriteDetection(){
                    return that.model.contentExists(article.get("path"))
                    .then(function(exists){
                        if (exists){
                            return dialogs.saveAs("File name should be unique.", that.model.root())
                            .then(updateArticlePath);
                        }else{
                            return Q();
                        }
                    })
                })
                // Write article
                .then(function() {
                    return that.writeArticle(article, "# "+article.get("title")+"\n")
                })
                // Save the article
                .then(function() {
                    return that.saveArticle(article);
                })
                // Save summary
                .then(function() {
                    return that.summary.save();
                })
                .then(function() {
                    return doOpen();
                })
                .fail(function(err) {
                    dialogs.alert("Error", err.message || err);
                });
            };

            if (!path) {
                return doSaveAndOpen();
            } else {
                return that.model.contentExists(path)
                .then(function(exists) {
                    if (exists) {
                        return doOpen();
                    } else {
                        return doSaveAndOpen();
                    }
                });
            }
        },

        // Open readme
        openReadme: function() {
            return this.openArticle(this.summary.getIntroduction());
        },

        // Get unsaved article
        getUnsavedArticles: function() {
            return _.chain(this.articles)
            .map(function(article, _path) {
                article.path = _path;
                return article;
            })
            .filter(function(article) {
                return !article.saved;
            })
            .value();
        },

        // Save all unsaved
        saveAll: function() {
            _.each(this.getUnsavedArticles(), function(_article) {
                var article = this.summary.getArticle(_article.path);
                console.log(_article.path, article);
                if (article) this.saveArticle(article);
            }, this);
        },

        // Open edit book.json dialog
        editConfig: function() {
            var that = this, content = "{}";

            var normalizeContent = function(_content) {
                return JSON.stringify(JSON.parse(_content), null, 4);
            };

            var showDialog = function() {
                return dialogs.fields("Edit Book Configuration (book.json)", {
                    content: {
                        type: "textarea",
                        rows: 8
                    }
                }, {
                    content: content
                }, {keyboardEnter: false})
                .then(function(values) {
                    content = values.content;
                    content = normalizeContent(content);
                })
                .fail(function(err) {
                    return dialogs.confirm("Would you like to correct the error?", "Your book.json is not a valid json file: "+err.message)
                    .then(showDialog);
                });
            };

            return this.model.read("book.json")
            .fail(function() {
                return "{}";
            })
            .then(function(_content) {
                content = _content;
                content = normalizeContent(content);
            })
            .then(showDialog, showDialog)
            .then(function() {
                return that.model.write("book.json", content).fail(dialogs.error);
            });
        },

        // Read/Write article in this fs
        readArticle: function(article) {
            var that = this;
            var path = article.get("path");

            if (this.articles[path]) return Q(this.articles[path].content);

            return this.model.contentRead(path)
            .then(function(content) {
                that.articles[path] = {
                    content: content,
                    saved: true
                };
                return content;
            });
        },

        // Update article buffer
        writeArticle: function(article, content) {
            var path = article.get("path");

            this.articles[path] = this.articles[path] || {};
            this.articles[path].saved = false;
            this.articles[path].content = content;

            this.trigger("article:write", article);
            this.triggerArticleState(article);

            return Q();
        },

        // Save an article
        saveArticle: function(article) {
            var that = this;
            var path = article.get("path");
            if (!this.articles[path]) return Q.reject(new Error("No content to save for this article"));

            // Normalize content before saving
            var content = this.articles[path].content;
            if (settings.get("normalizeEof")) content = normalize.eof(content);
            if (settings.get("normalizeWhitespace")) content = normalize.whitespace(content);

            // Try to create the directory
            return that.model.contentMkdir(dirname(path))
            .then( function(){
                return that.model.contentWrite(path, content)
            })
            .then(function() {
                that.articles[path].saved = true;
                that.triggerArticleState(article);

                // Update code views
                that.trigger("article:save", article, content);

                if (server.isRunning()) {
                    dialogs.confirm("Restart Preview Server", "Do you want to restart the preview server to access your last changes?")
                    .then(function() {
                        that.refreshPreviewServer();
                    });
                }
            });
        },

        // Update article state
        triggerArticleState: function(article) {
            var path = article.get("path");
            var st = this.articles[path]? this.articles[path].saved : true;

            this.trigger("article:state", article, st);
            this.toggleArticleClass(article, "modified", !st);
        },

        // return article state
        getArticleState: function(article) {
            article = article || this.currentArticle;
            var path = article.get("path");
            return this.articles[path];
        },
        toggleArticleClass: function(article, className, st) {
            this.$("*[data-article='"+article.get("path")+"']").toggleClass(className, st);
        },
        toggleArticlesClass: function(article, className) {
            this.$("*[data-article]").each(function() {
                $(this).toggleClass(className, $(this).data("article") == article.get("path"));
            });
        }
    });

    return BookView;
});
