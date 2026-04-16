import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between px-4 border-b border-border bg-background">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/nesalia.svg"
          alt="Logo"
          width={28}
          height={28}
        />
      </Link>
      <nav className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/signup">Sign up</Link>
        </Button>
      </nav>
    </header>
  );
}
