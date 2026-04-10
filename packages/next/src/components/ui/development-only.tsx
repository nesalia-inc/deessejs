"use client";

interface DevelopmentOnlyProps {
  children: React.ReactNode;
}

export function DevelopmentOnly({ children }: DevelopmentOnlyProps) {
  if (process.env["NODE_ENV"] !== "development") {
    return null;
  }
  return <>{children}</>;
}
