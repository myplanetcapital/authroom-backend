# ---------- Dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++ pkgconf pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

COPY package.json package-lock.json* ./
RUN npm install --omit=dev


# ---------- Runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache cairo pango pixman jpeg giflib librsvg && \
    npm install -g pm2

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3093
CMD ["pm2-runtime", "ecosystem.config.js"]
