FROM node:14.12.0-alpine@sha256:24ed8df3382733b7be4e3c9d592d3f5e7ed3939a27dd5e50a43c181e299478df
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