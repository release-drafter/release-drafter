FROM node:15.2.0-alpine@sha256:f28c4ede97d88bce965142a2fa4190509c355a1f7c405a3773ffcf36e2e7c65b
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