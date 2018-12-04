FROM node:10.14.1-alpine@sha256:35fcf0a48f57bef4bafa0f844f62edb659d036364a1d086995efe5b43ca0c4af
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
