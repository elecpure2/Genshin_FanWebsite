'use client'

import { r3fTunnel } from '@/components/canvas/GlobalCanvas'
import { LobbyScene } from '@/components/canvas/LobbyScene'
import { PostProcessingEffects } from '@/components/canvas/PostProcessingEffects'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function LobbyPage() {
  const setCurrentScene = useAppStore((state) => state.setCurrentScene)
  const setIsTransitioning = useAppStore((state) => state.setIsTransitioning)

  useEffect(() => {
    setCurrentScene('lobby')

    const transitionTimer = setTimeout(() => {
      setIsTransitioning(false)
    }, 50)

    return () => {
      clearTimeout(transitionTimer)
    }
  }, [setCurrentScene, setIsTransitioning])

  return (
    <>
      {/* 글로벌 트랜지션 오버레이(Layout)가 로드 후 부드럽게 걷혀주므로 로컬 오버레이는 제거 */}

      {/* R3F Scene Injection */}
      <r3fTunnel.In>
        <LobbyScene />
        <PostProcessingEffects />
      </r3fTunnel.In>
    </>
  )
}
