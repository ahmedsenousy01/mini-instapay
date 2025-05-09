FROM node:alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --production --frozen-lockfile
COPY --from=builder /app/dist ./dist
EXPOSE 5002
CMD ["node", "dist/index.js"]