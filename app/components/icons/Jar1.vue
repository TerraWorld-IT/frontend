<!--
  유리병 (Jar1) — TERRAWORLD2 Figma 프로토타입 `imports/Jar1/Jar1.tsx` 픽셀-정확 이식.
  경로 상수는 Figma export `jar1/jar1Paths.ts` (디자인 SoT) 를 그대로 사용.
  size-full 로 부모(400×552 컨테이너)에 꽉 채워 렌더.
-->
<template>
  <div class="relative size-full" data-name="jar1">
    <!-- Group -->
    <div class="absolute contents inset-0" data-name="Group">
      <!-- Component (레이어 1) -->
      <div class="absolute contents inset-0" data-name="레이어 1">
        <!-- Group1 -->
        <div class="absolute contents inset-0" data-name="Group">
          <!-- 병 몸통 (white base) -->
          <div class="absolute inset-[0_15.56%_85.39%_14.76%]" data-name="Vector">
            <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 278.704 80.67">
              <path :d="p.p2c71b880" fill="white" />
            </svg>
          </div>

          <!-- Group2 -->
          <div class="absolute contents inset-[5.35%_0_0_0]" data-name="Group">
            <!-- Group3 -->
            <div class="absolute contents inset-[5.35%_0_0_0]" data-name="Group">
              <div class="absolute inset-[5.35%_5.78%_86%_7.6%] mix-blend-multiply" data-name="Vector">
                <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 346.48 47.8">
                  <g style="mix-blend-mode: multiply"><path :d="p.p2e7dc000" fill="#F092F0" /></g>
                </svg>
              </div>
              <div class="absolute inset-[14%_9.71%_85.65%_87.49%]" data-name="Vector">
                <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.23 1.95">
                  <path :d="p.p1dd5f900" fill="#518CDB" />
                </svg>
              </div>
              <div class="absolute inset-[6.72%_87%_5.98%_0]" data-name="Vector">
                <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 51.99 482.08">
                  <path :d="p.p21f4ed80" fill="#518CDB" />
                </svg>
              </div>
              <div class="absolute inset-[5.83%_0.94%_0.82%_0.49%]" data-name="Vector">
                <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 394.26 515.46">
                  <path :d="p.p2e328380" fill="#518CDB" />
                </svg>
              </div>
              <div class="absolute inset-[32.11%_0.94%_0.82%_0.49%]" data-name="Vector">
                <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 394.26 370.39">
                  <path :d="p.p3cfc9500" fill="#487DB7" />
                </svg>
              </div>
              <div class="absolute inset-[14.35%_0_0_1.41%] mix-blend-multiply" data-name="Vector">
                <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 394.33 472.92">
                  <g style="mix-blend-mode: multiply"><path :d="p.p9c8b000" fill="#F092F0" /></g>
                </svg>
              </div>
            </div>
            <div class="absolute inset-[14.82%_14.42%_83.5%_42.82%]" data-name="Vector">
              <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 171.033 9.29681">
                <path :d="p.p5f091f0" fill="#487DB7" />
              </svg>
            </div>
            <div class="absolute inset-[14.35%_14.53%_84.7%_18.49%]" data-name="Vector">
              <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 267.88 5.24812">
                <path :d="p.p3d75bb00" fill="#8C6AE4" />
              </svg>
            </div>
            <div class="absolute inset-[15.4%_1.76%_34.02%_84.73%]" data-name="Vector">
              <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 54.02 279.26">
                <path :d="p.p17e14900" fill="#E4F38D" />
              </svg>
            </div>
          </div>

          <!-- 병 몸통 하이라이트 (F092F0 multiply) -->
          <div class="absolute inset-[0_15.56%_85.39%_14.76%] mix-blend-multiply" data-name="Vector">
            <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 278.704 80.67">
              <g style="mix-blend-mode: multiply"><path :d="p.p2c71b880" fill="#F092F0" /></g>
            </svg>
          </div>

          <!-- Group4 (흙/식물 디테일) -->
          <div class="absolute contents inset-[62.14%_2.79%_2.51%_2.79%]" data-name="Group">
            <div
              v-for="(v, i) in group4"
              :key="`g4-${i}`"
              class="absolute"
              :class="v.blend ? `mix-blend-${v.blend}` : ''"
              :style="{ inset: v.inset }"
              data-name="Vector"
            >
              <svg class="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" :viewBox="v.vb">
                <g v-if="v.blend" :style="{ mixBlendMode: v.blend }"><path v-if="v.d" :d="v.d" :fill="v.fill" /></g>
                <path v-else-if="v.d" :d="v.d" :fill="v.fill" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import p from './jar1/jar1Paths'

// Group4 의 흙/식물 벡터들 — TERRAWORLD2 Jar1.tsx Group4() 를 데이터-주도 배열로 이식.
// key 는 jar1Paths.ts 의 export 키. blend='multiply'|'overlay' 는 원본 mixBlendMode 대응.
// d 가 빈 초기 Vector(빈 <g/>)는 제외 (원본에서 렌더 결과 없음).
interface G4 {
  inset: string
  vb: string
  d?: string
  fill?: string
  blend?: 'multiply' | 'overlay'
}

const group4: G4[] = [
  { inset: '87.06% 82.7% 12.84% 15.83%', vb: '0 0 5.88 0.554651', d: p.p16bb1180, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.2% 90.62% 10.78% 9.24%', vb: '0 0 0.539997 0.0900269', d: p.pe20f100, fill: '#8E5023', blend: 'overlay' },
  { inset: '85.6% 3.32% 14.29% 96.64%', vb: '0 0 0.160004 0.609985', d: p.p36750280, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.26% 87.96% 10.71% 11.11%', vb: '0 0 3.75 0.211078', d: p.p12e58100, fill: '#8E5023', blend: 'overlay' },
  { inset: '87.45% 92.9% 11.06% 3.22%', vb: '0 0 15.53 8.19', d: p.p12bd1600, fill: '#8E5023', blend: 'overlay' },
  { inset: '77.53% 2.84% 13.96% 37.15%', vb: '0 0 240.05 47.01', d: p.p3e94c300, fill: '#8E5023', blend: 'overlay' },
  { inset: '87.16% 85.5% 12.61% 11.8%', vb: '0 0 10.8024 1.27002', d: p.p9429380, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.14% 92.15% 10.84% 7.38%', vb: '0 0 1.91 0.0999756', d: p.p22860c00, fill: '#8E5023', blend: 'overlay' },
  { inset: '87.31% 88.32% 12.41% 7.35%', vb: '0 0 17.32 1.56', d: p.p115c8900, fill: '#8E5023', blend: 'overlay' },
  { inset: '87.12% 84.38% 12.75% 14.14%', vb: '0 0 5.89678 0.670013', d: p.p158fae00, fill: '#8E5023', blend: 'overlay' },
  { inset: '86.45% 70.6% 12.98% 21.97%', vb: '0 0 29.7128 3.12', d: p.p30e427f0, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.51% 68.07% 10.28% 22.09%', vb: '0 0 39.36 1.17999', d: p.p2cf76500, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.64% 60.59% 10.09% 32.76%', vb: '0 0 26.6068 1.51467', d: p.p28139580, fill: '#8E5023', blend: 'overlay' },
  { inset: '87.01% 9.42% 10.2% 39.19%', vb: '0 0 205.55 15.3626', d: p.p2ea63740, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.16% 92.52% 10.83% 7.29%', vb: '0 0 0.77 0.0599976', d: p.pa472600, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.7% 65.15% 10.07% 30.95%', vb: '0 0 15.5705 1.26001', d: p.p22d2d800, fill: '#8E5023', blend: 'overlay' },
  { inset: '86.24% 67.66% 13.67% 31.48%', vb: '0 0 3.45999 0.459991', d: p.p3f6df700, fill: '#8E5023', blend: 'overlay' },
  { inset: '85.97% 63.83% 13.57% 31.53%', vb: '0 0 18.52 2.53777', d: p.pe214b00, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.55% 77.88% 10.39% 20.6%', vb: '0 0 6.07999 0.348022', d: p.p28bd7b80, fill: '#8E5023', blend: 'overlay' },
  { inset: '86.81% 77.05% 13.04% 20.5%', vb: '0 0 9.8 0.833799', d: p.p3f966400, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.48% 78.7% 10.48% 20.67%', vb: '0 0 2.55 0.220001', d: p.pa902e70, fill: '#8E5023', blend: 'overlay' },
  { inset: '86.94% 79.57% 12.9% 17.81%', vb: '0 0 10.4764 0.889984', d: p.p2b992280, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.33% 85.37% 10.66% 14.35%', vb: '0 0 1.12 0.0599976', d: p.p3827300, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.45% 79.45% 10.41% 18.91%', vb: '0 0 6.57 0.759979', d: p.pf3484c0, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.37% 81.13% 10.49% 15.47%', vb: '0 0 13.61 0.75', d: p.p179fcbf0, fill: '#8E5023', blend: 'overlay' },
  { inset: '89.54% 77.67% 10.43% 21.88%', vb: '0 0 1.82 0.139984', d: p.p3c2e9e80, fill: '#80634A' },
  { inset: '89.73% 65.72% 10.17% 32.62%', vb: '0 0 6.62999 0.529999', d: p.p3a3d0b80, fill: '#80634A' },
  { inset: '89.15% 92.62% 10.84% 7.27%', vb: '0 0 0.41 0.0299988', d: p.p281bea00, fill: '#80634A' },
  { inset: '89.73% 60.45% 10.23% 39.04%', vb: '0 0 2.03999 0.223517', d: p.p32284700, fill: '#80634A' },
  { inset: '85.44% 3.08% 14.21% 96.68%', vb: '0 0 0.950012 1.9111', d: p.p3eca91f0, fill: '#80634A' },
  { inset: '88.94% 92.19% 10.84% 3.49%', vb: '0 0 17.28 1.20999', d: p.p3172c900, fill: '#80634A' },
  { inset: '85.71% 3.36% 12.99% 90.59%', vb: '0 0 24.2203 7.17999', d: p.p2e483b00, fill: '#80634A' },
  { inset: '89.65% 68.25% 10.3% 31.13%', vb: '0 0 2.49 0.300018', d: p.p11bb5500, fill: '#80634A' },
  { inset: '89.47% 81.09% 10.51% 18.77%', vb: '0 0 0.580002 0.119995', d: p.p3ef114f0, fill: '#80634A' },
  { inset: '89.19% 87.96% 10.7% 9.38%', vb: '0 0 10.62 0.649994', d: p.pde92f00, fill: '#80634A' },
  { inset: '89.14% 90.76% 10.78% 7.48%', vb: '0 0 7.06 0.449982', d: p.pfcdfe20, fill: '#80634A' },
  { inset: '89.24% 85.61% 10.67% 11.29%', vb: '0 0 12.42 0.48999', d: p.p27a48680, fill: '#80634A' },
  { inset: '89.34% 84.53% 10.63% 14.38%', vb: '0 0 4.34 0.179993', d: p.p3b65a800, fill: '#80634A' },
  { inset: '89.51% 79.23% 10.47% 20.45%', vb: '0 0 1.26 0.140015', d: p.p11489f00, fill: '#80634A' },
  { inset: '89.52% 78.91% 10.45% 20.82%', vb: '0 0 1.10001 0.120026', d: p.p1bd6700, fill: '#80634A' },
  { inset: '86.06% 64.31% 13.89% 35.45%', vb: '0 0 0.953658 0.23999', d: p.p25f61b40, fill: '#80634A' },
  { inset: '85.98% 61.9% 13.9% 37.1%', vb: '0 0 3.98283 0.649994', d: p.p3ca72a00, fill: '#80634A' },
  { inset: '86.88% 76.94% 13.08% 22.68%', vb: '0 0 1.51 0.23999', d: p.p2b9e0100, fill: '#80634A' },
  { inset: '89.25% 88.74% 10.74% 11.04%', vb: '0 0 0.860001 0.0500183', d: p.p2db01270, fill: '#80634A' },
  { inset: '89.66% 64.99% 10.26% 33.23%', vb: '0 0 7.13039 0.420013', d: p.p32555500, fill: '#80634A' },
  { inset: '89.82% 66.5% 10.17% 33.33%', vb: '0 0 0.669998 0.0599976', d: p.p208b5f80, fill: '#80634A' },
  { inset: '89.15% 92.37% 10.84% 7.37%', vb: '0 0 1.04 0.0599976', d: p.p1777e000, fill: '#80634A' },
  { inset: '78.57% 2.96% 10.18% 3.5%', vb: '0 0 374.15 62.12', d: p.p6b2b400, fill: '#80634A' },
  { inset: '86.18% 2.92% 2.51% 3.15%', vb: '0 0 375.731 62.4778', d: p.p13676e00, fill: '#202126' },
  { inset: '89.92% 66.67% 10.05% 32.21%', vb: '0 0 4.50999 0.160004', d: p.p161f7380, fill: '#202126' },
  { inset: '68.6% 3.98% 30.96% 95.77%', vb: '0 0 1.00998 2.45001', d: p.p3cecbbf0, fill: '#3D4C51' },
  { inset: '74.13% 96.39% 12.97% 2.91%', vb: '0 0 2.76799 71.2081', d: p.p204cac80, fill: '#3D4C51' },
  { inset: '64.74% 62.71% 35.16% 36.97%', vb: '0 0 1.27128 0.554202', d: p.p26ddaf80, fill: '#3D4C51' },
  { inset: '71.55% 96.64% 25.42% 2.79%', vb: '0 0 2.27055 16.74', d: p.p135dab00, fill: '#3D4C51' },
  { inset: '69.13% 95.97% 30.57% 3.71%', vb: '0 0 1.26 1.66617', d: p.pad85080, fill: '#3D4C51' },
  { inset: '67.91% 3.93% 31.16% 95.51%', vb: '0 0 2.23444 5.09333', d: p.p2bd9b480, fill: '#3D4C51' },
  { inset: '62.14% 2.79% 23.16% 3.17%', vb: '0 0 376.16 81.21', d: p.p2b09f80, fill: '#3D4C51' },
  { inset: '65.4% 22.89% 34.55% 76.8%', vb: '0 0 1.26298 0.279286', d: p.p2cb2edb0, fill: '#3D4C51' },
  { inset: '85.44% 63.48% 12.55% 3.59%', vb: '0 0 131.749 11.08', d: p.p6bbda00, fill: '#283135' },
  { inset: '76.84% 3.22% 14.22% 35.71%', vb: '0 0 244.29 49.34', d: p.p1d45d400, fill: '#283135' },
  { inset: '73.8% 96.83% 24.89% 3.03%', vb: '0 0 0.54 7.20001', d: p.p26ba3cf0, fill: '#283135' },
  { inset: '86.11% 64.29% 13.85% 35.31%', vb: '0 0 1.62999 0.220001', d: p.p34419280, fill: '#283135' },
  { inset: '83.63% 37.49% 16.17% 61.04%', vb: '0 0 5.89999 1.10001', d: p.p2476ae72, fill: '#283135' },
  { inset: '84.54% 46.66% 12.43% 3.58%', vb: '0 0 199.06 16.73', d: p.p7506b30, fill: '#283135' },
  { inset: '83.73% 38.93% 15.48% 53.86%', vb: '0 0 28.84 4.35001', d: p.p3ad75980, fill: '#283135' },
  { inset: '83.12% 32.96% 16.76% 66.01%', vb: '0 0 4.12 0.660004', d: p.p9693c00, fill: '#283135' },
  { inset: '83.35% 35.2% 16.54% 63.9%', vb: '0 0 3.60001 0.609985', d: p.p24a6ef00, fill: '#283135' },
  { inset: '83.44% 36.42% 16.46% 63.25%', vb: '0 0 1.32001 0.519989', d: p.p33f04100, fill: '#283135' },
  { inset: '85.81% 60.43% 14.02% 38.1%', vb: '0 0 5.86546 0.960022', d: p.p15224d00, fill: '#283135' },
  { inset: '83.33% 34.85% 16.66% 65.08%', vb: '0 0 0.279999 0.0400085', d: p.p31a10880, fill: '#283135' },
  { inset: '86.92% 77.32% 13.06% 22.6%', vb: '0 0 0.32 0.0899963', d: p.p224213f0, fill: '#283135' },
  { inset: '85.95% 61.13% 13.75% 35.46%', vb: '0 0 13.64 1.69', d: p.p16d7be00, fill: '#283135' },
  { inset: '87% 82.16% 12.93% 17.29%', vb: '0 0 2.17 0.349976', d: p.pa165000, fill: '#283135' },
  { inset: '86.85% 78.71% 13.07% 19.16%', vb: '0 0 8.53001 0.464328', d: p.p248caf00, fill: '#283135' },
  { inset: '86.86% 77.09% 13.08% 22.63%', vb: '0 0 1.11 0.329987', d: p.p2bb5a700, fill: '#283135' },
  { inset: '87.07% 84.18% 12.88% 15.26%', vb: '0 0 2.25464 0.309998', d: p.p3df99100, fill: '#283135' },
  { inset: '87.31% 87.99% 12.64% 11.68%', vb: '0 0 1.307 0.22998', d: p.p208bf780, fill: '#283135' },
  { inset: '87.25% 85.86% 12.73% 13.77%', vb: '0 0 1.48 0.109985', d: p.pa552a00, fill: '#283135' },
  { inset: '87.51% 92.64% 12.47% 7.1%', vb: '0 0 1.01 0.119995', d: p.p111e8a80, fill: '#283135' },
  { inset: '86.33% 68.52% 13.48% 29.4%', vb: '0 0 8.31 1.08002', d: p.p3069ef00, fill: '#283135' },
  { inset: '86.16% 67.07% 13.76% 32.34%', vb: '0 0 2.32837 0.449982', d: p.p2c1a8b00, fill: '#283135' },
  { inset: '62.66% 3.15% 12.96% 3.13%', vb: '0 0 374.866 134.63', d: p.p2ab89500, fill: '#384449' },
  { inset: '87.02% 96.4% 12.97% 3.57%', vb: '0 0 0.12 0.0299988', d: p.p16597300, fill: '#283135' },
  { inset: '85.73% 64.29% 14.27% 35.63%', vb: '0 0 0.339996 0.0200195', d: p.p4f0da80, fill: '#283135' },
  { inset: '65.93% 23.11% 34.02% 76.58%', vb: '0 0 1.25332 0.279286', d: p.p2c55a800, fill: '#283135' },
]
</script>
