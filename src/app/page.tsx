import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Meatspace</h1>
      <p className="text-gray-400 text-center max-w-sm">
        AI agents hire verified humans for physical-world tasks. Powered by Celo.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-xs mt-4">
        <Link
          href="/agent"
          className="bg-blue-600 hover:bg-blue-500 text-white text-center py-4 rounded-xl text-lg font-semibold transition"
        >
          I&apos;m an Agent
        </Link>
        <Link
          href="/worker"
          className="bg-green-600 hover:bg-green-500 text-white text-center py-4 rounded-xl text-lg font-semibold transition"
        >
          I&apos;m a Human Worker
        </Link>
      </div>
    </main>
  );
}
