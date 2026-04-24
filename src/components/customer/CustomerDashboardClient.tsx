"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatedTabs3D } from "@/components/ui/AnimatedTabs3D";
import { StatCard } from "@/components/ui/StatCard";
import { BookOpenText, Heart, Package, Ticket } from "lucide-react";
import { startListingCheckout } from "@/lib/client-checkout";

type Listing = {
  _id: string;
  title: string;
  description: string;
  type: "product" | "project" | "notes" | "event";
  price: number;
  isFree?: boolean;
  campus: string;
  isAuction?: boolean;
};

type Props = {
  listings: Listing[];
  userCampus: string;
  wishlistKeys: string[];
};

type CollegeLookup = {
  name: string;
  shortCode: string;
};

type ListingGridProps = {
  data: Listing[];
  selectedCampus: string;
  userCampus: string;
  query: string;
  sortBy: "newest" | "price_asc" | "price_desc";
  wishlist: Set<string>;
  onToggleWishlist: (item: Listing) => void;
  onBuy: (item: Listing) => void;
  formatCampus: (campus: string) => string;
  normalizeCampus: (campus: string) => string;
};

function ListingGrid({
  data,
  selectedCampus,
  userCampus,
  query,
  sortBy,
  wishlist,
  onToggleWishlist,
  onBuy,
  formatCampus,
  normalizeCampus,
}: ListingGridProps) {
  const filtered = useMemo(() => {
    const normalizedSelectedCampus = selectedCampus === "Global" ? "Global" : normalizeCampus(selectedCampus);

    const campusFiltered = data.filter((item) => {
      if (normalizedSelectedCampus === "Global") return true;
      return normalizeCampus(item.campus) === normalizedSelectedCampus;
    });

    const queryFiltered = campusFiltered.filter((item) => {
      const term = query.trim().toLowerCase();
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      );
    });

    const sorted = [...queryFiltered];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return sorted;
  }, [data, normalizeCampus, query, selectedCampus, sortBy]);

  const effectiveSelectedCampus = selectedCampus === "Global" ? "Global" : normalizeCampus(selectedCampus);

  return (
    <div className="space-y-3">
      {effectiveSelectedCampus !== "Global" && effectiveSelectedCampus !== userCampus ? (
        <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "var(--warning-bg)", border: "1px solid #facc9a", color: "#9a580b" }}>
          You selected another campus. You may need to travel for pickup or event attendance.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <article key={item._id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--primary)" }}>
                {item.type}
              </p>
              {item.isAuction ? (
                <span className="rounded-full px-2 py-1 text-xs" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
                  Auction
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description}</p>
            <p className="mt-3 text-sm text-slate-500">Campus: {formatCampus(item.campus)}</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {item.isFree ? "Free" : `Rs ${item.price.toFixed(2)}`}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onBuy(item)} className="btn-primary px-3 py-2 text-xs font-semibold">
                Buy / Open
              </button>
              <button
                onClick={() => onToggleWishlist(item)}
                className="rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              >
                {wishlist.has(`${item.type}:${item._id}`) ? "Wishlisted" : "Wishlist"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CustomerDashboardClient({ listings, userCampus, wishlistKeys }: Props) {
  const [selectedCampus, setSelectedCampus] = useState(userCampus);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [status, setStatus] = useState("");
  const [wishlist, setWishlist] = useState(new Set(wishlistKeys));
  const [campusLookup, setCampusLookup] = useState<Record<string, string>>({});
  const [campusCanonicalLookup, setCampusCanonicalLookup] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const loadCampusLookup = async () => {
      try {
        const response = await fetch("/api/colleges?active=true", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { colleges?: CollegeLookup[] };
        const map: Record<string, string> = {};
        const canonicalMap: Record<string, string> = {};

        for (const college of data.colleges || []) {
          if (!college.name || !college.shortCode) continue;
          map[college.name] = college.shortCode;
          map[college.shortCode] = college.shortCode;
          canonicalMap[college.name] = college.name;
          canonicalMap[college.shortCode] = college.name;
        }

        if (mounted) {
          setCampusLookup(map);
          setCampusCanonicalLookup(canonicalMap);
        }
      } catch {
        if (mounted) {
          setCampusLookup({});
          setCampusCanonicalLookup({});
        }
      }
    };

    void loadCampusLookup();

    return () => {
      mounted = false;
    };
  }, []);

  const formatCampus = (campus: string) => campusLookup[campus] || campus;
  const normalizeCampus = (campus: string) => campusCanonicalLookup[campus] || campus;
  const normalizedUserCampus = normalizeCampus(userCampus);
  const selectedCampusValue = selectedCampus === "Global" ? "Global" : normalizeCampus(selectedCampus);

  const products = listings.filter((l) => l.type === "product");
  const projects = listings.filter((l) => l.type === "project");
  const notes = listings.filter((l) => l.type === "notes");
  const events = listings.filter((l) => l.type === "event");

  async function onToggleWishlist(item: Listing) {
    const key = `${item.type}:${item._id}`;
    const hasItem = wishlist.has(key);

    const response = await fetch("/api/wishlist", {
      method: hasItem ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType: item.type, itemId: item._id, campus: item.campus, title: item.title }),
    });

    if (!response.ok) {
      setStatus("Wishlist action failed.");
      return;
    }

    const next = new Set(wishlist);
    if (hasItem) next.delete(key);
    else next.add(key);
    setWishlist(next);
    setStatus(hasItem ? "Removed from wishlist." : "Added to wishlist.");
  }

  async function onBuy(item: Listing) {
    try {
      setStatus("Opening checkout...");
      const result = await startListingCheckout({
        listingId: item._id,
        quantity: 1,
        itemType: item.type,
      });

      setStatus(
        result.provider === "fallback"
          ? "Order placed in fallback mode."
          : "Payment successful and order placed."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete checkout.";
      setStatus(message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Products" value={String(products.length)} subtitle="Campus + global inventory" Icon={Package} />
        <StatCard title="Projects" value={String(projects.length)} subtitle="One-buyer and auction listings" Icon={BookOpenText} />
        <StatCard title="Events" value={String(events.length)} subtitle="Ticketing and registrations" Icon={Ticket} />
        <StatCard title="Wishlist" value={String(wishlist.size)} subtitle="Products, projects, notes, events" Icon={Heart} />
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Viewing Campus</label>
          <select
            value={selectedCampusValue}
            onChange={(e) => setSelectedCampus(e.target.value)}
            title="Viewing campus"
            aria-label="Viewing campus"
            className="rounded-xl px-3 py-2 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
          >
            <option value="Global">Global</option>
            {Array.from(new Set(listings.map((l) => l.campus))).map((campus) => (
              <option key={campus} value={campus}>
                {formatCampus(campus)}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title"
            className="rounded-xl px-3 py-2 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "price_asc" | "price_desc")}
            title="Sort listings"
            aria-label="Sort listings"
            className="rounded-xl px-3 py-2 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Sort: Price Low to High</option>
            <option value="price_desc">Sort: Price High to Low</option>
          </select>
          <p className="text-xs text-slate-500">Your home campus: {formatCampus(userCampus)}</p>
        </div>
        {status ? <p className="mt-2 text-sm text-slate-700">{status}</p> : null}
      </section>

      <AnimatedTabs3D
        tabs={[
          {
            id: "products",
            label: "Products",
            content: (
              <ListingGrid
                data={products}
                selectedCampus={selectedCampusValue}
                userCampus={normalizedUserCampus}
                query={query}
                sortBy={sortBy}
                wishlist={wishlist}
                onToggleWishlist={onToggleWishlist}
                onBuy={onBuy}
                formatCampus={formatCampus}
                normalizeCampus={normalizeCampus}
              />
            ),
          },
          {
            id: "projects",
            label: "Projects",
            content: (
              <ListingGrid
                data={projects}
                selectedCampus={selectedCampusValue}
                userCampus={normalizedUserCampus}
                query={query}
                sortBy={sortBy}
                wishlist={wishlist}
                onToggleWishlist={onToggleWishlist}
                onBuy={onBuy}
                formatCampus={formatCampus}
                normalizeCampus={normalizeCampus}
              />
            ),
          },
          {
            id: "notes",
            label: "Notes",
            content: (
              <ListingGrid
                data={notes}
                selectedCampus={selectedCampusValue}
                userCampus={normalizedUserCampus}
                query={query}
                sortBy={sortBy}
                wishlist={wishlist}
                onToggleWishlist={onToggleWishlist}
                onBuy={onBuy}
                formatCampus={formatCampus}
                normalizeCampus={normalizeCampus}
              />
            ),
          },
          {
            id: "events",
            label: "Events",
            content: (
              <ListingGrid
                data={events}
                selectedCampus={selectedCampusValue}
                userCampus={normalizedUserCampus}
                query={query}
                sortBy={sortBy}
                wishlist={wishlist}
                onToggleWishlist={onToggleWishlist}
                onBuy={onBuy}
                formatCampus={formatCampus}
                normalizeCampus={normalizeCampus}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
