#!/usr/bin/env bash

set -u
# E1 — dispatcher, v1
#
# The single entry point: `bash inopack.sh <command> [args]`. It does no work of
# its own; it routes the command to a sibling script in this folder.
#
# v1 must:
#   - `inopack.sh help`, `-h`, `--help`, and no command at all → print a usage
#     message, exit 0.
#   - `inopack.sh hello a "b c"` → hand off to hello.sh with the remaining args
#     intact (hello.sh should see 2 args: <a> <b c>). Nothing in this script
#     may run after the handoff, and hello.sh's exit code must be the exit code
#     of the whole run.
#   - an unknown command → an error message on stderr, the usage, and a
#     non-zero exit code.
#   - work no matter which directory it's run from.
#
# Test from at least two directories, then check `echo $?` after each case.
# Every primitive here was a dispatcher warm-up drill (warmup/dispatcher/).

cmd=${1:-help}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$#" -gt 0 ]]; then shift; fi;

echo "$?"

usage () {
cat <<'EOF'
  Usage:
    hello -- prints arguments passed into it in a pretty way
EOF
}

case $cmd in
  "help"|"-h"|"--help") usage; exit 0;;
  "hello") exec bash $SCRIPT_DIR/hello.sh "$@";;
  *) echo "unknown command $cmd" >&2; usage >&2; exit 2;;
esac

# what is the difference between:

# "hello") exec bash $("SCRIPT_DIR/hello.sh" "$@");;
# and

# "hello") exec bash $SCRIPT_DIR/hello.sh "$@";;