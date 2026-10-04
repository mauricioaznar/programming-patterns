#!/usr/bin/env bash
# Drill 3 (shorthand v1) — grep as a test
#
# To be idempotent, install-shorthand first has to ask "is a definition
# already in this file?". grep answers through its EXIT CODE, not its output.
#
# Make a fake-home/test-rc with a few lines, one of them a greet() definition
# like the one from drill 2. Then predict and check `echo $?` for:
#   1. grep 'greet' fake-home/test-rc
#   2. grep 'nothing-like-this' fake-home/test-rc
#   3. grep 'greet' fake-home/missing-file
#   4. grep -q 'greet' fake-home/test-rc     (what does -q change?)
#
# Then write a script that prints "found" or "not found" using grep directly
# as an `if` condition (no `$?`, no `[ ]`).
#
# Last: a commented-out line `# greet() { … }` should NOT count as a
# definition. Write a pattern that only matches the line when `greet` is the
# first non-space text on it. (Look up `^`, `[[:space:]]`, and `grep -E`.)
