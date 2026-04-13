import { RootLayout } from "@deessejs/next/root-layout";
import { config } from "@deesse-config";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RootLayout config={config}>{children}</RootLayout>;
}