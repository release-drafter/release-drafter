FROM node:10.15.3-alpine@sha256:f2ef15bb0017aeca6573f7de6f4f872aba1f7d4aeb9e8cb2f923d0a12f51a946
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
