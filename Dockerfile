FROM node:18.5.0-alpine@sha256:e479d86de1ef8403adda6800733a7f8d18df4f3c1c2e68ba3e2bc05fdea9de20
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
