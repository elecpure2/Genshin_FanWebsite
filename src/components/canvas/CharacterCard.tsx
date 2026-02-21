'use client'

import { useFrame, ThreeEvent } from '@react-three/fiber'
import React, { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

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
// 심플하고 고요한 파티클 연출 (마우스를 올렸을 때만 천천히 소용돌이침)
function ElementalAura({ active, character }: { active: boolean; character: 'furina' | 'nahida' }) {
  const count = 50 // 개수를 줄여서 덜 산만하게
  const pointsRef = useRef<THREE.Points>(null)
  const isFurina = character === 'furina'

  const [particleData] = useState(() => {
    const pos = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // 카드 테두리를 따라 빙글빙글 도는 위치
      const angle = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(angle) * (2.2 + Math.random() * 0.5)
      pos[i * 3 + 1] = Math.sin(angle) * (3.8 + Math.random() * 0.5)
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5 + 0.2 // 카드보다 조금 앞에

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
      // 천천히 회전
      for (let i = 0; i < count; i++) {
        const x = positions[i * 3]
        const y = positions[i * 3 + 1]

        // 카드 형태에 맞게 타원형 궤도로 회전
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

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const isSelected = activeCard === character
  const isOtherSelected = activeCard !== null && activeCard !== character

  // Load character texture
  const characterTexture = useTexture(isFurina ? '/images/Upperbody.png' : '/images/nahida.png')

  // 15차: 클램핑(늘어짐/찌그러짐) 현상을 원천 차단하기 위해 텍스처 자체 UV 구부리기 폐기.
  useEffect(() => {
    characterTexture.colorSpace = THREE.SRGBColorSpace
  }, [characterTexture])

  // Card shape and Frame shapes
  const cardShape = useMemo(() => createRoundedRectShape(4.5, 8.0, 0.4), [])
  const frameShape = useMemo(() => {
    // 얇고 우아한 금속 테두리를 위해 폭을 좁힘
    const outer = createRoundedRectShape(4.55, 8.05, 0.42)
    const inner = createRoundedRectShape(4.45, 7.95, 0.38)
    outer.holes.push(inner)
    return outer
  }, [])

  // 15차: 커스텀 프래그먼트 셰이더 (ShaderMaterial) 마스킹
  // 배경을 삼키는 투명도 버그(Stencil)나 이미지가 구겨지는(Shape) 현상을 피하기 위해
  // 텍스처를 단순 사각형(Plane)으로 그리되, 둥근 모서리 바깥쪽 픽셀을 강제로 지워버립니다.
  const imageMaterial = useMemo(() => {
    // 좌표 계산용 SDF 거리 함수 및 투명도 깎기 셰이더
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

      // 둥근 사각형 거리 공식 (Signed Distance Field)
      float udRoundBox( vec2 p, vec2 b, float r ) {
        return length(max(abs(p)-b+r,0.0))-r;
      }

      void main() {
        // 이미지의 원래 컬러
        vec4 color = texture2D(uTexture, vUv);
        
        // 현재 픽셀이 Plane 중심(0,0)으로부터 떨어진 절대 거리
        vec2 pos = (vUv - 0.5) * uPlaneSize - uOffset;
        
        // 우리가 자르려는 액자의 크기 바운더리
        vec2 boxHalfSize = uSize * 0.5;

        float d = udRoundBox(pos, boxHalfSize, uRadius);

        // 둥근 모서리 밖으로 넘어간 픽셀이면 alpha가 급격히 0이 됨 (부드러운 잘림 Anti-aliasing)
        float alphaMask = 1.0 - smoothstep(0.0, 0.02, d);

        gl_FragColor = vec4(color.rgb, color.a * alphaMask * 0.95);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: characterTexture },
        uRadius: { value: 0.4 },
        uSize: { value: new THREE.Vector2(4.5, 8.0) }, // 잘라서 보여줄 카드 크기
        uPlaneSize: { value: new THREE.Vector2(isFurina ? 5.2 : 5.04, isFurina ? 9.2 : 9.0) }, // 실제 그리는 Plane 크기
        uOffset: { value: new THREE.Vector2(0, 0) } // 마스크 좌표 이동 없음 (Frame과 물리적 [0,0] 완벽 고정)
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false, // 투명 객체 겹침 렌더 오류 방지
    })
  }, [characterTexture, isFurina])

  useFrame((state, delta) => {
    if (!groupRef.current) return

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

      // 카메라를 향해 반듯하게 정면(0,0,0)을 바라봄
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta * 8)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 8)
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 8)

      if (tiltGroupRef.current) {
        // 클릭되었을 때 어중간하게 틀어진 상태가 유지되지 않도록 회전 복구
        tiltGroupRef.current.rotation.x = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.x, 0, delta * 12)
        tiltGroupRef.current.rotation.y = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.y, 0, delta * 12)
        // 19차: 클릭 리액션을 위해 수축했던 Scale을 원상 복구(탄력 바운스)
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

    // Smooth tilt on inner group
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.x = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.x, targetRotation.x, delta * 5)
      tiltGroupRef.current.rotation.y = THREE.MathUtils.lerp(tiltGroupRef.current.rotation.y, targetRotation.y, delta * 5)
      // 19차: 일반 떠있는 상태에서도 클릭 시 수축했던 Scale을 원상 복구
      tiltGroupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), delta * 10)
    }

    // 15차: 마스크와 이미지가 완벽한 1:1로 고정되어야 클리핑(썰림)이 어긋나지 않으므로, 
    // 마우스를 따라 속의 이미지가 유영하던 Parallax 로직(imageRef.current.position 변경)을 삭제했습니다.
  })

  // 틸트 감도 완화 (자연스럽게)
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if ((activeCard && activeCard !== character) || !e.uv) return
    const x = (e.uv.x - 0.5) * 2
    const y = (e.uv.y - 0.5) * 2

    setTargetRotation({
      x: -y * 0.1, // 기울기 값 감소
      y: x * 0.1,
    })
    setMousePos({ x, y })
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
    setMousePos({ x: 0, y: 0 })
    document.body.style.cursor = 'auto'
  }

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // 다른 카드가 이미 active 상태라면 무시
    if (activeCard && activeCard !== character) return
    document.body.style.cursor = 'auto'

    // 19차: 클릭(타격) 반응! 카드를 살짝 수축시켰다가 튕겨 오르게(Bounce) 만듦
    if (tiltGroupRef.current) {
      tiltGroupRef.current.scale.set(0.85, 0.85, 0.85)
    }

    // 클릭 즉시 마우스 방향에서 보던 틸트 각도를 0으로 초기화하여 정면 보장
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
        {/* 1. Glass Base (뒷배경이 투영되는 투명한 크리스탈 바탕) */}
        {/* MeshTransmissionMaterial이 투명 오브젝트(캐릭터)를 통째로 삼켜버리는 버그를 방지하기 위해
            순수 meshPhysicalMaterial을 사용하여 가장 뒤에 렌더링합니다. */}
        <mesh position={[0, 0, 0]} renderOrder={1}>
          <shapeGeometry args={[cardShape]} />
          <meshPhysicalMaterial
            transparent
            opacity={0.4}
            roughness={0.1}
            metalness={0.5}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
            color="#0a1220" /* 살짝 어두운 크리스탈 톤으로 가시성 확보 */
          />
        </mesh>

        {/* 2. Character image (Mapped onto a perfect Plane, cut perfectly by ShaderMaterial mask) */}
        <group ref={imageRef} position={[0, -0.01, 0.04]} renderOrder={2}>
          <mesh material={imageMaterial}>
            <planeGeometry args={isFurina ? [5.2, 9.2] : [5.0, 9.0]} />
          </mesh>
        </group>

        {/* 4. 얇고 뽀얀 화이트 반투명 유리 테두리 프레임 (레퍼런스 UI풍 감성) */}
        <mesh position={[0, 0, 0.05]} renderOrder={3}>
          <shapeGeometry args={[frameShape]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.5} // 살짝 반투명한 유리 테두리
            opacity={1}
            transparent={true}
            roughness={0.2}
            clearcoat={1.0}
            emissive="#ffffff"
            emissiveIntensity={hovered ? 0.6 : 0.2} // 마우스 오버 시 화이트 엣지가 환하게 빛남
          />
        </mesh>

        {/* 4. 매달림 끈 (Hanging Line) 추가: 천장(우주 끝)부터 카드 가장 위쪽까지 떨어지는 무한한 실선 */}
        <mesh position={[0, 50 + 4, 0]} renderOrder={0}>
          {/* Cylinder (반지름 위, 반지름 아래, 길이, 분할수) */}
          <cylinderGeometry args={[0.015, 0.015, 100, 8]} />
          <meshBasicMaterial color="#ffeab8" transparent opacity={0.3} />
        </mesh>

        {/* 6. 은은한 원소 아우라 & 파티클 */}
        <ElementalAura active={hovered} character={character} />

      </group>
    </group>
  )
}
