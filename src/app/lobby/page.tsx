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

      {/* DOM UI for Lobby */}
      <div className="fixed inset-0 flex flex-col items-center justify-end pb-24 pointer-events-none z-30">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.5 }}
          className="flex items-center gap-4 text-white/60 font-serif text-xs md:text-sm tracking-widest"
        >
          <div className="w-16 h-[1px] bg-white/30"></div>
          <span>원하는 캐릭터를 선택하세요</span>
          <div className="w-16 h-[1px] bg-white/30"></div>
        </motion.div>
      </div>
    </>
  )
}
