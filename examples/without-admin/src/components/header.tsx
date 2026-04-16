import Image from "next/image";
import Link from "next/link";

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
        <span className="font-semibold text-foreground">DeesseJS</span>
      </Link>
      <nav className="flex items-center gap-4">
        <Link
          href="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
