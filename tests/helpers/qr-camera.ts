import type { Page } from '@playwright/test'
import { toDataURL } from 'qrcode'

/**
 * Gives the page a synthetic camera showing a real QR code of `value`, so the
 * app's real scanner (decoder included) reads it: only the camera is faked.
 * Call before the page navigates (it is an init script).
 *
 * `captureStream` only emits a frame when the canvas changes: drawn once, the
 * stream can stay empty and the scanner never sees the code. Redrawing keeps
 * frames flowing, like a real camera.
 */
export async function showQrToCamera(page: Page, value: string) {
  const qr = await toDataURL(value, { width: 480, margin: 4 })
  await page.addInitScript((imageURL) => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 480
      const image = new Image()
      image.src = imageURL
      await image.decode()
      const context = canvas.getContext('2d')!
      const draw = () => context.drawImage(image, 0, 0)
      draw()
      setInterval(draw, 100)
      return canvas.captureStream(10)
    }
  }, qr)
}
