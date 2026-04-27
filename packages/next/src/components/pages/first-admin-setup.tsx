"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";

import { Button, Input, Label } from "@deessejs/ui";

import { PasswordInput } from "./password-input";

export const FirstAdminSetup = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/first-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json() as { message?: string };

      if (response.ok) {
        router.push("/admin/login?created=true");
      } else {
        setError(data.message || "Failed to create admin user");
        setIsPending(false);
      }
    } catch {
      setError("An error occurred. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="flex" style={{ height: "100vh" }}>
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Create First Admin</h1>
            <p className="text-sm text-muted-foreground">
              No admin users exist yet. Create your first admin account to get started.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Admin User"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                name="password"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                disabled={isPending}
              />
            </div>
            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Admin"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
