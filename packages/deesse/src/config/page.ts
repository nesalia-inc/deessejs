import type { ReactNode } from "react";

export type Page = {
  type: "page";
  name: string;
  slug: string;
  content: ReactNode;
};

export type Section = {
  type: "section";
  name: string;
  slug: string;
  children: PageTree[];
};

export type PageTree = Page | Section;

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function page(config: {
  name: string;
  slug?: string;
  content: ReactNode;
}): Page {
  return {
    type: "page",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    content: config.content,
  };
}

export function section(config: {
  name: string;
  slug?: string;
  children: PageTree[];
}): Section {
  return {
    type: "section",
    name: config.name,
    slug: config.slug ?? toSlug(config.name),
    children: config.children,
  };
}
