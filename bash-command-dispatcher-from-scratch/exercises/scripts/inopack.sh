#!/usr/bin/env bash
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
