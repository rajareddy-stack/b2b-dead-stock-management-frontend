import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { api, conditionLabels, formatMoney, roleHome, statusLabels } from "./api.js";
import { downloadCsv, parseCsv } from "./csv.js";
import {
  IconSearch,
  IconMapPin,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconDownload,
  IconUpload,
  IconAlertCircle,
} from "./icons.jsx";
import "./styles.css";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const current = await api("/api/auth/me");
      setUser(current);
      return current;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        return null;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser().catch((error) => {
      console.error("Could not restore user session:", error);
      setLoading(false);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      signOut: async () => {
        await api("/api/auth/logout", { method: "POST" });
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  return useContext(AuthContext);
}

function useLoad(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loader()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (active) setError(reason.message || "Could not load records.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...dependencies, reloadKey]);

  return { data, error, loading, reload: () => setReloadKey((key) => key + 1), setData };
}

function PageState({ loading, error, children }) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em" }}>
          Retrieving Records &amp; Manifests…
        </span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="editorial-notice error" style={{ margin: "32px auto", maxWidth: "600px" }}>
        <div>
          <strong style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "12px", textTransform: "uppercase" }}>
            Operational Notice
          </strong>
          <span>{error}</span>
        </div>
        <button className="button secondary tiny" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }
  return children;
}

function Notice({ message, kind = "success", onClose }) {
  if (!message) return null;
  return (
    <div className={`editorial-notice ${kind === "error" ? "error" : ""}`} role="status">
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {kind === "success" && <IconCheck size={16} />}
        {kind === "error" && <IconAlertCircle size={16} />}
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss notice" style={{ color: "inherit", opacity: 0.8 }}>
          <IconClose size={15} />
        </button>
      )}
    </div>
  );
}

function Layout() {
  const { user, loading, signOut } = useAuth();
  const [headerKw, setHeaderKw] = useState("");
  const [headerLoc, setHeaderLoc] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (headerKw.trim()) params.set("query", headerKw.trim());
    if (headerLoc.trim()) params.set("location", headerLoc.trim());
    navigate(`/browse${params.size ? `?${params}` : ""}`);
  };

  const logout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <>
      {/* Top Editorial Bar */}
      <div className="top-bar-announcement">
        <div className="top-bar-inner">
          <div className="top-trust-badge">
            <span className="dot" />
            <span>Industrial Dead Stock &amp; Raw Material Exchange · Direct Counterparties</span>
          </div>
          <div className="top-bar-links">
            <span style={{ fontWeight: 600 }}>100% Tax ID / GST Verified</span>
            <span>|</span>
            <Link to="/browse" className="top-bar-link">Catalog</Link>
            <span>|</span>
            {user ? (
              <span style={{ color: "var(--foreground)", fontWeight: 700 }}>
                {user.businessProfile?.companyName || user.fullName} ({user.role})
              </span>
            ) : (
              <Link to="/login" className="top-bar-link">Enterprise Sign In</Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="site-header">
        <div className="header-main-row">
          {/* Text-Only Branding: NO LOGO ICON */}
          <Link className="brand-text-block" to="/" aria-label="b2b dead stock marketplace home">
            <span className="brand-text-main">
              b2b dead stock marketplace
              <span className="brand-accent-tag">B2B</span>
            </span>
            <span className="brand-text-sub">Commercial Surplus &amp; Raw Material Exchange</span>
          </Link>

          {/* Minimalist Integrated Search Bar */}
          <form className="header-search-bar" onSubmit={handleHeaderSearch}>
            <select
              className="search-loc-select"
              value={headerLoc}
              onChange={(e) => setHeaderLoc(e.target.value)}
              aria-label="Filter yard location"
            >
              <option value="">All Regions</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi NCR">Delhi NCR</option>
              <option value="Pune">Pune</option>
              <option value="Surat">Surat</option>
              <option value="Chennai">Chennai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Kolkata">Kolkata</option>
            </select>
            <input
              className="search-kw-input"
              type="text"
              placeholder="Search steel grades, coils, motors, packaging, timber..."
              value={headerKw}
              onChange={(e) => setHeaderKw(e.target.value)}
            />
            <button className="search-submit-btn" type="submit" aria-label="Execute search">
              <IconSearch size={14} />
              <span>Search</span>
            </button>
          </form>

          {/* User & Action Navigation */}
          <div className="header-user-actions">
            <NavLink className="nav-link-btn" to="/browse">
              Marketplace
            </NavLink>

            {user && (
              <NavLink className="nav-link-btn" to={roleHome(user.role)}>
                Workspace
              </NavLink>
            )}

            {user && (
              <NavLink className="nav-link-btn" to="/profile">
                Credentials
              </NavLink>
            )}

            {user && (
              <NavLink className="nav-link-btn" to="/notifications">
                Inquiries
              </NavLink>
            )}

            {/* Changed & Prominent Position for "Post Lot" */}
            <Link
              className="btn-post-lot-header"
              to={user?.role === "SELLER" ? "/seller/listings/new" : user ? "/seller/dashboard" : "/register"}
            >
              + Post Surplus Lot
            </Link>

            {loading ? null : user ? (
              <button className="button subtle tiny" onClick={logout}>
                Sign Out
              </button>
            ) : (
              <div style={{ display: "flex", gap: "8px" }}>
                <Link className="button secondary tiny" to="/login">
                  Sign In
                </Link>
                <Link className="button primary tiny" to="/register">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sub-Header Category Strip */}
        <div className="category-ribbon">
          <div className="category-ribbon-inner">
            <Link to="/browse" className="category-ribbon-item special">
              [ All Surplus Lots ]
            </Link>
            <Link to="/browse?categoryId=1" className="category-ribbon-item">
              Construction &amp; Raw Metals
            </Link>
            <Link to="/browse?categoryId=2" className="category-ribbon-item">
              Machinery &amp; Industrial Parts
            </Link>
            <Link to="/browse?categoryId=3" className="category-ribbon-item">
              Packaging &amp; Warehouse
            </Link>
            <Link to="/browse?categoryId=4" className="category-ribbon-item">
              Textiles &amp; Raw Fabrics
            </Link>
            <Link to="/browse?categoryId=5" className="category-ribbon-item">
              Timber &amp; Dimensional Lumber
            </Link>
            <Link to="/browse?discountTier=50+" className="category-ribbon-item special">
              [ 50%+ Deep Clearance ]
            </Link>
          </div>
        </div>
      </header>

      {notice && (
        <div style={{ width: "min(var(--container-max), 100% - 48px)", margin: "20px auto 0" }}>
          <Notice message={notice} kind="error" onClose={() => setNotice("")} />
        </div>
      )}

      <main className="main">
        <Outlet />
      </main>

      {/* Editorial Footer */}
      <footer className="editorial-footer">
        <div className="footer-inner-editorial">
          <div>
            <div className="brand-text-main" style={{ fontSize: "19px", marginBottom: "6px" }}>
              b2b dead stock marketplace
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)", maxWidth: "520px" }}>
              Direct commercial liquidation exchange. Connecting accredited mills, manufacturers, fabricators, and enterprises across India with strict GST transparency and zero broker margins.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", display: "block" }}>
              Minimalist Monochrome Industrial Exchange · 2026
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)" }}>
              Tax ID, Mill Test, and Physical Yard Verification Required
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ==========================================================================
   Listing Card: ZERO IMAGES · PURE ARCHITECTURAL TECHNICAL MANIFEST
   ========================================================================== */
function ListingCard({ listing }) {
  const discount = listing.discountPercentage ?? 0;

  return (
    <article className="listing-mono-card">
      {/* Technical Spec Stamp Box (Replaces Photos entirely) */}
      <div className="card-technical-stamp">
        <div className="stamp-top-row">
          <span className="stamp-sku">
            {listing.sku || `LOT-${listing.id}`}
          </span>
          {discount > 0 && (
            <span className="stamp-discount">
              {discount}% REDUCED
            </span>
          )}
        </div>

        <table className="stamp-spec-table">
          <tbody>
            <tr>
              <td>CLASSIFICATION</td>
              <td className="val">{listing.category?.title}</td>
            </tr>
            <tr>
              <td>YARD LOCATION</td>
              <td className="val">
                <IconMapPin size={11} style={{ verticalAlign: "middle", marginRight: "3px" }} />
                {listing.location}
              </td>
            </tr>
            <tr>
              <td>CONDITION</td>
              <td className="val">{conditionLabels[listing.condition] || listing.condition}</td>
            </tr>
            <tr>
              <td>AVAILABLE QUANTITY</td>
              <td className="val">{listing.quantity} {listing.unit}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Content Details */}
      <div className="card-content-box">
        <h3 className="card-title-serif">
          <Link to={`/listings/${listing.id}`}>{listing.title}</Link>
        </h3>
        <p className="card-summary-text">{listing.description}</p>

        {/* Valuation Floor */}
        <div className="card-valuation-floor">
          <div className="valuation-left">
            {discount > 0 && (
              <span className="valuation-original">{formatMoney(listing.originalPrice)}</span>
            )}
            <span className="valuation-surplus">{formatMoney(listing.price)}</span>
            <span className="valuation-unit">per {listing.unit}</span>
          </div>
          <div className="valuation-stock">
            <strong>{listing.quantity} {listing.unit}</strong>
            <span>Available Stock</span>
          </div>
        </div>

        {/* Dual Actions */}
        <div className="card-actions-grid">
          <Link className="button primary tiny" to={`/listings/${listing.id}`}>
            Propose Offer
          </Link>
          <Link className="button secondary tiny" to={`/listings/${listing.id}`}>
            Specifications
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ==========================================================================
   Home Page: Minimalist Monochrome Hero, Inverted Stats, Categories, RFQ
   ========================================================================== */
function HomePage() {
  const { data, loading, error } = useLoad(() => api("/api/public/overview"));
  const navigate = useNavigate();
  const [heroKw, setHeroKw] = useState("");
  const [heroLoc, setHeroLoc] = useState("");

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroKw.trim()) params.set("query", heroKw.trim());
    if (heroLoc.trim()) params.set("location", heroLoc.trim());
    navigate(`/browse${params.size ? `?${params}` : ""}`);
  };

  return (
    <PageState loading={loading} error={error}>
      {/* Hero Section */}
      <section className="mono-hero-section">
        <div className="hero-container">
          <div className="hero-meta-label">
            Industrial Surplus · Direct Counterparties
          </div>

          <h1 className="hero-headline-oversized">
            DEAD STOCK. RAW MATERIALS.
            <em>REDUCED TO ESSENCE.</em>
          </h1>

          <p className="hero-lead-text">
            An uncompromising commercial liquidation exchange connecting accredited manufacturers, fabricators, and enterprises. Acquire primary overruns, off-spec coils, and production lots at 30% to 70% below list value with strict GST transparency.
          </p>

          {/* Search Console & Prominent "Post Lot" Card */}
          <div className="hero-search-wrapper">
            <form className="hero-search-card" onSubmit={handleHeroSearch}>
              <select
                className="hero-search-loc"
                value={heroLoc}
                onChange={(e) => setHeroLoc(e.target.value)}
                aria-label="Select state or city"
              >
                <option value="">All Yards / India</option>
                <option value="Ahmedabad">Ahmedabad, Gujarat</option>
                <option value="Mumbai">Mumbai, Maharashtra</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Pune">Pune, Maharashtra</option>
                <option value="Surat">Surat, Gujarat</option>
                <option value="Chennai">Chennai, Tamil Nadu</option>
                <option value="Bengaluru">Bengaluru, Karnataka</option>
                <option value="Hyderabad">Hyderabad, Telangana</option>
              </select>
              <input
                className="hero-search-input"
                type="text"
                placeholder="Grade, metallurgy, or SKU (e.g. Stainless 304, Cold-Rolled)..."
                value={heroKw}
                onChange={(e) => setHeroKw(e.target.value)}
              />
              <button className="hero-search-btn" type="submit">
                <IconSearch size={15} />
                <span>Search Lots</span>
              </button>
            </form>

            {/* Changed Position of Post Lot: Prominently featured right here */}
            <Link to="/seller/listings/new" className="hero-post-lot-card">
              <span className="sub">Have Dormant Stock?</span>
              <span className="title">
                Post A Lot Now <IconArrowRight size={16} />
              </span>
            </Link>
          </div>

          {/* Tag Badges */}
          <div className="hero-tags-row">
            <span style={{ fontWeight: 700, textTransform: "uppercase" }}>Curated Indices:</span>
            {["Structural Steel", "Cold-Rolled Coils", "Electric Induction Motors", "Corrugated Shipping Cartons", "Raw Cotton Canvas", "50%+ Clearance"].map((tag) => (
              <Link
                key={tag}
                to={tag === "50%+ Clearance" ? "/browse?discountTier=50+" : `/browse?query=${encodeURIComponent(tag)}`}
                className="hero-tag-badge"
              >
                {tag}
              </Link>
            ))}
          </div>

          {/* Inverted Stats Strip (Bold Choice #3: Black background, white text, subtle vertical lines) */}
          <div className="mono-inverted-stats">
            <div className="stat-cell">
              <div className="stat-number-serif">
                ₹{formatMoney(data?.stats.totalActiveSurplusValue).replace("₹", "").trim()}
              </div>
              <div className="stat-label-mono">Active Surplus Valuation</div>
            </div>

            <div className="stat-cell">
              <div className="stat-number-serif">{data?.stats.totalListings ?? "—"}</div>
              <div className="stat-label-mono">Cataloged Material Lots</div>
            </div>

            <div className="stat-cell">
              <div className="stat-number-serif">{data?.stats.totalUsers ?? "—"}</div>
              <div className="stat-label-mono">Accredited Enterprises</div>
            </div>

            <div className="stat-cell">
              <div className="stat-number-serif">{data?.stats.acceptedDealsCount ?? "—"}</div>
              <div className="stat-label-mono">Executed Transactions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Sourcing Classifications */}
      <section className="section">
        <div className="section-inner">
          <div className="section-header-bar">
            <div>
              <h2 className="section-title-serif">Material Classifications</h2>
              <p className="section-subtitle-mono">
                Indexed industrial categories with metallurgical &amp; technical standards
              </p>
            </div>
            <Link className="button secondary tiny" to="/browse">
              Complete Catalog <IconArrowRight size={13} />
            </Link>
          </div>

          <div className="category-mono-grid">
            {(data?.categories ?? []).map((cat, idx) => {
              const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][idx] || `0${idx + 1}`;
              return (
                <Link key={cat.id} to={`/browse?categoryId=${cat.id}`} className="category-mono-card">
                  <div>
                    <span className="cat-card-num">SECTION {roman}</span>
                    <h3 className="cat-card-title">{cat.title}</h3>
                    <p className="cat-card-desc">{cat.description}</p>
                  </div>
                  <span className="cat-card-arrow">
                    View Available Lots <IconArrowRight size={13} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Lots (Zero Images) */}
      <section className="section" style={{ background: "var(--muted)", borderTop: "2px solid var(--border)", borderBottom: "2px solid var(--border)" }}>
        <div className="section-inner">
          <div className="section-header-bar">
            <div>
              <h2 className="section-title-serif">Prime Liquidation Lots</h2>
              <p className="section-subtitle-mono">
                Available for immediate yard inspection, sampling, and truckload dispatch
              </p>
            </div>
            <Link className="button primary tiny" to="/browse">
              View All Lots
            </Link>
          </div>

          <div className="listing-mono-grid">
            {(data?.featuredListings ?? []).slice(0, 6).map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* Inverted RFQ Banner (Bold Choice #5 & #10) */}
      <div className="section-inner">
        <div className="mono-rfq-banner">
          <div className="rfq-text-group">
            <h3>Liquidate Dormant Factory Surplus or Raw Stock</h3>
            <p>
              Free locked capital from excess manufacturing raw inventory, off-gauge coils, or canceled client orders. Connect with verified commercial buyers within 48 hours.
            </p>
          </div>
          <div className="rfq-buttons-group">
            <Link className="button primary large" to="/seller/listings/new">
              Post Surplus Lot
            </Link>
            <Link className="button secondary large" to="/browse">
              Browse Requests
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Protocol (Four Tenets) */}
      <section className="section">
        <div className="section-inner">
          <div className="section-header-bar">
            <div>
              <h2 className="section-title-serif">Operational Protocol</h2>
              <p className="section-subtitle-mono">
                Four classical tenets governing corporate counterparty trade
              </p>
            </div>
          </div>

          <div className="mono-tenets-grid">
            {[
              ["I", "Corporate Accreditation", "Every enterprise submits audited GST & Tax ID documentation prior to accessing bid terminals."],
              ["II", "Physical Yard Indexing", "Lots catalog physical SKU coordinates, unit weights, mill test certs, and warehouse inspection windows."],
              ["III", "Direct Counter-Offer", "Commercial buyers propose unit pricing. Sellers accept, reject, or issue counter proposals in real time."],
              ["IV", "Yard Dispatch & Release", "Upon mutual price acceptance, invoice settlements and physical yard truckload loading proceed directly."],
            ].map(([num, title, text]) => (
              <div className="tenet-cell" key={num}>
                <span className="tenet-roman">{num}.</span>
                <h4 className="tenet-title">{title}</h4>
                <p className="tenet-body">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageState>
  );
}

/* ==========================================================================
   Browse Page: Monograph Filter & Technical Grid
   ========================================================================== */
function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("query") || "";
  const location = params.get("location") || "";
  const categoryId = params.get("categoryId") || "";
  const discountTier = params.get("discountTier") || "";

  const { data: loadedCategories, error: categoriesError } = useLoad(() => api("/api/categories"));
  const categories = loadedCategories || [];

  const [form, setForm] = useState({ query, location, categoryId, discountTier });

  const searchQuery = new URLSearchParams();
  if (query) searchQuery.set("query", query);
  if (location) searchQuery.set("location", location);
  if (categoryId) searchQuery.set("categoryId", categoryId);

  const discountRanges = {
    "10-24": [10, 24],
    "25-49": [25, 49],
    "50+": [50, 100],
  };

  const { data: rawListings, error, loading } = useLoad(
    () => api(`/api/listings${searchQuery.size ? `?${searchQuery}` : ""}`),
    [query, location, categoryId]
  );

  const listings = useMemo(() => {
    let items = rawListings || [];
    if (discountRanges[discountTier]) {
      const [min, max] = discountRanges[discountTier];
      items = items.filter(
        (listing) => listing.discountPercentage >= min && listing.discountPercentage <= max
      );
    }
    return items;
  }, [rawListings, discountTier]);

  useEffect(() => {
    setForm({ query, location, categoryId, discountTier });
  }, [query, location, categoryId, discountTier]);

  const applyFilters = (nextForm = form) => {
    const next = new URLSearchParams();
    if (nextForm.query.trim()) next.set("query", nextForm.query.trim());
    if (nextForm.location.trim()) next.set("location", nextForm.location.trim());
    if (nextForm.categoryId) next.set("categoryId", nextForm.categoryId);
    if (nextForm.discountTier) next.set("discountTier", nextForm.discountTier);
    setParams(next);
  };

  const setCategoryFilter = (id) => {
    const nextForm = { ...form, categoryId: id === form.categoryId ? "" : id };
    setForm(nextForm);
    applyFilters(nextForm);
  };

  const setDiscountFilter = (tier) => {
    const nextForm = { ...form, discountTier: tier === form.discountTier ? "" : tier };
    setForm(nextForm);
    applyFilters(nextForm);
  };

  const resetFilters = () => {
    setForm({ query: "", location: "", categoryId: "", discountTier: "" });
    setParams({});
  };

  return (
    <div className="page-container">
      <div className="section-header-bar" style={{ marginBottom: "32px" }}>
        <div>
          <h1 className="section-title-serif">Surplus Inventory Index</h1>
          <p className="section-subtitle-mono">
            Direct acquisition of secondary raw materials, overruns, and dormant factory stocks
          </p>
        </div>
        <Link to="/seller/listings/new" className="button primary tiny">
          + Post Surplus Lot
        </Link>
      </div>

      <div className="browse-mono-layout">
        {/* Monograph Filter Sidebar */}
        <aside className="filter-mono-card">
          <div className="filter-heading-group">
            <span className="filter-title-mono">Refine Index</span>
            <button className="button subtle tiny" onClick={resetFilters}>
              Reset
            </button>
          </div>

          {categoriesError && <Notice message={categoriesError} kind="error" />}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <label className="filter-section-title">Keyword or Grade</label>
              <input
                className="filter-input-mono"
                value={form.query}
                onChange={(e) => setForm({ ...form, query: e.target.value })}
                placeholder="Grade, metallurgy, SKU..."
              />
            </div>

            <div>
              <label className="filter-section-title">Yard Location</label>
              <input
                className="filter-input-mono"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City or State..."
              />
            </div>

            <div>
              <label className="filter-section-title">Price Reduction Tier</label>
              <div>
                {[
                  ["", "All Available Lots"],
                  ["10-24", "10% – 24% Off Par"],
                  ["25-49", "25% – 49% Off Par"],
                  ["50+", "50%+ Deep Liquidation"],
                ].map(([tier, label]) => (
                  <button
                    key={tier}
                    type="button"
                    className={`filter-choice-btn ${form.discountTier === tier ? "selected" : ""}`}
                    onClick={() => setDiscountFilter(tier)}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="filter-section-title">Classification</label>
              <div style={{ maxHeight: "260px", overflowY: "auto" }}>
                <button
                  type="button"
                  className={`filter-choice-btn ${!form.categoryId ? "selected" : ""}`}
                  onClick={() => setCategoryFilter("")}
                >
                  <span>All Categories</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`filter-choice-btn ${String(cat.id) === String(form.categoryId) ? "selected" : ""}`}
                    onClick={() => setCategoryFilter(String(cat.id))}
                  >
                    <span>{cat.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="button primary full-width" type="submit">
              Apply Specifications
            </button>
          </form>
        </aside>

        {/* Results Stream */}
        <section style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "12px", borderBottom: "1.5px solid var(--border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {listings?.length ?? 0} Lots Cataloged
            </span>
          </div>

          <PageState loading={loading} error={error}>
            {listings?.length ? (
              <div className="listing-mono-grid">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div style={{ padding: "64px 32px", textAlign: "center", border: "2px solid var(--border)", background: "var(--background)" }}>
                <h3 className="section-title-serif" style={{ fontSize: "1.8rem", marginBottom: "12px" }}>
                  No Material Lots Matched
                </h3>
                <p style={{ color: "var(--muted-foreground)", fontSize: "14px", maxWidth: "420px", margin: "0 auto 24px" }}>
                  Broaden your parameters, select an alternative classification, or clear filters.
                </p>
                <button className="button secondary" onClick={resetFilters}>
                  Clear All Filters
                </button>
              </div>
            )}
          </PageState>
        </section>
      </div>
    </div>
  );
}

/* ==========================================================================
   Listing Detail Page: ZERO IMAGES · ARCHITECTURAL SPECIFICATION SHEET
   ========================================================================== */
function ListingDetailPage() {
  const { id } = useParams();
  const { data: listing, error, loading } = useLoad(() => api(`/api/listings/${id}`), [id]);
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState("success");
  const [busy, setBusy] = useState(false);

  const [offerPrice, setOfferPrice] = useState("");
  const [offerQty, setOfferQty] = useState(1);

  useEffect(() => {
    if (listing) {
      setOfferPrice(listing.price);
      setOfferQty(Math.min(listing.quantity, 1));
    }
  }, [listing]);

  if (loading || error || !listing) {
    return (
      <div className="page-container">
        <PageState loading={loading} error={error} />
      </div>
    );
  }

  const discount = listing.discountPercentage ?? 0;
  const totalOfferVal = (Number(offerPrice) || 0) * (Number(offerQty) || 0);

  const makeOffer = async (event) => {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/offers", {
        method: "POST",
        body: JSON.stringify({
          listingId: listing.id,
          offerPrice: Number(data.get("offerPrice")),
          quantity: Number(data.get("quantity")),
          buyerMessage: data.get("buyerMessage"),
        }),
      });
      setNotice("Your commercial offer proposal has been formally dispatched to the seller.");
      setNoticeKind("success");
    } catch (reason) {
      setNotice(reason.message);
      setNoticeKind("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container">
      {/* Editorial Breadcrumbs */}
      <div className="editorial-breadcrumbs">
        <Link to="/">Index</Link>
        <span>/</span>
        <Link to="/browse">Marketplace</Link>
        <span>/</span>
        <Link to={`/browse?categoryId=${listing.category?.id}`}>{listing.category?.title}</Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)", fontWeight: 700 }}>LOT-{listing.id}</span>
      </div>

      <Notice message={notice} kind={noticeKind} onClose={() => setNotice("")} />

      <div className="detail-mono-layout">
        {/* Left: Architectural Technical Manifest Sheet (NO PHOTOS) */}
        <div>
          <div className="detail-technical-sheet">
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
              <span className="stamp-sku">{listing.sku || `LOT-${listing.id}`}</span>
              <span className={`status-stamp ${listing.status}`}>{statusLabels[listing.status] || listing.status}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {conditionLabels[listing.condition] || listing.condition}
              </span>
            </div>

            <h1 className="detail-heading-serif">{listing.title}</h1>

            {/* Boxed Drop Cap on first description paragraph (Bold Choice #11) */}
            <p className="detail-body-text boxed-drop-cap">{listing.description}</p>

            <table className="specs-editorial-table">
              <tbody>
                <tr>
                  <td className="key">Catalog SKU</td>
                  <td className="val" style={{ fontFamily: "var(--font-mono)" }}>
                    {listing.sku || `SKU-LOT-${listing.id}`}
                  </td>
                </tr>
                <tr>
                  <td className="key">Industrial Classification</td>
                  <td className="val">{listing.category?.title}</td>
                </tr>
                <tr>
                  <td className="key">Surplus Condition</td>
                  <td className="val">{conditionLabels[listing.condition] || listing.condition}</td>
                </tr>
                <tr>
                  <td className="key">Available Quantity</td>
                  <td className="val">{listing.quantity} {listing.unit}</td>
                </tr>
                <tr>
                  <td className="key">Inspection &amp; Pickup Yard</td>
                  <td className="val">
                    <IconMapPin size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                    {listing.location}
                  </td>
                </tr>
                <tr>
                  <td className="key">Obsolescence / Date</td>
                  <td className="val">{listing.expiryDate || "Non-perishable industrial stock"}</td>
                </tr>
                <tr>
                  <td className="key">Date Cataloged</td>
                  <td className="val">
                    {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Negotiation Console */}
        <aside>
          <div className="negotiation-terminal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Surplus Valuation
              </span>
              {discount > 0 && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, background: "var(--foreground)", color: "var(--background)", padding: "2px 6px" }}>
                  {discount}% Below Par
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "32px", fontWeight: 900 }}>
                {formatMoney(listing.price)}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--muted-foreground)", textDecoration: "line-through" }}>
                {formatMoney(listing.originalPrice)}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "13.5px", color: "var(--muted-foreground)", marginBottom: "24px" }}>
              Ex-yard valuation per {listing.unit}. Direct counter-offer settlement on verified tax invoice.
            </p>

            {listing.status !== "AVAILABLE" && listing.status !== "UNDER_NEGOTIATION" ? (
              <div className="editorial-notice">This surplus lot has concluded its negotiation window.</div>
            ) : user?.role === "BUYER" ? (
              <form onSubmit={makeOffer} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Submit Formal Price Proposal
                </span>
                <div>
                  <label className="field-label-mono">Target Price Per {listing.unit} (₹)</label>
                  <input
                    className="editorial-input"
                    name="offerPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="field-label-mono">Requested Lot Quantity (Max {listing.quantity})</label>
                  <input
                    className="editorial-input"
                    name="quantity"
                    type="number"
                    min="1"
                    max={listing.quantity}
                    value={offerQty}
                    onChange={(e) => setOfferQty(e.target.value)}
                    required
                  />
                </div>

                <div style={{ padding: "14px", background: "var(--muted)", border: "1.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", textTransform: "uppercase" }}>Total Proposal</span>
                  <strong style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>
                    {formatMoney(totalOfferVal)}
                  </strong>
                </div>

                <div>
                  <label className="field-label-mono">Logistics &amp; Yard Terms</label>
                  <textarea
                    className="editorial-input"
                    name="buyerMessage"
                    rows="3"
                    placeholder="e.g. Can dispatch flatbed trucks for Friday morning loading."
                  />
                </div>

                <button className="button primary full-width large" disabled={busy}>
                  {busy ? "Submitting…" : "Dispatch Formal Offer →"}
                </button>
              </form>
            ) : user?.role === "SELLER" ? (
              <div className="editorial-notice">
                You are currently authenticated as a seller. Sign in with a verified buyer account to propose offers.
              </div>
            ) : (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "12px" }}>
                <Link className="button primary full-width large" to="/login">
                  Sign In to Negotiate
                </Link>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)" }}>
                  Accredited enterprises trade and counter-offer directly.
                </span>
              </div>
            )}

            <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1.5px solid var(--border)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", color: "var(--muted-foreground)", marginBottom: "4px" }}>
                Selling Counterparty
              </span>
              <strong style={{ fontFamily: "var(--font-serif)", fontSize: "16px", display: "block" }}>
                {listing.seller?.businessProfile?.companyName || listing.seller?.fullName || "Verified Mill / Enterprise"}
              </strong>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)" }}>
                {listing.seller?.businessProfile?.city
                  ? `${listing.seller.businessProfile.city}, ${listing.seller.businessProfile.state}`
                  : listing.location} · 100% GST Verified
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ==========================================================================
   Login Page: 1-Click Demo Accounts & Minimalist Monograph Auth
   ========================================================================== */
function LoginPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const autofill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const user = await refreshUser();
      navigate(roleHome(user?.role), { replace: true });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="editorial-auth-box">
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div className="brand-text-main" style={{ fontSize: "1.35rem", justifyContent: "center", marginBottom: "6px" }}>
          b2b dead stock marketplace
        </div>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)", fontSize: "14px" }}>
          Access your verified commercial trading workspace
        </p>
      </div>

      {/* 1-Click Demo Credentials */}
      <div style={{ padding: "16px", background: "var(--muted)", border: "1px solid var(--border)", marginBottom: "24px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "10px" }}>
          Instant Demo Access:
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <button
            type="button"
            className="button secondary tiny"
            onClick={() => autofill("seller@metrosteel.com", "password123")}
          >
            Seller (Metro Steel)
          </button>
          <button
            type="button"
            className="button secondary tiny"
            onClick={() => autofill("buyer@apexbuild.com", "password123")}
          >
            Buyer (Apex Builders)
          </button>
          <button
            type="button"
            className="button secondary tiny"
            onClick={() => autofill("admin@deadstock.com", "password123")}
          >
            Admin Ops
          </button>
        </div>
      </div>

      <Notice message={location.state?.message} onClose={() => navigate("/login", { replace: true, state: null })} />
      <Notice message={error} kind="error" onClose={() => setError("")} />

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <label className="field-label-mono">Corporate Email</label>
          <input
            className="editorial-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="corporate@enterprise.com"
            required
          />
        </div>

        <div>
          <label className="field-label-mono">Password</label>
          <input
            className="editorial-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button className="button primary full-width large" disabled={busy}>
          {busy ? "Authenticating…" : "Authenticate & Enter →"}
        </button>

        <p style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "12px" }}>
          Unregistered enterprise?{" "}
          <Link to="/register" style={{ color: "var(--foreground)", textDecoration: "underline", fontWeight: 600 }}>
            Submit corporate registration
          </Link>
        </p>
      </form>
    </div>
  );
}

/* ==========================================================================
   Register Page: Corporate Accreditation
   ========================================================================== */
function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...values, role: values.role, postalCode: values.postalCode || null }),
      });
      navigate("/login?registered=1", {
        state: { message: "Corporate account established. Please sign in." },
      });
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="editorial-auth-box" style={{ maxWidth: "680px" }}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div className="brand-text-main" style={{ fontSize: "1.35rem", justifyContent: "center", marginBottom: "6px" }}>
          b2b dead stock marketplace
        </div>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--muted-foreground)", fontSize: "14px" }}>
          Corporate Registration &amp; Accreditation
        </p>
      </div>

      <Notice message={error} kind="error" onClose={() => setError("")} />

      <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
        <div>
          <label className="field-label-mono">Full Contact Name</label>
          <input className="editorial-input" name="fullName" placeholder="e.g. Rajesh Mehta" required />
        </div>

        <div>
          <label className="field-label-mono">Corporate Email</label>
          <input className="editorial-input" name="email" type="email" placeholder="name@company.com" required />
        </div>

        <div>
          <label className="field-label-mono">Account Password</label>
          <input className="editorial-input" name="password" type="password" minLength="6" required />
        </div>

        <div>
          <label className="field-label-mono">Commercial Trading Role</label>
          <select className="editorial-input" name="role">
            <option value="BUYER">Buyer (Source Discounted Materials)</option>
            <option value="SELLER">Seller (Liquidate Surplus &amp; Dead Stock)</option>
          </select>
        </div>

        <div>
          <label className="field-label-mono">Legal Business Name</label>
          <input className="editorial-input" name="companyName" placeholder="e.g. Apex Industrial Fabricators" required />
        </div>

        <div>
          <label className="field-label-mono">GST / Tax Identification ID</label>
          <input className="editorial-input" name="taxId" placeholder="e.g. 27ABCDE1234F1Z5" required />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label-mono">Registered Office / Storage Yard Address</label>
          <input className="editorial-input" name="address" placeholder="Industrial Area, Plot Number..." required />
        </div>

        <div>
          <label className="field-label-mono">City</label>
          <input className="editorial-input" name="city" placeholder="e.g. Ahmedabad" required />
        </div>

        <div>
          <label className="field-label-mono">State</label>
          <input className="editorial-input" name="state" placeholder="e.g. Gujarat" required />
        </div>

        <div>
          <label className="field-label-mono">Postal Code</label>
          <input className="editorial-input" name="postalCode" placeholder="e.g. 382445" />
        </div>

        <div>
          <label className="field-label-mono">Commercial Phone</label>
          <input className="editorial-input" name="phone" type="tel" placeholder="+91 98765 00000" required />
        </div>

        <div style={{ gridColumn: "1 / -1", marginTop: "14px" }}>
          <button className="button primary full-width large" disabled={busy}>
            {busy ? "Registering…" : "Complete Corporate Accreditation →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
    else if (!loading && user && !roles.includes(user.role)) navigate(roleHome(user.role), { replace: true });
  }, [user, loading, roles, navigate]);

  if (loading || !user || !roles.includes(user.role)) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", textTransform: "uppercase" }}>
          Verifying Credentials…
        </span>
      </div>
    );
  }
  return children;
}

/* ==========================================================================
   Dashboards (Buyer, Seller, Admin)
   ========================================================================== */
function DashboardPage({ role }) {
  const endpoint = role === "ADMIN" ? null : `/api/${role.toLowerCase()}/dashboard`;
  const { data, error, loading, reload } = useLoad(() => (endpoint ? api(endpoint) : Promise.resolve(null)), [endpoint]);
  const { user } = useAuth();

  return (
    <RequireRole roles={[role]}>
      <div className="page-container">
        <div className="section-header-bar" style={{ marginBottom: "32px" }}>
          <div>
            <h1 className="section-title-serif">
              {role === "SELLER"
                ? "Liquidation Ledger & Inventory"
                : role === "BUYER"
                ? "Sourcing Proposals & Purchases"
                : "Exchange Governance"}
            </h1>
            <p className="section-subtitle-mono">
              Accredited enterprise account: {user?.fullName} ({user?.businessProfile?.companyName || "Commercial User"})
            </p>
          </div>
          {role === "SELLER" && (
            <div style={{ display: "flex", gap: "10px" }}>
              <Link className="button secondary tiny" to="/seller/listings/import">
                <IconUpload size={14} /> Import CSV
              </Link>
              {/* Prominent Post Surplus Lot Button */}
              <Link className="button primary tiny" to="/seller/listings/new">
                + Post Surplus Lot
              </Link>
            </div>
          )}
        </div>

        {role === "ADMIN" ? (
          <AdminDashboard reload={() => {}} />
        ) : (
          <PageState loading={loading} error={error}>
            {role === "BUYER" && data && <BuyerDashboard data={data} reload={reload} />}
            {role === "SELLER" && data && <SellerDashboard data={data} reload={reload} />}
          </PageState>
        )}
      </div>
    </RequireRole>
  );
}

function BuyerDashboard({ data, reload }) {
  const purchases = data.offers.filter((offer) => offer.status === "ACCEPTED");
  const activeOffers = data.offers.filter((offer) => offer.status !== "ACCEPTED");

  const exportPurchases = () =>
    downloadCsv(
      "purchase-history.csv",
      ["Listing", "Seller", "SKU", "Agreed Price", "Quantity", "Unit", "Total", "Status", "Date"],
      purchases.map((offer) => [
        offer.listing.title,
        offer.listing.seller?.fullName,
        offer.listing.sku,
        offer.counterPrice || offer.offerPrice,
        offer.quantity,
        offer.listing.unit,
        (offer.counterPrice || offer.offerPrice) * offer.quantity,
        offer.status,
        offer.updatedAt,
      ])
    );

  return (
    <>
      <div className="mono-inverted-stats" style={{ marginBottom: "36px" }}>
        <div className="stat-cell">
          <div className="stat-number-serif">{activeOffers.length}</div>
          <div className="stat-label-mono">Active Negotiations</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number-serif">{purchases.length}</div>
          <div className="stat-label-mono">Closed Purchases</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number-serif">{data.offers.length}</div>
          <div className="stat-label-mono">Total Submitted Proposals</div>
        </div>
        <div className="stat-cell" style={{ display: "flex", alignItems: "center" }}>
          <button className="button secondary tiny" onClick={exportPurchases} style={{ background: "#FFFFFF", color: "#000000" }}>
            <IconDownload size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <h3 className="section-title-serif" style={{ fontSize: "1.35rem" }}>Confirmed Purchases</h3>
      </div>

      {purchases.length ? (
        <div className="mono-table-wrapper" style={{ marginBottom: "36px" }}>
          <table className="mono-table">
            <thead>
              <tr>
                <th>Material Lot</th>
                <th>Supplier</th>
                <th>Settled Price</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((offer) => (
                <tr key={offer.id}>
                  <td>
                    <Link to={`/listings/${offer.listing.id}`} style={{ fontWeight: "700" }}>
                      {offer.listing.title}
                    </Link>
                  </td>
                  <td>{offer.listing.seller?.fullName}</td>
                  <td>
                    <strong>{formatMoney(offer.counterPrice || offer.offerPrice)}</strong>
                  </td>
                  <td>{offer.quantity} {offer.listing.unit}</td>
                  <td>
                    <span className={`status-stamp ${offer.status}`}>{offer.status}</span>
                  </td>
                  <td>{offer.updatedAt ? new Date(offer.updatedAt).toLocaleDateString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "32px", border: "1.5px solid var(--border)", marginBottom: "36px", textAlign: "center" }}>
          <p style={{ color: "var(--muted-foreground)" }}>No confirmed purchases recorded yet.</p>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <h3 className="section-title-serif" style={{ fontSize: "1.35rem" }}>Active Purchase Proposals</h3>
      </div>

      {activeOffers.length ? (
        <div className="mono-table-wrapper">
          <table className="mono-table">
            <thead>
              <tr>
                <th>Material Lot</th>
                <th>Supplier</th>
                <th>Offered Price</th>
                <th>Quantity</th>
                <th>Counter Response</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeOffers.map((offer) => (
                <tr key={offer.id}>
                  <td>
                    <Link to={`/listings/${offer.listing.id}`} style={{ fontWeight: "700" }}>
                      {offer.listing.title}
                    </Link>
                  </td>
                  <td>{offer.listing.seller?.fullName}</td>
                  <td>
                    <strong>{formatMoney(offer.offerPrice)}</strong>
                  </td>
                  <td>{offer.quantity} {offer.listing.unit}</td>
                  <td>
                    {offer.counterPrice ? (
                      <div>
                        <strong>{formatMoney(offer.counterPrice)}</strong>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--muted-foreground)" }}>
                          {offer.sellerMessage || "Counter proposed"}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>Awaiting Review</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-stamp ${offer.status}`}>{offer.status}</span>
                  </td>
                  <td>
                    <OfferActions offer={offer} role="BUYER" reload={reload} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "40px", border: "1.5px solid var(--border)", textAlign: "center" }}>
          <p style={{ color: "var(--muted-foreground)" }}>No active offers currently pending.</p>
        </div>
      )}
    </>
  );
}

function SellerDashboard({ data, reload }) {
  const activeListings = data.listings.filter((item) => ["AVAILABLE", "UNDER_NEGOTIATION"].includes(item.status));

  const exportInventory = () =>
    downloadCsv(
      "inventory-ledger.csv",
      ["SKU", "Title", "Category", "Original Price", "Liquidation Price", "Quantity", "Unit", "Location", "Status"],
      data.listings.map((item) => [
        item.sku,
        item.title,
        item.category?.title,
        item.originalPrice,
        item.price,
        item.quantity,
        item.unit,
        item.location,
        item.status,
      ])
    );

  return (
    <>
      <div className="mono-inverted-stats" style={{ marginBottom: "36px" }}>
        <div className="stat-cell">
          <div className="stat-number-serif">{activeListings.length}</div>
          <div className="stat-label-mono">Active Material Lots</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number-serif">
            ₹{formatMoney(data.listedStockValue).replace("₹", "").trim()}
          </div>
          <div className="stat-label-mono">Listed Liquidation Value</div>
        </div>
        <div className="stat-cell">
          <div className="stat-number-serif">{data.pendingOfferCount}</div>
          <div className="stat-label-mono">Proposals Requiring Review</div>
        </div>
        <div className="stat-cell" style={{ display: "flex", alignItems: "center" }}>
          <button className="button secondary tiny" onClick={exportInventory} style={{ background: "#FFFFFF", color: "#000000" }}>
            <IconDownload size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 className="section-title-serif" style={{ fontSize: "1.35rem" }}>Cataloged Surplus Inventory</h3>
        <Link className="button primary tiny" to="/seller/listings/new">
          + Post Surplus Stock
        </Link>
      </div>

      {data.listings.length ? (
        <div className="mono-table-wrapper" style={{ marginBottom: "36px" }}>
          <table className="mono-table">
            <thead>
              <tr>
                <th>SKU / Material</th>
                <th>Price Valuation</th>
                <th>Stock Quantity</th>
                <th>Yard Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.listings.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {item.sku || "—"}
                    </span>
                    <Link to={`/listings/${item.id}`} style={{ fontWeight: "700" }}>
                      {item.title}
                    </Link>
                  </td>
                  <td>
                    <strong>{formatMoney(item.price)}</strong>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {item.discountPercentage}% off list
                    </span>
                  </td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{item.location}</td>
                  <td>
                    <span className={`status-stamp ${item.status}`}>{item.status}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Link className="button secondary tiny" to={`/seller/listings/${item.id}/edit`}>
                        Edit
                      </Link>
                      <button
                        className="button danger tiny"
                        onClick={() =>
                          confirmAction("Delist this inventory item?", () =>
                            api(`/api/listings/${item.id}`, { method: "DELETE" }).then(reload)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "40px", border: "1.5px solid var(--border)", textAlign: "center", marginBottom: "36px" }}>
          <p style={{ color: "var(--muted-foreground)" }}>No inventory currently cataloged.</p>
        </div>
      )}

      {/* Incoming Offers */}
      <div style={{ marginBottom: "16px" }}>
        <h3 className="section-title-serif" style={{ fontSize: "1.35rem" }}>Incoming Purchase Proposals</h3>
      </div>

      {data.offers.length ? (
        <div className="mono-table-wrapper">
          <table className="mono-table">
            <thead>
              <tr>
                <th>Lot / Counterparty</th>
                <th>Offered Price</th>
                <th>Quantity</th>
                <th>Proposal Note</th>
                <th>Status</th>
                <th>Negotiate</th>
              </tr>
            </thead>
            <tbody>
              {data.offers.map((offer) => (
                <tr key={offer.id}>
                  <td>
                    <Link to={`/listings/${offer.listing.id}`} style={{ fontWeight: "700" }}>
                      {offer.listing.title}
                    </Link>
                    <span style={{ display: "block", fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {offer.buyer?.fullName} ({offer.buyer?.email})
                    </span>
                  </td>
                  <td>
                    <strong>{formatMoney(offer.offerPrice)}</strong>
                    {offer.counterPrice && (
                      <span style={{ display: "block", fontSize: "11px", fontWeight: "700" }}>
                        Counter: {formatMoney(offer.counterPrice)}
                      </span>
                    )}
                  </td>
                  <td>{offer.quantity} {offer.listing.unit}</td>
                  <td style={{ maxWidth: "240px", fontSize: "12.5px", color: "var(--muted-foreground)" }}>
                    {offer.buyerMessage || "—"}
                  </td>
                  <td>
                    <span className={`status-stamp ${offer.status}`}>{offer.status}</span>
                  </td>
                  <td>
                    <OfferActions offer={offer} role="SELLER" reload={reload} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "40px", border: "1.5px solid var(--border)", textAlign: "center" }}>
          <p style={{ color: "var(--muted-foreground)" }}>No offers currently received.</p>
        </div>
      )}
    </>
  );
}

function OfferActions({ offer, role, reload }) {
  const [counterPrice, setCounterPrice] = useState(offer.counterPrice ?? offer.offerPrice);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const active = ["PENDING", "COUNTER_OFFERED"].includes(offer.status);

  const action = async (path, method = "POST", body) => {
    setWorking(true);
    setError("");
    try {
      await api(path, { method, body: body ? JSON.stringify(body) : undefined });
      reload();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setWorking(false);
    }
  };

  if (!active) return <span style={{ color: "var(--muted-foreground)" }}>—</span>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {role === "SELLER" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            action(`/api/offers/${offer.id}/counter`, "POST", {
              counterPrice: Number(counterPrice),
              sellerMessage: event.currentTarget.message.value,
            });
          }}
          style={{ display: "flex", gap: "4px" }}
        >
          <input
            style={{ width: "80px", padding: "4px 8px", fontSize: "12px", border: "1.5px solid var(--border)", background: "var(--background)" }}
            aria-label="Counter price"
            type="number"
            min="0.01"
            step="0.01"
            value={counterPrice}
            onChange={(e) => setCounterPrice(e.target.value)}
            required
          />
          <input
            name="message"
            style={{ width: "90px", padding: "4px 8px", fontSize: "12px", border: "1.5px solid var(--border)", background: "var(--background)" }}
            placeholder="Terms"
          />
          <button className="button secondary tiny" disabled={working}>
            Counter
          </button>
        </form>
      )}

      <div style={{ display: "flex", gap: "4px" }}>
        {role === "SELLER" && (
          <button className="button primary tiny" disabled={working} onClick={() => action(`/api/offers/${offer.id}/accept`)}>
            Accept Deal
          </button>
        )}
        {role === "BUYER" && offer.status === "COUNTER_OFFERED" && (
          <button className="button primary tiny" disabled={working} onClick={() => action(`/api/offers/${offer.id}/accept`)}>
            Accept Counter
          </button>
        )}
        <button className="button danger tiny" disabled={working} onClick={() => action(`/api/offers/${offer.id}/reject`)}>
          Decline
        </button>
      </div>

      {error && <span style={{ fontSize: "11px", color: "#000000", fontWeight: 700 }}>{error}</span>}
    </div>
  );
}

function AdminDashboard({ reload }) {
  const { data: stats, loading: statsLoading, error: statsError } = useLoad(() => api("/api/admin/stats"));
  const { data: businesses, loading: businessesLoading, error: businessesError, reload: reloadBusinesses } = useLoad(() => api("/api/admin/businesses"));
  const [actionError, setActionError] = useState("");

  const update = async (url) => {
    await api(url, { method: "PUT" });
    reloadBusinesses();
    reload();
  };
  const runAction = (action) => action().catch((reason) => setActionError(reason.message));

  return (
    <>
      <Notice message={actionError} kind="error" onClose={() => setActionError("")} />

      <PageState loading={statsLoading} error={statsError}>
        <div className="mono-inverted-stats" style={{ marginBottom: "36px" }}>
          <div className="stat-cell">
            <div className="stat-number-serif">{stats?.totalUsers ?? "—"}</div>
            <div className="stat-label-mono">Enterprises</div>
          </div>
          <div className="stat-cell">
            <div className="stat-number-serif">{stats?.totalListings ?? 0}</div>
            <div className="stat-label-mono">Cataloged Lots</div>
          </div>
          <div className="stat-cell">
            <div className="stat-number-serif">
              ₹{formatMoney(stats?.totalActiveSurplusValue).replace("₹", "").trim()}
            </div>
            <div className="stat-label-mono">Surplus Valuation</div>
          </div>
          <div className="stat-cell">
            <div className="stat-number-serif">{stats?.acceptedDealsCount ?? 0}</div>
            <div className="stat-label-mono">Closed Transactions</div>
          </div>
        </div>
      </PageState>

      <div style={{ marginBottom: "16px" }}>
        <h3 className="section-title-serif" style={{ fontSize: "1.35rem" }}>Corporate Accreditation Queue</h3>
      </div>

      <PageState loading={businessesLoading} error={businessesError}>
        {businesses?.length ? (
          <div className="mono-table-wrapper">
            <table className="mono-table">
              <thead>
                <tr>
                  <th>Corporate Name</th>
                  <th>Contact</th>
                  <th>Tax ID / GST</th>
                  <th>Jurisdiction</th>
                  <th>Status</th>
                  <th>Accreditation</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((biz) => (
                  <tr key={biz.id}>
                    <td>
                      <strong>{biz.companyName}</strong>
                    </td>
                    <td>{biz.fullName} ({biz.email})</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{biz.taxId}</td>
                    <td>{biz.city}, {biz.state}</td>
                    <td>
                      <span className={`status-stamp ${biz.verificationStatus}`}>{biz.verificationStatus}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {biz.verificationStatus !== "APPROVED" && (
                          <button className="button primary tiny" onClick={() => runAction(() => update(`/api/admin/verify/${biz.id}`))}>
                            Approve
                          </button>
                        )}
                        {biz.verificationStatus !== "REJECTED" && (
                          <button className="button danger tiny" onClick={() => runAction(() => update(`/api/admin/reject/${biz.id}`))}>
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "32px", border: "1.5px solid var(--border)", textAlign: "center" }}>
            <p style={{ color: "var(--muted-foreground)" }}>No accreditations pending review.</p>
          </div>
        )}
      </PageState>
    </>
  );
}

/* ==========================================================================
   Listing Form Page: Post & Edit Surplus Lots
   ========================================================================== */
function ListingFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useLoad(() => api("/api/categories"));
  const { data: current, loading: listingLoading, error: listingError } = useLoad(
    () => (editing ? api(`/api/listings/${id}`) : Promise.resolve(null)),
    [id]
  );
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.categoryId = Number(values.categoryId);
    values.originalPrice = Number(values.originalPrice);
    values.price = Number(values.price);
    values.quantity = Number(values.quantity);
    values.tags = values.tags ? values.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

    try {
      if (editing) await api(`/api/listings/${id}`, { method: "PUT", body: JSON.stringify(values) });
      else await api("/api/listings", { method: "POST", body: JSON.stringify(values) });
      navigate("/seller/dashboard");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <RequireRole roles={["SELLER"]}>
      <div className="page-container" style={{ maxWidth: "780px" }}>
        <div className="section-header-bar" style={{ marginBottom: "24px" }}>
          <div>
            <h1 className="section-title-serif">{editing ? "Edit Material Lot" : "Index Surplus Stock"}</h1>
            <p className="section-subtitle-mono">Provide accurate technical specifications and storage coordinates</p>
          </div>
        </div>

        <PageState loading={categoriesLoading || listingLoading} error={categoriesError || listingError}>
          <Notice message={error} kind="error" onClose={() => setError("")} />

          <form onSubmit={submit} style={{ background: "var(--background)", border: "2px solid var(--border)", padding: "36px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "18px" }}>
            <div>
              <label className="field-label-mono">SKU / Reference ID</label>
              <input className="editorial-input" name="sku" defaultValue={current?.sku} placeholder="e.g. SKU-STEEL-09" required />
            </div>

            <div>
              <label className="field-label-mono">Classification</label>
              <select className="editorial-input" name="categoryId" defaultValue={current?.category?.id ?? ""} required>
                <option value="" disabled>Select category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label-mono">Listing Title</label>
              <input className="editorial-input" name="title" defaultValue={current?.title} placeholder="e.g. Structural Steel I-Beams (W12x26)" required />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label-mono">Technical Description</label>
              <textarea className="editorial-input" name="description" rows="4" defaultValue={current?.description} placeholder="Grade, finish, storage condition, certifications..." required />
            </div>

            <div>
              <label className="field-label-mono">Condition</label>
              <select className="editorial-input" name="condition" defaultValue={current?.condition ?? "BRAND_NEW_SURPLUS"}>
                {Object.entries(conditionLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label-mono">Pickup Yard Location</label>
              <input className="editorial-input" name="location" defaultValue={current?.location || [user?.businessProfile?.city, user?.businessProfile?.state].filter(Boolean).join(", ")} required />
            </div>

            <div>
              <label className="field-label-mono">Original Valuation (₹)</label>
              <input className="editorial-input" name="originalPrice" type="number" min="0.01" step="0.01" defaultValue={current?.originalPrice} required />
            </div>

            <div>
              <label className="field-label-mono">Surplus Price (₹)</label>
              <input className="editorial-input" name="price" type="number" min="0.01" step="0.01" defaultValue={current?.price} required />
            </div>

            <div>
              <label className="field-label-mono">Available Quantity</label>
              <input className="editorial-input" name="quantity" type="number" min="1" step="1" defaultValue={current?.quantity} required />
            </div>

            <div>
              <label className="field-label-mono">Unit Measure</label>
              <input className="editorial-input" name="unit" defaultValue={current?.unit} placeholder="e.g. Tons, Meters, Sheets" required />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <Link className="button secondary" to="/seller/dashboard">Cancel</Link>
              <button className="button primary large" disabled={busy}>
                {busy ? "Publishing…" : editing ? "Save Revisions" : "Index Surplus Lot →"}
              </button>
            </div>
          </form>
        </PageState>
      </div>
    </RequireRole>
  );
}

/* ==========================================================================
   Spreadsheet Bulk Import Page
   ========================================================================== */
function BulkListingImportPage() {
  const { data: categories, loading, error } = useLoad(() => api("/api/categories"));
  const [listings, setListings] = useState([]);
  const [fileError, setFileError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const categoryLookup = useMemo(
    () => new Map((categories || []).map((cat) => [cat.title.trim().toLowerCase(), cat.id])),
    [categories]
  );

  const downloadTemplate = () =>
    downloadCsv(
      "inventory-intake-template.csv",
      ["sku", "title", "description", "category", "originalPrice", "price", "quantity", "unit", "condition", "location", "expiryDate", "imageUrl", "tags"],
      [["SKU-001", "Surplus Steel Plates", "Unused steel plates, clean indoor warehouse storage", "Construction & Raw Metals", 8500, 5200, 30, "Plates", "BRAND_NEW_SURPLUS", "Ahmedabad, Gujarat", "", "", "steel; prime surplus"]]
    );

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    setListings([]);
    setFileError("");
    setNotice("");
    if (!file) return;

    try {
      const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      const required = ["sku", "title", "description", "category", "originalprice", "price", "quantity", "unit", "condition", "location"];

      const normalized = parsed.map((row, idx) => {
        const values = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
        const missing = required.filter((h) => !values[h]);
        if (missing.length) throw new Error(`Row ${idx + 2} is missing required fields: ${missing.join(", ")}`);
        const catId = categoryLookup.get(values.category.trim().toLowerCase());
        if (!catId) throw new Error(`Row ${idx + 2} unknown category: "${values.category}"`);

        return {
          sku: values.sku.trim(),
          title: values.title.trim(),
          description: values.description.trim(),
          categoryId: catId,
          originalPrice: Number(values.originalprice),
          price: Number(values.price),
          quantity: Number(values.quantity),
          unit: values.unit.trim(),
          condition: values.condition.trim(),
          location: values.location.trim(),
          expiryDate: values.expirydate || null,
          imageUrl: values.imageurl || null,
          tags: values.tags ? values.tags.split(";").map((t) => t.trim()).filter(Boolean) : [],
        };
      });

      setListings(normalized);
    } catch (err) {
      setFileError(err.message);
    }
  };

  const submit = async () => {
    setBusy(true);
    setFileError("");
    try {
      const result = await api("/api/listings/bulk", { method: "POST", body: JSON.stringify(listings) });
      setNotice(`Successfully published ${result.created} surplus inventory items.`);
      setListings([]);
    } catch (err) {
      setFileError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <RequireRole roles={["SELLER"]}>
      <div className="page-container" style={{ maxWidth: "780px" }}>
        <div className="section-header-bar" style={{ marginBottom: "24px" }}>
          <div>
            <h1 className="section-title-serif">Spreadsheet Inventory Ingestion</h1>
            <p className="section-subtitle-mono">Upload certified CSV spreadsheets to index lots in batch</p>
          </div>
          <button className="button secondary tiny" onClick={downloadTemplate}>
            <IconDownload size={14} /> Sample Template
          </button>
        </div>

        <PageState loading={loading} error={error}>
          <Notice message={notice} onClose={() => setNotice("")} />
          <Notice message={fileError} kind="error" onClose={() => setFileError("")} />

          <div style={{ background: "var(--background)", border: "2px solid var(--border)", padding: "36px", textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "14px" }}>
              Select CSV Spreadsheet File
            </span>
            <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ margin: "0 auto 20px" }} />

            {listings.length > 0 && (
              <div style={{ marginTop: "24px", textAlign: "left", borderTop: "1.5px solid var(--border)", paddingTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", textTransform: "uppercase", fontWeight: 700 }}>
                    {listings.length} Lots Parsed &amp; Verified
                  </span>
                  <button className="button primary" disabled={busy} onClick={submit}>
                    {busy ? "Ingesting…" : "Commit Lots to Exchange →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </PageState>
      </div>
    </RequireRole>
  );
}

/* ==========================================================================
   Profile & Credentials Page
   ========================================================================== */
function ProfilePage() {
  const { data, error, loading, reload } = useLoad(() => api("/api/profile"));
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/profile", { method: "PUT", body: JSON.stringify(values) });
      setNotice("Corporate accreditation profile revised.");
      reload();
    } catch (reason) {
      setNotice(reason.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <RequireRole roles={["BUYER", "SELLER", "ADMIN"]}>
      <div className="page-container" style={{ maxWidth: "780px" }}>
        <div className="section-header-bar" style={{ marginBottom: "24px" }}>
          <div>
            <h1 className="section-title-serif">Business Credentials &amp; Standing</h1>
            <p className="section-subtitle-mono">Audit trail and legal verification records</p>
          </div>
        </div>

        <PageState loading={loading} error={error}>
          {data && (
            <div style={{ background: "var(--background)", border: "2px solid var(--border)", padding: "36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1.5px solid var(--border)" }}>
                <div>
                  <h3 className="section-title-serif" style={{ fontSize: "1.45rem" }}>{data.user.fullName}</h3>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {data.user.email} · {data.user.role}
                  </span>
                </div>
                <span className={`status-stamp ${data.businessProfile?.verificationStatus}`}>
                  {data.businessProfile?.verificationStatus}
                </span>
              </div>

              <Notice message={notice} onClose={() => setNotice("")} />

              <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                <div>
                  <label className="field-label-mono">Registered Entity Name</label>
                  <input className="editorial-input" name="companyName" defaultValue={data.businessProfile?.companyName} required />
                </div>

                <div>
                  <label className="field-label-mono">GST / Tax Identification ID</label>
                  <input className="editorial-input" name="taxId" defaultValue={data.businessProfile?.taxId} required />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label-mono">Commercial Address</label>
                  <input className="editorial-input" name="address" defaultValue={data.businessProfile?.address} required />
                </div>

                <div>
                  <label className="field-label-mono">City</label>
                  <input className="editorial-input" name="city" defaultValue={data.businessProfile?.city} required />
                </div>

                <div>
                  <label className="field-label-mono">State</label>
                  <input className="editorial-input" name="state" defaultValue={data.businessProfile?.state} required />
                </div>

                <div style={{ gridColumn: "1 / -1", textAlign: "right", marginTop: "12px" }}>
                  <button className="button primary large" disabled={busy}>
                    {busy ? "Saving…" : "Update Corporate Profile →"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </PageState>
      </div>
    </RequireRole>
  );
}

/* ==========================================================================
   Notifications & Alerts Page
   ========================================================================== */
function NotificationsPage() {
  const { data, error, loading, reload } = useLoad(() => api("/api/notifications"));
  const [actionError, setActionError] = useState("");

  const markAll = async () => {
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      reload();
    } catch (reason) {
      setActionError(reason.message);
    }
  };

  const markRead = async (id) => {
    try {
      await api(`/api/notifications/read/${id}`, { method: "POST" });
      reload();
    } catch (reason) {
      setActionError(reason.message);
    }
  };

  return (
    <RequireRole roles={["BUYER", "SELLER", "ADMIN"]}>
      <div className="page-container" style={{ maxWidth: "780px" }}>
        <div className="section-header-bar" style={{ marginBottom: "24px" }}>
          <div>
            <h1 className="section-title-serif">Correspondence &amp; Alerts</h1>
            <p className="section-subtitle-mono">Formal notifications of proposals, counter-offers, and deal closures</p>
          </div>
          <button className="button secondary tiny" onClick={markAll}>
            Mark All Read
          </button>
        </div>

        <Notice message={actionError} kind="error" onClose={() => setActionError("")} />

        <PageState loading={loading} error={error}>
          {data?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {data.map((item) => (
                <article
                  key={item.id}
                  style={{
                    background: "var(--background)",
                    border: "1.5px solid var(--border)",
                    borderLeft: item.read ? "1.5px solid var(--border)" : "5px solid var(--foreground)",
                    padding: "18px 22px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <strong style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", display: "block", marginBottom: "4px" }}>
                      {item.title}
                    </strong>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--muted-foreground)", margin: "2px 0 6px" }}>
                      {item.message}
                    </p>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : ""}
                    </span>
                  </div>
                  {!item.read && (
                    <button className="button subtle tiny" onClick={() => markRead(item.id)}>
                      Acknowledge
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div style={{ padding: "48px", border: "1.5px solid var(--border)", textAlign: "center" }}>
              <p style={{ color: "var(--muted-foreground)" }}>All correspondence has been acknowledged.</p>
            </div>
          )}
        </PageState>
      </div>
    </RequireRole>
  );
}

function confirmAction(message, action) {
  if (window.confirm(message)) action().catch((error) => window.alert(error.message));
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/buyer/dashboard" element={<DashboardPage role="BUYER" />} />
            <Route path="/seller/dashboard" element={<DashboardPage role="SELLER" />} />
            <Route path="/seller/listings/new" element={<ListingFormPage />} />
            <Route path="/seller/listings/:id/edit" element={<ListingFormPage />} />
            <Route path="/seller/listings/import" element={<BulkListingImportPage />} />
            <Route path="/admin/dashboard" element={<DashboardPage role="ADMIN" />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route
              path="*"
              element={
                <div className="page-container" style={{ textAlign: "center", padding: "100px 0" }}>
                  <h2 className="section-title-serif" style={{ fontSize: "2.2rem", marginBottom: "12px" }}>
                    Record Not Found
                  </h2>
                  <p style={{ color: "var(--muted-foreground)", marginBottom: "24px" }}>
                    The requested index does not exist in the active catalog.
                  </p>
                  <Link className="button primary" to="/">Return to Index</Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
