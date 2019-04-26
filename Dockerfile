FROM node:10.15.3-alpine@sha256:313c5c88acc0ec12a9abca9a83719065dfd54e94ffc56464b7ce24998dd2838d

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
