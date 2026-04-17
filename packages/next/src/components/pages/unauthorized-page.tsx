import Link from "next/link";
import { Button } from "@deessejs/ui";
import { Card, CardDescription, CardHeader, CardTitle } from "@deessejs/ui";

export interface UnauthorizedPageProps {
  redirectTo?: string;
}

export function UnauthorizedPage({ redirectTo = "/" }: UnauthorizedPageProps) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm mx-auto text-center">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Admin privileges required. You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <Link href={redirectTo}>
            <Button className="w-full">Go Back Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
