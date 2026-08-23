<template>
  <!-- 수수께끼 정령(도장 0~9) 플레이스홀더 — 흰 달걀 실루엣 + 물음표.
       WS-F 에셋(Figma "수수께끼 정령" 실루엣) 도착 전까지 인라인 SVG 로 대체한다. -->
  <svg
    width="140"
    height="160"
    viewBox="0 0 140 160"
    fill="none"
    role="img"
    aria-label="수수께끼 정령"
    class="animate-float"
  >
    <!-- 바닥 그림자 -->
    <ellipse cx="70" cy="150" rx="42" ry="7" fill="rgba(0,0,0,0.12)" />
    <!-- 달걀 본체 -->
    <path
      d="M70 8C37 8 14 54 14 92c0 32 25 54 56 54s56-22 56-54C126 54 103 8 70 8Z"
      fill="white"
      fill-opacity="0.96"
    />
    <!-- 하이라이트 -->
    <ellipse cx="48" cy="52" rx="10" ry="18" fill="white" transform="rotate(-18 48 52)" />
    <!-- 물음표 -->
    <text
      x="70"
      y="104"
      text-anchor="middle"
      font-size="54"
      font-weight="700"
      fill="#c9d6e8"
      font-family="inherit"
    >?</text>
  </svg>
</template>
