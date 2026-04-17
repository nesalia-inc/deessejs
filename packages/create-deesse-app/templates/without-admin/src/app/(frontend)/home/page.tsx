import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { deesseAuth } from "@/lib/deesse";

export default async function HomePage() {
  const session = await deesseAuth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-semibold">Welcome Home</h1>
    </div>
  );
}
