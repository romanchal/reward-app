export function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase();
  return <span className={`pill pill-${key}`}>{status}</span>;
}
