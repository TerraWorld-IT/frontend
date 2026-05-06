<!--
  PixiJS 기반 눈 파티클 효과. 비 파티클(RainParticles)과 형태/속도/색상 차이.
  눈은 둥근 흰색 원 + 약한 좌우 sway, 비보다 느린 낙하.

  Props
    enabled — boolean. true 일 때만 렌더 + 애니메이션.
    intensity — 'soft' | 'normal' | 'heavy'. 눈송이 수 결정 (40 / 80 / 160).
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any = null
let cleanup: (() => void) | null = null

const flakeCount = computed(() => {
  switch (props.intensity) {
    case 'soft': return 40
    case 'heavy': return 160
    default: return 80
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

  type Flake = { gfx: InstanceType<typeof Graphics>; vy: number; baseX: number; phase: number; sway: number }
  const flakes: Flake[] = []
  const w = app.screen.width
  const h = app.screen.height

  for (let i = 0; i < flakeCount.value; i++) {
    const flake = new Graphics()
    const size = 1.5 + Math.random() * 2.5
    flake.circle(0, 0, size).fill({ color: 0xFFFFFF, alpha: 0.6 + Math.random() * 0.3 })
    const x = Math.random() * w
    flake.x = x
    flake.y = Math.random() * h
    container.addChild(flake)
    flakes.push({ gfx: flake, vy: 0.4 + Math.random() * 1.0, baseX: x, phase: Math.random() * Math.PI * 2, sway: 8 + Math.random() * 16 })
  }

  let t = 0
  const tick = () => {
    t += 0.02
    for (const f of flakes) {
      f.gfx.y += f.vy
      f.gfx.x = f.baseX + Math.sin(t + f.phase) * f.sway
      if (f.gfx.y > h) {
        f.gfx.y = -6
        f.baseX = Math.random() * w
      }
    }
  }
  app.ticker.add(tick)

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
