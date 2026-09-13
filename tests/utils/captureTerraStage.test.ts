// commit-checker:file-lang=english
// @vitest-environment node
import { expect, it } from 'vitest'
import { captureTerraStage, invalidateTerraCapture } from '../../app/lib/captureTerraStage'

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
