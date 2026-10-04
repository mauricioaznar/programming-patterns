#!/usr/bin/env bash

echo "caller processid: $$"

bash ./08-exec-callee.sh

echo "caller last command status $?"

exit 8