'use client'

import { useFrame, ThreeEvent } from '@react-three/fiber'
import React, { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useTexture, Text } from '@react-three/drei'

interface CharacterCardProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  character: 'furina' | 'nahida'
  index: number
  onCardClick: (char: 'furina' | 'nahida') => void
  activeCard: string | null
}

// ─── Rounded Rectangle Shape Helper ───
function createRoundedRectShape(width: number, height: number, radius: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2 + radius, -height / 2)
  shape.lineTo(width / 2 - radius, -height / 2)
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius)
  shape.lineTo(width / 2, height / 2 - radius)
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2)
  shape.lineTo(-width / 2 + radius, height / 2)
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius)
  shape.lineTo(-width / 2, -height / 2 + radius)
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2)
  return shape
}

// ─── Subtle Elemental Particles ───
function ElementalAura({ active, character }: { active: boolean; character: 'furina' | 'nahida' }) {
  const count = 50
  const pointsRef = useRef<THREE.Points>(null)
  const isFurina = character === 'furina'

  const [particleData] = useState(() => {
    const pos = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(angle) * (2.2 + Math.random() * 0.5)
      pos[i * 3 + 1] = Math.sin(angle) * (3.8 + Math.random() * 0.5)
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5 + 0.2

      phases[i] = Math.random() * Math.PI * 2
    }
    return { pos, phases }
  })

  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(isFurina ? '#ccffff' : '#eeffcc') },
        uTime: { value: 0 },
        uActive: { value: 0 },
      },
      vertexShader: `
        attribute float phase;
        varying float vPhase;
        uniform float uActive;
        void main() {
          vPhase = phase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (8.0 + sin(phase) * 4.0) * uActive * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vPhase;
        uniform float uTime;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float dist = length(p);
          if (dist > 0.5) discard;
          
          float glow = exp(-dist * 4.0);
          float twinkle = (sin(uTime * 3.0 + vPhase) + 1.0) * 0.5;
          gl_FragColor = vec4(uColor, glow * twinkle * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [isFurina])

  useFrame((state, delta) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime

    const targetActive = active ? 1 : 0
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(mat.uniforms.uActive.value, targetActive, delta * 3)

    if (mat.uniforms.uActive.value > 0.01) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < count; i++) {
        const x = positions[i * 3]
        const y = positions[i * 3 + 1]

        const angle = Math.atan2(y, x * 1.8) + delta * 0.5 * (active ? 1 : 0.2)
        const radius = Math.sqrt(x * x + (y / 1.8) * (y / 1.8))

        positions[i * 3] = Math.cos(angle) * radius
        positions[i * 3 + 1] = Math.sin(angle) * (radius * 1.8)
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particleData.pos} itemSize={3} args={[particleData.pos, 3]} />
        <bufferAttribute attach="attributes-phase" count={count} array={particleData.phases} itemSize={1} args={[particleData.phases, 1]} />
      </bufferGeometry>
      <primitive object={materialParams} attach="material" />
    </points>
  )
}

// ─── Outer Glow (테두리 바깥 원소 글로우 — NormalBlending으로 Bloom 간섭 없음) ───
function OuterGlow({ hovered, character }: { hovered: boolean; character: 'furina' | 'nahida' }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const isFurina = character === 'furina'

  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(isFurina ? '#4499dd' : '#55aa44') },
        uIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec2 vUv;

        float udRoundBox(vec2 p, vec2 b, float r) {
          return length(max(abs(p) - b + r, 0.0)) - r;
        }

        void main() {
          vec2 pos = (vUv - 0.5) * vec2(6.0, 10.4);
          float d = udRoundBox(pos, vec2(2.25, 4.0), 0.4);

          // 카드 안쪽은 절대 그리지 않음
          if (d < 0.15) discard;

          // 바깥쪽으로 부드러운 글로우
          float glow = exp(-d * 3.0);

          // Plane 가장자리 페이드아웃
          vec2 edge = smoothstep(0.0, 0.15, min(vUv, 1.0 - vUv));
          float edgeFade = edge.x * edge.y;

          float alpha = glow * uIntensity * edgeFade;
          if (alpha < 0.005) discard;

          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    })
  }, [isFurina])

  useFrame((_state, delta) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    const target = hovered ? 0.6 : 0.2
    mat.uniforms.uIntensity.value = THREE.MathUtils.lerp(mat.uniforms.uIntensity.value, target, delta * 5)
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -0.01]} renderOrder={0}>
      <planeGeometry args={[6.0, 10.4]} />
      <primitive object={glowMaterial} attach="material" />
    </mesh>
  )
}

// ─── Main Character Card ───
export function CharacterCard({
  position,
  rotation = [0, 0, 0],
  character,
  index,
  onCardClick,
  activeCard,
}: CharacterCardProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tiltGroupRef = useRef<THREE.Group>(null)
  const imageRef = useRef<THREE.Group>(null)

  const [hovered, setHovered] = useState(false)
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0 })
  const isFurina = character === 'furina'

  const isSelected = activeCard === character
  const isOtherSelected = activeCard !== null && activeCard !== character

  // Load character texture
  const characterTexture = useTexture(isFurina ? '/images/Upperbody.png' : '/images/nahida.png')

  useEffect(() => {
    characterTexture.colorSpace = THREE.SRGBColorSpace
  }, [characterTexture])

  // Card shape and Frame shapes
  const cardShape = useMemo(() => createRoundedRectShape(4.35, 7.85, 0.35), [])
  const frameShape = useMemo(() => {
    const outer = createRoundedRectShape(4.5, 7.95, 0.38)
    const inner = createRoundedRectShape(4.38, 7.83, 0.34)
    outer.holes.push(inner)
    return outer
  }, [])

  // 프레임 시머 셰이더 머티리얼
  const frameMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: new THREE.Color(isFurina ? '#5b8fb9' : '#5a9a72') },
        uColor2: { value: new THREE.Color(isFurina ? '#a3cde8' : '#9fd4b3') },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vPos;

        void main() {
          // 세로 방향 그라데이션 (아래→위로 밝아짐)
          float grad = smoothstep(-4.0, 4.0, vPos.y);
          vec3 baseColor = mix(uColor1, uColor2, grad);

          // 시머: 대각선으로 빛줄기가 스르르 지나가는 효과
          float diagonal = vPos.x * 0.7 + vPos.y;
          // 3초 주기: 2초간 스윕, 1초간 쉼
          float cycle = mod(uTime, 3.0);
          float sweepPos = cycle < 2.0
            ? mix(-6.0, 6.0, cycle / 2.0)
            : 99.0;
          float shimmerDist = abs(diagonal - sweepPos);
          float shimmer = smoothstep(1.2, 0.0, shimmerDist) * 0.55;

          vec3 finalColor = baseColor + vec3(shimmer);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      transparent: false,
    })
  }, [isFurina])

  // 이미지 셰이더 (SDF 마스킹 + premultiplied alpha)
  const imageMaterial = useMemo(() => {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uTexture;
      uniform float uRadius;
      uniform vec2 uSize;
      uniform vec2 uPlaneSize;
      uniform vec2 uOffset;

      varying vec2 vUv;

      float udRoundBox( vec2 p, vec2 b, float r ) {
        return length(max(abs(p)-b+r,0.0))-r;
      }

      void main() {
        vec4 color = texture2D(uTexture, vUv);
        
        vec2 pos = (vUv - 0.5) * uPlaneSize - uOffset;
        vec2 boxHalfSize = uSize * 0.5;

        float d = udRoundBox(pos, boxHalfSize, uRadius);
        float alphaMask = 1.0 - smoothstep(0.0, 0.02, d);

        // premultiplied alpha: 투명 영역의 RGB도 0으로 만들어 색상 누출/Bloom 증폭 방지
        float finalAlpha = color.a * alphaMask * 0.95;
        if (finalAlpha < 0.01) discard;
        gl_FragColor = vec4(color.rgb * finalAlpha, finalAlpha);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: characterTexture },
        uRadius: { value: 0.35 },
        uSize: { value: new THREE.Vector2(4.3, 7.8) },
        uPlaneSize: { value: new THREE.Vector2(isFurina ? 5.2 : 5.04, isFurina ? 9.2 : 9.0) },
        uOffset: { value: new THREE.Vector2(0, 0) }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    })
  }, [characterTexture, isFurina])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // 시머 애니메이션 업데이트
    frameMaterial.uniforms.uTime.value = state.clock.elapsedTime

    // If another card is selected, fade out and move away
    if (isOtherSelected) {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1] - 10, delta * 3)
      return
    }

    // 22차: Morphing 대신 제자리에서 정면을 바라보며 대기 (카메라가 이 카드로 다가옴)
    if (isSelected) {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], delta * 4)
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1], delta * 4)
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2], delta * 4)

      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 8)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 8)
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 8)

      if (tiltGroupRef.current) {
        tiltGroupRef.current.rotation.x = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.x, 0, delta * 12)
        tiltGroupRef.current.rotation.y = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.y, 0, delta * 12)
        tiltGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 10)
      }
      return
    }

    // Normal floating animation
    const floatY = Math.sin(state.clock.elapsedTime * 1.2 + index * Math.PI) * 0.15

    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, position[0], delta * 3)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1] + floatY, delta * 3)
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, position[2], delta * 3)

    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotation[0], delta * 5)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotation[1], delta * 5)
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, rotation[2], delta * 5)

    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.x = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.x, targetRotation.x, delta * 5)
      tiltGroupRef.current.rotation.y = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.y, targetRotation.y, delta * 5)
      tiltGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 10)
    }
  })

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if ((activeCard && activeCard !== character) || !e.uv) return
    const x = (e.uv.x - 0.5) * 2
    const y = (e.uv.y - 0.5) * 2

    setTargetRotation({
      x: -y * 0.1,
      y: x * 0.1,
    })
  }

  const handlePointerOver = () => {
    if (activeCard && activeCard !== character) return
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    if (activeCard && activeCard !== character) return
    setHovered(false)
    setTargetRotation({ x: 0, y: 0 })
    document.body.style.cursor = 'auto'
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (activeCard && activeCard !== character) return
    document.body.style.cursor = 'auto'

    if (tiltGroupRef.current) {
      tiltGroupRef.current.scale.set(0.85, 0.85, 0.85)
    }

    setTargetRotation({ x: 0, y: 0 })
    onCardClick(character)
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={0.55}>
      {/* Invisible Hitbox for stable pointer events */}
      <mesh
        onPointerOver={handlePointerOver}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
        visible={false}
      >
        <planeGeometry args={[4.5, 8]} />
      </mesh>

      <group ref={tiltGroupRef}>
        {/* 1. Glass Base — 불투명 배경으로 씬 오브젝트 차단 */}
        <mesh position={[0, 0, 0]} renderOrder={1}>
          <shapeGeometry args={[cardShape]} />
          <meshBasicMaterial color="#0e1525" />
        </mesh>

        {/* 2. Character image (ShaderMaterial SDF 마스크) */}
        <group ref={imageRef} position={[0, -0.01, 0.04]} renderOrder={2}>
          <mesh material={imageMaterial}>
            <planeGeometry args={isFurina ? [5.2, 9.2] : [5.0, 9.0]} />
          </mesh>
        </group>

        {/* 4. 원소 색상 그라데이션 + 시머 테두리 프레임 */}
        <mesh position={[0, 0, 0.05]} renderOrder={3}>
          <shapeGeometry args={[frameShape]} />
          <primitive object={frameMaterial} attach="material" />
        </mesh>

        {/* 5. 테두리 바깥 원소 글로우 */}
        <OuterGlow hovered={hovered} character={character} />

        {/* 7. 캐릭터 이름 텍스트 */}
        <Text
          position={[0, -4.5, 0.08]}
          fontSize={0.45}
          color={isFurina ? '#aaddff' : '#bbeeaa'}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.2}
          font="https://fonts.gstatic.com/s/cinzel/v26/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYo.ttf"
          material-transparent={true}
          material-depthWrite={false}
        >
          {isFurina ? 'FURINA' : 'NAHIDA'}
        </Text>

        {/* 8. 매달림 끈 (Hanging Line) */}
        <mesh position={[0, 50 + 4, 0]} renderOrder={0}>
          <cylinderGeometry args={[0.015, 0.015, 100, 8]} />
          <meshBasicMaterial color="#ffeab8" transparent opacity={0.3} />
        </mesh>

        {/* 9. 은은한 원소 아우라 & 파티클 */}
        <ElementalAura active={hovered} character={character} />

      </group>
    </group>
  )
}
