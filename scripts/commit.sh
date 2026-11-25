#!/bin/bash
# Commit only the named paths, without touching the shared index.
#
#   scripts/commit.sh "feat(x): message" path [path ...]
#
# Several agents work in the main checkout at once and share .git/index, so a plain `git add` + `git commit`
# can sweep in another agent's staged files, or leave a staged revert behind. This builds the commit in a
# temporary index from HEAD with only the given paths (new, changed and deleted files; a folder means all of it),
# moves the branch only if it hasn't moved meanwhile, then resets the shared index for those paths to the new HEAD.
# Pushes nothing.
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "usage: scripts/commit.sh \"message\" path [path ...]" >&2
  exit 1
fi
msg="$1"
shift

cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git ls-files -u -- "$@")" ]; then
  echo "refused: a path has merge conflicts:" >&2
  git ls-files -u -- "$@" | awk '{print "  " $4}' | sort -u >&2
  exit 1
fi

ref=$(git symbolic-ref -q HEAD || echo HEAD)
old=$(git rev-parse HEAD)

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
GIT_INDEX_FILE="$tmp/index" git read-tree "$old"
GIT_INDEX_FILE="$tmp/index" git add -A -- "$@"
tree=$(GIT_INDEX_FILE="$tmp/index" git write-tree)

if [ "$tree" = "$(git rev-parse "$old^{tree}")" ]; then
  echo "nothing to commit in: $*" >&2
  exit 1
fi

new=$(printf '%s\n' "$msg" | git commit-tree "$tree" -p "$old")
# fails if another session moved the branch since $old: nothing is changed then, run the script again
if ! git update-ref -m "commit: ${msg%%$'\n'*}" "$ref" "$new" "$old"; then
  echo "refused: $ref moved while committing; nothing was changed, run it again" >&2
  exit 1
fi

# the shared index still holds the old blobs of these paths: point them at the new HEAD, or the next plain
# `git commit` by anyone would revert this one
git diff --name-only -z "$old" "$new" > "$tmp/paths"
git reset -q --pathspec-from-file="$tmp/paths" --pathspec-file-nul

git log --oneline -1 "$new"
git diff --stat "$old" "$new" | tail -1
