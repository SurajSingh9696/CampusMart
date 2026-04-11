export const env = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dev-secret-change-me",
  MONGODB_URI: process.env.MONGODB_URI || "",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
};

export function assertServerEnv() {
  if (!env.MONGODB_URI) {
    throw new Error("Missing environment variable: MONGODB_URI");
  }
}
