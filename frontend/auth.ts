import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    GitHub,
    Google,
    Apple,
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
