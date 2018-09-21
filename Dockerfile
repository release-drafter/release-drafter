FROM node:10.11.0-alpine@sha256:fcd9b3cb2fb21157899bbdb35d1cdf3d6acffcd91ad48c1af5cb62c22d2d05b1
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
