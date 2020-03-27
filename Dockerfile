FROM node:13.11.0-alpine@sha256:5769ed0cbef82ecd0d3b9522a086da41927d09ed38a286ab3c76b36bfc5f4e7a
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
LABEL "repository"="https://github.com/toolmantim/release-drafter"
LABEL "homepage"="https://github.com/toolmantim/release-drafter"
LABEL "maintainer"="Tim Lucas"
LABEL "com.github.actions.name"="Release Drafter"
LABEL "com.github.actions.description"="Drafts your next release notes as pull requests are merged into master."
LABEL "com.github.actions.icon"="edit-2"
LABEL "com.github.actions.color"="orange"
WORKDIR /app
COPY . .
RUN yarn --frozen-lockfile
ENTRYPOINT [ "/app/node_modules/.bin/probot", "receive", "/app/index.js" ]