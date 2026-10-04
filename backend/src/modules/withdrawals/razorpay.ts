import crypto from 'node:crypto';
import { HttpError } from '../../lib/http-error';

const API = 'https://api.razorpay.com/v1';

function creds() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const account = process.env.RAZORPAY_ACCOUNT_NUMBER;
  return { keyId, keySecret, account };
}

export function isConfigured() {
  const { keyId, keySecret, account } = creds();
  return Boolean(keyId && keySecret && account);
}

export interface PayoutRequest {
  withdrawalId: string;
  amount: number;
  currency: string;
  method: string;
  recipient: string;
  idempotencyKey: string;
}

export interface PayoutResponse {
  providerRef: string;
  status: string;
  raw: unknown;
}

function methodMap(input: string): { mode: string; fundAccount: 'vpa' | 'bank_account' } {
  const m = input.toLowerCase();
  if (m.includes('upi')) return { mode: 'UPI', fundAccount: 'vpa' };
  return { mode: 'IMPS', fundAccount: 'bank_account' };
}

export async function initiatePayout(input: PayoutRequest): Promise<PayoutResponse> {
  const { keyId, keySecret, account } = creds();
  if (!keyId || !keySecret || !account) throw new HttpError(503, 'Razorpay not configured');

  const { mode, fundAccount } = methodMap(input.method);
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const fundAccountBody = fundAccount === 'vpa'
    ? { account_type: 'vpa', vpa: { address: input.recipient } }
    : { account_type: 'bank_account', bank_account: { name: 'Beneficiary', ifsc: 'HDFC0000001', account_number: input.recipient } };

  const body = {
    account_number: account,
    amount: input.amount * 100,
    currency: input.currency || 'INR',
    mode,
    purpose: 'payout',
    fund_account: fundAccountBody,
    reference_id: input.withdrawalId,
    narration: 'Reward payout',
  };

  const res = await fetch(`${API}/payouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      'X-Payout-Idempotency': input.idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.description || `Razorpay payout failed (${res.status})`;
    throw new HttpError(502, message);
  }

  return {
    providerRef: (json as any).id,
    status: (json as any).status,
    raw: json,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function mapProviderStatus(status: string): 'PROCESSING' | 'COMPLETED' | 'FAILED' | null {
  switch (status) {
    case 'queued':
    case 'pending':
    case 'processing':
      return 'PROCESSING';
    case 'processed':
    case 'reversed':
      return status === 'processed' ? 'COMPLETED' : 'FAILED';
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return 'FAILED';
    default:
      return null;
  }
}
