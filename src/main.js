require([
    "hr/utils",
    "hr/dom",
    "hr/promise",
    "hr/hr",
    "hr/args",
    "utils/loading",
    "utils/dialogs",
    "utils/analytic",
    "core/settings",
    "core/gitbookio",
    "core/update",
    "models/book",
    "views/book"
], function(_, $, Q, hr, args, loading, dialogs, analytic, settings, gitbookIo, update, Book, BookView) {
    var path = node.require("path");
    var wrench = node.require("wrench");
    var gui = node.gui;
    var __dirname = node.require("../src/dirname");
    var defaultBook = path.join(__dirname, "../intro");

    // Configure hr
    hr.configure(args);

    hr.Resources.addNamespace("templates", {
        loader: "text"
    });

    // Define base application
    var Application = hr.Application.extend({
        name: "GitBook Editor",
        metas: {},
        links: {},
        events: {},

        initialize: function() {
            Application.__super__.initialize.apply(this, arguments);

            var that = this;

            // Loading bar
            loading.appendTo(this);

            // Setup menu
            this.menu = new gui.Menu({ type: 'menubar' });
            this.langsMenu = new gui.MenuItem({
                label: 'Languages',
                submenu: new gui.Menu()
            });

            this.recentBooksMenu = new gui.MenuItem({
                label: 'Open Recent',
                submenu: new gui.Menu()
            });

            this.setBook(new BookView({
                base: defaultBook
            }, this));

            this.openPath(this.getLatestBook(), { failDialog: false });

            var fileMenu = new node.gui.Menu();
            fileMenu.append(new gui.MenuItem({
                label: 'New Book',
                click: function () {
                    that.openNewBook();
                }
            }));
            fileMenu.append(new gui.MenuItem({
                label: 'Open...',
                click: function () {
                    that.openFolderSelection();
                }
            }));
            fileMenu.append(this.recentBooksMenu);
            fileMenu.append(new gui.MenuItem({
                label: 'Open Introduction Book',
                click: function () {
                    that.openPath(defaultBook);
                }
            }));
            fileMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            fileMenu.append(new gui.MenuItem({
                label: 'Check for Updates...',
                click: function () {
                    that.checkUpdate(true);
                }
            }));
            fileMenu.append(new gui.MenuItem({
                label: 'Close',
                click: function () {
                    gui.Window.get().close();
                }
            }));

            var bookMenu = new node.gui.Menu();
            bookMenu.append(new gui.MenuItem({
                label: 'Save all',
                click: function () {
                    that.book.saveAll();
                }
            }));
            bookMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Publish As...',
                click: function () {
                    gitbookIo.publishBook(that.book.model);
                }
            }));
            bookMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Add Chapter',
                click: function () {
                    that.book.summary.addChapter();
                }
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Set Cover Picture',
                click: function () {
                    that.book.setCover();
                }
            }));
            bookMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            bookMenu.append(this.langsMenu);
            bookMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Edit Configuration',
                click: function () {
                    that.book.editConfig();
                }
            }));
            bookMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Preview Website',
                click: function () {
                    that.book.refreshPreviewServer();
                }
            }));
            bookMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Build Website As...',
                click: function () {
                    dialogs.folder()
                    .then(function(_path) {
                        _path = path.join(_path, "book");

                        if (confirm("Book website will be build into "+_path+"?")) {
                            that.book.buildBook({
                                output: _path
                            })
                            .then(function(options) {
                                node.gui.Shell.showItemInFolder(path.join(_path, "index.html"));
                            });
                        }
                    });
                }
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Build PDF As...',
                click: function () {
                    that.book.buildBookFile("pdf");
                }
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Build eBook (EPUB) As...',
                click: function () {
                    that.book.buildBookFile("epub");
                }
            }));
            bookMenu.append(new gui.MenuItem({
                label: 'Build eBook (MOBI) As...',
                click: function () {
                    that.book.buildBookFile("mobi");
                }
            }));

            var devMenu = new node.gui.Menu();
            devMenu.append(new gui.MenuItem({
                label: 'Open Tools',
                click: function () {
                    var win = gui.Window.get();
                    win.showDevTools();
                }
            }));

            var helpMenu = new node.gui.Menu();
            helpMenu.append(new gui.MenuItem({
                label: 'Official Website',
                click: function () {
                    gui.Shell.openExternal('https://www.gitbook.io');
                }
            }));
            helpMenu.append(new gui.MenuItem({
                label: 'Documentation',
                click: function () {
                    gui.Shell.openExternal('http://help.gitbook.io');
                }
            }));
            helpMenu.append(new gui.MenuItem({
                label: 'Send Feedback',
                click: function () {
                    gui.Shell.openExternal('https://github.com/GitbookIO/editor/issues');
                }
            }));

            var preferencesMenu = new node.gui.Menu();
            this.accountMenuItem = new gui.MenuItem({
                label: "",
                click: function () {
                    gitbookIo.connectAccount();
                }
            });
            this.updateAccountMenu();
            preferencesMenu.append(this.accountMenuItem);
            preferencesMenu.append(new gui.MenuItem({
                type: 'separator'
            }));
            preferencesMenu.append(new gui.MenuItem({
                label: 'Advanced Settings',
                click: function () {
                    settings.dialog();
                }
            }));

            // Get reference to App's menubar
            // if we set this later menu entries are out of order
            if(process.platform === 'darwin') {
                gui.Window.get().menu = this.menu;
            }

            this.menu.insert(new gui.MenuItem({
                label: 'File',
                submenu: fileMenu
            }), process.platform === 'darwin' ? 1 : 0);
            this.menu.append(new gui.MenuItem({
                label: 'Book',
                submenu: bookMenu
            }));
            this.menu.append(new gui.MenuItem({
                label: 'Preferences',
                submenu: preferencesMenu
            }));
            this.menu.append(new gui.MenuItem({
                label: 'Develop',
                submenu: devMenu
            }));
            this.menu.append(new gui.MenuItem({
                label: 'Help',
                submenu: helpMenu
            }));

            // Set the window's menu
            if(process.platform !== 'darwin') {
                gui.Window.get().menu = this.menu;
            }

            // Save before quitting
            gui.Window.get().on("close", function() {
                if (that.book.getUnsavedArticles().length == 0 || confirm("There is unsaved changes, do you really want to quit without saving?")) {
                    this.close(true);
                }
            });

            this.listenTo(settings, "change:username", this.updateAccountMenu);

            this.checkUpdate(false);
        },

        render: function() {
            gui.Window.get().show();
            return this.ready();
        },

        setBook: function(book) {
            if (this.book) {
                this.book.remove();
            }
            this.book = book;
            this.book.update();
            this.book.appendTo(this);
            this.title(this.book.model.title());
        },

        getLatestBook: function() {
            return hr.Storage.get('latestBook') || defaultBook;
        },

        setLatestBook: function(_path) {
            hr.Storage.set('latestBook', _path);
        },

        addRecentBook: function(_path) {
            var that = this;
            var books = hr.Storage.get('latestBooks') || [];
            books.unshift(_path);
            books = _.unique(books);
            books = books.slice(0, 8);
            hr.Storage.set('latestBooks', books);

            var submenu = new gui.Menu();

            _.chain(books)
            .map(function(bookPath) {
                return new gui.MenuItem({
                    label: bookPath,
                    click: function () {
                        that.openPath(bookPath)
                    }
                });
            })
            .each(submenu.append.bind(submenu));
            this.recentBooksMenu.submenu = submenu;
        },

        // Open a book at a specific path
        openPath: function(_path, options) {
            analytic.track("open");

            options = _.defaults(options || {}, {
                failDialog: true,
                setLatest: true,
                addLatests: true
            });

            var that = this;
            var book = new Book({}, {
                base: _path
            });

            return loading.show(book.valid()
            .then(function() {
                // Change current book
                that.setBook(new BookView({
                    model: book
                }, that));

                // Use as latest book
                if (options.setLatest) that.setLatestBook(_path);
                if (options.addLatests) that.addRecentBook(_path);
            }, function(err) {
                if (!options.failDialog) return Q.reject(err);
                return dialogs.error(err);
            }), "Opening book '"+_path+"'");
        },

        // Click to select a new local folder
        openFolderSelection: function() {
            var that = this;

            dialogs.folder()
            .then(function(_path) {
                that.openPath(_path);
            });
        },

        // Create a new book and open it
        openNewBook: function() {
            var that = this;

            dialogs.folder()
            .then(function(_path) {
                if (confirm("Do you really want to erase "+_path+" content and create a new book in it?")) {
                    Q.nfcall(wrench.copyDirRecursive, path.join(__dirname, "../example"), _path, {forceDelete: true})
                    .then(function() {
                        that.openPath(_path);
                    });
                }
            });
        },

        // Check update
        checkUpdate: function(signalNo) {
            loading.show(update.isAvailable(), "Checking for update ...")
            .then(function(version) {
                dialogs.alert('Update', "An update is available ("+version+"), download it at http://www.gitbook.io");
            }, function() {
                if (signalNo) dialogs.alert('Check back soon!', "No update available. Using version version "+update.version+" and GitBook version "+update.gitbook.version+".");
            });
        },

        // Update account menu
        updateAccountMenu: function() {
            this.accountMenuItem.label = settings.get("username") ? settings.get("username") : 'Connect Account';
        }
    });

    var app = new Application();
    app.run();
});
