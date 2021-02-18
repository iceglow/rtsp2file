FROM alpine:3.12.3

WORKDIR /app

ADD package.json package-lock.json server.js /app/
COPY src/ /app/src/

VOLUME [ "/app/config" ]

RUN apk update && \
    apk add live-media-utils nodejs npm && \
    npm install

EXPOSE 80

ENTRYPOINT [ "npm", "start" ]