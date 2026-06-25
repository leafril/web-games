import Link from "next/link";

const GAMES = [
  {
    slug: "suika",
    title: "Suika",
    description: "과일을 떨어뜨려 합치는 머지 퍼즐",
    emoji: "🍉",
  },
  {
    slug: "animal-tower",
    title: "Animal Tower",
    description: "동물 블록을 쌓아 올리는 밸런스 게임",
    emoji: "🐘",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-4xl font-bold">Web Games</h1>
      <p className="mb-12 text-base text-white/60">
        Phaser로 만든 미니 게임 모음
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((game) => (
          <li key={game.slug}>
            <Link
              href={`/${game.slug}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/30 hover:bg-white/10"
            >
              <span className="mb-3 block text-5xl">{game.emoji}</span>
              <span className="mb-1 block text-xl font-semibold">
                {game.title}
              </span>
              <span className="block text-sm text-white/60">
                {game.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
