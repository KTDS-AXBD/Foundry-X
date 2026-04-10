/**
 * F493: TableBlock — TableSchema 렌더러 (가독성 개선: 패딩↑, whitespace-pre-line, min-width)
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
    <div className="space-y-1.5">
      {table.caption && (
        <p className="text-xs text-muted-foreground">{table.caption}</p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-[13px] border-collapse min-w-[28rem]">
          <thead>
            <tr className="bg-muted/60">
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left px-3 py-2.5 font-semibold text-foreground/90 border-b whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr
                key={i}
                className={
                  row.highlight
                    ? "bg-[color-mix(in_srgb,var(--discovery-mint-bg)_60%,transparent)]"
                    : i % 2 === 1
                      ? "bg-muted/20"
                      : ""
                }
              >
                {row.cells.map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-2.5 border-b border-border/40 text-foreground/90 align-top leading-relaxed whitespace-pre-line"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
