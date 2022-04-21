FROM node:17.9.0-alpine@sha256:e7930abb2b33c8c7fa1a6dd1addd40cb26104c80f2e2a5d59d480aa2843bbed1
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
LABEL "repository"="https://github.com/release-drafter/release-drafter"
LABEL "homepage"="https://github.com/release-drafter/release-drafter"
LABEL "maintainer"="Tim Lucas"
LABEL "com.github.actions.name"="Release Drafter"
LABEL "com.github.actions.description"="Drafts your next release notes as pull requests are merged into master."
LABEL "com.github.actions.icon"="edit-2"
LABEL "com.github.actions.color"="orange"
WORKDIR /app
COPY . .
RUN yarn --frozen-lockfile
ENTRYPOINT [ "/app/node_modules/.bin/probot" ]
CMD [ "receive", "/app/index.js" ]
