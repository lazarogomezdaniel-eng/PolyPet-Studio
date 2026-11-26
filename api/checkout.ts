import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  EDITION_CATALOG,
  getStripeClient,
  isValidEditionId,
  normalizeCheckoutLocale,
  readJsonBody,
  resolveAppOrigin,
  sendJson,
} from './_stripe.ts';

interface CheckoutRequestBody {
  tier?: unknown;
  locale?: unknown;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

  let body: CheckoutRequestBody;
  try {
    body = await readJsonBody<CheckoutRequestBody>(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body' });
    return;
  }

  if (!isValidEditionId(body.tier)) {
    sendJson(res, 400, { error: 'Invalid edition tier. Expected hd, pbn, or bundle.' });
    return;
  }

  const locale = normalizeCheckoutLocale(body.locale);
  const edition = EDITION_CATALOG[body.tier];
  const copy = edition.titles[locale];
  const origin = resolveAppOrigin(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale,
      line_items: [
        {
          price_data: {
            currency: edition.currency,
            unit_amount: edition.amountCents,
            product_data: {
              name: copy.name,
              description: copy.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tier: edition.id,
        app: 'polypet-studio',
      },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}#studio`,
      cancel_url: `${origin}/?checkout=cancelled#studio`,
    });

    if (!session.url) {
      sendJson(res, 500, { error: 'Stripe did not return a checkout URL' });
      return;
    }

    sendJson(res, 200, {
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to create Stripe Checkout session';
    sendJson(res, 500, { error: message });
  }
}
