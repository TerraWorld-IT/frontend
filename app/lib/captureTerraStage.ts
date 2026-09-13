import { withTimeout } from '../utils/withTimeout'

const captures = new WeakMap<HTMLElement, Map<string, Promise<HTMLCanvasElement>>>()

export function invalidateTerraCapture(target: HTMLElement): void {
  captures.delete(target)
}

/** 공유·위젯 소비자가 같은 스테이지/배경의 진행 중 캡처를 재사용한다. */
export function captureTerraStage(target: HTMLElement, backgroundColor: string | null = '#FFF8EB'): Promise<HTMLCanvasElement> {
  const key = backgroundColor ?? 'transparent'
  let entries = captures.get(target)
  if (!entries) { entries = new Map(); captures.set(target, entries) }
  const pending = entries.get(key)
  if (pending) return pending
  const capture = (async () => {
    const html2canvas = (await import('html2canvas')).default
    return withTimeout(html2canvas(target, {
      backgroundColor,
      scale: 2,
      useCORS: true,
      logging: false,
      imageTimeout: 8_000,
      onclone: (doc) => {
        const cloned = doc.getElementById('my-terra-container')?.querySelector<HTMLElement>(':scope > div')
        if (cloned) {
          cloned.style.transform = 'scale(1)'
          cloned.style.marginBottom = '0px'
        }
      },
    }), 10_000)
  })()
  entries.set(key, capture)
  void capture.finally(() => entries.delete(key)).catch(() => {})
  return capture
}
