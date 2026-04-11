import { connectDB } from "@/lib/db";
import { PageContent } from "@/models/PageContent";

type PageDefaults = {
  title: string;
  subtitle: string;
  blocks: Record<string, unknown>;
};

const defaults: Record<string, PageDefaults> = {
  landing: {
    title: "Buy. Sell. Share. Built for Campus Life.",
    subtitle: "A moderated college marketplace for products, projects, notes, and events.",
    blocks: {
      ctaPrimary: "Explore as Customer",
      ctaSecondary: "Become a Seller",
      stats: [
        { label: "Live Listings", value: "12K+" },
        { label: "Partner Campuses", value: "4" },
        { label: "Weekly Settlements", value: "100%" },
        { label: "Approval SLA", value: "24h" },
      ],
    },
  },
  "auth-login": {
    title: "Welcome back to CampusMart",
    subtitle: "Same login for customer, seller, and admin.",
    blocks: {},
  },
  "auth-register": {
    title: "Create your CampusMart account",
    subtitle: "Choose registration path based on your role.",
    blocks: {},
  },
};

export async function getPageContent(slug: string) {
  const fallback = defaults[slug] || {
    title: "CampusMart",
    subtitle: "Professional campus commerce",
    blocks: {},
  };

  try {
    await connectDB();

    let page = await PageContent.findOne({ slug }).lean();
    if (page) return page;

    page = await PageContent.create({ slug, ...fallback });
    return JSON.parse(JSON.stringify(page));
  } catch {
    return { slug, ...fallback, isPublished: true };
  }
}
