import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
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
            Get Started
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Welcome to DeesseJS. Create your first admin user to access the dashboard.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" asChild>
            <Link
              href="https://deessejs.com/docs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin">
              Admin Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
