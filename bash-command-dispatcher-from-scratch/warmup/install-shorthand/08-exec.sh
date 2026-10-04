#!/usr/bin/env bash
# Drill 8 — exec vs. a plain call
#
# Create two tiny scripts: a caller and a callee (e.g. 08-exec-caller.sh and
# 08-exec-callee.sh). The callee should print its own process id ($$) and
# exit with a distinct exit code (e.g. exit 7).
#
# Version A: have the caller invoke the callee normally (`bash callee.sh`),
# then print its OWN $$ and $? right after.
# Version B: have the caller invoke the callee with `exec bash callee.sh`
# instead, with nothing after that line.
#
# Compare: in version A, does anything print after the callee runs? they print a differnt process id, if called with bash or with exec bash. also command subtitution would spawn a new process without substituting like exec does.
# In version B? What's the caller's $$ vs the callee's $$ in each case? differnt process id. only source reuses the same process (maybe there are other commands similar to source, but I only know of exec, bash, command subtitution and source)
#  What exit code does the whole invocation end with in each case? if called with exec, with my configuration, non show exit status. A, it would show 0
# extra, interesingly source runs the command on the same process, if caller is called from master with source, its last status would be what caller set

echo "master processpid: $$"
source ./08-exec-caller.sh

echo "master last command status $?"


