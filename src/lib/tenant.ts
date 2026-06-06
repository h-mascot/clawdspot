import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface TenantContext {
  userId: string
  organizationId: string
  organizationSlug: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

/**
 * Get current authenticated user and their primary organization.
 * Returns null if not authenticated or no organization exists.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  // Get first membership (primary org)
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!membership) {
    return null
  }

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    organizationSlug: membership.organization.slug,
    role: membership.role,
  }
}

/**
 * Require authenticated tenant context. Throws if not authenticated.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const ctx = await getTenantContext()
  if (!ctx) {
    throw new Error('Authentication required')
  }
  return ctx
}

/**
 * Generate a URL-friendly slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'org'
}

/**
 * Create a default organization for a user (on first sign-in)
 */
export async function createDefaultOrganization(userId: string, userName?: string | null) {
  const baseName = userName || 'My Organization'
  let slug = generateSlug(baseName)

  // Ensure unique slug
  let counter = 0
  while (await prisma.organization.findUnique({ where: { slug } })) {
    counter++
    slug = `${generateSlug(baseName)}-${counter}`
  }

  const org = await prisma.organization.create({
    data: {
      slug,
      name: baseName,
      ownerId: userId,
      memberships: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
      subscription: {
        create: {
          status: 'active',
          plan: 'free',
        },
      },
    },
    include: {
      memberships: true,
      subscription: true,
    },
  })

  return org
}
