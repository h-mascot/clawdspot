import Stripe from 'stripe'

export const stripeApiVersion = '2024-06-20'

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  return new Stripe(secretKey, {
    apiVersion: stripeApiVersion,
  })
}

export function getBillingEnv() {
  return {
    checkoutPriceId: process.env.STRIPE_PRICE_ID_STARTER || process.env.STRIPE_PRICE_ID,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    appUrl: process.env.NEXTAUTH_URL || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || 'http://localhost:3000',
  }
}

export function stripeNotConfigured() {
  return Response.json(
    {
      error: 'Stripe is not configured',
      required: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID_STARTER', 'STRIPE_WEBHOOK_SECRET'],
    },
    { status: 501 }
  )
}
