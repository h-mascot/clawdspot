import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { createDefaultOrganization } from '@/lib/tenant'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Redirect to learning-sources after sign-in
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/dashboard`
      }
      // Allow relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      return baseUrl
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async signIn({ user }) {
      try {
        // Get or create SetupState for the user
        let setupState = await prisma.setupState.findUnique({
          where: { userId: user.id },
        })

        if (!setupState) {
          setupState = await prisma.setupState.create({
            data: {
              userId: user.id,
              status: 'pending',
            },
          })
        }

        // Get or create default Organization for multi-tenant support
        const membership = await prisma.membership.findFirst({
          where: { userId: user.id },
        })

        if (!membership) {
          await createDefaultOrganization(user.id, user.name)
        }
      } catch (error) {
        // Don't block authentication if setup/org creation fails
        console.error('Failed to create setup state or org during sign in:', error)
      }

      return true
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'database',
  },
}
