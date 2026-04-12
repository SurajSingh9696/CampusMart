import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  preload: false,
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "CampusMart | Buy. Sell. Share. Inside Your Campus.",
    template: "%s | CampusMart",
  },
  description:
    "The premium multi-college marketplace for products, academic projects, curated notes, and campus event passes.",
  keywords: ["campus marketplace", "student marketplace", "college ecommerce", "buy sell campus"],
  openGraph: {
    title: "CampusMart — Buy. Sell. Share. Inside Your Campus.",
    description: "Peer-to-peer trading reinvented for college communities.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${sora.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#14243a",
                border: "1px solid #d8e2f1",
                borderRadius: "12px",
                fontSize: "14px",
                boxShadow: "0 10px 24px rgba(16,40,74,0.14)",
              },
              success: {
                iconTheme: { primary: "#1f9d54", secondary: "white" },
              },
              error: {
                iconTheme: { primary: "#d93025", secondary: "white" },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
