#!/bin/bash

SOURCE=appbuilds/releases/GitBook/linux32/
OUTPUT=appbuilds/releases/gitbook-linux32.tar.gz

echo "Building Linux Tar: $OUTPUT"
tar -zcvf $OUTPUT -C ${SOURCE} GitBook