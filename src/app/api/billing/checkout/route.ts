import { NextResponse } from 'next/server'
import { requireTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { getBillingEnv, getStripeClient, stripeNotConfigured } from '@/lib/stripe'

export async function POST() {
  const stripe = getStripeClient()
  const { checkoutPriceId, appUrl } = getBillingEnv()

  if (!stripe || !checkoutPriceId) return stripeNotConfigured()

  try {
    const ctx = await requireTenantContext()
    const organization = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: { subscription: true, owner: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    let stripeCustomerId = organization.subscription?.stripeCustomerId || undefined

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: organization.owner.email || undefined,
        name: organization.name,
        metadata: { organizationId: organization.id, ownerId: organization.ownerId },
      })
      stripeCustomerId = customer.id
      await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        create: { organizationId: organization.id, stripeCustomerId, status: 'inactive', plan: 'free' },
        update: { stripeCustomerId },
      })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: checkoutPriceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard?billing=cancelled`,
      metadata: { organizationId: organization.id },
      subscription_data: { metadata: { organizationId: organization.id } },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to create checkout session' }, { status: 400 })
  }
}
