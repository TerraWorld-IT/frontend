// commit-checker:file-lang=english
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({
  enabled: true,
  available: true,
  saveSnapshot: vi.fn<(...args: unknown[]) => Promise<void>>(),
  clearSnapshot: vi.fn<() => Promise<void>>(),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => native.enabled,
    isPluginAvailable: () => native.available,
  },
  registerPlugin: () => native,
}))

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  native.enabled = true
  native.available = true
  native.saveSnapshot.mockReset().mockResolvedValue()
  native.clearSnapshot.mockReset().mockResolvedValue()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(), drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test')
})

describe('widget snapshot ownership', () => {
  it('does not invoke native APIs on web or old shells', async () => {
    const widget = await import('../../app/lib/terraWidget')
    native.enabled = false
    widget.setWidgetOwner('A')
    expect(await widget.saveWidgetCanvas(document.createElement('canvas'), widget.widgetEpoch())).toBe(false)
    native.enabled = true
    native.available = false
    widget.setWidgetOwner('A')
    expect(await widget.saveWidgetCanvas(document.createElement('canvas'), widget.widgetEpoch())).toBe(false)
    expect(native.clearSnapshot).not.toHaveBeenCalled()
    expect(native.saveSnapshot).not.toHaveBeenCalled()
  })

  it('drops a capture completed after logout or account switch', async () => {
    const widget = await import('../../app/lib/terraWidget')
    widget.setWidgetOwner('A')
    const oldEpoch = widget.widgetEpoch()
    widget.setWidgetOwner(null)
    widget.setWidgetOwner('B')
    expect(await widget.saveWidgetCanvas(document.createElement('canvas'), oldEpoch)).toBe(false)
    expect(await widget.saveWidgetCanvas(document.createElement('canvas'), widget.widgetEpoch())).toBe(true)
    expect(native.saveSnapshot).toHaveBeenCalledTimes(1)
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledTimes(1)
  })

  it('clears after an already dispatched save and before the next account writes', async () => {
    const widget = await import('../../app/lib/terraWidget')
    widget.setWidgetOwner('A')
    const events: string[] = []
    let finish!: () => void
    let started!: () => void
    const didStart = new Promise<void>(resolve => { started = resolve })
    native.saveSnapshot.mockImplementationOnce(() => {
      events.push('save A')
      started()
      return new Promise<void>(resolve => { finish = resolve })
    })
    const saving = widget.saveWidgetCanvas(document.createElement('canvas'), widget.widgetEpoch())
    await didStart
    native.clearSnapshot.mockImplementation(async () => { events.push('clear') })
    widget.setWidgetOwner('B')
    native.saveSnapshot.mockImplementation(async () => { events.push('save B') })
    const next = widget.saveWidgetCanvas(document.createElement('canvas'), widget.widgetEpoch())
    expect(events).toEqual(['save A'])
    finish()
    await saving
    await next
    expect(events).toEqual(['save A', 'clear', 'save B'])
  })

  it('recovers after a native write failure without rejecting the home flow', async () => {
    const widget = await import('../../app/lib/terraWidget')
    widget.setWidgetOwner('A')
    native.saveSnapshot.mockRejectedValueOnce(new Error('disk full'))
    expect(await widget.saveWidgetCanvas(document.createElement('canvas'), widget.widgetEpoch())).toBe(false)
    expect(await widget.saveWidgetCanvas(document.createElement('canvas'), widget.widgetEpoch())).toBe(true)
  })
})
