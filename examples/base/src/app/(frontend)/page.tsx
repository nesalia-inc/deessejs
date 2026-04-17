import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-start justify-center py-32 px-16 bg-white dark:bg-black gap-8">
        <Image
          src="/nesalia.svg"
          alt="Nesalia logo"
          width={100}
          height={100}
          priority
        />
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <Link
              href="https://deessejs.com"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Documentation
            </Link>{" "}
            or the{" "}
            <Link
              href="https://deessejs.com"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Guide
            </Link>
            .
          </p>
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
            <Button variant="outline" size="lg" asChild>
              <Link
                href="https://deessejs.com/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </Link>
            </Button>
            <Button size="lg" asChild>
              <Link href="/admin">
                Admin Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
