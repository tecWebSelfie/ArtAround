import { Gltf } from '@react-three/drei'
import { z } from 'zod'
import { EXHIBIT_EDITOR_HEIGHT, EXHIBIT_EDITOR_WIDTH, ExhibitNode } from '../ExhibitNode'

export default function ExhibitRenderer({ node }: { node: z.infer<typeof ExhibitNode> }) {
  return (
    <group
      position={node.position}
      scale={[EXHIBIT_EDITOR_WIDTH, EXHIBIT_EDITOR_HEIGHT, EXHIBIT_EDITOR_WIDTH]}
    >
      <Gltf src="/models/exhibit.glb" />
    </group>
  )
}
