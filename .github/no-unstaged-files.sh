#!/bin/bash

# The following makes git "touch" the files at leas one,
# and applies the contents of .gitattributes the same way
# a local developer would.
# This helps alleviate line-endigs inconsistencies our tools
# and dependencies might produce.
git add .
git reset

if [[ "$(git status --porcelain)" != "" ]]; then
  git status -u all
  echo "::error::💥 Unstaged changes detected. Locally try running: yarn prettier && yarn lint --fix && yarn build"
  exit 1
fi
