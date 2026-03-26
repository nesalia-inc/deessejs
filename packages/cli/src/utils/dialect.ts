/**
 * Dialect detection utility
 *
 * Detects the database dialect from a Drizzle database instance.
 * Supports PostgreSQL, MySQL, and SQLite.
 */

export type Dialect = 'postgresql' | 'mysql' | 'sqlite';

/**
 * Detect the database dialect from a Drizzle database instance
 */
export function detectDialect(db: unknown): Dialect {
  if (!db || typeof db !== 'object') {
    throw new Error('Invalid database instance');
  }

  const dbObj = db as Record<string, Record<string, unknown>>;
  const client = dbObj['$client'];

  if (!client) {
    throw new Error('Invalid database instance: no $client');
  }

  // For pg Pool - has query method
  if (
    client['query'] !== undefined &&
    typeof client['query'] === 'function'
  ) {
    return 'postgresql';
  }

  // For postgres-js client - has options
  if (
    client['options'] !== undefined
  ) {
    return 'postgresql';
  }

  // For mysql2 - has connection
  if (
    client['connection'] !== undefined &&
    client['query'] === undefined
  ) {
    return 'mysql';
  }

  // For SQLite (better-sqlite3 or libsql)
  if (
    client['name'] === 'sqlite' ||
    client['open'] !== undefined
  ) {
    return 'sqlite';
  }

  // Default to PostgreSQL as it's the most common
  return 'postgresql';
}

/**
 * Get connection credentials from a database instance
 */
export interface ConnectionCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getConnectionCredentials(db: unknown): ConnectionCredentials {
  const dbObj = db as Record<string, Record<string, unknown>>;
  const client = dbObj['$client'] as Record<string, Record<string, unknown> | string | number> | undefined;

  if (!client) {
    throw new Error('Cannot extract connection credentials: database instance has no $client');
  }

  // For pg Pool - has connectionParameters
  if (client['connectionParameters']) {
    const params = client['connectionParameters'] as Record<string, string | number>;
    return {
      host: String(params['host'] ?? 'localhost'),
      port: Number(params['port'] ?? 5432),
      user: String(params['user'] ?? 'postgres'),
      password: String(params['password'] ?? ''),
      database: String(params['database'] ?? 'postgres'),
    };
  }

  // For postgres-js
  if (client['options']) {
    const options = client['options'] as Record<string, string | number>;
    return {
      host: String(options['host'] ?? 'localhost'),
      port: Number(options['port'] ?? 5432),
      user: String(options['user'] ?? 'postgres'),
      password: String(options['password'] ?? ''),
      database: String(options['database'] ?? 'postgres'),
    };
  }

  // For mysql2
  if (client['connection']) {
    const conn = client['connection'] as Record<string, string | number>;
    return {
      host: String(conn['host'] ?? 'localhost'),
      port: Number(conn['port'] ?? 3306),
      user: String(conn['user'] ?? 'root'),
      password: String(conn['password'] ?? ''),
      database: String(conn['database'] ?? 'mysql'),
    };
  }

  throw new Error('Cannot determine connection credentials from database client');
}
