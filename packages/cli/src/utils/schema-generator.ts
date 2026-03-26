/**
 * Schema generator utility
 *
 * Converts introspected database schema JSON to TypeScript code.
 * This is used by db:introspect to generate a schema.ts file.
 */

import type { Dialect } from './dialect.js';

interface IntrospectedTable {
  name: string;
  schema?: string;
  columns: Array<{
    name: string;
    type: string;
    isNullable: boolean;
    isArray?: boolean;
    default?: string | null;
    primaryKey?: boolean;
    unique?: boolean;
  }>;
}

// Mapping of PostgreSQL column types to Drizzle column types
const PG_TYPE_TO_DRIZZLE: Record<string, string> = {
  // Numeric types
  'integer': 'integer',
  'bigint': 'bigint',
  'smallint': 'smallint',
  'numeric': 'numeric',
  'decimal': 'decimal',
  'real': 'real',
  'double precision': 'doublePrecision',
  'serial': 'serial',
  'bigserial': 'bigserial',
  'smallserial': 'smallserial',

  // Character types
  'character varying': 'varchar',
  'varchar': 'varchar',
  'character': 'char',
  'char': 'char',
  'text': 'text',

  // Date/time types
  'timestamp': 'timestamp',
  'timestamp without time zone': 'timestamp',
  'timestamp with time zone': 'timestamp',
  'date': 'date',
  'time': 'time',
  'time without time zone': 'time',
  'time with time zone': 'time',
  'interval': 'interval',

  // Boolean
  'boolean': 'boolean',

  // UUID
  'uuid': 'uuid',

  // JSON types
  'json': 'json',
  'jsonb': 'jsonb',

  // Binary
  'bytea': 'bytea',

  // Array types (simplified)
  'array': 'array',

  // Network types
  'inet': 'inet',
  'cidr': 'cidr',
  'macaddr': 'macaddr',
  'macaddr8': 'macaddr8',

  // Other
  'money': 'money',
  'bit': 'bit',
  'bit varying': 'varbit',
  'xml': 'xml',
  'point': 'point',
  'line': 'line',
  'lseg': 'lseg',
  'box': 'box',
  'path': 'path',
  'polygon': 'polygon',
  'circle': 'circle',
};

function mapColumnType(pgType: string, isArray: boolean): string {
  let drizzleType = PG_TYPE_TO_DRIZZLE[pgType.toLowerCase()];

  if (!drizzleType) {
    // For unknown types, use a placeholder or the original type
    console.warn(`Unknown PostgreSQL type: ${pgType}, using 'text' as fallback`);
    drizzleType = 'text';
  }

  if (isArray) {
    return `(${drizzleType}())`;
  }

  return drizzleType;
}

function generateColumn(column: {
  name: string;
  type: string;
  isNullable: boolean;
  isArray?: boolean;
  default?: string | null;
  primaryKey?: boolean;
  unique?: boolean;
}): string {
  const { name, type, isNullable, isArray, default: defaultValue, primaryKey, unique } = column;

  const columnName = name.includes(' ') || name.includes('-')
    ? `"${name}"`
    : `'${name}'`;

  let line = `  ${name.includes(' ') || name.includes('-') ? `"${name}"` : name}: ${mapColumnType(type, isArray ?? false)}(${columnName})`;

  if (!isNullable) {
    line += '.notNull()';
  }

  if (defaultValue !== undefined && defaultValue !== null) {
    // Handle different default value formats
    if (defaultValue === 'now()' || defaultValue === 'CURRENT_TIMESTAMP') {
      line += '.defaultNow()';
    } else if (defaultValue === 'true' || defaultValue === 'false') {
      line += `.default(${defaultValue})`;
    } else if (!isNaN(Number(defaultValue))) {
      line += `.default(${defaultValue})`;
    } else {
      line += `.default('${String(defaultValue).replace(/'/g, "\\'")}')`;
    }
  }

  if (primaryKey) {
    line += '.primaryKey()';
  }

  if (unique && !primaryKey) {
    line += '.unique()';
  }

  return line;
}

function generateTable(table: IntrospectedTable): string {
  const lines: string[] = [];

  // Determine table reference based on dialect
  const tableRef = 'pgTable';
  const importStatement = "import { pgTable } from 'drizzle-orm/pg-core';";

  lines.push(importStatement);
  lines.push('');

  const tableName = table.name.includes(' ') || table.name.includes('-')
    ? `"${table.name}"`
    : `'${table.name}'`;

  lines.push(`export const ${table.name} = ${tableRef}(${tableName}, {`);
  lines.push('  columns: {');

  for (const column of table.columns) {
    lines.push(generateColumn(column) + ',');
  }

  lines.push('  },');
  lines.push('});');

  return lines.join('\n');
}

export function generateSchema(
  schema: { tables?: IntrospectedTable[] },
  dialect: Dialect
): string {
  const lines: string[] = [];

  // Add header
  lines.push('/**');
  lines.push(' * Auto-generated schema file');
  lines.push(` * Dialect: ${dialect}`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(' */');
  lines.push('');

  // Add import
  if (dialect === 'postgresql') {
    lines.push("import { pgTable, text, integer, timestamp, boolean, uuid, jsonb, varchar } from 'drizzle-orm/pg-core';");
  } else if (dialect === 'mysql') {
    lines.push("import { mysqlTable, text, int, timestamp, boolean, varchar } from 'drizzle-orm/mysql-core';");
  } else {
    lines.push("import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';");
  }
  lines.push('');

  // Generate tables
  const tables = schema.tables ?? [];

  for (let i = 0; i < tables.length; i++) {
    lines.push(generateTable(tables[i]));

    if (i < tables.length - 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
}
