import Link from "next/link";

const GAMES = [
  {
    slug: "suika",
    title: "Suika",
    description: "과일을 떨어뜨려 합치는 머지 퍼즐",
  },
  {
    slug: "animal-tower",
    title: "Animal Tower",
    description: "동물 블록을 쌓아 올리는 밸런스 게임",
  },
  {
    slug: "memory",
    title: "Memory",
    description: "같은 그림을 기억해 짝 맞추는 카드 게임",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-bold">Web Games</h1>
      <p className="mt-2 text-base text-white/50">Phaser로 만든 미니 게임 모음</p>

      <ul className="mt-10 flex flex-col gap-3">
        {GAMES.map((game) => (
          <li key={game.slug}>
            <Link
              href={`/${game.slug}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition-colors hover:bg-white/10"
            >
              <span>
                <span className="block font-semibold">{game.title}</span>
                <span className="block text-sm text-white/50">
                  {game.description}
                </span>
              </span>
              <span className="text-white/40">→</span>
            </Link>
          </li>
        ))}
      </ul>

      <footer className="mt-10 text-sm text-white/30">
        <Link
          href="https://github.com/leafril/web-games"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-white/60"
        >
          GitHub
        </Link>
      </footer>
    </main>
  );
}
