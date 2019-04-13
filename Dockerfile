FROM node:10.15.3-alpine@sha256:e622269573edaa6be7676d21ec87f9038cef11464df87d9d67425d6af29ee4f1

LABEL repository="https://github.com/toolmantim/release-drafter"
LABEL homepage="https://github.com/toolmantim/release-drafter"
LABEL maintainer="Tim Lucas"

LABEL com.github.actions.name="Release Drafter"
LABEL com.github.actions.description="Drafts your next release notes as pull requests are merged into master."
LABEL com.github.actions.icon="edit-2"
LABEL com.github.actions.color="orange"

WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "receive"]
