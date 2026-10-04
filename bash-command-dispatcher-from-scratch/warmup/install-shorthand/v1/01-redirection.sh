#!/usr/bin/env bash
# Drill 1 (shorthand v1) — writing to files: `>` vs `>>`
#
# install-shorthand edits an rc file. Before touching one, learn how bash
# writes to files. Work in ./fake-home/ (create it; it's gitignored).
#
# Write a script that:
#   1. writes the line `first` to fake-home/notes.txt with `>`
#   2. writes `second` to it with `>>`
#   3. writes `third` to it with `>` again
# Predict the file's contents after each step, then `cat` it to check.
#
# Then:
#   - Write two lines with ONE printf call (printf's format is reused per arg).
#   - Group two commands with `{ cmd1; cmd2; } >> file` so both outputs go to
#     the file through a single redirect. Why is the `;` before `}` required?
#   - `[ -s file ]` tests "exists and is non-empty". Use it to print whether
#     notes.txt has content. What does it say for a file that doesn't exist?
