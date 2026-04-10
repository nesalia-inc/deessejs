import type { Config } from "deesse";

export function RootLayout({ children }: { config: Config; children: React.ReactNode }) {
  // Minimal HTML shell - no AdminShell here
  // AdminShell is rendered by RootPage when needed
  return (
    <div className="min-h-screen h-full flex flex-col">
      {children}
    </div>
  );
}
