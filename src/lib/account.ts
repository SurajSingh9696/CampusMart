import crypto from "crypto";
import { Role } from "@/types";

export function generateAccountNumber(role: Role) {
  const prefix = role === "admin" ? "ADM" : role === "seller" ? "SEL" : "CUS";
  const random = crypto.randomInt(100000, 999999);
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${year}-${random}`;
}
