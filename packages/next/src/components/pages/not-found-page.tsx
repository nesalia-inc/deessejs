export interface NotFoundPageProps {
  slug: string;
}

export function NotFoundPage({ slug }: NotFoundPageProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        The page &quot;{slug}&quot; does not exist.
      </p>
    </div>
  );
}
