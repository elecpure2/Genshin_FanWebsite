'use client'

import { Clouds, Cloud, Environment, useTexture, Text, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import React, { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useSpring, a } from '@react-spring/three'
import { CharacterCard } from './CharacterCard'
import { LobbyCamera } from './LobbyCamera'
import { useRouter } from 'next/navigation'
import { HangingForest } from './HangingForest'
import { useAppStore } from '@/store/useAppStore'

// ─── Image Background (미드저니 심연/우주 배경 이미지 맵핑) ───
function ImageBackground() {
  const texture = useTexture('/bg-lobby.png')
  texture.colorSpace = THREE.SRGBColorSpace

  return (
    <mesh>
      <sphereGeometry args={[120, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
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
      sizes[i] = Math.random() * 2.0 + 1.0
    }
    return { pos, phases, sizes }
  })

  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#88ccff') },
        uColor2: { value: new THREE.Color('#d4aaff') },
      },
      vertexShader: `
        attribute float phase;
        attribute float aSize;
        varying float vPhase;
        void main() {
          vPhase = phase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 40.0 * (1.0 / -mvPosition.z);
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
          if (dist > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, dist);
          float twinkle = (sin(uTime * 1.0 + vPhase) + 1.2) * 0.4;
          vec3 color = mix(uColor1, uColor2, sin(vPhase) * 0.5 + 0.5);
          gl_FragColor = vec4(color, glow * twinkle);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime

    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] += delta * (0.5 + Math.sin(particleData.phases[i]) * 0.2)
      positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.5 + particleData.phases[i]) * delta * 0.3
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

  const particles = useMemo(() => {
    const list = []
    for (let i = 0; i < hydroCount + dendroCount; i++) {
      list.push({
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 120,
        z: (Math.random() - 0.5) * 40 - 20,
        speedY: Math.random() * 0.4 + 0.1,
        speedX: (Math.random() - 0.5) * 0.15,
        scale: Math.random() * 0.4 + 0.15
      })
    }
    return list
  }, [hydroCount, dendroCount])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    if (hydroRef.current) {
      for (let i = 0; i < hydroCount; i++) {
        const p = particles[i]
        p.y += p.speedY * delta * 5
        p.x += p.speedX * delta * 5 + Math.sin(time + i) * 0.01
        if (p.y > 60) p.y = -60
        dummy.position.set(p.x, p.y, p.z)
        dummy.scale.setScalar(p.scale * (Math.sin(time * 2 + i) * 0.2 + 0.8))
        dummy.updateMatrix()
        hydroRef.current.setMatrixAt(i, dummy.matrix)
      }
      hydroRef.current.instanceMatrix.needsUpdate = true
    }

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


// ─── 진자 물리 상수 (HangingForest와 일관된 느낌) ───
const LETTER_DAMPING = 0.97
const LETTER_REST = 0.05
const LETTER_MAX_VEL = 0.015
const STRING_HEIGHT = 8
const STRING_OFFSET_X = 0.3
const STRING_WIDE_X = 0.42

// 글자별 줄 모드: 'center' = 가운데 1개, 'wide' = 양쪽 2개
const WIDE_CHARS = new Set(['N', 'H', 'U'])

// ─── Individual Particle Letter (단일 글자 파티클 + 매달린 줄 + 진자 물리) ───
function ParticleLetter({
  char,
  targetX,
  scatterX,
  scatterY,
  scatterZ,
  scatterRotX,
  scatterRotY,
  scatterRotZ,
  delay,
  active,
  mouseWorld,
  stringShift = 0,
  stringWiden = 0
}: any) {
  const textRef = useRef<any>(null)
  const glowRef = useRef<any>(null)
  const pivotRef = useRef<THREE.Group>(null)
  const innerRef = useRef<THREE.Group>(null)
  const leftLineRef = useRef<any>(null)
  const rightLineRef = useRef<any>(null)

  // 진자 물리 상태
  const swingAngle = useRef(0)
  const swingVel = useRef(0)
  const assembled = useRef(false)

  // 줄 투명도 + 위치 (useFrame에서 업데이트)
  const stringOpacity = useRef(0)
  const stringSlideY = useRef(15)

  // ── 텍스트 scatter/gather Spring ──
  const { progress } = useSpring({
    progress: active ? 1 : 0,
    config: { mass: 1, tension: active ? 150 : 80, friction: active ? 25 : 40 },
    delay: active ? delay * 1000 : 0,
    onChange: ({ value }) => {
      if (textRef.current) textRef.current.fillOpacity = value.progress
      if (glowRef.current) glowRef.current.fillOpacity = value.progress * 0.8
      assembled.current = value.progress > 0.95
    },
  })

  // ── 줄 독립 Spring (텍스트 scatter와 완전 분리) ──
  const { stringProgress } = useSpring({
    stringProgress: active ? 1 : 0,
    config: { tension: 100, friction: 30 },
    delay: active ? delay * 1000 + 200 : 0,
    onChange: ({ value }) => {
      stringSlideY.current = (1 - value.stringProgress) * 15
      stringOpacity.current = value.stringProgress * 0.3
    },
  })

  // 텍스트 scatter 위치 (targetX 기준 상대값)
  const posX = progress.to([0, 1], [scatterX - targetX, 0])
  const posY = progress.to([0, 1], [scatterY, 0])
  const posZ = progress.to([0, 1], [scatterZ, 0])
  const rotX = progress.to([0, 1], [scatterRotX, 0])
  const rotY = progress.to([0, 1], [scatterRotY, 0])
  const rotZ = progress.to([0, 1], [scatterRotZ, 0])

  // 글자별 줄 모드 결정
  const isWide = WIDE_CHARS.has(char)
  const offsetX = isWide ? STRING_WIDE_X : 0

  // 줄 포인트 (글자 뒤에 배치 z=-0.1, 하단은 글자 상단에 살짝 겹침)
  const sx = stringShift
  const sw = stringWiden
  const leftLine: [number, number, number][] = isWide
    ? [[-offsetX + 0.1 + sx - sw, STRING_HEIGHT, -0.1], [-offsetX + 0.1 + sx - sw, 0.5, -0.1]]
    : [[0.08 + sx, STRING_HEIGHT, -0.1], [0.08 + sx, 0.55, -0.1]]
  const rightLine: [number, number, number][] = isWide
    ? [[offsetX + sx + sw, STRING_HEIGHT, -0.1], [offsetX + sx + sw, 0.5, -0.1]]
    : [[0.08 + sx, STRING_HEIGHT, -0.1], [0.08 + sx, 0.55, -0.1]]

  // 진자 물리 + 줄 업데이트
  useFrame(() => {
    if (!pivotRef.current || !innerRef.current) return

    // 마우스 반발 (assembled 상태에서만)
    if (assembled.current && mouseWorld) {
      const worldPos = new THREE.Vector3()
      innerRef.current.getWorldPosition(worldPos)
      const dx = worldPos.x - mouseWorld.x
      const dy = worldPos.y - mouseWorld.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 2.5) {
        const force = (2.5 - dist) * 0.002
        const direction = dx > 0 ? 1 : -1
        swingVel.current += direction * force
      }
    }

    // 복원 + 감쇠
    swingVel.current -= swingAngle.current * LETTER_REST
    swingVel.current *= LETTER_DAMPING
    if (Math.abs(swingVel.current) > LETTER_MAX_VEL) {
      swingVel.current = Math.sign(swingVel.current) * LETTER_MAX_VEL
    }
    swingAngle.current += swingVel.current

    // 비활성 시 서서히 멈춤
    if (!assembled.current) {
      swingAngle.current *= 0.95
      swingVel.current *= 0.95
    }

    pivotRef.current.rotation.z = swingAngle.current

    // 줄 material 업데이트 (opacity + Y 슬라이드)
    if (leftLineRef.current) {
      leftLineRef.current.material.opacity = stringOpacity.current
      leftLineRef.current.position.y = stringSlideY.current
    }
    if (rightLineRef.current) {
      rightLineRef.current.material.opacity = stringOpacity.current
      rightLineRef.current.position.y = stringSlideY.current
    }
  })

  return (
    <group position={[targetX, 0, 0]}>
      <group ref={pivotRef} position={[0, STRING_HEIGHT, 0]}>
        <group ref={innerRef} position={[0, -STRING_HEIGHT, 0]}>

          {/* ── 줄: 독립 애니메이션, scatter 회전 NOT 추종 ── */}
          <Line ref={leftLineRef} points={leftLine} color="#ffeab8" lineWidth={1} transparent opacity={0} />
          {isWide && (
            <Line ref={rightLineRef} points={rightLine} color="#ffeab8" lineWidth={1} transparent opacity={0} />
          )}

          {/* ── 텍스트: scatter/gather 애니메이션 (줄과 분리) ── */}
          <a.group position-x={posX} position-y={posY} position-z={posZ}
            rotation-x={rotX} rotation-y={rotY} rotation-z={rotZ}>
            <Text
              ref={textRef}
              font="https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYo.ttf"
              fontSize={1.5}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.1}
              fillOpacity={0}
              material-transparent={true}
              material-depthWrite={false}
            >
              {char}
            </Text>

            <Text
              ref={glowRef}
              font="https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYo.ttf"
              fontSize={1.5}
              color="#88ccff"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.1}
              position={[0, 0, -0.05]}
              fillOpacity={0}
              material-transparent={true}
              material-depthWrite={false}
            >
              {char}
            </Text>
          </a.group>

        </group>
      </group>
    </group>
  )
}

// ─── Particle Shatter Text (캐릭터 선택 시 산산조각 났다가 모이는 3D 텍스트) ───
function ParticleText({ text, active, position }: { text: string, active: boolean, position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null)
  const { mouse } = useThree()
  const mouseWorld = useRef(new THREE.Vector3())

  const chars = text.split('')

  const charData = useMemo(() => {
    // 글자별 줄 X 미세 조정 (텍스트별 개별 튜닝)
    const shifts: Record<string, number[]> = {
      'NAHIDA': [0, -0.06, 0, 0, 0, 0],
    }
    const widens: Record<string, number[]> = {
      'NAHIDA': [0.04, 0, 0, 0, 0, 0],
    }
    const charShifts = shifts[text] || []
    const charWidens = widens[text] || []

    return chars.map((char, i) => ({
      char,
      scatterX: (Math.random() - 0.5) * 15,
      scatterY: (Math.random() - 0.5) * 15,
      scatterZ: (Math.random() - 0.5) * 15 - 5,
      scatterRotX: Math.random() * Math.PI * 4,
      scatterRotY: Math.random() * Math.PI * 4,
      scatterRotZ: Math.random() * Math.PI * 4,
      targetX: i * 1.5 - (chars.length * 1.5) / 2,
      delay: i * 0.05,
      stringShift: charShifts[i] || 0,
      stringWiden: charWidens[i] || 0
    }))
  }, [chars])

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.2

    // 카메라 unproject로 정확한 마우스-월드 좌표 계산 (Z-plane에 맞춤)
    const cam = state.camera
    const ndc = new THREE.Vector3(mouse.x, mouse.y, 0.5)
    ndc.unproject(cam)
    const dir = ndc.sub(cam.position).normalize()
    const t = (position[2] - cam.position.z) / dir.z
    mouseWorld.current.copy(cam.position).add(dir.clone().multiplyScalar(t))
  })

  return (
    <group ref={groupRef} position={position}>
      {charData.map((data, i) => (
        <ParticleLetter key={i} active={active} mouseWorld={mouseWorld.current} {...data} />
      ))}
    </group>
  )
}

// ─── Main Lobby Scene ───
export function LobbyScene() {
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const router = useRouter()
  const bgLightRef = useRef<THREE.PointLight>(null)
  const forestRef = useRef<THREE.Group>(null)

  const { setTransitionType, setTransitionState, setGlobalVolume } = useAppStore()

  useFrame((state, delta) => {
    if (bgLightRef.current) {
      const targetColor = new THREE.Color(
        activeCard === 'furina'
          ? '#e6f2ff'
          : activeCard === 'nahida'
            ? '#f2ffe6'
            : '#ffffff'
      )
      bgLightRef.current.color.lerp(targetColor, delta * 3)
      bgLightRef.current.intensity = THREE.MathUtils.lerp(bgLightRef.current.intensity, activeCard ? 1.5 : 0.5, delta * 3)
    }

    // 카드 선택 시 배경 오브먼트를 서서히 흐리게 (시각적 집중)
    if (forestRef.current) {
      const targetOpacity = activeCard ? 0.15 : 1
      forestRef.current.children.forEach(child => {
        child.traverse(obj => {
          if ((obj as any).material) {
            const mat = (obj as any).material
            if (mat.opacity !== undefined) {
              mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 3)
            }
          }
        })
      })
    }
  })

  const handleCardClick = (character: 'furina' | 'nahida') => {
    if (activeCard !== character) {
      const sweepAudio = new Audio('/sfx/Sweep.wav')
      sweepAudio.volume = 0.15
      sweepAudio.play().catch(e => console.error("Sweep.wav play failed:", e))

      setActiveCard(character)
      return
    }

    setTransitionType(character === 'furina' ? 'water' : 'leaf')
    setTransitionState('in')
    setGlobalVolume(0)

    setTimeout(() => {
      router.push(`/character/${character}`)
    }, 2000)
  }

  return (
    <>
      <Environment preset="night" />

      <ImageBackground />
      <fog attach="fog" args={['#0a0816', 40, 140]} />

      {/* 14차: 아기자기한 작은 정20면체 수정 파티클 */}
      <AnimatedSparkleBackground />

      {/* 빈 공간(배경) 클릭 시 카드 선택 해제 */}
      <mesh
        position={[0, 0, -35]}
        onClick={(e) => {
          if (activeCard) {
            e.stopPropagation()
            const sweepAudio = new Audio('/sfx/Sweep.wav')
            sweepAudio.volume = 0.15
            sweepAudio.play().catch(e => console.error("Sweep.wav play failed:", e))
            setActiveCard(null)
          }
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <LobbyCamera activeCard={activeCard} />

      <pointLight ref={bgLightRef} position={[0, 10, -10]} distance={80} intensity={1} color="#ffffff" />
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#e0f0ff" castShadow />
      <directionalLight position={[-15, -10, -15]} intensity={1.5} color="#9966ff" />

      {/* ─── Stylized Stardust & Atmosphere ─── */}
      <StylizedStarDust />

      {/* ─── Hanging Forest Art Installation (Vector Style) ─── */}
      <group ref={forestRef}>
        <HangingForest count={250} areaSize={50} />
      </group>

      {/* Character Cards */}
      <CharacterCard
        position={[-5, 0.5, -12]}
        rotation={[0, 0.2, 0]}
        character="furina"
        index={0}
        onCardClick={handleCardClick}
        activeCard={activeCard}
      />

      <React.Suspense fallback={null}>
        <ParticleText text="FURINA" active={activeCard === 'furina'} position={[2, 0.5, -15]} />
      </React.Suspense>

      <CharacterCard
        position={[6, 2, -15]}
        rotation={[0, -0.2, 0]}
        character="nahida"
        index={1}
        onCardClick={handleCardClick}
        activeCard={activeCard}
      />

      <React.Suspense fallback={null}>
        <ParticleText text="NAHIDA" active={activeCard === 'nahida'} position={[13, 2, -18]} />
      </React.Suspense>
    </>
  )
}
