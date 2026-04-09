/**
 * F493: TableBlock — TableSchema 렌더러
 */
interface TableRow {
  cells: string[];
  highlight?: boolean;
}

interface TableData {
  headers: string[];
  rows: TableRow[];
  caption?: string;
}

interface TableBlockProps {
  table: TableData;
}

export function TableBlock({ table }: TableBlockProps) {
  return (
    <div className="overflow-x-auto">
      {table.caption && (
        <p className="text-xs text-muted-foreground mb-1">{table.caption}</p>
      )}
      <table className="w-full text-sm border border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {table.headers.map((h, i) => (
              <th key={i} className="text-left p-2 border font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className={row.highlight ? "bg-accent/30" : ""}>
              {row.cells.map((cell, j) => (
                <td key={j} className="p-2 border">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
