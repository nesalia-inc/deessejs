import * as LucideIcons from "lucide-react";

export function getIcon(iconName?: string) {
  if (!iconName) return null;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Icon = icons[iconName];
  return Icon ? <Icon className="size-4" /> : null;
}