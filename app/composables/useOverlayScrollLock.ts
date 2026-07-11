/**
 * 모달/바텀시트가 열려 있는 동안 배경 스크롤을 잠근다.
 *
 * **왜 `document.body.style.overflow = 'hidden'` 으로는 안 되는가**
 * 이 앱의 실제 스크롤 컨테이너는 `body` 가 아니라 `layouts/default.vue` 의
 * `<main class="flex-1 overflow-y-auto">` 다. body 를 잠가도 그 안쪽은 그대로 스크롤된다.
 * 그래서 `<html>` 에 클래스를 붙이고, CSS 가 body 와 `main` 을 함께 잠근다
 * (`assets/css/tailwind.css` 의 `html.scroll-locked` 규칙 — `layout: false` 페이지는
 * body 가 스크롤러이므로 두 경우를 모두 덮는다).
 *
 * **참조 카운트가 필요한 이유**
 * 오버레이는 겹쳐 뜬다(예: 홈의 시트 위에 TierModal). 각자 열고 닫을 때 클래스를 무조건
 * 토글하면, 안쪽 모달이 닫히면서 바깥 모달이 아직 열려 있는데도 잠금이 풀린다.
 *
 * `overflow: hidden` 은 `position: fixed` 트릭과 달리 스크롤 위치를 보존하므로,
 * 모달을 닫았을 때 화면이 맨 위로 튀지 않는다.
 */
const LOCK_CLASS = 'scroll-locked'
const COUNT_ATTR = 'data-scroll-lock-count'

// 참조 카운트를 모듈 변수가 아니라 <html> 의 data 속성에 둔다.
// 이유: (1) per-document 로 정확하다 — Nitro 가 모듈을 프로세스당 한 번 로드하므로 모듈 변수는
// SSR 요청 간 공유돼 위험하다(여긴 client-only 라 실사용엔 무해하나 원칙상). (2) DOM 이 곧 SoT 라
// 클래스와 카운트가 항상 같은 곳에 있어 desync 가 불가능하다. (3) 클래스+속성만 지우면 상태가
// 완전히 초기화돼 테스트 격리가 자연스럽다.
function readCount(): number {
  const raw = document.documentElement.getAttribute(COUNT_ATTR)
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) && n > 0 ? n : 0
}

function writeCount(n: number): void {
  const el = document.documentElement
  if (n <= 0) {
    el.removeAttribute(COUNT_ATTR)
    el.classList.remove(LOCK_CLASS)
  }
  else {
    el.setAttribute(COUNT_ATTR, String(n))
    el.classList.add(LOCK_CLASS)
  }
}

export function useOverlayScrollLock(isOpen: Ref<boolean>): void {
  if (import.meta.server) return

  // 이 호출부가 잠금을 쥐고 있는지. 같은 오버레이가 중복으로 카운트를 올리지 않게 한다(per-instance).
  let held: boolean = false

  function acquire(): void {
    if (held) return
    held = true
    writeCount(readCount() + 1)
  }

  function release(): void {
    if (!held) return
    held = false
    writeCount(readCount() - 1)
  }

  watch(isOpen, (open) => {
    if (open) acquire()
    else release()
  }, { immediate: true })

  // 오버레이가 열린 채로 라우트가 바뀌면 unmount 만 일어나고 `isOpen` watcher 는 안 돈다.
  // 그때 잠금을 풀지 않으면 다음 화면이 영영 스크롤되지 않는다.
  onScopeDispose(release)
}
