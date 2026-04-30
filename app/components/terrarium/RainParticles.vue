<!--
  PixiJS 기반 비 파티클 효과.
  테라리움 영역 위에 absolute 오버레이로 배치. pointer-events 없음 (UI 클릭 통과).

  Props
    enabled — boolean. true 일 때만 렌더 + 애니메이션.
    intensity — 'soft' | 'normal' | 'heavy'. 빗방울 수 결정 (30 / 60 / 120).

  성능
    - 빗방울 sprite 는 Graphics 로 한 번 그려 재사용 (PIXI.Texture 캐시).
    - 페이지 unmount 시 Application.destroy 로 캔버스/리스너 모두 정리.
    - SSR 안전 — onMounted 에서만 PixiJS 동적 import.
-->
<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full pointer-events-none"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  enabled?: boolean
  intensity?: 'soft' | 'normal' | 'heavy'
}>(), {
  enabled: true,
  intensity: 'normal',
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
// PIXI 모듈은 dynamic import 라서 strict 타입 대신 unknown 으로 보유
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null
let cleanup: (() => void) | null = null

const dropCount = computed(() => {
  switch (props.intensity) {
    case 'soft': return 30
    case 'heavy': return 120
    default: return 60
  }
})

async function start() {
  if (!import.meta.client || !canvasRef.value) return
  const parent = canvasRef.value.parentElement
  if (!parent) return

  const { Application, Graphics, Container } = await import('pixi.js')
  app = new Application()
  await app.init({
    canvas: canvasRef.value,
    width: parent.clientWidth || 320,
    height: parent.clientHeight || 480,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  })

  const container = new Container()
  app.stage.addChild(container)

  type Drop = { gfx: InstanceType<typeof Graphics>; vy: number }
  const drops: Drop[] = []
  const w = app.screen.width
  const h = app.screen.height

  for (let i = 0; i < dropCount.value; i++) {
    const drop = new Graphics()
    drop.rect(0, 0, 1.5, 10).fill({ color: 0xA8D8EA, alpha: 0.55 })
    drop.x = Math.random() * w
    drop.y = Math.random() * h
    container.addChild(drop)
    drops.push({ gfx: drop, vy: 1.6 + Math.random() * 3.2 })
  }

  const tick = () => {
    for (const d of drops) {
      d.gfx.y += d.vy
      if (d.gfx.y > h) {
        d.gfx.y = -10
        d.gfx.x = Math.random() * w
      }
    }
  }
  app.ticker.add(tick)

  // 부모 크기 변경 대응
  const resizeObserver = new ResizeObserver(() => {
    if (!app || !parent) return
    app.renderer.resize(parent.clientWidth, parent.clientHeight)
  })
  resizeObserver.observe(parent)

  cleanup = () => {
    resizeObserver.disconnect()
    if (app) {
      app.ticker.remove(tick)
      app.destroy(true, { children: true, texture: true })
      app = null
    }
  }
}

function stop() {
  cleanup?.()
  cleanup = null
}

onMounted(() => {
  if (props.enabled) void start()
})

watch(() => props.enabled, (next) => {
  if (next && !app) void start()
  else if (!next && app) stop()
})

onBeforeUnmount(stop)
</script>
