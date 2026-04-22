import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { User } from "@/models/User";
import { env } from "@/lib/env";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "CampusMart",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const normalizedEmail = parsed.data.email.trim().toLowerCase();

        await connectDB();
        const user = await User.findOne({ email: normalizedEmail }).lean();
        if (!user) return null;

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          sellerApprovalStatus: user.sellerApprovalStatus,
          isBlocked: user.isBlocked,
          blockedReason: user.blockedReason,
          accountNumber: user.accountNumber,
          campus: user.campus,
          profileImageId: user.profileImageId ? user.profileImageId.toString() : undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sellerApprovalStatus = user.sellerApprovalStatus;
        token.isBlocked = user.isBlocked;
        token.blockedReason = user.blockedReason;
        token.accountNumber = user.accountNumber;
        token.campus = user.campus;
        token.profileImageId = user.profileImageId;
      }

      if (trigger === "update" && session) {
        const updatedSession = session as {
          name?: string;
          campus?: string;
          profileImageId?: string | null;
        };

        if (typeof updatedSession.name === "string") {
          token.name = updatedSession.name;
        }
        if (typeof updatedSession.campus === "string") {
          token.campus = updatedSession.campus;
        }
        if (updatedSession.profileImageId === null || updatedSession.profileImageId === "") {
          token.profileImageId = undefined;
        } else if (typeof updatedSession.profileImageId === "string") {
          token.profileImageId = updatedSession.profileImageId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.sellerApprovalStatus = token.sellerApprovalStatus;
        session.user.isBlocked = token.isBlocked;
        session.user.blockedReason = token.blockedReason as string | undefined;
        session.user.accountNumber = token.accountNumber;
        session.user.campus = token.campus;
        session.user.profileImageId = token.profileImageId as string | undefined;
      }
      return session;
    },
    async signIn({ user }) {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

      if (user.role === "seller" && user.sellerApprovalStatus !== "approved") {
        return new URL("/pending-approval", baseUrl).toString();
      }
      if (user.isBlocked) {
        const blockedUrl = new URL("/blocked", baseUrl);
        if (typeof user.blockedReason === "string" && user.blockedReason.trim()) {
          blockedUrl.searchParams.set("reason", user.blockedReason);
        }
        return blockedUrl.toString();
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) return url;
      } catch {
        return baseUrl;
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
};
