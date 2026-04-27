// Table view page - server component that fetches data directly
import { getDeesse, sql } from "deesse";
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@deessejs/ui";
import { Database } from "lucide-react";

type TableData = {
  tableName: string;
  rows: Record<string, unknown>[];
  columns: string[];
};

async function fetchTableData(tableName: string): Promise<TableData> {
  const { database } = await getDeesse();

  // Validate table name against whitelist
  const validTablesResult = await database.execute<{ table_name: string }>(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const validTables = validTablesResult.rows.map(
    (r: { table_name: string }) => r.table_name
  );

  if (!validTables.includes(tableName)) {
    throw new Error(`Table "${tableName}" not found`);
  }

  // Get column info
  const columnsResult = await database.execute<{
    column_name: string;
  }>(
    sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `
  );
  const columns = columnsResult.rows.map(
    (r: { column_name: string }) => r.column_name
  );

  // Get table data
  const dataResult = await database.execute<Record<string, unknown>>(
    sql`SELECT * FROM ${sql.identifier(tableName)} LIMIT 100`
  );

  return {
    tableName,
    rows: dataResult.rows,
    columns,
  };
}

export async function TableViewPage(props: { tableName?: string }) {
  const tableName = props.tableName;

  if (!tableName) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Table View</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          No table specified
        </div>
      </div>
    );
  }

  let data: TableData;
  try {
    data = await fetchTableData(tableName);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">{tableName}</h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{data.tableName}</h1>
      </div>

      {data.rows.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          This table is empty
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {data.columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row, index) => (
                <TableRow key={index}>
                  {data.columns.map((column) => (
                    <TableCell key={column}>
                      {formatCellValue(row[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {data.rows.length} row{data.rows.length !== 1 ? "s" : ""}
        {data.rows.length === 100 && " (limited to 100)"}
      </p>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}