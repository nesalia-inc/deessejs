"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { client } from "@/lib/client"

export function Header() {
  const { data: session, isPending } = client.auth.useSession()

  if (isPending) {
    return (
      <header className="flex h-14 items-center border-b border-border bg-background">
        <div className="flex items-center justify-between w-full px-4 mx-auto max-w-7xl">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/nesalia.svg"
              alt="Logo"
              width={36}
              height={36}
              loading="eager"
            />
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="flex h-14 items-center border-b border-border bg-background">
      <div className="flex items-center justify-between w-full px-4 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/nesalia.svg"
            alt="Logo"
            width={36}
            height={36}
            loading="eager"
          />
        </Link>
        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/home">Dashboard</Link>
              </Button>
              <Avatar>
                <AvatarFallback>
                  {session.user.name?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
