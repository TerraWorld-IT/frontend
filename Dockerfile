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
# 실측(2026-07-08): self-hosted Mac 러너에서 bun run build 가 SIGKILL(cannot allocate
# memory)로 죽는 외부 OOM 발생 — Node/Nitro 빌드 프로세스가 V8 heap 을 과도하게 키워서
# 실제 물리 메모리를 다 쓴 것으로 보임(러너 RAM 자체가 부족하거나, 오늘 반복된 빌드로
# Docker 리소스가 누적됐을 가능성 — 근본 해결은 러너 쪽 확인 필요). heap 상한을 낮춰
# 피크 메모리 사용량을 줄이는 완화책 — 그래도 죽으면 heap OOM 이라 더 명확히 진단 가능.
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN bun run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/.output .output
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
