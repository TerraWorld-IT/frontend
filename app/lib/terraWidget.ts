import { Capacitor, registerPlugin } from '@capacitor/core'

interface TerraWidgetPlugin {
  saveSnapshot(options: { pngBase64: string }): Promise<void>
  clearSnapshot(): Promise<void>
}

function plugin(): TerraWidgetPlugin { return registerPlugin<TerraWidgetPlugin>('TerraWidget') }
let owner: string | null | undefined
let epoch = 0
let queue: Promise<unknown> = Promise.resolve()

export function widgetAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('TerraWidget')
}

// 네이티브 쓰기·초기화를 직렬화한다. 로그아웃은 이미 디스패치된 쓰기 이후에 끝나야 한다.
export function setWidgetOwner(next: string | null): void {
  if (!widgetAvailable() || next === owner) return
  owner = next
  epoch++
  queue = queue.then(() => plugin().clearSnapshot()).catch(() => {})
}

export function widgetEpoch(): number { return epoch }

export function saveWidgetCanvas(canvas: HTMLCanvasElement, capturedEpoch: number): Promise<boolean> {
  if (!widgetAvailable() || owner === null || owner === undefined || capturedEpoch !== epoch) return Promise.resolve(false)
  // RemoteViews 는 Binder 로 비트맵을 넘긴다. 디코드 메모리를 약 566 KB 로 제한한다.
  const small = document.createElement('canvas')
  small.width = 320
  small.height = 442
  const context = small.getContext('2d')
  if (!context) return Promise.resolve(false)
  context.fillStyle = '#FFF8EB'
  context.fillRect(0, 0, small.width, small.height)
  context.drawImage(canvas, 0, 0, small.width, small.height)
  let pngBase64: string
  try { pngBase64 = small.toDataURL('image/png') }
  catch { return Promise.resolve(false) }
  const operation = queue.then(async () => {
    if (capturedEpoch !== epoch || owner === null || owner === undefined) return false
    await plugin().saveSnapshot({ pngBase64 })
    return true
  }).catch(() => false)
  queue = operation
  return operation
}
