#!/bin/bash

SOURCE=appbuilds/releases/GitBook/win/
TITLE=GitBook
OUTPUT=appbuilds/releases/gitbook-win.zip

echo "Building Windows Release ZIP file: $OUTPUT"

# Temporary till it can't be done with grunt-node-webkit-builder
wine ./node_modules/rcedit/bin/rcedit.exe ./appbuilds/releases/GitBook/win/GitBook/GitBook.exe --set-icon ./build/static/images/icons/512.ico

cd ${SOURCE} && zip -ru ../../gitbook-win.zip ./*