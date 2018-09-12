FROM node:10.10.0-alpine@sha256:c9e98df001371ec4510e9b22bfb8a19e5023afe53f3013f316d648d4052feacf
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
