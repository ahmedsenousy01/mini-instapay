FROM node:alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm run build

FROM node:alpine
WORKDIR /app
COPY package.json ./
RUN npm install -g pnpm
RUN pnpm install --production
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]