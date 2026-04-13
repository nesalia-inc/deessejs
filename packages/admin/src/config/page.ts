import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type Page = {
  type: "page";
  name: string;
  slug: string;
  icon?: LucideIcon;
  content: ReactNode | null;
};

export type Section = {
  type: "section";
  name: string;
  slug: string;
  bottom?: boolean;
  children: PageTree[];
};

export type PageTree = Page | Section;

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function page(config: {
  name: string;
  slug?: string;
  icon?: LucideIcon;
  content: ReactNode | null;
}): Page {
  return {
    type: "page",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    icon: config.icon,
    content: config.content,
  };
}

export function section(config: {
  name: string;
  slug?: string;
  bottom?: boolean;
  children: PageTree[];
}): Section {
  return {
    type: "section",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    bottom: config.bottom,
    children: config.children,
  };
}
