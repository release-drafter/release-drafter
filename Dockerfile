FROM node:10.15.1-alpine@sha256:0cbb2f7bbc8e7c3a519fa05263cea700324f627369bd44c0a42f8da275179e19
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
