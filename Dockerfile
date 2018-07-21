FROM node:10-alpine@sha256:9787e45382cb61f65068dbb1ef58337888f55f51f4dfc9455643a1db44da71a4
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]