'use client'

import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'

export function LobbyCamera({ activeCard }: { activeCard?: string | null }) {
  const { scrollOffset, setScrollOffset } = useAppStore()
  const targetOffset = useRef(scrollOffset)
  const currentLookAt = useRef(new THREE.Vector3(0, 2, -15))

  const activeCardRef = useRef(activeCard)
  useEffect(() => {
    activeCardRef.current = activeCard
  }, [activeCard])

  // 전역 스크롤/터치 이벤트 가로채기
  useEffect(() => {
    let currentTarget = targetOffset.current

    const handleWheel = (e: WheelEvent) => {
      if (activeCardRef.current) return // 줌인 상태에선 스크롤 잠금
      // pointer-events: auto인 곳에서만 휠 스크롤 막기
      if (document.body.style.cursor !== 'pointer') {
        // e.preventDefault()
      }

      // 스크롤 감도 조절
      currentTarget += e.deltaY * 0.01

      // 두 카드를 오갈 수 있게 범위 축소 (1.8로 제한하여 끝까지 스크롤 시 화면 중앙에 양쪽 카드가 대칭으로 남게 끔 설정)
      currentTarget = THREE.MathUtils.clamp(currentTarget, 0, 1.8)

      targetOffset.current = currentTarget
      setScrollOffset(currentTarget)
    }

    let touchStartY = 0
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }
    const handleTouchMove = (e: TouchEvent) => {
      // e.preventDefault()
      if (activeCardRef.current) return // 줌인 상태에선 스크롤 잠금
      const deltaY = touchStartY - e.touches[0].clientY
      currentTarget += deltaY * 0.02
      currentTarget = THREE.MathUtils.clamp(currentTarget, 0, 1.8)
      targetOffset.current = currentTarget
      setScrollOffset(currentTarget)
      touchStartY = e.touches[0].clientY
    }

    // passive: true 로 변경하여 브라우저 기본 스크롤 성능 향상 및 클릭 이벤트 간섭 최소화
    // canvas 래퍼에 z-index를 보장하여 클릭 가능하도록 유도
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [setScrollOffset])

  useFrame((state, delta) => {
    const targetPos = new THREE.Vector3()
    const targetLookAt = new THREE.Vector3()

    if (activeCard === 'furina') {
      // 카드([-5, 0.5, -12]) + 텍스트([2, 0.5, -15])의 중간점으로 카메라 이동
      targetPos.set(-1.5, 0.5, -6)
      targetLookAt.set(-1.5, 0.5, -13.5)
    } else if (activeCard === 'nahida') {
      // 카드([6, 2, -15]) + 텍스트([13, 2, -18])의 중간점으로 카메라 이동
      targetPos.set(9.5, 2, -9)
      targetLookAt.set(9.5, 2, -16.5)
    } else {
      // 목표 카메라 위치 계산 (거울들을 따라 좌우/앞뒤로 이동하는 패닝)
      const t = targetOffset.current * 4 - 6
      targetPos.set(t, 2, -5 + Math.sin(t * 0.2) * 2)
      targetLookAt.set(t, 2, -15)
    }

    // 부드러운 위치/시선 이동
    state.camera.position.lerp(targetPos, delta * 4)
    currentLookAt.current.lerp(targetLookAt, delta * 4)
    state.camera.lookAt(currentLookAt.current)
  })

  return null
}
