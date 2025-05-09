FROM node:alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install -g pnpm@latest
RUN pnpm install
COPY . .
RUN pnpm run build

FROM node:alpine
WORKDIR /app
COPY package.json ./
RUN npm install -g pnpm@latest
RUN pnpm install
COPY --from=builder /app/dist ./dist
EXPOSE 5001
CMD ["pnpm", "start"]