'use client'

import { Cloud, Clouds, Environment, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, forwardRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'

// A myriad of 3D star crystals bursting smoothly on initial load
function IntroStarBurst() {
  const count = 4000 // Reduced from 10000 to prevent severe overdraw lag
  const pointsRef = useRef<THREE.Points>(null)
  const introState = useAppStore((state) => state.introState)
  const [startTime, setStartTime] = useState<number | null>(null)

  const [particleData] = useState(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // Start them tightly packed directly in front of the camera's initial path (-35 to 10)
      pos[i * 3] = (Math.random() - 0.5) * 60
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = -40 + Math.random() * 60

      // Calculate a highly explosive velocity outward from the center
      const angle1 = Math.random() * Math.PI * 2
      const angle2 = Math.acos((Math.random() * 2) - 1)
      const speed = Math.random() * 60 + 20 // Extreme speed

      vel[i * 3] = Math.sin(angle2) * Math.cos(angle1) * speed
      vel[i * 3 + 1] = Math.sin(angle2) * Math.sin(angle1) * speed
      vel[i * 3 + 2] = Math.cos(angle2) * speed + 30 // Extra momentum pushing towards/past the camera
    }
    return { pos, vel }
  })

  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.0 },
        uColor: { value: new THREE.Color('#ffffff') }
      },
      vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 150.0 * (1.0 / -mvPosition.z); // Massive soft particles
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float dist = length(p);
          if (dist > 0.5) discard;
          
          // Extremely soft glowing aura
          float glow = pow(1.0 - (dist * 2.0), 3.0) * 1.5;
          
          gl_FragColor = vec4(uColor, glow * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) return

    if (introState === 'playing' && startTime === null) {
      setStartTime(state.clock.elapsedTime)
    }

    if (startTime !== null) {
      const t = state.clock.elapsedTime - startTime

      if (t > 8) {
        materialRef.current.uniforms.uOpacity.value = 0
        return
      }

      // Exponential decay of speed
      const speedMultiplier = Math.exp(-t * 0.8)
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array

      for (let i = 0; i < count; i++) {
        positions[i * 3] += particleData.vel[i * 3] * delta * speedMultiplier
        positions[i * 3 + 1] += particleData.vel[i * 3 + 1] * delta * speedMultiplier
        positions[i * 3 + 2] += particleData.vel[i * 3 + 2] * delta * speedMultiplier
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true

      // Intense flash, then fade
      if (t < 0.2) {
        materialRef.current.uniforms.uOpacity.value = (t / 0.2) * 4.0 // Super bright flash
      } else {
        materialRef.current.uniforms.uOpacity.value = Math.max(0, 4.0 * Math.exp(-(t - 0.2) * 1.5))
      }
    } else {
      materialRef.current.uniforms.uOpacity.value = 0
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particleData.pos}
          itemSize={3}
          args={[particleData.pos, 3]}
        />
      </bufferGeometry>
      <shaderMaterial ref={materialRef} args={[materialParams]} />
    </points>
  )
}

// Night specific: Shooting stars streaking across the sky
function NightShootingStars() {
  const count = 3 // Reduced from 5 to make them rarer
  const starsRef = useRef<THREE.Group>(null)

  const [starData, setStarData] = useState(() =>
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 80,
      y: 20 + Math.random() * 20,
      z: -10 - Math.random() * 20,
      speed: 30 + Math.random() * 20,
      delay: Math.random() * 15, // Increased initial delay
      active: false,
      progress: 0
    }))
  )

  const materials = useMemo(() => {
    return Array.from({ length: count }, () => new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color('#ffffff') },
        opacity: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          // vUv.x goes from 0 (tail) to 1 (head)
          float tail = smoothstep(0.0, 1.0, vUv.x);
          float thickness = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
          float alpha = tail * thickness * opacity;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }))
  }, [count])

  useFrame((state, delta) => {
    // Time formula MUST exactly match the background's time formula
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)
    const timeValue = Math.sin(cycle)
    const dayOpacity = THREE.MathUtils.clamp(timeValue * 2.0 + 0.5, 0, 1)
    const nightOpacity = 1 - dayOpacity

    if (!starsRef.current) return

    // Shooting stars should only be visible during the NIGHT (when nightOpacity is high)
    if (nightOpacity < 0.05) {
      starsRef.current.visible = false
      return
    }

    starsRef.current.visible = true

    const updatedStarData = [...starData]
    let needsUpdate = false

    updatedStarData.forEach((star, index) => {
      if (!star.active) {
        star.delay -= delta
        if (star.delay <= 0) {
          star.active = true
          star.progress = 0
          star.x = (Math.random() - 0.5) * 80 + 20
          star.y = 20 + Math.random() * 20
          needsUpdate = true
        }
      } else {
        star.progress += delta * star.speed
        if (star.progress > 100) {
          star.active = false
          star.delay = 5 + Math.random() * 10 // Increased wait time before shooting again
          needsUpdate = true
        }
      }

      const child = starsRef.current!.children[index] as THREE.Mesh
      if (star.active) {
        child.position.set(
          star.x - star.progress,
          star.y - star.progress * 0.8,
          star.z
        )

        // Thinner, longer streaks for a more delicate look
        child.scale.set(star.progress * 0.8 + 2, 0.015, 0.015)
        child.rotation.z = Math.atan2(-0.8, -1)

        const alpha = Math.sin((star.progress / 100) * Math.PI)
          ; (child.material as THREE.ShaderMaterial).uniforms.opacity.value = alpha * nightOpacity * 0.8
      } else {
        ; (child.material as THREE.ShaderMaterial).uniforms.opacity.value = 0
      }
    })

    if (needsUpdate) {
      setStarData(updatedStarData)
    }
  })

  return (
    <group ref={starsRef}>
      {starData.map((_, i) => (
        <mesh key={i} material={materials[i]}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}

// Day specific: Soft, feathered God rays (Sunbeams) shining diagonally from the sun
function DaySunbeams() {
  const beamsRef = useRef<THREE.Group>(null)

  // 각기 다른 두께와 길이의 안개 빛기둥(God Rays) 4개를 생성합니다.
  const materials = useMemo(() => {
    return Array.from({ length: 4 }, () => new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color('#fff2e6') }, // 아주 연한 아침 햇살 톤
        opacity: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        
        // 간단한 노이즈 함수 (빛줄기가 너무 인공적으로 깔끔하지 않도록 아지랑이 부여)
        float rand(vec2 n) { 
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        void main() {
          // X축(폭): 양옆으로 갈수록 매우 빠르고 넓게 퍼지며 사라지는 기둥 형태 (Feather 효과 극대화)
          float edgeX = smoothstep(0.0, 0.4, vUv.x) * smoothstep(1.0, 0.6, vUv.x);
          
          // Y축(길이): 위(광원)쪽은 강하고 아래(대지)로 갈수록 서서히 빛이 약해져 땅에 스며드는 느낌
          float edgeY = smoothstep(0.0, 0.9, vUv.y) * smoothstep(1.0, 0.1, vUv.y);
          
          // 빛기둥 내부에 미세한 먼지 노이즈를 섞어 산란광(Tyndall effect) 느낌을 줍니다.
          float noise = rand(vUv * 50.0) * 0.1 + 0.9;
          
          // 뾰족함을 없애기 위해 x축 페더 곡선을 조금 더 둥글게(pow) 깎아냅니다.
          float alpha = pow(edgeX, 1.5) * edgeY * opacity * noise;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    }))
  }, [])

  useFrame((state) => {
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)
    const timeValue = Math.sin(cycle)
    const dayOpacity = THREE.MathUtils.clamp(timeValue * 2.0 + 0.5, 0, 1)

    if (!beamsRef.current) return

    if (dayOpacity < 0.05) {
      beamsRef.current.visible = false
      return
    }

    beamsRef.current.visible = true

    // 풍차처럼 뱅글뱅글 도는 것을 멈추고 제자리에서 부드럽게 일렁이게(Oscillate) 변경
    const time = state.clock.elapsedTime

    beamsRef.current.children.forEach((child, i) => {
      const mat = (child as THREE.Mesh).material as THREE.ShaderMaterial
      if (mat && mat.uniforms) {
        // 각 줄기가 다른 주기로 천천히 밝아졌다 어두워졌다(숨쉬기)
        const pulse = (Math.sin(time * 0.8 + i * 1.5) * 0.3 + 0.7)
        // 안개 산란광 느낌이 배경에 묻히지 않도록 강도 높임
        mat.uniforms.opacity.value = dayOpacity * pulse * 1.5
      }

      // X축 위치를 아주 천천히 양옆으로 흔들어 커튼이 일렁이는 느낌 추가
      child.position.x = Math.sin(time * 0.2 + i * 2.0) * 1.0
    })

    // DaySunGlow 광원과 함께 위치하도록 카메라 패럴랙스 연동
    beamsRef.current.position.x = state.camera.position.x * 0.9 + 15
    beamsRef.current.position.y = state.camera.position.y * 0.9 + 25
  })

  return (
    // 배경 이미지 바로 앞, DaySunGlow 바로 아래 부근에서 오른쪽 위 -> 왼쪽 아래로 내려오게 45도 기울임
    <group ref={beamsRef} position={[25, 30, -40]} rotation={[0, 0, Math.PI / 4]}>
      {/* 여러 가닥의 거친 빛기둥 빔을 겹쳐서 풍성한 아침 햇살 연출 (전체적으로 얇게 축소) */}
      <mesh position={[0, 0, 0]} material={materials[0]}>
        <planeGeometry args={[90, 15]} /> {/* 메인 빔 축소 */}
      </mesh>
      <mesh position={[8, 5, 0]} material={materials[1]}>
        <planeGeometry args={[110, 8]} /> {/* 윗쪽 측면 길게 뻗는 빔 축소 */}
      </mesh>
      <mesh position={[-6, -5, 0]} material={materials[2]}>
        <planeGeometry args={[70, 10]} /> {/* 아랫쪽으로 둥글게 퍼지는 빛 축소 */}
      </mesh>
      <mesh position={[12, -8, 0]} material={materials[3]}>
        <planeGeometry args={[120, 5]} /> {/* 잔가지 빛 축소 */}
      </mesh>
    </group>
  )
}

// Night specific: Twinkling stars reacting to mouse
function NightTwinkles() {
  const count = 1000 // Increased count significantly
  const pointsRef = useRef<THREE.Points>(null)

  const [particleData] = useState(() => {
    const pos = new Float32Array(count * 3)
    const ph = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 140 // Wider spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60 + 10 // Pushed higher up into the sky
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40 - 15
      ph[i] = Math.random() * Math.PI * 2
    }
    return { pos, ph }
  })

  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffffff') },
        uOpacity: { value: 0 }
      },
      vertexShader: `
        attribute float phase;
        varying float vPhase;
        void main() {
          vPhase = phase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 60.0 * (1.0 / -mvPosition.z); // Increased base size significantly
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vPhase;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float dist = length(p);
          if (dist > 0.5) discard;
          
          // Sharp star shape (cross) + Soft glowing center
          float crossShape = 0.01 / (abs(p.x) * abs(p.y) + 0.01);
          float core = pow(1.0 - (dist * 2.0), 3.0) * 1.5;
          float glow = crossShape * (1.0 - dist * 2.0) + core;
          
          float twinkle = (sin(uTime * 3.0 + vPhase) + 1.0) * 0.5;
          // Brighter overall
          gl_FragColor = vec4(uColor, glow * twinkle * uOpacity * 2.5);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  useFrame((state) => {
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)
    const dayOpacity = THREE.MathUtils.clamp(Math.sin(cycle) * 2.0 + 0.5, 0, 1)
    const nightOpacity = 1 - dayOpacity

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uOpacity.value = nightOpacity
    }
    if (pointsRef.current && particleData) {
      pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.5
      // Mouse parallax - more sensitive to feel interactive
      pointsRef.current.position.x = THREE.MathUtils.lerp(
        pointsRef.current.position.x,
        state.pointer.x * 6,
        0.05
      )

      const targetY = state.pointer.y * 3
      pointsRef.current.position.y += (targetY - pointsRef.current.position.y) * 0.05
    }
  })

  return (
    <points ref={pointsRef}>
      {particleData && (
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={particleData.pos}
            itemSize={3}
            args={[particleData.pos, 3]}
          />
          <bufferAttribute
            attach="attributes-phase"
            count={count}
            array={particleData.ph}
            itemSize={1}
            args={[particleData.ph, 1]}
          />
        </bufferGeometry>
      )}
      <shaderMaterial ref={materialRef} args={[materialParams]} />
    </points>
  )
}

// Day specific: Bokeh particles reacting to mouse
function DayBokeh() {
  const count = 150
  const pointsRef = useRef<THREE.Points>(null)

  const [particleData] = useState(() => {
    const pos = new Float32Array(count * 3)
    const ph = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5
      ph[i] = Math.random() * Math.PI * 2
    }
    return { pos, ph }
  })

  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffddaa') },
        uOpacity: { value: 0 }
      },
      vertexShader: `
        attribute float phase;
        varying float vPhase;
        void main() {
          vPhase = phase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 80.0 * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vPhase;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float dist = length(p);
          if (dist > 0.5) discard;
          
          // Soft edges, slightly hollow center for bokeh effect
          float bokeh = smoothstep(0.5, 0.3, dist) * smoothstep(0.2, 0.4, dist) * 0.5 + smoothstep(0.5, 0.0, dist) * 0.3;
          
          float pulse = (sin(uTime * 1.5 + vPhase) + 1.0) * 0.5;
          gl_FragColor = vec4(uColor, bokeh * pulse * uOpacity * 0.6);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  useFrame((state) => {
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)
    // DayBokeh opacity 공식 수정 (NightStarfield 등과 동일하게)
    const dayOpacity = THREE.MathUtils.clamp(Math.sin(cycle) * 2.0 + 0.5, 0, 1)

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uOpacity.value = dayOpacity
    }
    if (pointsRef.current && particleData) {
      pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 1.5
      // Mouse parallax - day bokeh floats more loosely in opposite direction
      pointsRef.current.position.x = THREE.MathUtils.lerp(
        pointsRef.current.position.x,
        state.pointer.x * -3,
        0.02
      )

      const targetY = state.pointer.y * -1.5
      pointsRef.current.position.y += (targetY - pointsRef.current.position.y) * 0.02

      // dayOpacity가 0.01보다 작으면 렌더링 끄기 (최적화)
      pointsRef.current.visible = dayOpacity > 0.01
    }
  })

  return (
    <points ref={pointsRef}>
      {particleData && (
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={particleData.pos}
            itemSize={3}
            args={[particleData.pos, 3]}
          />
          <bufferAttribute
            attach="attributes-phase"
            count={count}
            array={particleData.ph}
            itemSize={1}
            args={[particleData.ph, 1]}
          />
        </bufferGeometry>
      )}
      <shaderMaterial ref={materialRef} args={[materialParams]} />
    </points>
  )
}

// Night specific: Dense background starfield to fill the empty night sky
function NightStarfield() {
  const count = 5000 // Reduced from 12000 to prevent overdraw and lag
  const pointsRef = useRef<THREE.Points>(null)

  const [particleData] = useState(() => {
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // Spread across a very wide area behind everything
      pos[i * 3] = (Math.random() - 0.5) * 300
      pos[i * 3 + 1] = Math.random() * 120 + 5 // Keep them strictly above ground in the sky
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100 - 60 // Pushed back slightly
      sizes[i] = Math.random() * 2.5 + 1.0 // Increased size variance
    }
    return { pos, sizes }
  })

  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#ffffff') },
        uOpacity: { value: 0 }
      },
      vertexShader: `
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vAlpha = aSize / 2.0;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * 30.0 * (1.0 / -mvPosition.z); // Increased base size
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          vec2 p = gl_PointCoord - vec2(0.5);
          float dist = length(p);
          if (dist > 0.5) discard;
          
          // Soft circular star with a bright core
          float glow = smoothstep(0.5, 0.0, dist) * 0.8 + smoothstep(0.1, 0.0, dist) * 0.8;
          gl_FragColor = vec4(uColor, glow * vAlpha * uOpacity * 1.5);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  useFrame((state, delta) => {
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)
    const dayOpacity = THREE.MathUtils.clamp(Math.sin(cycle) * 2.0 + 0.5, 0, 1)
    const nightOpacity = 1 - dayOpacity

    if (materialRef.current) {
      materialRef.current.uniforms.uOpacity.value = nightOpacity * 1.2 // Increased brightness
    }
    if (pointsRef.current) {
      // Extremely slow rotation to feel like the whole galaxy is moving
      pointsRef.current.rotation.y -= delta * 0.005
      pointsRef.current.rotation.z -= delta * 0.002
    }
  })

  return (
    <points ref={pointsRef}>
      {particleData && (
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={particleData.pos}
            itemSize={3}
            args={[particleData.pos, 3]}
          />
          <bufferAttribute
            attach="attributes-aSize"
            count={count}
            array={particleData.sizes}
            itemSize={1}
            args={[particleData.sizes, 1]}
          />
        </bufferGeometry>
      )}
      <shaderMaterial ref={materialRef} args={[materialParams]} />
    </points>
  )
}

// Day specific: A massive glowing sun dominating the daytime sky
function DaySunGlow() {
  const glowRef = useRef<THREE.Mesh>(null)

  const materialParams = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#ffffff') }, // Blinding bright white core
        uOpacity: { value: 0 }
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
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5));
          if (dist > 0.5) discard;
          
          // 엄청 셌던 빛을 크게 줄이고 훨씬 부드러운 안개/구름산란광 수준의 후광(Aura)으로 얌전하게 조정
          float glow = pow(max(0.0, 1.0 - (dist * 2.0)), 3.0) * 1.5; 
          gl_FragColor = vec4(uColor, glow * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])

  useFrame((state) => {
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)
    const timeValue = Math.sin(cycle)
    const dayOpacity = THREE.MathUtils.clamp(timeValue * 2.0 + 0.5, 0, 1)

    if (glowRef.current) {
      if (dayOpacity < 0.01) {
        glowRef.current.visible = false
      } else {
        glowRef.current.visible = true
          // 구름 사이로 희미하게 퍼지는 빛만 남기도록 투명도 최대 0.4로 억제
          ; (glowRef.current.material as THREE.ShaderMaterial).uniforms.uOpacity.value = dayOpacity * 0.4

        // 카메라 중심을 침범하지 않게 하늘 높이 고정
        glowRef.current.position.x = state.camera.position.x * 0.95 + 10
        glowRef.current.position.y = state.camera.position.y * 0.95 + 30
        glowRef.current.position.z = state.camera.position.z - 45 // 배경 이미지( -50 ) 바로 앞에 배치
      }
    }
  })

  return (
    <mesh ref={glowRef}>
      <planeGeometry args={[140, 140]} /> {/* 태양 전체 크기도 축소 */}
      <shaderMaterial args={[materialParams]} />
    </mesh>
  )
}

// Night specific: A small, subtly glowing moon that crosses the sky in a flat arc
function NightMoon() {
  const moonGroupRef = useRef<THREE.Group>(null)
  const bodyMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const glowMaterialRef = useRef<THREE.ShaderMaterial>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const glowParams = useMemo(() => {
    return {
      uniforms: {
        uColor: { value: new THREE.Color('#88bbff') }, // Deep magical blue glow
        uOpacity: { value: 0 }
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
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5));
          if (dist > 0.5) discard;
          
          float glow = pow(max(0.0, 1.0 - (dist * 2.0)), 2.5);
          gl_FragColor = vec4(uColor, glow * uOpacity * 0.4); 
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }
  }, [])


  useFrame((state) => {
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)
    const timeValue = Math.sin(cycle)
    const dayOpacity = THREE.MathUtils.clamp(timeValue * 2.0 + 0.5, 0, 1)
    const nightOpacity = 1 - dayOpacity

    if (moonGroupRef.current) {
      // 시간(cycle)을 밤의 정점(1.5 * PI)을 기준으로 -PI ~ PI 사이의 값으로 변환합니다.
      // 이렇게 하면 달이 안 보이는 완전한 낮(0.5 * PI)에만 위치가 리셋되어, 
      // 눈에 보일 때는 갑자기 점프(순간이동)하는 현상이 사라집니다.
      let timeOffset = cycle - 1.5 * Math.PI;
      if (timeOffset > Math.PI) timeOffset -= Math.PI * 2;
      if (timeOffset < -Math.PI) timeOffset += Math.PI * 2;

      // x축: 화면 좌측 상단 부근에 고정된 느낌으로 아주 살짝만 이동
      // 화면에 좀 더 잘 보이도록 -15부터 시작하게 조정
      const moonX = -15 + timeOffset * 3;

      // y축: 하늘 높이 떠 있도록 위치 조정하되, 벗어나지 않게 낮춤
      const moonY = 12 - Math.pow(timeOffset, 2) * 0.5;

      // isTransitioning일 때 달이 이상하게 화면 가운데로 끌려오는 것 방지
      // 카메라가 z축으로 -30까지 들어가므로 달도 상대적으로 멀어지는 느낌을 주기 위해 고정
      moonGroupRef.current.position.x = moonX + state.camera.position.x * 0.95
      moonGroupRef.current.position.y = moonY + state.camera.position.y * 0.95
      moonGroupRef.current.position.z = state.camera.position.z - 38

      if (nightOpacity < 0.01) {
        moonGroupRef.current.visible = false
      } else {
        moonGroupRef.current.visible = true
      }
    }

    if (bodyMaterialRef.current) {
      bodyMaterialRef.current.opacity = nightOpacity * 0.9
    }
    if (glowMaterialRef.current) {
      // 달빛 전체가 좀 더 확실히 화면을 비추도록 opacity 스케일 상승
      glowMaterialRef.current.uniforms.uOpacity.value = nightOpacity * 2.5
    }
    if (lightRef.current) {
      // 달빛이 구름 윗면에 너무 과하게 파고들지 않도록(낮처럼 쨍하지 않게) 조도 100으로 은은하게 하향 조정
      lightRef.current.intensity = nightOpacity * 100
      lightRef.current.position.set(0, -2, 5) // 빛을 약간 앞쪽(카메라 방향)아래로 이동시켜 구름 표면(위쪽)에 잘 닿게 함
    }
  })

  return (
    <group ref={moonGroupRef}>
      {/* 
        달빛이 구름 윗면을 비출 수 있도록, 달 중심이 아니라 달 살짝 아래 앞쪽에서 빛을 쏩니다.
      */}
      <pointLight
        ref={lightRef}
        color="#88ddff" // 형광빛(신비로운 밝은 하늘색)을 띠게 하여 확 튀게
        distance={150}
        decay={1.2}
      />

      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[120, 120]} />
        <shaderMaterial ref={glowMaterialRef} args={[glowParams]} />
      </mesh>

      <mesh>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial
          ref={bodyMaterialRef}
          color="#ffffff"
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export const GateScene = forwardRef((_props, _ref) => {
  const cloudsRef = useRef<THREE.Group>(null)
  const bgGroupRef = useRef<THREE.Group>(null)
  const dayMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const nightMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const dayLightRef = useRef<THREE.DirectionalLight>(null)
  const nightFillLightRef = useRef<THREE.PointLight>(null)
  const isTransitioning = useAppStore((state) => state.isTransitioning)
  const introState = useAppStore((state) => state.introState)

  // Load both day and night backgrounds
  const [dayTexture, nightTexture] = useTexture([
    '/images/home/Background3.png', // 낮 (Day)
    '/images/home/Background2.png'  // 밤 (Night)
  ])

  useFrame((state, delta) => {
    // Subtle cloud rotation
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y -= delta * 0.015
    }

    if (isTransitioning) {
      // High-speed zoom in to transition to next scene like Genshin Login
      // Dolly in very deep into the clouds for a warp effect
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, -30, delta * 2)
      // X, Y축을 이동시키면 배경이 누워버리거나 너무 과도한 느낌을 주므로, x, y 이동은 없애고 FOV만 살짝 넓힘

      // Warp FOV effect - FOV를 너무 과하게 넓히면 배경 플레인이 왜곡되므로 조금 줄임
      const camera = state.camera as THREE.PerspectiveCamera
      camera.fov = THREE.MathUtils.lerp(camera.fov, 80, delta * 2)
      camera.updateProjectionMatrix()
    } else if (introState === 'pending') {
      state.camera.position.z = -35
      state.camera.position.x = 0
      state.camera.position.y = 0

      const camera = state.camera as THREE.PerspectiveCamera
      if (camera.fov !== 45) {
        camera.fov = 45
        camera.updateProjectionMatrix()
      }
    } else if (introState === 'playing') {
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 10, delta * 1.5)
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, delta * 1.5)
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0, delta * 1.5)

      const camera = state.camera as THREE.PerspectiveCamera
      if (camera.fov !== 45) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 45, delta * 2)
        camera.updateProjectionMatrix()
      }
    } else {
      const targetX = Math.sin(state.clock.elapsedTime * 0.2) * 2.0
      const targetY = Math.cos(state.clock.elapsedTime * 0.2) * 1.0

      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 10, delta * 2)
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, delta * 1.5)
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, delta * 1.5)

      const camera = state.camera as THREE.PerspectiveCamera
      if (Math.abs(camera.fov - 45) > 0.1) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 45, delta * 2)
        camera.updateProjectionMatrix()
      }
    }
    // 카메라 시선을 항상 정면(화면 중앙에서 약간 뒤)을 향하도록 고정시켜 배경 텍스처가 눕는 것을 원천 차단
    state.camera.lookAt(state.camera.position.x, state.camera.position.y, state.camera.position.z - 40)

    // Bind background to camera position, but with a multiplier < 1
    // This allows the background to move slightly opposite to camera, creating a massive parallax effect
    if (bgGroupRef.current) {
      bgGroupRef.current.position.x = state.camera.position.x * 0.95
      bgGroupRef.current.position.y = state.camera.position.y * 0.95
      // FOV가 커질 때 배경이 잘리거나 작아보이지 않도록 Z 위치 고정
      bgGroupRef.current.position.z = state.camera.position.z - 50 // 항상 카메라보다 50만큼 뒤에 있도록 설정하여 눕는 현상(Perspective에 의한 왜곡) 방지
    }

    // Faster Day/Night Cycle that starts transitioning immediately
    // Offset by -Math.PI/2 to start exactly at Night, then transition quickly to Day
    const cycle = (state.clock.elapsedTime * 0.15 - Math.PI / 2) % (Math.PI * 2)

    // Calculate a value between 0 (Night) and 1 (Day)
    const timeValue = Math.sin(cycle)

    // Smoothstep for better blending
    const dayOpacity = THREE.MathUtils.clamp(timeValue * 2.0 + 0.5, 0, 1)
    const nightOpacity = 1 - dayOpacity

    if (dayMaterialRef.current) dayMaterialRef.current.opacity = dayOpacity
    if (nightMaterialRef.current) nightMaterialRef.current.opacity = nightOpacity

    // Adjust lighting based on time of day
    if (dayLightRef.current) {
      dayLightRef.current.intensity = Math.max(0, dayOpacity * 2.5)
    }
    if (nightFillLightRef.current) {
      // 밤일 때만 베이스 앰비언트 역할의 파란 조명을 강하게
      nightFillLightRef.current.intensity = nightOpacity * 15
    }
  })

  return (
    <>
      {/* Dynamic Lighting */}
      <ambientLight intensity={0.4} color="#e6f0ff" />
      <directionalLight
        ref={dayLightRef}
        position={[10, 20, 10]}
        intensity={2.5}
        color="#ffeebb"
        castShadow
      />
      {/* Night fill light */}
      <pointLight
        ref={nightFillLightRef}
        position={[-10, -10, -10]}
        intensity={0}
        distance={200}
        color="#4488ff"
      />

      {/* Background Container */}
      <group ref={bgGroupRef} position={[0, 0, -50]} scale={[160, 90, 1]}>
        {/* Night Background (always behind) */}
        <mesh>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={nightMaterialRef}
            map={nightTexture}
            transparent
            depthWrite={false}
            color="#2a3860" // Dark blue tint to make the bright image look like night
          />
        </mesh>

        {/* Day Background (fades in and out in front) */}
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={dayMaterialRef}
            map={dayTexture}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Environmental reflection map */}
      <Environment preset="night" />

      {/* Day / Night Specific Particles */}
      <DaySunGlow />
      <NightMoon />
      <NightStarfield />
      <NightTwinkles />
      <DayBokeh />

      {/* Day / Night Specific Effects */}
      <DaySunbeams />
      <NightShootingStars />

      {/* Myriad of stars appearing and disappearing on load */}
      <IntroStarBurst />

      {/* Volumetric Clouds (Tinted to match the fantasy vibe) */}
      <group ref={cloudsRef} position={[0, -12, -20]}>
        {/* material={THREE.MeshLambertMaterial} 를 사용해야 빛(PointLight)에 반응하지만, 
            Cloud는 빛을 너무 강하게 반사하는 경향이 있어 기본적으로 살짝 톤다운 시킵니다 */}
        {/* 구름 투명도 버그 해결: fade 속성을 다시 추가해 카메라가 돌파할 때 렌더링에 끊김이 없게 하고, 
            opacity를 다시 낮춰서(LambertMaterial 특성상 투명도가 높으면 검정색 그림자가 생김) 픽스 */}
        <Clouds material={THREE.MeshLambertMaterial} limit={400} range={400}>
          {/* Base Layer - 너무 하얗게 뜨지 않도록 color 어둡게(기존처럼 파스텔톤) 조정 */}
          <Cloud
            bounds={[40, 5, 40]}
            color="#b0d0ff"
            seed={1}
            position={[0, 0, 0]}
            volume={30}
            opacity={0.3}
            fade={20}
          />
          {/* Depth Layer - 베이스 뒤에서 무게감을 잡아주는 어두운 구름 */}
          <Cloud
            bounds={[50, 4, 50]}
            color="#5a7a9a"
            seed={3}
            position={[-10, -5, 10]}
            volume={40}
            opacity={0.2}
            fade={30}
          />
        </Clouds>
      </group>
    </>
  )
})

GateScene.displayName = 'GateScene'

