'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'

export default function CharacterPage() {
  const params = useParams()
  const characterId = params.id as string
  const { setTransitionState } = useAppStore()
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)

  useEffect(() => {
    // iframe 마운트 및 콘텐츠 로드가 끝났으면 덮여있던 시야를 엽니다(Unveil/Out)
    if (isIframeLoaded) {
      setTransitionState('out')
    }
  }, [isIframeLoaded, setTransitionState])

  return (
    <div className="fixed inset-0 w-full h-full bg-black z-0">
      <iframe
        src={`/character-page/index.html?id=${characterId}`}
        className="w-full h-full border-none"
        onLoad={() => setIsIframeLoaded(true)}
        title="Character Lounge"
      />
    </div>
  )
}
