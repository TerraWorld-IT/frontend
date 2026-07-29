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
# heap 상한은 빌드 환경별 주입 (기본 4096 — 빌드는 ubuntu 러너(~7GB)에서 수행되므로
# 과거 맥 러너 OOM 완화용 1536 은 GC 스래싱만 유발. 맥 로컬 빌드 재개 시
# `--build-arg NODE_HEAP=1536` 으로 재현 가능)
ARG NODE_HEAP=4096
ENV NODE_OPTIONS=--max-old-space-size=${NODE_HEAP}

# 공개 클라이언트 설정 (ENV-1). `runtimeConfig.public.*` 항목은 컨테이너 런타임 env 로도
# 덮어쓸 수 있지만, `nuxt.config.ts` 의 `gtag.id` 는 **빌드 시점** `NUXT_PUBLIC_GA_ID` 로만
# 채워진다 — 런타임에 덮으려면 키 이름이 `NUXT_PUBLIC_GTAG_ID` 로 달라져 혼선이 나므로
# 공개 ID 는 빌드에 넘겨 굽는다.
# 값을 안 넘기면 빈 문자열로 빌드된다(해당 기능만 비활성, 빌드는 실패하지 않음) — 지금까지의
# 동작과 동일하므로 build-arg 미설정 환경에서도 안전하다.
ARG NUXT_PUBLIC_GA_ID=""
ARG NUXT_PUBLIC_ADSENSE_CLIENT=""
ARG NUXT_PUBLIC_ADSENSE_SLOT=""
ARG NUXT_PUBLIC_ADMOB_REWARDED_AD_ID=""
ARG NUXT_PUBLIC_META_APP_ID=""
ENV NUXT_PUBLIC_GA_ID=${NUXT_PUBLIC_GA_ID}
ENV NUXT_PUBLIC_ADSENSE_CLIENT=${NUXT_PUBLIC_ADSENSE_CLIENT}
ENV NUXT_PUBLIC_ADSENSE_SLOT=${NUXT_PUBLIC_ADSENSE_SLOT}
ENV NUXT_PUBLIC_ADMOB_REWARDED_AD_ID=${NUXT_PUBLIC_ADMOB_REWARDED_AD_ID}
ENV NUXT_PUBLIC_META_APP_ID=${NUXT_PUBLIC_META_APP_ID}

RUN bun run build

FROM node:20-alpine AS runtime
WORKDIR /app
# 비-root 실행: node:20-alpine 에 이미 있는 `node` 사용자(uid 1000)로 낮춘다.
# Nitro 는 `data:` 스토리지를 `./.data/kv`(fsLite) 에 마운트하지만 이 앱엔 `useStorage('data')`
# 소비자가 없고, 캐시(`defineCachedEventHandler`)는 마운트가 없어 루트 memory 드라이버로 떨어져
# 디스크에 쓰지 않는다 — 따라서 `.output` 읽기 권한이면 충분하다(빌드 산출물 실측).
# 단 `useStorage('data')` 를 쓰기 시작하면 root 소유인 `/app` 아래에 쓰려다 EACCES 가 나므로
# 그때는 쓰기 경로를 따로 열어야 한다.
# 3000 은 1024 초과라 비특권 사용자도 바인드할 수 있다.
COPY --from=build --chown=node:node /app/.output .output
USER node
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
# 컨테이너 자체 헬스체크. alpine 의 busybox wget 대신 `node` 를 쓰는 이유는 node 이미지에
# 반드시 존재해서 추가 의존성이 없기 때문(busybox 옵션 지원 여부에 기대지 않음).
# `/` 는 미인증 요청이 /auth/login 으로 302 되므로, 인증 없이 200 이 보장되는 경로를 친다
# (배포 워크플로의 기동 확인 프로브와 동일 경로).
# interval 120s: 이 프로브는 실제 SSR 라우트를 렌더하므로 비용이 있고, 소비자가 없다
# (compose 에 frontend healthcheck 의존이 없고 nginx depends_on 도 condition 없는 목록).
# 30s 로 두면 하루 ~2,880 회 무의미한 SSR 렌더가 발생한다.
HEALTHCHECK --interval=120s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/auth/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", ".output/server/index.mjs"]
