FROM node:10.14.2-alpine@sha256:539572fabf307f60709a4e0c5f9595f37ed99200b2224b0e42bef539415ac319
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
