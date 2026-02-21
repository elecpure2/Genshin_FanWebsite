'use client'

import { useAppStore } from '@/store/useAppStore'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function GlobalTransition() {
    const { transitionType, transitionState, setTransitionState } = useAppStore()

    // 35차: 화이트아웃 사운드 적용 (Gate -> Lobby 때의 가벼운 효과음 'Enter.wav' 재사용)
    useEffect(() => {
        if (transitionState === 'in') {
            const transitionAudio = new Audio('/sfx/Enter.wav')
            transitionAudio.volume = 0.3
            transitionAudio.play().catch(e => console.error("Enter.wav play failed:", e))
        }
    }, [transitionState])

    if (transitionType === 'none') return null

    // 35차: Gate -> Lobby 와 매우 흡사한 가장 미니멀한 화이트아웃(White Fade) 애니메이션 적용
    const fadeVariants: any = {
        initial: { opacity: 0 },
        in: {
            opacity: 1,
            transition: { duration: 1.0, ease: 'easeOut' }
        },
        out: {
            opacity: 0,
            transition: { duration: 1.0, ease: 'easeInOut' }
        }
    }

    return (
        <AnimatePresence>
            {(transitionState === 'in' || transitionState === 'out') && (
                <motion.div
                    key="global-transition"
                    variants={fadeVariants}
                    initial="initial"
                    animate={transitionState}
                    exit="out"
                    onAnimationComplete={(definition) => {
                        // 트랜지션 아웃(페이드)이 끝나면 무조건 상태를 idle로 풀어서 클릭/스크롤 렌더링 락 해제
                        if (definition === 'out') {
                            setTransitionState('idle')
                        }
                    }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        pointerEvents: 'auto', // 렌더링 중 뒤에 클릭 방지 방어막
                        zIndex: 99999,
                        backgroundColor: '#ffffff', // 화이트 스크린
                    }}
                />
            )}
        </AnimatePresence>
    )
}
