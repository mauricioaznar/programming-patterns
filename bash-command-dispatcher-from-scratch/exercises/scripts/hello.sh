#!/usr/bin/env bash
# Placeholder subcommand for the dispatcher. Replaced by real commands as they
# are built. Prints its args in <…> (like bash-sandbox/argv-pipeline/args) and
# exits 3, so you can see whether the dispatcher passed the args and the exit
# code through unchanged.
printf 'hello.sh got %d args:' "$#"
[ "$#" -gt 0 ] && printf ' <%s>' "$@"
printf '\n'
exit 3
