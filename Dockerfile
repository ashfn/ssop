FROM node:24-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S ssop -u 1001

COPY package*.json ./

RUN npm ci

COPY . .

RUN mkdir -p /app/config && \
    chown -R ssop:nodejs /app

USER ssop

ENV COOKIE_SECRET=change-this-to-a-random-32-char-string

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/.well-known/openid-configuration || exit 1

CMD ["npx", "tsx", "src/index.ts"] 