FROM node:alpine AS builder
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:alpine
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml* ./
COPY --from=builder /usr/src/app/dist ./dist
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile
EXPOSE 5002
EXPOSE 9180
CMD ["pnpm", "start"]