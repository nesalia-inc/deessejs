"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { client } from "@/lib/client"

export function Header() {
  const router = useRouter()
  const { data: session, isPending } = client.auth.useSession()
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false)

  const handleSignOut = async () => {
    await client.auth.signOut()
    router.push("/")
  }

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
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/home">Dashboard</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="cursor-pointer">
                    <AvatarFallback>
                      {session.user.name?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setShowLogoutDialog(true)}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to sign out?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOut}>Sign out</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
