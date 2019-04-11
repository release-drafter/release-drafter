FROM node:10.15.3-alpine@sha256:e622269573edaa6be7676d21ec87f9038cef11464df87d9d67425d6af29ee4f1
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
