#!/usr/bin/env bash
# Drill 4 (shorthand v1) — append only if absent (idempotence)
#
# Combine drills 1–3: a script that adds the greet() line from drill 2 to
# "$HOME/.bashrc", but only if no greet() definition is in it already.
#   - first run: appends it, prints "added"
#   - second run: changes nothing, prints "already there"
#   - if the file doesn't exist yet, the first run creates it
#
# Never run it against your real home. Override HOME for that one command:
#     HOME="$PWD/fake-home" bash 04-append-if-absent.sh
# Why does the override only last for that command? Check: `echo $HOME` after.
#
# Run it 3 times and `cat fake-home/.bashrc`. Exactly one definition?
#
# Bonus: if .bashrc already has content and its last line doesn't end in a
# newline, does your appended line get glued onto it? How would you guard
# against that?
