import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  EDITION_CATALOG,
  getStripeClient,
  isValidEditionId,
  sendJson,
} from './_stripe.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    sendJson(res, 503, {
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in environment variables.',
      code: 'STRIPE_NOT_CONFIGURED',
    });
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const sessionId = url.searchParams.get('session_id')?.trim() ?? '';

  if (!sessionId || !sessionId.startsWith('cs_')) {
    sendJson(res, 400, { error: 'Missing or invalid session_id parameter' });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' && session.status === 'complete';
    const rawTier = session.metadata?.tier;
    const tier = isValidEditionId(rawTier) ? rawTier : null;

    if (!paid || !tier) {
      sendJson(res, 200, {
        verified: false,
        paid: false,
        sessionId: session.id,
        tier,
        unlockedExports: [],
        paymentStatus: session.payment_status,
      });
      return;
    }

    const edition = EDITION_CATALOG[tier];
    sendJson(res, 200, {
      verified: true,
      paid: true,
      sessionId: session.id,
      tier,
      unlockedExports: edition.unlocks,
      amountTotal: session.amount_total,
      currency: session.currency,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to verify Stripe Checkout session';
    sendJson(res, 400, { verified: false, paid: false, error: message });
  }
}
