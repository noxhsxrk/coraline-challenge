FROM node:22-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm install
COPY . .
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["node", "dist/main"]
