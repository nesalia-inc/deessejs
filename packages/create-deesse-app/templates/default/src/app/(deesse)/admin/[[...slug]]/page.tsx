import { RootPage } from "@deessejs/next";
import { config } from "@deesse-config";
import { auth } from "@/lib/auth";

interface AdminPageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) as Record<string, string | string[]>;

  return (
    <RootPage
      config={config}
      auth={auth}
      params={resolvedParams}
      searchParams={resolvedSearchParams}
    />
  );
}