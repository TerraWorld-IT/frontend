FROM oven/bun:1-alpine AS build
WORKDIR /app

# openapi-frontend 는 package.json 에 `file:./openapi-frontend` 로 링크돼 있어
# bun install --frozen-lockfile 이 실제 디렉토리를 요구한다. lockfile 만 먼저
# 복사하면 ENOENT 로 설치가 실패하므로, 의존성 해석에 필요한 최소 파일을
# 미리 함께 복사해서 한 번에 resolve 한다.
COPY package.json bun.lock ./
COPY openapi-frontend ./openapi-frontend
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/.output .output
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
