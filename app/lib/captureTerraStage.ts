import { withTimeout } from '../utils/withTimeout'

const captures = new WeakMap<HTMLElement, Map<string, Promise<HTMLCanvasElement>>>()

interface TerraCaptureOptions {
  fitBackdrop?: boolean
}

/** 복제된 스테이지의 배율을 복원하고, 위젯 캡처에서는 병 뒤 글로우 원을 스테이지 폭에 맞추고 가장자리를 투명하게 해 사각 경계를 없앤다. */
export function prepareTerraCaptureClone(doc: Document, options: TerraCaptureOptions = {}): void {
  const cloned = doc.getElementById('my-terra-container')?.querySelector<HTMLElement>(':scope > div')
  if (!cloned) return
  cloned.style.transform = 'scale(1)'
  cloned.style.marginBottom = '0px'
  if (!options.fitBackdrop) return
  const backdrop = cloned.querySelector<HTMLElement>('[data-testid="home-jar-backdrop"]')
  if (backdrop) {
    backdrop.style.width = '100%'
    backdrop.style.background = 'radial-gradient(circle closest-side, rgba(81,140,219,0.2) 0%, rgba(255,248,235,0) 100%)'
  }
}

export function invalidateTerraCapture(target: HTMLElement): void {
  captures.delete(target)
}

/** 같은 스테이지·배경·옵션의 진행 중 캡처를 재사용한다. */
export function captureTerraStage(target: HTMLElement, backgroundColor: string | null = '#FFF8EB', options: TerraCaptureOptions = {}): Promise<HTMLCanvasElement> {
  const fitBackdrop = options.fitBackdrop === true
  const key = JSON.stringify([backgroundColor, fitBackdrop])
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
      onclone: doc => prepareTerraCaptureClone(doc, { fitBackdrop }),
    }), 10_000)
  })()
  entries.set(key, capture)
  void capture.finally(() => entries.delete(key)).catch(() => {})
  return capture
}
