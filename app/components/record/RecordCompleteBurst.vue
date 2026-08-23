<template>
  <!-- 기록 완료 파티클 (N-C1, 댓글 #52) — 경량 CSS 컨페티. 20개 조각이 위로 흩어지며 사라진다.
       prefers-reduced-motion 이면 애니메이션 없이 즉시 숨긴다(아래 style). -->
  <div class="burst pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
    <span
      v-for="p in PIECES"
      :key="p.i"
      class="piece"
      :style="{
        left: `${p.left}%`,
        background: p.color,
        animationDelay: `${p.delay}ms`,
        '--dx': `${p.dx}px`,
        '--dy': `${p.dy}px`,
        '--rot': `${p.rot}deg`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 완료 토스트와 함께 1.2초 표시되는 컨페티. 토큰 팔레트(이슬/햇살/번개/바람/반짝이) 5색.
 * 조각 위치·궤적은 결정적(index 기반)이라 SSR/CSR 불일치가 없다.
 */
const COLORS: string[] = [
  'var(--color-apjek-dew)',
  'var(--color-apjek-sun)',
  'var(--color-apjek-bolt)',
  'var(--color-apjek-wind)',
  'var(--color-apjek-sparkle)',
]

interface Piece { i: number; left: number; color: string; delay: number; dx: number; dy: number; rot: number }

const PIECES: Piece[] = Array.from({ length: 20 }, (_, i) => {
  const t = i / 20
  return {
    i,
    left: 8 + ((i * 37) % 84),
    color: COLORS[i % COLORS.length] ?? COLORS[0]!,
    delay: (i % 5) * 40,
    dx: Math.round(Math.sin(t * Math.PI * 2) * 60),
    dy: -(60 + ((i * 13) % 50)),
    rot: 180 + ((i * 53) % 360),
  }
})
</script>

<style scoped>
.piece {
  position: absolute;
  top: 50%;
  width: 7px;
  height: 10px;
  border-radius: 2px;
  opacity: 0;
  animation: burst-fly 1.2s ease-out forwards;
}

@keyframes burst-fly {
  0% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(0.6); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .piece { animation: none; opacity: 0; }
}
</style>
