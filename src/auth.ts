import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const providers = process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  secret: process.env.AUTH_SECRET,
  providers,
  session: { strategy: "jwt" },
});
