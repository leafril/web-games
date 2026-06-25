import Link from "next/link";

export default function AnimalTowerPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-2xl font-semibold">🐘 Animal Tower</p>
      <p className="text-white/60">게임 포팅 준비 중</p>
      <Link href="/" className="text-sm text-white/40 underline">
        ← 메뉴로
      </Link>
    </main>
  );
}
