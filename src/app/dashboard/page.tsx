import { redirect } from 'next/navigation'
import { getTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { CreditCard, Globe2, Server, Sparkles, Users } from 'lucide-react'

export default async function DashboardPage() {
  const ctx = await getTenantContext()
  if (!ctx) redirect('/')

  const organization = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    include: {
      subscription: true,
      whiteLabelConfig: true,
      memberships: true,
      vms: { select: { id: true, status: true } },
    },
  })

  if (!organization) redirect('/')

  const brandName = organization.whiteLabelConfig?.brandName || organization.name
  const activeVms = organization.vms.filter((vm) => vm.status === 'running').length

  return (
    <main className="min-h-screen bg-sam-bg text-sam-text relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_32rem),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.14),transparent_28rem)]" />
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">
              <Sparkles className="h-3.5 w-3.5" /> ClawSpot workspace
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">{brandName}</h1>
            <p className="mt-3 max-w-2xl text-sam-text-dim">
              Multi-tenant ClawdBody hosting for teams, agencies, and white-label operators. One hosted control plane, isolated tenant context, billing, and branded setup flows.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-sam-text-dim">
            <div className="text-white">/{organization.slug}</div>
            <div>Role: {ctx.role}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric icon={CreditCard} label="Plan" value={organization.subscription?.plan || 'free'} />
          <Metric icon={Users} label="Members" value={String(organization.memberships.length)} />
          <Metric icon={Server} label="Running VMs" value={String(activeVms)} />
          <Metric icon={Globe2} label="Domain" value={organization.whiteLabelConfig?.customDomain || 'Not connected'} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold text-white">White-label surface</h2>
            <p className="mt-2 text-sm text-sam-text-dim">
              The tenant API is live at <code className="rounded bg-black/30 px-1.5 py-0.5">/api/tenant</code>. Use it to update brand name, logo, colors, favicon, and future custom domains.
            </p>
            <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
              <Field label="Brand name" value={brandName} />
              <Field label="Primary color" value={organization.whiteLabelConfig?.primaryColor || 'Default ClawSpot teal'} />
              <Field label="Accent color" value={organization.whiteLabelConfig?.accentColor || 'Default ClawSpot rose'} />
              <Field label="Logo URL" value={organization.whiteLabelConfig?.logoUrl || 'Using default mark'} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-xl font-semibold text-white">Billing</h2>
            <p className="mt-2 text-sm text-sam-text-dim">
              Stripe routes are scaffolded for checkout, customer portal, and webhook sync. They fail closed with JSON until Stripe env vars are configured.
            </p>
            <form action="/api/billing/checkout" method="post" className="mt-5">
              <button className="w-full rounded-full bg-gradient-to-r from-rose-500 to-teal-400 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-teal-400/10">
                Upgrade workspace
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <Icon className="mb-4 h-5 w-5 text-teal-300" />
      <div className="text-xs uppercase tracking-[0.18em] text-sam-text-dim">{label}</div>
      <div className="mt-2 truncate text-2xl font-semibold text-white">{value}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-sam-text-dim">{label}</div>
      <div className="mt-2 break-words text-white">{value}</div>
    </div>
  )
}
