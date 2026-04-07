import Image from "next/image";
import Link from "next/link";
import { deesse } from "@/lib/deesse";

export default async function Home() {
  // Verify deesse instance is properly initialized
  const hasDatabase = !!deesse?.database;
  const hasAuth = !!deesse?.auth;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          src="/nesalia.svg"
          alt="Nesalia logo"
          width={100}
          height={100}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            DeesseJS Example
          </h1>
          <div className="flex flex-col gap-3 text-lg">
            <p className="text-zinc-600 dark:text-zinc-400">
              Database initialized:{" "}
              <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                {hasDatabase ? "Yes" : "No"}
              </code>
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              Auth initialized:{" "}
              <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                {hasAuth ? "Yes" : "No"}
              </code>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://deessejs.com/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="/admin"
          >
            Admin Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
