FROM node:20-alpine as builder
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm i
WORKDIR /app/demo
COPY ./demo .
RUN npm i
RUN npm run build

FROM pierrezemb/gostatic
COPY --from=builder /app/demo/dist/ /srv/http/