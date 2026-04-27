"use client";

import type { InputHTMLAttributes } from "react";
import { forwardRef, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Button, Input } from "@deessejs/ui";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className: _className, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className="pr-10"
        ref={ref}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-0 hover:bg-transparent"
        onClick={() => setShowPassword(!showPassword)}
        disabled={props.disabled}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
