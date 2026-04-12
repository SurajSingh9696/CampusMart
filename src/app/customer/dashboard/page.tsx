import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Order } from "@/models/Order";
import { WishlistItem } from "@/models/WishlistItem";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { College } from "@/models/College";
import Link from "next/link";

async function getDashboardData(userId: string) {
  await connectDB();

  const user = await User.findById(userId).select("campus").lean();
  const campusName = user?.campus?.trim() || "";

  const college = campusName
    ? await College.findOne({ $or: [{ name: campusName }, { shortCode: campusName }] }).select("name shortCode").lean()
    : null;

  const campusValues = college
    ? Array.from(new Set([college.name, college.shortCode].filter((value): value is string => Boolean(value))))
    : [campusName];

  const listingFilter = { status: "live", campus: { $in: campusValues } };
  const campusDisplayName = college?.shortCode || campusName;

  const [recentListings, ordersCount, wishlistCount, notificationsCount, categoryCounts] = await Promise.all([
    Listing.find(listingFilter).sort({ createdAt: -1 }).limit(6).lean(),
    Order.countDocuments({ buyerId: userId }),
    WishlistItem.countDocuments({ userId }),
    Notification.countDocuments({ userId, isRead: false }),
    Listing.aggregate([
      { $match: listingFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
  ]);

  const countsByType = {
    product: 0,
    project: 0,
    notes: 0,
    event: 0,
  };

  for (const row of categoryCounts as Array<{ _id: string; count: number }>) {
    if (row._id in countsByType) {
      countsByType[row._id as keyof typeof countsByType] = row.count;
    }
  }

  return { campusName: campusDisplayName, recentListings, ordersCount, wishlistCount, notificationsCount, countsByType };
}

export default async function CustomerDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "customer") redirect("/auth/login");

  const { campusName, recentListings, ordersCount, wishlistCount, notificationsCount, countsByType } = await getDashboardData(
    session.user.id
  );

  const categoryCards = [
    { href: "/customer/products", icon: "shopping_bag", label: "Products", color: "#2563eb", bg: "#eff6ff", count: countsByType.product },
    { href: "/customer/projects", icon: "terminal", label: "Projects", color: "#1a73e8", bg: "#edf4ff", count: countsByType.project },
    { href: "/customer/notes", icon: "menu_book", label: "Notes", color: "#d97706", bg: "#fffbeb", count: countsByType.notes },
    { href: "/customer/events", icon: "local_activity", label: "Events", color: "#16a34a", bg: "#f0fdf4", count: countsByType.event },
  ];

  const quickStats = [
    { label: "My Orders", value: ordersCount, icon: "inventory_2", color: "#2563eb", bg: "#eff6ff" },
    { label: "Campus", value: campusName || "Not Set", icon: "school", color: "#1a73e8", bg: "#edf4ff" },
    { label: "Wishlist", value: wishlistCount, icon: "favorite", color: "#ec4899", bg: "#fdf2f8" },
    { label: "Notifications", value: notificationsCount, icon: "notifications", color: "#d97706", bg: "#fffbeb" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 lg:p-8"
        style={{
          background: "linear-gradient(135deg, #1a73e8 0%, #2f80ed 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-blue-100">
              Welcome Back
            </p>
            <h1 className="text-2xl lg:text-3xl font-black text-white">
              Hey, {session.user.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-blue-100 mt-1 text-sm">
              {campusName ? (
                <>Browsing <strong className="text-white">{campusName}</strong> marketplace</>
              ) : (
                "Explore your campus marketplace"
              )}
            </p>
          </div>
          <Link
            href="/customer/products"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-blue-700 bg-white hover:bg-blue-50 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">explore</span>
            Explore Now
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <div key={stat.label} className="card p-5 flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: stat.bg }}
            >
              <span className="material-symbols-outlined text-xl" style={{ color: stat.color }}>
                {stat.icon}
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Category Quick Links */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Browse Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categoryCards.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="card p-4 flex flex-col items-center gap-3 text-center group hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{ background: cat.bg }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: cat.color }}>
                  {cat.icon}
                </span>
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm">{cat.label}</p>
                <p className="text-[10px] font-medium text-slate-400">{cat.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Campus Listings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Latest in {campusName || "Your Campus"}
          </h2>
          <Link
            href="/customer/products"
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: "var(--primary)" }}
          >
            View All
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {recentListings.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-3 block">storefront</span>
            <p className="text-slate-800 font-bold mb-2">No listings yet at your campus</p>
            <p className="text-slate-400 text-sm">Be the first! Ask your campus sellers to join CampusMart.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentListings.map((listing) => (
              <Link
                key={listing._id.toString()}
                href={`/customer/${listing.type === "notes" ? "notes" : listing.type === "event" ? "events" : listing.type + "s"}/${listing._id}`}
              >
                <div className="card group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div
                    className="aspect-[4/3] w-full flex items-center justify-center relative overflow-hidden"
                    style={{ background: "#f1f5f9" }}
                  >
                    {listing.mediaUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.mediaUrls[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-5xl text-slate-300">
                        {listing.type === "product" ? "shopping_bag" : listing.type === "project" ? "terminal" : listing.type === "notes" ? "menu_book" : "local_activity"}
                      </span>
                    )}
                    <div className="absolute top-2 left-2 badge badge-primary">{listing.type}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {listing.title}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{listing.description}</p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-black text-slate-900">
                        {listing.isFree ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          `₹${listing.price}`
                        )}
                      </span>
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-50"
                        style={{ border: "1px solid var(--border)", color: "var(--primary)" }}
                      >
                        <span className="material-symbols-outlined text-sm">favorite_border</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Browse All Campuses Banner */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-4 justify-between"
        style={{ background: "linear-gradient(135deg, #eff6ff, #edf4ff)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#dbeafe" }}>
            <span className="material-symbols-outlined text-2xl" style={{ color: "#2563eb" }}>hub</span>
          </div>
          <div>
            <p className="text-slate-900 font-bold">Browse All Campuses</p>
            <p className="text-slate-500 text-sm">Discover items from other partner colleges</p>
          </div>
        </div>
        <Link
          href="/customer/products?global=true"
          className="btn-ghost shrink-0 flex items-center gap-2 text-sm"
          style={{ padding: "0.625rem 1.25rem" }}
        >
          Global View
          <span className="material-symbols-outlined text-xl">language</span>
        </Link>
      </div>
    </div>
  );
}
