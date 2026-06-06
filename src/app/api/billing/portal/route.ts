import { NextResponse } from 'next/server'
import { requireTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { getBillingEnv, getStripeClient, stripeNotConfigured } from '@/lib/stripe'

export async function POST() {
  const stripe = getStripeClient()
  const { appUrl } = getBillingEnv()

  if (!stripe) return stripeNotConfigured()

  try {
    const ctx = await requireTenantContext()
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: ctx.organizationId },
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer exists for this organization' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/dashboard`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to create billing portal session' }, { status: 400 })
  }
}
