define([
    "hr/hr",
    "utils/dragdrop",
    "utils/dialogs",
    "collections/articles",
    "text!resources/templates/article.html",
    "utils/dblclick"
], function(hr, dnd, dialogs, Articles, templateFile) {
    var normalizePath = node.require("normall").filename;
    var path = node.require("path");
    var gui = node.gui;

    var ArticleItem = hr.List.Item.extend({
        className: "article",
        template: templateFile,
        events: {
            "contextmenu": "contextMenu"
        },

        initialize: function() {
            var that = this;
            ArticleItem.__super__.initialize.apply(this, arguments);

            this.articles = new ArticlesView({collection: this.model.articles}, this.list.parent);
            this.summary = this.list.parent;
            this.editor = this.summary.parent;

            // Drop tabs to order
            this.dropArea = new dnd.DropArea({
                view: this,
                dragType: this.summary.drag,
                handler: function(article) {
                    if (that.model.isIntroduction()) return;

                    var i = that.collection.indexOf(that.model);
                    var ib = that.collection.indexOf(article);

                    if (ib >= 0 && ib < i) {
                        i = i - 1;
                    }
                    article.collection.remove(article);
                    that.collection.add(article, {
                        at: i
                    });
                    that.summary.save();
                }
            });

            this.summary.drag.enableDrag({
                view: this,
                data: this.model,
                start: function() {
                    return !that.$el.hasClass("mode-edit") && !that.model.isIntroduction();
                }
            });


            this.menu = new gui.Menu();
            this.menu.append(new gui.MenuItem({
                label: 'Add Article',
                click: this.addChapter.bind(this)
            }));
            this.menu.append(new gui.MenuItem({
                type: 'separator'
            }));
            this.menu.append(new gui.MenuItem({
                label: 'Rename',
                click: this.changeTitle.bind(this)
            }));
            this.menu.append(new gui.MenuItem({
                label: 'Delete',
                click: this.removeChapter.bind(this)
            }));
        },

        render: function() {
            this.articles.collection.reset(this.model.get("articles", []));
            if (this.model.get("path")) this.$el.attr("data-article", this.model.get("path"));
            return ArticleItem.__super__.render.apply(this, arguments);
        },

        finish: function() {
            this.articles.appendTo(this.$(".chapter-articles"));

            var pd = 10;
            if (this.model.level() > 1) {
                pd = (this.model.level() - 1) * 28;
            }

            this.$("> .chapter-title").css("paddingLeft", pd+"px");
            this.$("> .chapter-title").click(this.open.bind(this));

            return ArticleItem.__super__.finish.apply(this, arguments);
        },

        templateContext: function() {
            return {
                'article': this.model
            };
        },

        open: function(e) {
            e.preventDefault();
            e.stopPropagation();

            this.editor.openArticle(this.model);
        },

        changeTitle: function() {
            dialogs.prompt("Change Title", "", this.model.get("title"))
            .then(function(title) {
                this.model.set("title", title);
                this.summary.save();
            }.bind(this));
        },

        addChapter: function(e) {
            var that = this;

            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            dialogs.prompt("Add New Article", "Enter a title for the new article", "Article")
            .then(function(title) {
                var dir = path.dirname(that.model.get('path')),
                    _title = normalizePath(title),
                    article = {
                        title: title,
                        path: path.join(dir, _title)
                    };
                that.model.articles.add(article);
                that.summary.save();
            });
        },

        removeChapter: function() {
            var that = this;

            var removeArticle = function () {
                var articlepath = that.model.get("path"),
                names = articlepath.split("/");
                // to do change to path.filename
                if (names[names.length - 1] === "README.md"){
                    return that.editor.model.rmdir(path.dirname(articlepath));
                }
                return that.editor.model.unlink(articlepath);
            };
            var hasChildren = that.model.articles.models.length !== 0;
            dialogs.confirm("Remove entry", "Do you really want to remove this" +
                (hasChildren ? " and all the sub-articles?":"?") )
                .then(function() {
                    that.collection.remove(that.model);
                    that.summary.save();
                    removeArticle();
                });
        },

        contextMenu: function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.menu.popup(e.originalEvent.x, e.originalEvent.y);
        }
    });

    var ArticlesView = hr.List.extend({
        className: "articles",
        Collection: Articles,
        Item: ArticleItem,

        initialize: function() {
            var that = this;
            ArticlesView.__super__.initialize.apply(this, arguments);

            this.summary = this.parent;
        }
    });

    return ArticlesView;
});