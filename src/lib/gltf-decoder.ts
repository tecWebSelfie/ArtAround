import { useGLTF } from '@react-three/drei'

// Configure before any GLTF preload or canvas mounts: compressed models use our installed Three decoder.
// The default Google-hosted Draco decoder cannot load offline or on a restricted cloud network.
useGLTF.setDecoderPath('/draco/')
