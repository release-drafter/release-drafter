FROM node:16.10.0-alpine@sha256:3da1c08529fef7007d57d2133a0feb0fa8c60fdd4ad6691978f9dfcb0365b430
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
ENTRYPOINT [ "/app/node_modules/.bin/probot" ]
CMD [ "receive", "/app/index.js" ]
