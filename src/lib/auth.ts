import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          console.log("[auth] authorize called for:", credentials?.email)
          if (!credentials?.email || !credentials?.password) {
            console.log("[auth] missing credentials")
            return null
          }
          const user = await db.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            include: { tenant: true },
          })
          if (!user) {
            console.log("[auth] user not found")
            return null
          }
          const valid = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!valid) {
            console.log("[auth] password invalid")
            return null
          }
          console.log("[auth] authorized:", user.email, user.role)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
          } as any
        } catch (e) {
          console.error("[auth] authorize error:", e)
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as any
        ;(token as any).role = u.role
        ;(token as any).tenantId = u.tenantId
        ;(token as any).userId = u.id
      }
      return token
    },
    async session({ session, token }) {
      const t = token as any
      if (session.user) {
        ;(session.user as any).role = t.role
        ;(session.user as any).tenantId = t.tenantId
        ;(session.user as any).id = t.userId
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
}
