#!/bin/bash

git diff

if [[ "$(git status --porcelain)" != "" ]]; then
  git status
  echo "::error::💥 Unstaged changes detected. Locally try running: npm run prettier && npm run lint --fix && npm run build"
  exit 1
fi
