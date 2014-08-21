# GitBook Editor

This application is a simple editor for writing books. It's available for Windows, Linux (32 and 64bits) and Mac.

![Image](https://raw.github.com/GitbookIO/editor/master/preview.png)

### How to install it?

Download are available on the [Releases page](https://github.com/GitbookIO/editor/releases).

#### How to install it on Mac:

1. Download *gitbook-mac.dmg*
2. Open the file
3. Copy the Codebox application to your mac's *Applications* folder
4. Open it and start working

#### How to install it on Linux:

1. Download *gitbook-linux32.tar.gz*
2. Extract it using: ```tar -xvzf gitbook-linux32.tar.gz```
3. Run the installation script ```cd GitBook && ./install.sh```
4. There is now a shortcut on your desktop
5. Open it and start working

#### How to install it on Windows:

1. Download *gitbook-win.zip*
2. Extract it using a ZIP tool
3. Copy the `GitBook` folder to your desktop
4. Open `GitBook.exe` and start working


### How to test it for development?


```
$ npm install .
$ grunt build
$ nw ./
```

### How to build releases?

```
$ grunt build-apps
$ nw ./
```
