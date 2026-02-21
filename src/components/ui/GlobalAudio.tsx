'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

export function GlobalAudio() {
    const audioRef = useRef<HTMLAudioElement>(null)
    const windChimeRef = useRef<HTMLAudioElement>(null)

    // Zustand States
    const introState = useAppStore((state) => state.introState)
    const currentScene = useAppStore((state) => state.currentScene)
    const globalVolume = useAppStore((state) => state.globalVolume)
    const isMuted = useAppStore((state) => state.isMuted)

    // 1. Intro "Click Here"를 눌러 BGM이 시작되는 순간 캐치
    useEffect(() => {
        if (introState === 'playing') {
            if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play().catch(e => console.log("Global Audio Autoplay prevented:", e))
            }
        }
    }, [introState])

    // 2. 메인 BGM 스무스 볼륨 페이드 아웃 (Lerp)
    useEffect(() => {
        let bgmFrameId: number
        const targetVolume = currentScene === 'character' ? 0 : globalVolume

        const lerpBGM = () => {
            if (!audioRef.current) return

            const currentVol = audioRef.current.volume
            const diff = targetVolume - currentVol

            if (Math.abs(diff) > 0.01) {
                audioRef.current.volume += diff * 0.05
                bgmFrameId = requestAnimationFrame(lerpBGM)
            } else {
                audioRef.current.volume = targetVolume
            }
        }

        // 페이드 시작
        bgmFrameId = requestAnimationFrame(lerpBGM)

        return () => cancelAnimationFrame(bgmFrameId)
    }, [currentScene, globalVolume])

    // 2-1. 윈드차임(WindChime) 전용 독립 제어 루프 (버그 수정: 완벽한 분리)
    useEffect(() => {
        let chimeFrameId: number

        // 씬이 로비이고, 전역 볼륨이 0이 아닐 때만 윈드차임 재생을 트리거
        if (currentScene === 'lobby' && globalVolume > 0) {
            if (windChimeRef.current && windChimeRef.current.paused) {
                windChimeRef.current.volume = 0 // 0에서 시작하여 스무스하게 페이드인
                windChimeRef.current.play().catch(e => console.log("Windchime play prevented:", e))
            }
        }

        const lerpChime = () => {
            if (!windChimeRef.current) return

            // 라우터가 아직 lobby에 머물러 있더라도, 트랜지션 진입 시점(globalVolume === 0)에는 즉각 0으로 목표 설정
            const targetChimeVol = (currentScene === 'lobby' && globalVolume > 0) ? 0.3 : 0
            const diff = targetChimeVol - windChimeRef.current.volume

            if (Math.abs(diff) > 0.01) {
                // BGM보다 살짝 더 빠르게(0.08) 꺼지게 반응속도 향상
                windChimeRef.current.volume += diff * 0.08
                chimeFrameId = requestAnimationFrame(lerpChime)
            } else {
                windChimeRef.current.volume = targetChimeVol
                // 완전히 목표 볼륨(0)에 도달하면 미디어 자체를 Pause 하여 오버랩 사운드 방지
                if (targetChimeVol === 0 && !windChimeRef.current.paused) {
                    windChimeRef.current.pause()
                }
            }
        }

        chimeFrameId = requestAnimationFrame(lerpChime)

        return () => cancelAnimationFrame(chimeFrameId)
    }, [currentScene, globalVolume])

    // 3. 음소거(Mute) 상태 동기화
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted
        }
        if (windChimeRef.current) {
            windChimeRef.current.muted = isMuted
        }
    }, [isMuted])

    return (
        <>
            {/* 
        DOM 트리 최상위(layout)에 마운트되어 라우트가 변경되어도 
        절대 Unmount 되지 않아 음악이 끊기지 않습니다. 
      */}
            <audio ref={audioRef} src="/bgm/Main.mp3" loop />
            <audio ref={windChimeRef} src="/sfx/WindChime.wav" loop />


        </>
    )
}
