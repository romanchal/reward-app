function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

interface ReceiptInput {
  id: string;
  amount: number;
  currency: string;
  method: string;
  referenceId: string;
  notes?: string | null;
  status: string;
  createdAt: Date | string;
  approvedAt?: Date | string | null;
  user?: { name: string; email: string } | null;
}

export function receiptHtml(p: ReceiptInput): string {
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.amount);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>Receipt ${esc(p.referenceId)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 32px auto; padding: 24px; color: #111; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  th { color: #666; font-weight: 500; width: 40%; }
  .amount { font-size: 32px; font-weight: 700; margin: 16px 0; }
  .status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .status-APPROVED { background: #dcfce7; color: #166534; }
  .status-PENDING_APPROVAL { background: #fef3c7; color: #92400e; }
  .status-REJECTED { background: #fee2e2; color: #991b1b; }
  .foot { margin-top: 32px; color: #888; font-size: 12px; }
  @media print { body { margin: 0; } }
</style></head>
<body>
<h1>Payment receipt</h1>
<div class="meta">Reward App · demo mode</div>
<div class="amount">${esc(amount)}</div>
<span class="status status-${esc(p.status)}">${esc(p.status)}</span>
<table>
  <tr><th>Reference ID</th><td>${esc(p.referenceId)}</td></tr>
  <tr><th>Method</th><td>${esc(p.method)}</td></tr>
  <tr><th>User</th><td>${esc(p.user?.name)} &lt;${esc(p.user?.email)}&gt;</td></tr>
  <tr><th>Created</th><td>${esc(new Date(p.createdAt).toISOString())}</td></tr>
  ${p.approvedAt ? `<tr><th>Approved</th><td>${esc(new Date(p.approvedAt).toISOString())}</td></tr>` : ''}
  ${p.notes ? `<tr><th>Notes</th><td>${esc(p.notes)}</td></tr>` : ''}
  <tr><th>Receipt ID</th><td>${esc(p.id)}</td></tr>
</table>
<div class="foot">Print this page to save as PDF. Receipts for demo payments only.</div>
</body></html>`;
}
