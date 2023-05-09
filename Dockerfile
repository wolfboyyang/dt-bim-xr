FROM node:20-alpine as builder
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm i
# build demo
WORKDIR /app/demo
COPY ./demo .
RUN npm i
RUN npm run build

# build web-ifc-babylon
WORKDIR /app/web-ifc-babylon
COPY ./web-ifc-babylon .
RUN npm i
RUN npm run build


FROM pierrezemb/gostatic
COPY --from=builder /app/web-ifc-babylon/dist/ /srv/http/
COPY --from=builder /app/demo/dist/assets/ /srv/http/assets/
COPY --from=builder /app/demo/dist/index.html /srv/http/demo/index.html