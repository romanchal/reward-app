export interface Column<T> { key: string; label: string; render?: (row: T) => React.ReactNode }
export function DataTable<T extends { id?: string | number }>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <table className="data-table">
      <thead>
        <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={(r.id as any) ?? i}>
            {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : (r as any)[c.key]}</td>)}
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={columns.length} className="muted">No data</td></tr>}
      </tbody>
    </table>
  );
}
