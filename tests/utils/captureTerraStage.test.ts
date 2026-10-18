// commit-checker:file-lang=english
// @vitest-environment node
import { expect, it } from 'vitest'
import { Window } from 'happy-dom'
import { captureTerraStage, invalidateTerraCapture, prepareTerraCaptureClone } from '../../app/lib/captureTerraStage'

// Exercise the real renderer's missing-document failure without mocking its dynamic import.
it('coalesces an in-flight capture and permits retry after render failure', async () => {
  const detached = {} as HTMLElement
  const first = captureTerraStage(detached)
  expect(captureTerraStage(detached)).toBe(first)
  await expect(first).rejects.toThrow('Element is not attached to a Document')
  const retry = captureTerraStage(detached)
  expect(retry).not.toBe(first)
  await expect(retry).rejects.toThrow('Element is not attached to a Document')
})

it('keeps transparent stories separate and invalidates captures when the scene changes', async () => {
  const detached = {} as HTMLElement
  const old = captureTerraStage(detached)
  const story = captureTerraStage(detached, null)
  expect(story).not.toBe(old)
  invalidateTerraCapture(detached)
  const next = captureTerraStage(detached)
  expect(next).not.toBe(old)
  const results = await Promise.allSettled([old, story, next])
  expect(results.map(result => result.status)).toEqual(['rejected', 'rejected', 'rejected'])
  const retry = captureTerraStage(detached)
  expect(retry).not.toBe(next)
  await expect(retry).rejects.toThrow('Element is not attached to a Document')
})

it('separates widget captures from shared captures while coalescing identical options', async () => {
  const detached = {} as HTMLElement
  const shared = captureTerraStage(detached)
  const widget = captureTerraStage(detached, undefined, { fitBackdrop: true })
  const story = captureTerraStage(detached, null)
  expect(widget).not.toBe(shared)
  expect(widget).not.toBe(story)
  expect(captureTerraStage(detached, undefined, { fitBackdrop: true })).toBe(widget)
  expect(captureTerraStage(detached, undefined, { fitBackdrop: false })).toBe(shared)
  const results = await Promise.allSettled([shared, widget, story])
  expect(results.map(result => result.status)).toEqual(['rejected', 'rejected', 'rejected'])
  const retry = captureTerraStage(detached, undefined, { fitBackdrop: true })
  expect(retry).not.toBe(widget)
  await expect(retry).rejects.toThrow('Element is not attached to a Document')
})

it('fits only the widget clone backdrop and preserves its background item image', () => {
  const window = new Window()
  const doc = window.document as unknown as Document
  doc.body.innerHTML = `
    <div id="my-terra-container">
      <div style="width: 400px; height: 552px; transform: scale(0.44); margin-bottom: -309px">
        <div data-testid="home-jar-backdrop" style="width: 197.7%; aspect-ratio: 1; background: radial-gradient(circle, rgba(81,140,219,0.2) 0%, #FFFFFF 100%)">
          <img src="https://example.com/background.webp" style="opacity: 0.85; mask-image: radial-gradient(circle, #000 60%, transparent 72%)">
        </div>
      </div>
    </div>`
  const stage = doc.getElementById('my-terra-container')!.firstElementChild as HTMLElement
  const backdrop = stage.querySelector<HTMLElement>('[data-testid="home-jar-backdrop"]')!
  const originalBackdrop = backdrop.outerHTML
  const originalAspectRatio = backdrop.style.aspectRatio
  const originalImage = backdrop.firstElementChild!
  const originalImageHtml = originalImage.outerHTML

  // Shared and story captures keep the existing backdrop styling.
  prepareTerraCaptureClone(doc)
  expect(stage.style.transform).toBe('scale(1)')
  expect(stage.style.marginBottom).toBe('0px')
  expect(backdrop.outerHTML).toBe(originalBackdrop)
  prepareTerraCaptureClone(doc, { fitBackdrop: false })
  expect(backdrop.outerHTML).toBe(originalBackdrop)

  prepareTerraCaptureClone(doc, { fitBackdrop: true })
  expect(stage.style.width).toBe('400px')
  expect(backdrop.style.width).toBe('100%')
  expect(backdrop.style.aspectRatio).toBe(originalAspectRatio)
  expect(backdrop.style.background.replace(/\s/g, '')).toMatch(/rgba\(\d+,\d+,\d+,0\)100%\)$/)
  expect(backdrop.style.background.toUpperCase()).not.toContain('#FFFFFF')
  expect(backdrop.firstElementChild).toBe(originalImage)
  expect(originalImage.outerHTML).toBe(originalImageHtml)
})
