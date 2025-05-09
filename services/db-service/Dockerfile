FROM node:alpine

WORKDIR /app

COPY package.json .

RUN npm install -g pnpm@latest
RUN pnpm install

COPY . .

CMD ["pnpm", "db:push"]