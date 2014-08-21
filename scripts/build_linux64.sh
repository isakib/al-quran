#!/bin/bash

SOURCE=appbuilds/releases/GitBook/linux64/
OUTPUT=appbuilds/releases/gitbook-linux64.tar.gz

echo "Building Linux Tar: $OUTPUT"
tar -zcvf $OUTPUT -C ${SOURCE} GitBook
