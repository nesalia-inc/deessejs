import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Represents a static slug segment (e.g., "users")
 */
export interface StaticSlugSegment {
  type: "static";
  value: string;
}

/**
 * Represents a dynamic slug segment (e.g., "[table_slug]")
 */
export interface DynamicSlugSegment {
  type: "dynamic";
  name: string;
}

export type SlugSegment = StaticSlugSegment | DynamicSlugSegment;

/**
 * Parse a slug string into segments.
 * "users" → [{ type: "static", value: "users" }]
 * "database/[table_slug]" → [
 *   { type: "static", value: "database" },
 *   { type: "dynamic", name: "table_slug" }
 * ]
 */
export function parseSlug(slug: string): SlugSegment[] {
  const segments: SlugSegment[] = [];
  const parts = slug.split("/");

  for (const part of parts) {
    const match = part.match(/^\[(.+)\]$/);
    if (match) {
      segments.push({ type: "dynamic", name: match[1] });
    } else {
      segments.push({ type: "static", value: part });
    }
  }

  return segments;
}

/**
 * Extract parameter names from a slug.
 * "database/[table_slug]/[view]" → ["table_slug", "view"]
 */
export function extractParamNames(slug: string): string[] {
  const matches = slug.matchAll(/\[([^\]]+)\]/g);
  return Array.from(matches, (m) => m[1]);
}

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

/**
 * Handler type for Server Pages.
 * Server Pages are async React components that receive Deesse directly.
 * Defined in @deessejs/admin but typed with structural compatibility for Deesse.
 *
 * The actual Deesse type from @deessejs/deesse is:
 * { auth: Auth; database: PostgresJsDatabase }
 * These are structurally compatible.
 */
export type ServerPageHandler = (deesse: {
  auth: unknown;
  database: unknown;
}) => Promise<ReactNode>;

/**
 * Handler type for Client Pages.
 * Client Pages are React components that receive no server context.
 */
export type ClientPageHandler = () => ReactNode;

/**
 * Creates a Server Page with explicit typing.
 *
 * Server Pages:
 * - Are async React components
 * - Receive Deesse as a parameter
 * - Execute on the server only
 * - Have direct access to database and auth
 *
 * @example
 * ```tsx
 * import { serverPage } from "@deessejs/deesse"; // re-exports from admin
 *
 * const UsersPage = serverPage(async (deesse) => {
 *   const { database } = deesse;
 *   const users = await database.select().from(schema.users);
 *   return <UsersTable users={users} />;
 * });
 * ```
 */
export function serverPage(handler: ServerPageHandler): ServerPageHandler {
  return handler;
}

/**
 * Creates a Client Page with explicit typing.
 *
 * Client Pages:
 * - Are React components (with "use client" directive)
 * - Receive no Deesse instance
 * - Execute on the client only
 * - Must use HTTP calls to access data
 *
 * @example
 * ```tsx
 * import { clientPage } from "@deessejs/deesse"; // re-exports from admin
 *
 * const StatsChart = clientPage(() => {
 *   const [data, setData] = useState([]);
 *   useEffect(() => {
 *     fetch("/api/stats").then(r => r.json()).then(setData);
 *   }, []);
 *   return <Chart data={data} />;
 * });
 * ```
 *
 * Note: The "use client" directive must be added to the file containing
 * the component returned by this function.
 */
export function clientPage(handler: ClientPageHandler): ClientPageHandler {
  return handler;
}

/**
 * Dynamic page content type - a function that receives params and returns ReactNode
 */
export type DynamicPageContent<
  TParams extends Record<string, string> = Record<string, string>,
> = (params: TParams) => ReactNode | null;

/**
 * Creates a page with dynamic segments and type-safe params.
 *
 * @example
 * ```tsx
 * const TablePage = dynamicPage({
 *   name: "Table View",
 *   slug: "database/[table_slug]",
 *   icon: Database,
 *   content: (params) => (
 *     <TableView tableName={params.table_slug} />
 *   ),
 * });
 * ```
 */
export function dynamicPage<TParams extends Record<string, string>>(
  config: {
    name: string;
    slug: string;
    icon?: LucideIcon;
    content: DynamicPageContent<TParams>;
  }
): Page {
  return {
    type: "page",
    name: config.name,
    slug: config.slug,
    icon: config.icon,
    content: config.content as unknown as ReactNode,
  };
}
