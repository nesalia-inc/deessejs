"use client";

import Link from "next/link";
import { client } from "@/lib/auth-client";

export function SessionStatus() {
  const { data: session, isPending } = client.auth.useSession();

  if (isPending) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Loading session...
      </p>
    );
  }

  if (session) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-zinc-600 dark:text-zinc-400">
          Status:{" "}
          <code className="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
            Logged in
          </code>
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          User: <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{session.user?.email}</code>
        </p>
        <button
          onClick={() => client.auth.signOut()}
          className="flex h-10 w-fit items-center justify-center rounded-full border border-solid border-red-200 px-4 text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-zinc-600 dark:text-zinc-400">
        Status:{" "}
        <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
          Not logged in
        </code>
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => client.auth.signIn.email({
            email: "admin@example.com",
            password: "password123",
          })}
          className="flex h-10 w-fit items-center justify-center rounded-full border border-solid border-black/[.08] px-4 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Sign In (Demo)
        </button>
        <Link
          href="/admin"
          className="flex h-10 w-fit items-center justify-center rounded-full border border-solid border-black/[.08] px-4 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Go to Admin
        </Link>
      </div>
    </div>
  );
}
