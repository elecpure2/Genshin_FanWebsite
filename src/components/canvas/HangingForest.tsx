'use client'

import React, { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface HangingForestProps {
    count?: number
    areaSize?: number
}

// ─── 단일 직선 진자(Pendulum) 물리 시뮬레이션 데이터 구조 ───
// 각 장식은 천장(anchor)에서 단 하나의 길고 팽팽한 줄로 연결됩니다. (구불거림 X)
const GRAVITY = 0.015   // 우아하고 천천히 떨어지도록 중력 완화
const DAMPING = 0.96    // 흔들림이 더 묵직하고 천천히 감쇠하도록 조절
const REST_FORCE = 0.03 // 제자리(수직)로 돌아가려는 복원력 완화 (너무 빳빳하지 않게)
const MAX_VELOCITY = 0.8 // 마우스에 맞아 튕겨나가는 최대 속도 제한

interface Pendulum {
    anchor: THREE.Vector3      // 천장(고정점)
    pos: THREE.Vector3         // 장식의 현재 위치
    velocity: THREE.Vector3    // 속도
    length: number             // 줄 길이
    decorationType: 'star' | 'moon'
    scale: number
    rotationOffset: number     // 장식의 Y축 기본 회전
    color: THREE.Color         // 각 장식의 고유 색조
}

export function HangingForest({ count = 80, areaSize = 35 }: HangingForestProps) {
    const { mouse } = useThree()

    // InstancedMesh 참조
    const linesRef = useRef<THREE.LineSegments>(null)
    const starsRef = useRef<THREE.InstancedMesh>(null)
    const moonsRef = useRef<THREE.InstancedMesh>(null)

    // 1. 단일 진자 숲 데이터 생성
    const pendulums = useMemo(() => {
        const arr: Pendulum[] = []

        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * areaSize
            const z = (Math.random() - 0.5) * areaSize - 10

            // 줄이 끊겨 보이지 않게 하늘 높이(30~45)부터 시작하도록 앵커를 훅 끌어올림
            const roofY = Math.random() * 15 + 30
            const length = Math.random() * 30 + 15   // 줄 길이도 그만큼 비례해서 대폭 연장

            const anchor = new THREE.Vector3(x, roofY, z)
            const pos = new THREE.Vector3(x, roofY - length, z)

            // 별과 달만 사용, 마름모 삭제 (심플한 벡터 스타일)
            const decType = Math.random() > 0.5 ? 'moon' : 'star'

            let color: THREE.Color
            if (decType === 'star') {
                // 별: 영롱하고 따뜻한 샴페인/레몬 골드 보석
                const hue = THREE.MathUtils.lerp(0.1, 0.15, Math.random()) // 주황~노랑
                const sat = THREE.MathUtils.lerp(0.6, 0.9, Math.random())
                const lit = THREE.MathUtils.lerp(0.7, 0.9, Math.random())
                color = new THREE.Color().setHSL(hue, sat, lit)
            } else {
                // 달: 은은하고 창백한 은빛/아이스블루 크리스탈
                const hue = THREE.MathUtils.lerp(0.55, 0.65, Math.random()) // 시안~아이스블루
                const sat = THREE.MathUtils.lerp(0.3, 0.6, Math.random())
                const lit = THREE.MathUtils.lerp(0.8, 0.95, Math.random())
                color = new THREE.Color().setHSL(hue, sat, lit)
            }

            arr.push({
                anchor,
                pos,
                velocity: new THREE.Vector3(0, 0, 0),
                length,
                decorationType: decType,
                scale: Math.random() * 0.3 + 0.3, // 12차 다이어트: 너무 거대했던 부피를 피해 기존 대비 50% 축소
                rotationOffset: Math.random() * Math.PI * 2,
                color
            })
        }
        return arr
    }, [count, areaSize])

    // 2. 버퍼 설정
    const linePositions = useMemo(() => new Float32Array(count * 2 * 3), [count])
    const starColorsArray = useMemo(() => new Float32Array(count * 3), [count])
    const moonColorsArray = useMemo(() => new Float32Array(count * 3), [count])
    const dummy = useMemo(() => new THREE.Object3D(), [])

    // 3. 재질: 영롱하게 빛나고 굴절되는 서브컬처 보석/유리 (Jewel Crystal)
    const jewelMaterial = useMemo(() => {
        return new THREE.MeshPhysicalMaterial({
            color: '#ffffff', // InstancedColor로 개별 착색
            transmission: 0.8, // 유리처럼 맑게 빛을 투과
            opacity: 1,
            transparent: true,
            roughness: 0.1, // 표면을 매끄럽게 하여 쨍한 하이라이트/반사 극대화
            metalness: 0.1,
            ior: 1.5, // 유리 굴절률
            thickness: 0.5, // 굴절을 체감하게 하는 보석 두께감
            clearcoat: 1.0, // 표면 니스 코팅 (영롱한 반짝임)
            clearcoatRoughness: 0.1,
            emissive: '#111111', // 아주 희미한 자체 발광으로 어두운 곳에서도 예쁘게 시인성 확보
            emissiveIntensity: 0.5
        })
    }, [])

    // 얇고 은은한 직선 (점선 느낌 대신 투명하고 얇은 심플라인으로 모던하게)
    const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({
        color: '#ffeab8',
        transparent: true,
        opacity: 0.25,
    }), [])

    // 4. Geometry 생성 (심플하고 납작한 2D 모빌/종이 장식 형태)
    const starGeo = useMemo(() => {
        const shape = new THREE.Shape()
        const innerRadius = 0.4
        const outerRadius = 1.0
        const points = 5 // 정통 5각별 (애니메이션/서브컬처 감성)

        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius
            const angle = (i / (points * 2)) * Math.PI * 2 + (Math.PI / 10) // 꼭지점이 위를 향하도록 회전 보정
            if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
            else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
        }

        // Extrude의 depth를 보석처럼 늘리고, 테두리 커팅(bevel)을 세밀하게.
        const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.04, bevelThickness: 0.08 }
        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
        geom.center() // [중요 픽스] 렌더링 앵커를 정중앙으로 맞춰 선이 끝에서 엇나가는 현상 방지
        return geom
    }, [])

    const moonGeo = useMemo(() => {
        const shape = new THREE.Shape()
        // 완벽하게 깎인 예리한 초승달 (Crescent Moon) 기하학
        shape.moveTo(0, 1)
        // 바깥쪽 둥근 곡선 (크게 돎)
        shape.quadraticCurveTo(1.5, 0, 0, -1)
        // 안쪽 파고드는 곡선 (날카롭게 파고듦)
        shape.quadraticCurveTo(0.5, 0, 0, 1)

        const extrudeSettings = { depth: 0.15, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.04, bevelThickness: 0.08 }
        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings)
        geom.center() // [중요 픽스] 중심점 정렬
        return geom
    }, [])


    // 5. 시뮬레이션 & 렌더링 업데이트 (useFrame)
    const mouseTarget = new THREE.Vector3()

    useFrame((state, delta) => {
        if (!linesRef.current || !starsRef.current || !moonsRef.current) return

        // 탭 복귀 시 폭주 방지
        const dt = Math.min(delta, 0.1)
        const viewport = state.viewport

        mouseTarget.set(
            (mouse.x * viewport.width) / 2,
            (mouse.y * viewport.height) / 2,
            -8 // 마우스 인식 Z-깊이
        )

        let lineIndex = 0
        let starIdx = 0
        let moonIdx = 0

        pendulums.forEach((pend) => {
            // --- 단일 진자 물리 (Straight Pendulum Physics) ---

            // 1) 중력 및 원래 자리(수직)로 돌아가려는 힘
            const restPos = pend.anchor.clone().sub(new THREE.Vector3(0, pend.length, 0))
            const restoreDir = restPos.sub(pend.pos)
            pend.velocity.add(restoreDir.multiplyScalar(REST_FORCE))

            // 2) 마우스 인터랙션 (서서히 휘면서 피하기 - 물속을 젓는 듯한 우아함)
            const distToMouse = pend.pos.distanceTo(mouseTarget)
            if (distToMouse < 4.0) { // 영향 반경
                const repelDir = pend.pos.clone().sub(mouseTarget).normalize()
                // 거리가 너무 가까워도 힘이 무한대로 튀지 않게 조절
                const force = Math.max(0, 4.0 - distToMouse) * 0.03
                pend.velocity.add(repelDir.multiplyScalar(force))
            }

            // 3) 감쇠 및 위치 업데이트 (Maximum Speed Limit 캡핑)
            pend.velocity.multiplyScalar(DAMPING)
            if (pend.velocity.length() > MAX_VELOCITY) {
                pend.velocity.normalize().multiplyScalar(MAX_VELOCITY)
            }
            pend.pos.add(pend.velocity)

            // 4) 길이 제약 (항상 팽팽한 직선 유지 = 구불거림 방지)
            const currentDir = pend.pos.clone().sub(pend.anchor)
            pend.pos.copy(pend.anchor).add(currentDir.normalize().multiplyScalar(pend.length))

            // --- 렌더링 (단 한 개의 완벽한 직선 버퍼) ---
            linePositions[lineIndex++] = pend.anchor.x
            linePositions[lineIndex++] = pend.anchor.y
            linePositions[lineIndex++] = pend.anchor.z

            linePositions[lineIndex++] = pend.pos.x
            linePositions[lineIndex++] = pend.pos.y
            linePositions[lineIndex++] = pend.pos.z


            // 장식(Decoration) 모빌 그리기
            dummy.position.copy(pend.pos)

            // 진자 기울기에 비례하여 모형도 기울리기
            const tiltX = (pend.pos.z - pend.anchor.z) / pend.length
            const tiltZ = (pend.pos.x - pend.anchor.x) / pend.length

            // 심플한 Y축 자전 + 기울기 반영
            dummy.rotation.set(tiltX, state.clock.elapsedTime * 0.2 + pend.rotationOffset, -tiltZ)
            dummy.scale.setScalar(pend.scale)
            dummy.updateMatrix()

            if (pend.decorationType === 'star') {
                const i = starIdx++
                starsRef.current!.setMatrixAt(i, dummy.matrix)
                pend.color.toArray(starColorsArray, i * 3)
            } else {
                const i = moonIdx++
                moonsRef.current!.setMatrixAt(i, dummy.matrix)
                pend.color.toArray(moonColorsArray, i * 3)
            }
        })

        // 라인/인스턴스 버퍼 업데이트
        linesRef.current.geometry.attributes.position.needsUpdate = true
        starsRef.current.instanceMatrix.needsUpdate = true
        moonsRef.current.instanceMatrix.needsUpdate = true
        starsRef.current.geometry.attributes.color.needsUpdate = true
        moonsRef.current.geometry.attributes.color.needsUpdate = true
    })

    // 각 타입별 개수 산출
    const starCount = pendulums.filter(s => s.decorationType === 'star').length
    const moonCount = pendulums.filter(s => s.decorationType === 'moon').length

    return (
        <group>
            {/* 팽팽한 한 가닥의 선들 */}
            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={linePositions.length / 3}
                        array={linePositions}
                        itemSize={3}
                        args={[linePositions, 3]}
                    />
                </bufferGeometry>
                <primitive object={lineMaterial} attach="material" />
            </lineSegments>

            {/* 영롱한 보석 느낌의 일러스트 장식물 - MeshPhysicalMaterial과 기능컬러 적용 */}
            <instancedMesh ref={starsRef} args={[starGeo, jewelMaterial, starCount]} renderOrder={-1}>
                <instancedBufferAttribute attach="geometry-attributes-color" args={[starColorsArray, 3]} />
            </instancedMesh>
            <instancedMesh ref={moonsRef} args={[moonGeo, jewelMaterial, moonCount]} renderOrder={-1}>
                <instancedBufferAttribute attach="geometry-attributes-color" args={[moonColorsArray, 3]} />
            </instancedMesh>
        </group>
    )
}
