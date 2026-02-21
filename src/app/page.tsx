'use client'

import { GateScene } from '@/components/canvas/GateScene'
import { r3fTunnel } from '@/components/canvas/GlobalCanvas'
import { PostProcessingEffects } from '@/components/canvas/PostProcessingEffects'
import { useAppStore } from '@/store/useAppStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function GatePage() {
  const router = useRouter()
  const setCurrentScene = useAppStore((state) => state.setCurrentScene)
  const isTransitioning = useAppStore((state) => state.isTransitioning)
  const setIsTransitioning = useAppStore((state) => state.setIsTransitioning)

  const introState = useAppStore((state) => state.introState)
  const setIntroState = useAppStore((state) => state.setIntroState)

  const gateSceneRef = useRef(null)

  useEffect(() => {
    setCurrentScene('gate')
    setIsTransitioning(false)
  }, [setCurrentScene, setIsTransitioning])

  const handleStartIntro = () => {
    if (introState !== 'pending') return

    // BGM 재생은 이제 GlobalAudio.tsx가 introState 변화를 감지하여 전역으로 자동 시작합니다.
    setIntroState('playing')

    // After the intro animation completes
    setTimeout(() => {
      setIntroState('done')
    }, 3500)
  }

  const handleEnterClick = () => {
    setIsTransitioning(true)

    // 별 클릭 오디오 재생 (볼륨 30%)
    const sfx = new Audio('/sfx/Enter.wav')
    sfx.volume = 0.3
    sfx.play().catch(e => console.warn('Audio play blocked:', e))

    // 1초 동안 글로벌 오버레이가 완전히 화면을 덮은 직후(1.1초)에 페이지를 이동시킵니다.
    setTimeout(() => {
      router.push('/lobby')
    }, 1100)
  }

  // 별이 부서지는 효과를 위한 파편(조각) 데이터 배열 생성
  const starShards = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2
    const distance = Math.random() * 150 + 100
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: Math.random() * 720 - 360,
      scale: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 0.1
    }
  })

  return (
    <>
      {/* 3D Scene Injection for Gate */}
      <r3fTunnel.In>
        <GateScene ref={gateSceneRef} />
        <PostProcessingEffects />
      </r3fTunnel.In>

      {/* DOM UI for Gate */}
      <div className="flex h-screen w-full flex-col items-center justify-center pointer-events-auto">

        {/* Initial White Screen Overlay */}
        <AnimatePresence>
          {introState === 'pending' && (
            <motion.div
              key="intro-overlay"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-white"
            >
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="font-serif text-gray-500 tracking-[0.4em] text-sm md:text-base uppercase cursor-pointer py-4 px-8"
                onClick={handleStartIntro}
              >
                Click here
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enter Button (Shows after intro is done) */}
        <AnimatePresence>
          {introState === 'done' && !isTransitioning && (
            <motion.div
              key="ui-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="flex flex-col items-center text-center px-4 z-10"
            >
              <motion.button
                onClick={handleEnterClick}
                className="group relative outline-none border-none bg-transparent flex items-center justify-center p-8 cursor-pointer"
              >
                <div className="relative flex items-center justify-center w-24 h-24">
                  {/* 중앙의 큼직한 메인 별 아이콘 (Pulsing 효과) */}
                  <motion.svg
                    animate={{ scale: [1, 1.15, 1], filter: ['drop-shadow(0 0 10px rgba(255,255,255,0.4))', 'drop-shadow(0 0 25px rgba(255,255,255,0.9))', 'drop-shadow(0 0 10px rgba(255,255,255,0.4))'] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    exit={{ opacity: 0, scale: 0, transition: { duration: 0.3 } }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-16 h-16 text-white/90 group-hover:text-white transition-colors duration-500 z-10"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </motion.svg>
                </div>
              </motion.button>

              <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 1.5 }}
                  className="flex items-center gap-4 text-white/40 font-serif text-xs md:text-sm tracking-widest"
                >
                  <div className="w-12 h-[1px] bg-white/30"></div>
                  <span>별을 클릭해서 이동</span>
                  <div className="w-12 h-[1px] bg-white/30"></div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* 17차: 클릭 시 산산조각 나면서 사방으로 흩어지는 별 파편들 (버튼 외부에 두어 안정적으로 출력되게 함) */}
          {introState === 'done' && isTransitioning && (
            <motion.div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              {starShards.map((shard, i) => (
                <motion.svg
                  key={`shard-${i}`}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                  animate={{
                    opacity: 0,
                    x: shard.x,
                    y: shard.y,
                    scale: shard.scale,
                    rotate: shard.rotate,
                  }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: shard.delay }}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="absolute w-8 h-8 text-white/80"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))' }}
                >
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </motion.svg>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* GlobalTransitionOverlay가 Layout 단에서 전체 화면을 덮어주므로, 
            로컬 트랜지션 덮개는 이제 필요 없습니다. */}
      </div>
    </>
  )
}
