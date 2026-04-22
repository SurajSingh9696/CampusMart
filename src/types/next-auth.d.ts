import { DefaultSession } from "next-auth";
import { Role, SellerApprovalStatus } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      sellerApprovalStatus?: SellerApprovalStatus;
      isBlocked: boolean;
      blockedReason?: string;
      accountNumber: string;
      campus: string;
      profileImageId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    sellerApprovalStatus?: SellerApprovalStatus;
    isBlocked: boolean;
    blockedReason?: string;
    accountNumber: string;
    campus: string;
    profileImageId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    sellerApprovalStatus?: SellerApprovalStatus;
    isBlocked: boolean;
    blockedReason?: string;
    accountNumber: string;
    campus: string;
    profileImageId?: string;
  }
}
