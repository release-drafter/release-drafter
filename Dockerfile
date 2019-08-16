FROM node:10.16.3-alpine@sha256:d732907d4f07416cb23010aa2f845e0b9c35b32905a8103757dd24415153dc66
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