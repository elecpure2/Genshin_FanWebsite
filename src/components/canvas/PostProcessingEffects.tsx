import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { forwardRef } from 'react'

export const PostProcessingEffects = forwardRef<any>((_props, _ref) => {
  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.88}
        mipmapBlur
        intensity={0.4}
        radius={0.5}
      />
      <Vignette eskil={false} offset={0.1} darkness={0.3} />
    </EffectComposer>
  )
})

PostProcessingEffects.displayName = 'PostProcessingEffects'
