import { RootPage } from "@deessejs/next";
import { config } from "@deesse-config";

interface AdminPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const resolvedParams = await params;

  return (
    <RootPage
      config={config}
      params={resolvedParams}
    />
  );
}
