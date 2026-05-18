import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'
import Resend from 'next-auth/providers/resend'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './src/lib/prisma'

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub,
    Google,
    Apple,
    Resend({
      from: process.env.EMAIL_FROM || 'Terminal <onboarding@resend.dev>',
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtected = ['/feed', '/registry', '/dashboard', '/quiz'].some(
        (path) => nextUrl.pathname.startsWith(path)
      )
      if (isProtected && !isLoggedIn) {
        return false // Redirect to sign-in
      }
      return true
    },
  },
})
