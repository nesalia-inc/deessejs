"use client";

import { Button } from "@deessejs/ui";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@deessejs/ui";

export interface AdminNotConfiguredProps {
  onSetupClick?: () => void;
}

export function AdminNotConfigured({ onSetupClick }: AdminNotConfiguredProps) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm mx-auto text-center">
        <CardHeader>
          <CardTitle>Admin Not Configured</CardTitle>
          <CardDescription>
            No admin user has been configured yet. Please set up an admin account to access the dashboard.
          </CardDescription>
        </CardHeader>
        {onSetupClick && (
          <div className="px-6 pb-6">
            <Button onClick={onSetupClick} className="w-full">
              Set Up Admin
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
