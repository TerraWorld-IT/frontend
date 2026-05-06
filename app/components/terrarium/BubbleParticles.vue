<!--
  PixiJS 기반 산소방울 효과. PALUDARIUM(수중) 단계용 — 위로 천천히 떠오르며 점점 사라진다.

  Props
    enabled — boolean. true 일 때만 렌더 + 애니메이션.
    intensity — 'soft' | 'normal' | 'heavy'. 방울 수 결정 (15 / 30 / 60).
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

const bubbleCount = computed(() => {
  switch (props.intensity) {
    case 'soft': return 15
    case 'heavy': return 60
    default: return 30
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

  type Bubble = { gfx: InstanceType<typeof Graphics>; vy: number; size: number; sway: number; baseX: number; phase: number }
  const bubbles: Bubble[] = []
  const w = app.screen.width
  const h = app.screen.height

  function spawn(b: Bubble) {
    b.size = 2 + Math.random() * 5
    b.gfx.clear()
    b.gfx
      .circle(0, 0, b.size)
      .stroke({ color: 0xA8D8EA, alpha: 0.55, width: 1 })
      .circle(-b.size * 0.3, -b.size * 0.3, b.size * 0.2)
      .fill({ color: 0xFFFFFF, alpha: 0.7 })
    b.baseX = Math.random() * w
    b.gfx.x = b.baseX
    b.gfx.y = h + Math.random() * 40
    b.vy = -0.3 - Math.random() * 0.7
    b.sway = 4 + Math.random() * 10
    b.phase = Math.random() * Math.PI * 2
    b.gfx.alpha = 0.7
  }

  for (let i = 0; i < bubbleCount.value; i++) {
    const gfx = new Graphics()
    container.addChild(gfx)
    const bubble: Bubble = { gfx, vy: 0, size: 0, sway: 0, baseX: 0, phase: 0 }
    spawn(bubble)
    bubble.gfx.y = Math.random() * h
    bubbles.push(bubble)
  }

  let t = 0
  const tick = () => {
    t += 0.04
    for (const b of bubbles) {
      b.gfx.y += b.vy
      b.gfx.x = b.baseX + Math.sin(t + b.phase) * b.sway
      // fade out near top
      if (b.gfx.y < h * 0.2) {
        b.gfx.alpha = Math.max(0, (b.gfx.y / (h * 0.2)) * 0.7)
      }
      if (b.gfx.y < -10 || b.gfx.alpha <= 0) {
        spawn(b)
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
