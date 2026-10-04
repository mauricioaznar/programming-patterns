#!/usr/bin/env bash
# Drill 2 (shorthand v1) — expand some parts of a string now, others later
#
# The line install-shorthand writes into an rc file looks like:
#     greet() { echo "dir: /abs/path/of/this/folder" "$@"; }
# The path must be expanded NOW (when this script runs) so it's baked into the
# file. `$@` must NOT be expanded now — it must land in the file literally, so
# it expands later, when the function is called.
#
# Write a script that:
#   1. puts this folder's absolute path in a variable (drill 7 of the dispatcher
#      warm-up)
#   2. builds the greet() line above in a variable, with the real path inside
#      and a literal "$@"
#   3. prints the variable, then writes it to fake-home/greet.sh
#
# Then, in your terminal: `source fake-home/greet.sh; greet a "b c"`.
# Predict what prints.
#
# Questions: which quoting did you use to keep `$@` literal while expanding the
# path? Name a second way to build the same string. Which would you pick?
