FROM node:10-alpine@sha256:8ccd3aa2e3340c79bb18aaa414523b2d81b0da05e36b52dfe6e0686aa3583411
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]