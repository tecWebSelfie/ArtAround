import { Gltf } from '@react-three/drei'
import { z } from 'zod'
import { ExhibitNode } from '../ExhibitNode'

export default function ExhibitRenderer({ node }: { node: z.infer<typeof ExhibitNode> }) {
  return (
    <group position={node.position}>
      <Gltf src="/models/exhibit.glb" />
    </group>
  )
}
