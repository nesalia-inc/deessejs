// Database page - displays database tables
import { getDeesse, sql } from "deesse";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@deessejs/ui";
import { Database } from "lucide-react";

type TableInfo = {
  table_name: string;
  table_schema: string;
};

export const DatabasePage = async () => {
  const { database } = await getDeesse();

  // Query information_schema to get list of tables
  const result = await database.execute<TableInfo>(
    sql`SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );

  const tables: TableInfo[] = result.rows;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Database</h1>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table Name</TableHead>
              <TableHead>Schema</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((table: TableInfo) => (
              <TableRow key={`${table.table_schema}.${table.table_name}`}>
                <TableCell className="font-medium">
                  <a
                    href={`/admin/database/${table.table_name}`}
                    className="hover:underline"
                  >
                    {table.table_name}
                  </a>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {table.table_schema}
                </TableCell>
              </TableRow>
            ))}
            {tables.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No tables found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {tables.length} table{tables.length !== 1 ? "s" : ""} in public schema
      </p>
    </div>
  );
};
