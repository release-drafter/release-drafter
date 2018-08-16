FROM node:10.9.0-alpine@sha256:e9a83aa3e7ea576b93a21195f2e318ef8075ceccbebaa8f6c333294e9aa51dbd
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
