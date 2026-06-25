# Web Games

Phaser로 만든 미니 게임 모음. Next.js 15 + TypeScript + Tailwind CSS 4.

## 게임

- **Suika** (`/suika`) — 과일을 떨어뜨려 합치는 머지 퍼즐
- **Animal Tower** (`/animal-tower`) — 동물 블록을 쌓아 올리는 밸런스 게임

## 개발

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # 프로덕션 빌드
pnpm typecheck
```

## 구조

```
src/
├── app/                 # Next.js App Router (라우트 진입점)
├── games/
│   ├── suika/
│   └── animal-tower/
└── shared/              # 게임 공용 엔진 유틸
```

## 에셋

게임 아트·사운드·BGM은 직접 제작하거나 라이선스를 구매한 것입니다.
BGM은 [Mureka](https://mureka.ai) AI 음악(소유권 보유).
