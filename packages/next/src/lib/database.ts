import { sql } from "deesse";

/**
 * Information about a database table column.
 */
export interface ColumnInfo {
  name: string;
  dataType: string;
}

/**
 * Result of a table query.
 */
export interface TableQueryResult {
  rows: Record<string, unknown>[];
  fields: ColumnInfo[];
}

/**
 * Get list of valid table names from the public schema.
 * Used for validating dynamic table routes.
 */
export async function getValidTables(
  database: unknown
): Promise<string[]> {
  const db = database as {
    execute: (query: ReturnType<typeof sql>) => Promise<{
      rows: Array<{ table_name: string }>;
    }>;
  };

  const result = await db.execute(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );

  return result.rows.map((r) => r.table_name);
}

/**
 * Get the schema (columns) for a specific table.
 */
export async function getTableSchema(
  database: unknown,
  tableName: string
): Promise<ColumnInfo[]> {
  const db = database as {
    execute: (query: ReturnType<typeof sql>) => Promise<{
      rows: Array<{
        column_name: string;
        data_type: string;
      }>;
    }>;
  };

  const result = await db.execute(
    sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `
  );

  return result.rows.map((r) => ({
    name: r.column_name,
    dataType: r.data_type,
  }));
}

/**
 * Execute a SELECT * query on a table with a LIMIT.
 * Use this for browsing table data.
 */
export async function queryTable(
  database: unknown,
  tableName: string,
  limit: number = 100
): Promise<TableQueryResult> {
  const db = database as {
    execute: (query: ReturnType<typeof sql>) => Promise<{
      rows: Record<string, unknown>[];
      fields: { name: string }[];
    }>;
  };

  // Validate table name to prevent SQL injection
  const validTables = await getValidTables(database);
  if (!validTables.includes(tableName)) {
    throw new Error(`Table "${tableName}" does not exist`);
  }

  // Use sql.identifier for safe table name
  const result = await db.execute(
    sql`SELECT * FROM ${sql.identifier(tableName)} LIMIT ${limit}`
  );

  return {
    rows: result.rows,
    fields: result.fields.map((f) => ({
      name: f.name,
      dataType: "unknown", // Drizzle doesn't expose column types in results
    })),
  };
}

/**
 * Validate that a table name exists and is safe to query.
 * Throws if the table doesn't exist.
 */
export async function validateTableName(
  database: unknown,
  tableName: string
): Promise<boolean> {
  const validTables = await getValidTables(database);
  if (!validTables.includes(tableName)) {
    return false;
  }
  return true;
}
