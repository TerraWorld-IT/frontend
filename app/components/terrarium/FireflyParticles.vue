<!--
  PixiJS 기반 반딧불 파티클 효과. 부드러운 노란 빛이 위쪽으로 드리프트.

  Props
    enabled — boolean. true 일 때만 렌더 + 애니메이션.
    intensity — 'soft' | 'normal' | 'heavy'. 반딧불 수 결정 (12 / 24 / 48).
-->
<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
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

const flyCount = computed(() => {
  switch (props.intensity) {
    case 'soft': return 12
    case 'heavy': return 48
    default: return 24
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

  type Fly = { gfx: InstanceType<typeof Graphics>; vx: number; vy: number; basePulse: number; phase: number }
  const flies: Fly[] = []
  const w = app.screen.width
  const h = app.screen.height

  for (let i = 0; i < flyCount.value; i++) {
    const fly = new Graphics()
    fly.circle(0, 0, 2.5).fill({ color: 0xFFE38C, alpha: 0.85 })
    fly.x = Math.random() * w
    fly.y = Math.random() * h
    container.addChild(fly)
    flies.push({
      gfx: fly,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.2 - Math.random() * 0.4,
      basePulse: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    })
  }

  let t = 0
  const tick = () => {
    t += 0.06
    for (const f of flies) {
      f.gfx.x += f.vx
      f.gfx.y += f.vy
      // pulsing alpha
      f.gfx.alpha = f.basePulse + Math.sin(t + f.phase) * 0.4
      if (f.gfx.y < -10) f.gfx.y = h + 5
      if (f.gfx.x < -10) f.gfx.x = w + 5
      if (f.gfx.x > w + 10) f.gfx.x = -5
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
