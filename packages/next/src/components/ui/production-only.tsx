"use client";

interface ProductionOnlyProps {
  children: React.ReactNode;
}

export const ProductionOnly = ({ children }: ProductionOnlyProps) => {
  if (process.env["NODE_ENV"] !== "production") {
    return null;
  }
  return <>{children}</>;
};
