'use client'

import { Clouds, Cloud, Environment, useTexture, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { CharacterCard } from './CharacterCard'
import { LobbyCamera } from './LobbyCamera'
import { useRouter } from 'next/navigation'
import { HangingForest } from './HangingForest'
import { useAppStore } from '@/store/useAppStore'

// ─── Gradient Background (단색 보라를 대체하는 우주/심해 다크 그라데이션) ───
function GradientBackground() {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        colorTop: { value: new THREE.Color('#ffffff') },       // 화이트
        colorBottom: { value: new THREE.Color('#d4c4f9') }    // 화사하고 밝은 파스텔 라벤더
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        varying vec3 vWorldPosition;
        void main() {
          // -30부터 30까지 y축을 0~1로 정규화하여 매우 부드러운 그라데이션 생성
          float h = normalize(vWorldPosition).y; 
          vec3 bgCol = mix(colorBottom, colorTop, max(pow(max(h + 0.3, 0.0), 1.2), 0.0));
          gl_FragColor = vec4(bgCol, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false, // 배경이므로 다른 모든 물체보다 항상 뒤에 렌더링
    })
  }, [])

  return (
    <mesh ref={meshRef}>
      {/* 씬 전체를 덮는 구체 (카메라는 구 안에 위치) */}
      <sphereGeometry args={[100, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ─── Stylized StarDust (서브컬처/애니메이션풍 둥글고 뽀샤시한 빛무리) ───
function StylizedStarDust() {
  const count = 150
  const pointsRef = useRef<THREE.Points>(null)

  const [particleData] = useState(() => {
    const pos = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60
      pos[i * 3 + 2] = (Math.random() - 0.5) * 70 - 15
      phases[i] = Math.random() * Math.PI * 2
      sizes[i] = Math.random() * 2.0 + 1.0 // 기존보다 큼직한 빛무리
    }
    return { pos, phases, sizes }
  })

  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#ffebb3') }, // 파스텔 옐로우 오렌지
        uColor2: { value: new THREE.Color('#e0b3ff') }, // 핑크 퍼플
      },
      vertexShader: `
        attribute float phase;
        attribute float aSize;
        varying float vPhase;
        void main() {
          vPhase = phase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 40.0 * (1.0 / -mvPosition.z); // 스크린 감쇠를 약하게 하여 큼직하게 유지
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        varying float vPhase;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float dist = length(p);
          
          // 동그랗고 선명한 툰 마법 빛무리 텍스처
          if (dist > 0.5) discard;
          
          // 중심은 밝고 테두리는 뽀샤시하게
          float glow = smoothstep(0.5, 0.0, dist);
          // 천천히 숨쉬는 듯한 투명도
          float twinkle = (sin(uTime * 1.0 + vPhase) + 1.2) * 0.4;
          vec3 color = mix(uColor1, uColor2, sin(vPhase) * 0.5 + 0.5);
          
          gl_FragColor = vec4(color, glow * twinkle);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // 빛 번짐 효과 강화
    })
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      // 아주 천천히 중력을 거슬러 위로 떠오르며 좌우로 살살 흔들림
      positions[i * 3 + 1] += delta * (0.5 + Math.sin(particleData.phases[i]) * 0.2)
      positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.5 + particleData.phases[i]) * delta * 0.3

      // 천장을 넘으면 바닥으로 초기화
      if (positions[i * 3 + 1] > 30) {
        positions[i * 3 + 1] = -30
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particleData.pos} itemSize={3} args={[particleData.pos, 3]} />
        <bufferAttribute attach="attributes-phase" count={count} array={particleData.phases} itemSize={1} args={[particleData.phases, 1]} />
        <bufferAttribute attach="attributes-aSize" count={count} array={particleData.sizes} itemSize={1} args={[particleData.sizes, 1]} />
      </bufferGeometry>
      <primitive object={materialParams} attach="material" />
    </points>
  )
}


// ─── Animated Sparkle Background (14차: 기존의 투박한 거대 라인 SVG 일러스트를 작고 귀여운 원소 빛망울(오브젝트)로 교체) ───
function AnimatedSparkleBackground() {
  const hydroRef = useRef<THREE.InstancedMesh>(null)
  const dendroRef = useRef<THREE.InstancedMesh>(null)

  const hydroCount = 40
  const dendroCount = 40

  const dummy = useMemo(() => new THREE.Object3D(), [])

  // 빛망울 물리 파라미터 저장 (23차: 크기 축소, xy 범위 대폭 확장, 밀도 완화)
  const particles = useMemo(() => {
    const list = []
    for (let i = 0; i < hydroCount + dendroCount; i++) {
      list.push({
        x: (Math.random() - 0.5) * 200, // 80 -> 200으로 가로 범위 2.5배 확장
        y: (Math.random() - 0.5) * 120, // 60 -> 120으로 세로 범위 2배 확장
        z: (Math.random() - 0.5) * 40 - 20, // Z축(깊이) 분포도 20 -> 40으로 여유 부여
        speedY: Math.random() * 0.4 + 0.1,  // 속도 소폭 완화
        speedX: (Math.random() - 0.5) * 0.15,
        scale: Math.random() * 0.4 + 0.15 // 0.6+0.2 -> 0.4+0.15 크기를 전체적으로 작게 변경
      })
    }
    return list
  }, [hydroCount, dendroCount])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    // Hydro particles (스카이블루 물 입자가 떠오름)
    if (hydroRef.current) {
      for (let i = 0; i < hydroCount; i++) {
        const p = particles[i]
        p.y += p.speedY * delta * 5
        p.x += p.speedX * delta * 5 + Math.sin(time + i) * 0.01

        // 위로 모두 날아가면 바닥에서 리스폰 (범위에 맞춰 리스폰 높이도 60으로 하향)
        if (p.y > 60) p.y = -60

        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(p.scale * (Math.sin(time * 2 + i) * 0.2 + 0.8))
        dummy.updateMatrix()
        hydroRef.current.setMatrixAt(i, dummy.matrix)
      }
      hydroRef.current.instanceMatrix.needsUpdate = true
    }

    // Dendro particles (연두색 풀 입자가 떠오름)
    if (dendroRef.current) {
      for (let i = 0; i < dendroCount; i++) {
        const idx = i + hydroCount
        const p = particles[idx]
        p.y += p.speedY * delta * 5
        p.x += p.speedX * delta * 5 + Math.cos(time + i) * 0.01

        if (p.y > 60) p.y = -60

        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(p.scale * (Math.sin(time * 2 + i) * 0.2 + 0.8))
        dummy.updateMatrix()
        dendroRef.current.setMatrixAt(i, dummy.matrix)
      }
      dendroRef.current.instanceMatrix.needsUpdate = true
    }
  })

  // 반짝거리고 영롱하게 빛나는 수정(IcosahedronGeometry) 재질
  return (
    <group position={[0, 0, -30]}>
      <instancedMesh ref={hydroRef} args={[undefined, undefined, hydroCount]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#b3d9ff" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </instancedMesh>
      <instancedMesh ref={dendroRef} args={[undefined, undefined, dendroCount]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ccffcc" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    </group>
  )
}


// ─── Main Lobby Scene ───
export function LobbyScene() {
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const router = useRouter()
  const bgLightRef = useRef<THREE.PointLight>(null)

  const { setTransitionType, setTransitionState, setGlobalVolume } = useAppStore()

  useFrame((state, delta) => {
    if (bgLightRef.current) {
      // 파스텔 톤에 어울리는 아주 약하고 화사한 간접광 (어두운 조명 제거)
      const targetColor = new THREE.Color(
        activeCard === 'furina'
          ? '#e6f2ff' // 밝은 소라색/스카이블루
          : activeCard === 'nahida'
            ? '#f2ffe6' // 밝은 연두/라임
            : '#ffffff' // 기본은 깨끗한 화이트오라
      )
      bgLightRef.current.color.lerp(targetColor, delta * 3)
      bgLightRef.current.intensity = THREE.MathUtils.lerp(bgLightRef.current.intensity, activeCard ? 1.5 : 0.5, delta * 3)
    }
  })

  const handleCardClick = (character: 'furina' | 'nahida') => {
    // 18차: 1st Click (Focus) - 카드가 선택되지 않은 상태라면 중앙으로 가져오기만 함
    if (activeCard !== character) {
      // 25차: 카메라 줌인 오디오 효과 적용 (첫 클릭 시)
      const sweepAudio = new Audio('/sfx/Sweep.wav')
      sweepAudio.volume = 0.5
      sweepAudio.play().catch(e => console.error("Sweep.wav play failed:", e))

      setActiveCard(character)
      return // 여기서 종료 (포커스 유지)
    }

    // 18차: 2nd Click (Transition & Routing) - 이미 중앙에 있는 카드를 한 번 더 눌렀을 때
    // 선택된 캐릭터에 맞춘 전환(Transition) 타입 설정
    setTransitionType(character === 'furina' ? 'water' : 'leaf')
    // 화면 덮기 애니메이션 발동
    setTransitionState('in')

    // 오디오 서서히 줄이기 (BGM, WindChime 모두 GlobalAudio에서 처리될 수 있도록 0 세팅)
    setGlobalVolume(0)

    // 30차: 셰이더 트랜지션이 화면을 완전히 덮을 때까지 충분한 시간 대기 (2.0초)
    // -> GlobalTransition.tsx의 useFrame lerp 속도로 화면이 꽉 찬 뒤 라우팅 진행
    setTimeout(() => {
      router.push(`/character/${character}`)
    }, 2000)
  }

  return (
    <>
      {/* 11차: 셰이더/보석의 회색 현상 완전 해결 (HDRI 환경광을 주입해 영롱하게 빛과 색을 반사시킴) */}
      <Environment preset="sunset" />

      {/* 11차: 파스텔 라벤더 그라데이션 배경 */}
      <GradientBackground />
      {/* 공기 원근감을 위한 파스텔 포그 */}
      <fog attach="fog" args={['#d4c4f9', 20, 80]} />

      {/* 13차: 텍스트 타이포그래피 완전히 삭제함 */}

      {/* 14차: 못생긴 큰 패턴 SVG 버리고 아기자기한 작은 정20면체 수정 파티클 요소들 추가 */}
      <AnimatedSparkleBackground />

      {/* 22차: 빈 공간(배경) 클릭 시 카드 선택 해제 및 카메라 줌아웃을 위한 투명 Mesh */}
      <mesh
        position={[0, 0, -35]}
        onClick={(e) => {
          if (activeCard) {
            e.stopPropagation()
            // 25차: 카메라 줌아웃(캐릭터 카드 해제) 오디오 효과 적용
            const sweepAudio = new Audio('/sfx/Sweep.wav')
            sweepAudio.volume = 0.5
            sweepAudio.play().catch(e => console.error("Sweep.wav play failed:", e))

            setActiveCard(null)
          }
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <LobbyCamera activeCard={activeCard} />

      {/* Dynamic Morphing Light - Provides ambient character color wash */}
      <pointLight ref={bgLightRef} position={[0, 10, -10]} distance={80} intensity={1} color="#ffffff" />

      {/* Bright, angelic ambient lighting (전반적인 톤을 올려 어둡지 않게) */}
      <ambientLight intensity={0.8} color="#ffffff" />

      {/* 부드러운 전면-측면 광원 (카툰 셰이딩의 하이라이트를 선명하게 그림) */}
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#fff1e6" castShadow />

      {/* 뒷쪽에서 오는 신비로운 보라빛 반사광 (툰 셰이딩의 그림자 영역을 우아하게 채움) */}
      <directionalLight position={[-15, -10, -15]} intensity={0.8} color="#cc99ff" />

      {/* ─── Stylized Stardust & Atmosphere ─── */}
      <StylizedStarDust />

      {/* ─── Hanging Forest Art Installation (Vector Style) ─── */}
      {/* 14차: 밀도를 150에서 250으로 극대화하여 훨씬 더 촘촘하고 예쁜 모빌 숲 조성 */}
      <HangingForest count={250} areaSize={50} />

      {/* Character Cards */}
      {/* 카드 위치는 사용자가 숲 한가운데 벤치에 앉아 바라보는 듯한 느낌으로 고정 */}
      <CharacterCard
        position={[-5, 0.5, -12]}
        rotation={[0, 0.2, 0]}
        character="furina"
        index={0}
        onCardClick={handleCardClick}
        activeCard={activeCard}
      />
      <CharacterCard
        position={[6, 2, -15]}
        rotation={[0, -0.2, 0]}
        character="nahida"
        index={1}
        onCardClick={handleCardClick}
        activeCard={activeCard}
      />
    </>
  )
}
