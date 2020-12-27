#!/bin/bash

if [[ "$(git status --porcelain)" != "" ]]; then
  git status
  echo "::error::💥 Unstaged changes detected. Locally try running: yarn prettier && yarn lint --fix && yarn build"
  exit 1
fi
