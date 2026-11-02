'use client'

import { Center as MantineCenter, Loader, Text } from '@mantine/core'
import {
  CameraControls,
  Center,
  ContactShadows,
  useGLTF,
  type CameraControlsImpl,
} from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Box3, type Group } from 'three'

/**
 * An object's 3D model in a card: React Three Fiber with drei, loaded only
 * when the visitor asks for it (`DetailCover` imports this file with
 * `React.lazy`), so three.js never ships to visitors who stay on the photo.
 * (`next/dynamic` sent the dev server into a reload loop with this module.)
 *
 * - `CameraControls`: one finger (or the mouse) orbits, two fingers pinch to
 *   zoom, the wheel zooms; motion is damped, distance and the lower polar
 *   angle are capped so the camera can't dive under the model.
 * - The model is centred and fitted to the view once loaded (`fitToBox`),
 *   whatever its scale or origin.
 * - `frameloop="demand"`: frames render only while something moves.
 * - A neutral gradient "stage" behind the canvas and a contact shadow set
 *   the object apart from the page; plain lights, no HDR environment, so
 *   nothing is fetched besides the GLB.
 * - No WebGL, or a broken file: `unavailable` is shown instead of a crash.
 */
export function ModelViewer({
  url,
  label,
  unavailable,
}: {
  url: string
  /** Accessible name of the canvas, e.g. "3D model of …". */
  label: string
  /** Shown when the device can't draw WebGL or the model fails to load. */
  unavailable: ReactNode
}) {
  const [loaded, setLoaded] = useState(false)
  // Probed once per viewer, not on every render (each probe is a context).
  const [webgl] = useState(hasWebGL)
  if (!webgl) return <Unavailable>{unavailable}</Unavailable>
  return (
    <ModelErrorBoundary fallback={<Unavailable>{unavailable}</Unavailable>}>
      {/* The canvas is a separate React renderer without the app's providers,
          so Mantine UI (the spinner) stays outside it, over the canvas. */}
      {!loaded && (
        <MantineCenter pos="absolute" inset={0} className="pointer-events-none">
          <Loader size="sm" />
        </MantineCenter>
      )}
      {/* The stage: a neutral gradient behind the transparent canvas, so the
          object stands out from the page in both color schemes. */}
      <Canvas
        className="bg-[radial-gradient(circle_at_50%_35%,var(--mantine-color-gray-0),var(--mantine-color-gray-3))] dark:bg-[radial-gradient(circle_at_50%_35%,var(--mantine-color-dark-5),var(--mantine-color-dark-8))]"
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 0.6, 3], fov: 40 }}
        aria-label={label}
        role="img"
      >
        <hemisphereLight args={['#ffffff', '#8a8a8a', 1.6]} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <directionalLight position={[-4, 2, -3]} intensity={0.8} />
        <Suspense fallback={null}>
          <Model url={url} onLoaded={setLoaded} />
        </Suspense>
        {/* A soft contact shadow grounds the object on the stage. */}
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={10} blur={2.5} far={4} />
        <CameraControls
          makeDefault
          smoothTime={0.2}
          minDistance={0.5}
          maxDistance={8}
          maxPolarAngle={Math.PI * 0.55}
          // Two fingers zoom; panning would lose the object off-screen.
          dollyToCursor={false}
        />
      </Canvas>
    </ModelErrorBoundary>
  )
}

/** The GLB, centred, with the camera fitted to it once it is in. */
function Model({ url, onLoaded }: { url: string; onLoaded: (loaded: true) => void }) {
  const { scene } = useGLTF(url)
  // Free the parsed model (geometry, textures) once the viewer closes.
  useEffect(() => () => useGLTF.clear(url), [url])
  const group = useRef<Group>(null)
  const controls = useThree((state) => state.controls) as CameraControlsImpl | null
  const invalidate = useThree((state) => state.invalidate)
  // Refit when the card's size settles or changes (the aspect drives the fit).
  const { width, height } = useThree((state) => state.size)
  useEffect(() => onLoaded(true), [onLoaded, scene])
  useEffect(() => {
    if (group.current && controls) {
      // `precise`: skinned and nested models report loose geometry bounds,
      // which framed only part of them.
      const box = new Box3().setFromObject(group.current, true)
      void controls.fitToBox(box, false, {
        paddingTop: 0.2,
        paddingBottom: 0.2,
        paddingLeft: 0.2,
        paddingRight: 0.2,
      })
      // On-demand frameloop: draw the fitted view now, not on the next drag.
      invalidate()
    }
  }, [controls, invalidate, scene, width, height])
  return (
    // `top`: the model stands on y = 0, where the contact shadow lies.
    <Center top>
      <group ref={group}>
        <primitive object={scene} />
      </group>
    </Center>
  )
}

function Unavailable({ children }: { children: ReactNode }) {
  return (
    <MantineCenter h="100%" p="md">
      <Text size="sm" c="dimmed" ta="center">
        {children}
      </Text>
    </MantineCenter>
  )
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    // Release the probe at once: browsers cap the live WebGL contexts.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return Boolean(gl)
  } catch {
    return false
  }
}

/** A failed GLB fetch or parse throws during render: catch it here. */
class ModelErrorBoundary extends Component<
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
