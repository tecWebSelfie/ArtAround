'use client'

import { Component, type ReactNode } from 'react'

/**
 * Shows `fallback` instead of `children` once they throw while rendering or
 * in an effect. Used around 3D canvases (`MapViewer`, `ModelViewer`): a
 * device without WebGL, or a broken model, makes three.js throw while the
 * canvas mounts, and without a boundary that error takes down the whole page
 * ("Application error") instead of just the canvas.
 */
export class RenderErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
