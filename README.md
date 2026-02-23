# 원신 팬사이트 — Genshin Impact Fan Website

> **Genshin Impact** 캐릭터 퓨리나(Furina)와 나히다(Nahida)를 주제로 한 팬메이드 인터랙티브 웹사이트입니다.  
> AI 이미지 생성(Midjourney)과 3D 웹 기술을 활용하여 제작했습니다.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Three.js](https://img.shields.io/badge/Three.js-r3f-black?logo=three.js)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)

---

## ✨ 주요 기능

- **3D 인터랙티브 로비** — React Three Fiber 기반 캐릭터 카드 씬
- **몰입형 캐릭터 페이지** — 스크롤 애니메이션, 파티클 텍스트, 커스텀 셰이더
- **글로벌 BGM & SFX** — 씬 전환 시 크로스페이드, 효과음 연동
- **페이지 전환 효과** — 화이트 페이드 트랜지션
- **AI 생성 이미지** — Midjourney로 제작한 캐릭터 일러스트 사용

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| 3D 렌더링 | Three.js, React Three Fiber, Drei |
| 애니메이션 | Framer Motion, GSAP |
| 상태관리 | Zustand |
| 언어 | TypeScript |
| 스타일 | CSS Modules |

---

## 🚀 로컬 실행

```bash
# 1. 레포 클론
git clone https://github.com/elecpure2/Genshin_FanWebsite.git
cd Genshin_FanWebsite

# 2. 패키지 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인하세요.

---

## ⚠️ 누락된 파일 (저작권)

이 레포지토리에는 **저작권 문제로 포함되지 않은 파일**이 있습니다.  
다운로드 후 직접 준비해야 정상 동작합니다.

### BGM 파일 (미호요 공식 음원)

아래 파일들을 `public/bgm/` 폴더에 직접 추가해주세요:

| 파일명 | 설명 |
|---|---|
| `Furina.mp3` | 퓨리나 캐릭터 페이지 배경음악 |
| `Nahida.mp3` | 나히다 캐릭터 페이지 배경음악 |
| `Main.mp3` | 메인 로비 배경음악 |

> 해당 음악은 [원신(Genshin Impact)](https://genshin.hoyoverse.com/) 공식 OST입니다.  
> 저작권은 miHoYo / HoYoverse에 있습니다.

### SFX 파일

효과음(`public/sfx/*.wav`)은 레포지토리에 포함되어 있습니다. ✅

---

## 📁 폴더 구조

```
src/
├── app/                  # Next.js App Router 페이지
│   ├── page.tsx          # 로비 (메인)
│   └── character/[id]/   # 캐릭터 상세 페이지
├── components/
│   ├── canvas/           # Three.js / R3F 3D 컴포넌트
│   └── ui/               # UI 오버레이 컴포넌트
└── store/                # Zustand 전역 상태

public/
├── images/               # 캐릭터 이미지 (AI 생성)
├── bgm/                  # BGM (⚠️ 별도 추가 필요)
└── sfx/                  # 효과음 (포함됨)
```

---

## ⚖️ 저작권 안내

- **원신(Genshin Impact)** 관련 모든 캐릭터, 이름, 설정, 음악의 저작권은 **miHoYo / HoYoverse**에 있습니다.
- 이 프로젝트는 **비상업적 팬 제작물**이며 수익을 목적으로 하지 않습니다.
- 캐릭터 일러스트는 **Midjourney**로 직접 생성한 AI 이미지입니다.

---

*Made with ❤️ using [Gemini](https://gemini.google.com) + [Cursor](https://cursor.sh)*
