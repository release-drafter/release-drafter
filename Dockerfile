FROM node:16.16.0-alpine@sha256:9a2db0008b592cfde1b98aa8972a8051ccb80bb51dde8b06c3a2e3762794e89c as build
ARG PNPM_VERSION="7.8.0"
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
LABEL "repository"="https://github.com/release-drafter/release-drafter"
LABEL "homepage"="https://github.com/release-drafter/release-drafter"
LABEL "maintainer"="Tim Lucas"
LABEL "com.github.actions.name"="Release Drafter"
LABEL "com.github.actions.description"="Drafts your next release notes as pull requests are merged since last release."
LABEL "com.github.actions.icon"="edit-2"
LABEL "com.github.actions.color"="orange"
RUN node npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ENTRYPOINT [ "/app/node_modules/.bin/probot" ]
CMD [ "receive", "/app/index.js" ]

FROM node:16.16.0-alpine@sha256:9a2db0008b592cfde1b98aa8972a8051ccb80bb51dde8b06c3a2e3762794e89c as run
ARG PNPM_VERSION="7.8.0"
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
LABEL "repository"="https://github.com/release-drafter/release-drafter"
LABEL "homepage"="https://github.com/release-drafter/release-drafter"
LABEL "maintainer"="Tim Lucas"
LABEL "com.github.actions.name"="Release Drafter"
LABEL "com.github.actions.description"="Drafts your next release notes as pull requests are merged since last release."
LABEL "com.github.actions.icon"="edit-2"
LABEL "com.github.actions.color"="orange"
RUN node npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
ENTRYPOINT [ "/app/node_modules/.bin/probot" ]
CMD [ "receive", "/app/index.js" ]
