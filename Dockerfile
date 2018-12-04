FROM node:10.14.1-alpine@sha256:2915a1ce37f05975545a77dd2731ce49e96de52f3166fa5ea0c973321e76d818
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
