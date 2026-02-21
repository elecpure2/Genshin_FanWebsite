'use client'

import { Canvas } from '@react-three/fiber'
import { ReactNode } from 'react'
import tunnel from 'tunnel-rat'

// This tunnel allows us to inject 3D components from inside Next.js pages
// into the global Canvas that sits at the root level.
export const r3fTunnel = tunnel()

export function GlobalCanvas() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: true, alpha: true, stencil: true }} // 13차: CharacterCard 클리핑 마스크를 위해 stencil: true 필수
      >
        {/* Inject components passed into r3fTunnel.In from child pages */}
        <r3fTunnel.Out />
      </Canvas>
    </div>
  )
}
