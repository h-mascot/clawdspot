import { NextRequest, NextResponse } from 'next/server'
import { requireTenantContext } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const ctx = await requireTenantContext()
    const organization = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      include: {
        subscription: true,
        whiteLabelConfig: true,
        memberships: {
          select: { id: true, role: true, createdAt: true, user: { select: { id: true, name: true, email: true, image: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ organization, role: ctx.role })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireTenantContext()
    if (ctx.role === 'MEMBER') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const data = {
      brandName: typeof body.brandName === 'string' ? body.brandName.slice(0, 80) : undefined,
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl.slice(0, 500) : undefined,
      primaryColor: typeof body.primaryColor === 'string' ? body.primaryColor.slice(0, 24) : undefined,
      accentColor: typeof body.accentColor === 'string' ? body.accentColor.slice(0, 24) : undefined,
      faviconUrl: typeof body.faviconUrl === 'string' ? body.faviconUrl.slice(0, 500) : undefined,
      customDomain: typeof body.customDomain === 'string' ? body.customDomain.slice(0, 255) : undefined,
    }

    const whiteLabelConfig = await prisma.whiteLabelConfig.upsert({
      where: { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, ...data },
      update: data,
    })

    return NextResponse.json({ whiteLabelConfig })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update tenant' }, { status: 400 })
  }
}
