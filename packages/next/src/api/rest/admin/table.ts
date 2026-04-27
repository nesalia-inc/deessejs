import { NextResponse } from "next/server";
import { getDeesse, sql } from "deesse";

/**
 * GET /api/admin/database/[table_slug]
 * Returns table data for the specified table name.
 */
export async function GETTableData(
  _request: Request,
  { params }: { params: Promise<{ table_slug: string }> }
) {
  const { table_slug } = await params;

  if (!table_slug) {
    return NextResponse.json(
      { error: "Table name is required" },
      { status: 400 }
    );
  }

  try {
    const { database } = await getDeesse();

    // Validate table name against whitelist
    const validTablesResult = await database.execute<{ table_name: string }>(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const validTables = validTablesResult.rows.map(
      (r: { table_name: string }) => r.table_name
    );

    if (!validTables.includes(table_slug)) {
      return NextResponse.json(
        { error: `Table "${table_slug}" not found` },
        { status: 404 }
      );
    }

    // Get column info
    const columnsResult = await database.execute<{
      column_name: string;
      data_type: string;
    }>(
      sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table_slug}
        ORDER BY ordinal_position
      `
    );
    const columns = columnsResult.rows.map(
      (r: { column_name: string }) => r.column_name
    );

    // Get table data
    const dataResult = await database.execute<Record<string, unknown>>(
      sql`SELECT * FROM ${sql.identifier(table_slug)} LIMIT 100`
    );

    return NextResponse.json({
      tableName: table_slug,
      columns,
      rows: dataResult.rows,
    });
  } catch (error) {
    console.error("[deesse] Error fetching table data:", error);
    return NextResponse.json(
      { error: "Failed to fetch table data" },
      { status: 500 }
    );
  }
}
