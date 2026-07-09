import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validators/auth";

/**
 * Auth.js v5, credentials strategy.
 * - Sessions are stateless JWTs in httpOnly/Secure/SameSite=Lax cookies,
 *   re-issued (rotated) on every sign-in.
 * - authorize() burns a dummy bcrypt compare for unknown emails so response
 *   timing doesn't reveal whether an account exists.
 */

// bcrypt hash of a random throwaway string, used to equalize timing.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpDLWpx4KfrTr/S1LWpp8Ff2P456e";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
          await compare(password, DUMMY_HASH);
          return null;
        }

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
