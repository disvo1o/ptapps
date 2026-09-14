FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production APP_ENV=production MOCK_TELEGRAM=false API_HOST=0.0.0.0
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/apps ./apps
COPY --from=build /app/database ./database
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/.data
EXPOSE 3001
CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]
