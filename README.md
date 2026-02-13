# Genshin Impact FanWeb (Prototype)

푸리나 우선 버전의 캐릭터 소개 페이지 프로토타입입니다.

## 실행 방법 (가장 쉬움)

1. 터미널에서 프로젝트 폴더로 이동
2. 아래 명령 실행:

```bash
python -m http.server 5500
```

3. 브라우저에서 `http://localhost:5500` 접속

## 포함된 기능

- 푸리나 중심의 모던/클린 첫 화면
- 상단 Characters 메뉴 기반 캐릭터 전환 (`Furina`, `Nahida`)
- 탭 전환 시 전역 테마(배경/배너/버튼/텍스트) 부드러운 변경
- 푸리나 이미지 자동 배경 제거 결과물 사용

## 자동 배경 제거 다시 실행

```bash
python tools/extract_furina_cutouts.py
```
