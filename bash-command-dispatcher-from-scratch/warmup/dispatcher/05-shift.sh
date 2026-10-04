#!/usr/bin/env bash

set -u

# Drill 5 — shift
#
# Write a script that treats its first argument as a "command name" and every
# argument after that as the command's own arguments. Print the command name,
# then use `shift` to drop it, then print the remaining arguments (via $@) as
# what would be "handed off" to that command.
#
# Try it with just a command name and no extra args, and with a command name
# plus several extra args.

if [[ $# -eq 0 ]];
 then
    echo "shift example, please pass at least one arg";
    exit 0;
fi

cmd="$1"

shift 1;

printf "%s " "$cmd"

# print arguments
if [[ $# -gt 0 ]]; then printf "<%s> " "$@"; fi

echo