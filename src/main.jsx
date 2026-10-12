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
import { api, conditionLabels, formatMoney, imageUrl, roleHome, statusLabels } from "./api.js";
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
      console.error("Could not restore the signed-in user:", error);
      setLoading(false);
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    refreshUser,
    signOut: async () => {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
    },
  }), [user, loading]);

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
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason.message || "Could not load this page."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [...dependencies, reloadKey]);

  return { data, error, loading, reload: () => setReloadKey((key) => key + 1), setData };
}

function PageState({ loading, error, children }) {
  if (loading) return <div className="page-state"><span className="spinner" /> Loading…</div>;
  if (error) return <div className="page-state error-state"><strong>Could not load this page.</strong><span>{error}</span><button className="button secondary" onClick={() => window.location.reload()}>Try again</button></div>;
  return children;
}

function Notice({ message, kind = "success", onClose }) {
  if (!message) return null;
  return <div className={`notice ${kind}`} role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={onClose}>×</button></div>;
}

function Layout() {
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await signOut();
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="B2B Dead Stock Management home">
            <span className="brand-icon">◇</span>
            <span><strong>B2B Dead Stock Management</strong><small>Inventory management</small></span>
          </Link>
          <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button>
          <nav className={menuOpen ? "main-nav open" : "main-nav"}>
            <NavLink to="/browse" onClick={() => setMenuOpen(false)}>Marketplace</NavLink>
            {user && <NavLink to={roleHome(user.role)} onClick={() => setMenuOpen(false)}>Dashboard</NavLink>}
            {user && <NavLink to="/profile" onClick={() => setMenuOpen(false)}>Business profile</NavLink>}
            {user && <NavLink to="/notifications" onClick={() => setMenuOpen(false)}>Notifications</NavLink>}
            {loading ? null : user ? (
              <div className="nav-user">
                <span>{user.businessProfile?.companyName || user.fullName}</span>
                <button className="button text-button" onClick={logout}>Sign out</button>
              </div>
            ) : (
              <div className="nav-actions">
                <Link className="button secondary" to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
                <Link className="button primary" to="/register" onClick={() => setMenuOpen(false)}>Join marketplace</Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <Notice message={notice} kind="error" onClose={() => setNotice("")} />
      <main className="main"><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-inner"><div><strong>B2B Dead Stock Management</strong><p>Trade surplus. Recover value.</p></div><span>Built for Indian businesses · 2026</span></div>
      </footer>
    </>
  );
}

function ListingCard({ listing }) {
  return (
    <article className="listing-card">
      <Link className="listing-image-wrap" to={`/listings/${listing.id}`} aria-label={`View ${listing.title}`}>
        <img src={imageUrl(listing.imageUrl)} alt={listing.title} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/listing-placeholder.svg"; }} />
        <span className="discount-badge">{listing.discountPercentage ?? 0}% OFF</span>
        <span className="condition-badge">{conditionLabels[listing.condition] || listing.condition}</span>
      </Link>
      <div className="listing-content">
        <div className="listing-meta"><span>{listing.category?.title}</span><span className="listing-location">⌖ {listing.location}</span></div>
        <h3><Link to={`/listings/${listing.id}`}>{listing.title}</Link></h3>
        <p className="listing-description">{listing.description}</p>
        <div className="listing-price-row"><div><del>{formatMoney(listing.originalPrice)}</del><strong>{formatMoney(listing.price)}</strong><small>per {listing.unit}</small></div><div className="stock-count"><strong>{listing.quantity} {listing.unit}</strong><small>Available stock</small></div></div>
        <Link className="button secondary full-width" to={`/listings/${listing.id}`}>View &amp; negotiate <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}

function HomePage() {
  const { data, loading, error } = useLoad(() => api("/api/public/overview"));
  return (
    <PageState loading={loading} error={error}>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">✓ For Indian businesses</span>
            <h1>Move surplus stock.<br /><em>Recover working capital.</em></h1>
            <p>Connect with verified businesses to sell surplus materials and find value-priced inventory.</p>
            <SearchBox />
            <div className="trust-points"><span>✓ Verified businesses</span><span>↔ Price negotiation</span><span>⌖ Local yard pickup</span></div>
          </div>
          <div className="overview-card">
            <h2>Dead stock overview</h2>
            <div className="stats-grid">
              <Stat label="Active surplus value" value={formatMoney(data?.stats.totalActiveSurplusValue)} />
              <Stat label="Surplus listings" value={data?.stats.totalListings ?? "—"} />
              <Stat label="Registered companies" value={data?.stats.totalUsers ?? "—"} />
              <Stat label="Deals confirmed" value={data?.stats.acceptedDealsCount ?? "—"} />
            </div>
            <Link className="button primary full-width" to="/register">Create a business account</Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><p className="overline">Find what you need</p><h2>Browse by category</h2></div><Link to="/browse">All categories →</Link></div>
        <div className="category-grid">{(data?.categories ?? []).map((category) => <Link key={category.id} to={`/browse?categoryId=${category.id}`} className="category-card"><span className="category-icon">▦</span><span><strong>{category.title}</strong><small>{category.description}</small></span><b>→</b></Link>)}</div>
      </section>
      <section className="section section-muted">
        <div className="section-heading"><div><p className="overline">Featured deals</p><h2>Featured surplus listings</h2></div><Link to="/browse">Explore all listings →</Link></div>
        <div className="listing-grid">{(data?.featuredListings ?? []).slice(0, 6).map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
      </section>
      <section className="section"><div className="section-heading"><div><p className="overline">Simple and direct</p><h2>How it works</h2></div></div><div className="steps-grid">{[["01", "Verify your business", "Create an account and let counterparties know who they are buying from."], ["02", "List or find stock", "Post available surplus or filter inventory by category and location."], ["03", "Negotiate directly", "Make offers, respond with counter-offers, and agree on a fair price."], ["04", "Confirm the deal", "Coordinate payment and pickup directly with the other business."]].map(([number, title, text]) => <article className="step-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    </PageState>
  );
}

function SearchBox({ initialQuery = "", initialLocation = "" }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState(initialLocation);
  useEffect(() => { setQuery(initialQuery); setLocation(initialLocation); }, [initialQuery, initialLocation]);
  const submit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (location.trim()) params.set("location", location.trim());
    navigate(`/browse${params.size ? `?${params}` : ""}`);
  };
  return <form className="search-box" onSubmit={submit}><label><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Item, material, or specs" aria-label="Search by keyword" /></label><label><span aria-hidden="true">⌖</span><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or state" aria-label="Filter by location" /></label><button className="button primary">Search deals</button></form>;
}

function Stat({ label, value }) {
  return <div className="stat-box"><strong>{value}</strong><span>{label}</span></div>;
}

function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("query") || "";
  const location = params.get("location") || "";
  const categoryId = params.get("categoryId") || "";
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ query, location, categoryId });
  const searchQuery = new URLSearchParams();
  if (query) searchQuery.set("query", query);
  if (location) searchQuery.set("location", location);
  if (categoryId) searchQuery.set("categoryId", categoryId);
  const { data: listings, error, loading } = useLoad(() => api(`/api/listings${searchQuery.size ? `?${searchQuery}` : ""}`), [query, location, categoryId]);

  useEffect(() => {
    setForm({ query, location, categoryId });
    api("/api/categories").then(setCategories).catch((reason) => console.error("Could not load categories:", reason));
    api("/api/locations").then(setLocations).catch((reason) => console.error("Could not load locations:", reason));
  }, [query, location, categoryId]);

  const apply = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (form.query.trim()) next.set("query", form.query.trim());
    if (form.location) next.set("location", form.location);
    if (form.categoryId) next.set("categoryId", form.categoryId);
    setParams(next);
  };

  return <div className="page-container">
    <div className="page-heading"><div><p className="overline">The marketplace</p><h1>Browse surplus inventory</h1><p>Discover discounted industrial materials, surplus equipment, and warehouse lots.</p></div></div>
    <SearchBox initialQuery={query} initialLocation={location} />
    <div className="browse-layout">
      <aside className="filter-panel"><div className="filter-title"><h2>Filters</h2><button className="text-button" onClick={() => setParams({})}>Clear all</button></div>
        <form onSubmit={apply}>
          <label className="field-label">Keywords<input className="input" value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} placeholder="Title, material, specs..." /></label>
          <label className="field-label">Location<select className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}><option value="">All locations</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <fieldset className="category-filter"><legend>Category</legend><button type="button" className={!form.categoryId ? "filter-choice selected" : "filter-choice"} onClick={() => setForm({ ...form, categoryId: "" })}>All categories</button>{categories.map((item) => <button type="button" key={item.id} className={String(item.id) === String(form.categoryId) ? "filter-choice selected" : "filter-choice"} onClick={() => setForm({ ...form, categoryId: String(item.id) })}>{item.title}</button>)}</fieldset>
          <button className="button primary full-width">Apply filters</button>
        </form>
      </aside>
      <section className="results">
        <PageState loading={loading} error={error}>
          <div className="results-heading"><span><strong>{listings?.length ?? 0}</strong> available items</span></div>
          {listings?.length ? <div className="listing-grid">{listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div> : <div className="empty-state"><span>▧</span><h2>No surplus items found</h2><p>Try changing your keywords, location, or category.</p><button className="button secondary" onClick={() => setParams({})}>Reset filters</button></div>}
        </PageState>
      </section>
    </div>
  </div>;
}

function ListingDetailPage() {
  const { id } = useParams();
  const { data: listing, error, loading } = useLoad(() => api(`/api/listings/${id}`), [id]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState("success");
  const [busy, setBusy] = useState(false);
  if (loading || error || !listing) return <PageState loading={loading} error={error}>{null}</PageState>;
  const makeOffer = async (event) => {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      await api("/api/offers", { method: "POST", body: JSON.stringify({ listingId: listing.id, offerPrice: Number(data.get("offerPrice")), quantity: Number(data.get("quantity")), buyerMessage: data.get("buyerMessage") }) });
      setNotice("Your offer has been sent to the seller.");
    } catch (reason) {
      setNotice(reason.message);
      setNoticeKind("error");
    } finally { setBusy(false); }
  };
  return <div className="page-container">
    <div className="breadcrumbs"><Link to="/">Home</Link><span>/</span><Link to="/browse">Marketplace</Link><span>/</span><span>{listing.category?.title}</span></div>
    <Notice message={notice} kind={noticeKind} onClose={() => setNotice("")} />
    <div className="detail-layout">
      <section>
        <div className="detail-image"><img src={imageUrl(listing.imageUrl)} alt={listing.title} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/listing-placeholder.svg"; }} /></div>
        <div className="panel detail-description"><div className="detail-labels"><span className="tag">{listing.category?.title}</span><span className={`status ${listing.status}`}>{statusLabels[listing.status] || listing.status}</span></div><h1>{listing.title}</h1><p>{listing.description}</p><dl className="spec-list"><div><dt>Condition</dt><dd>{conditionLabels[listing.condition] || listing.condition}</dd></div><div><dt>Available quantity</dt><dd>{listing.quantity} {listing.unit}</dd></div><div><dt>Pickup location</dt><dd>{listing.location}</dd></div><div><dt>Listing ID</dt><dd>LOT-{listing.id}</dd></div><div><dt>Posted</dt><dd>{listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("en-IN") : "—"}</dd></div></dl></div>
      </section>
      <aside>
        <div className="panel offer-panel"><div className="price-heading"><span>Surplus price</span><span className="discount-badge">{listing.discountPercentage ?? 0}% discount</span></div><div className="detail-price"><strong>{formatMoney(listing.price)}</strong><del>{formatMoney(listing.originalPrice)}</del></div><p className="muted">Per {listing.unit}. Confirm taxes and delivery terms with the seller.</p><hr />
          {listing.status !== "AVAILABLE" && listing.status !== "UNDER_NEGOTIATION" ? <p className="notice info">This listing is no longer available.</p> : user?.role === "BUYER" ? <form onSubmit={makeOffer} className="stack-form"><h2>Make an offer</h2><label className="field-label">Price per {listing.unit}<input className="input" name="offerPrice" type="number" min="0.01" step="0.01" defaultValue={listing.price} required /></label><label className="field-label">Quantity (max {listing.quantity})<input className="input" name="quantity" type="number" min="1" max={listing.quantity} defaultValue={Math.min(listing.quantity, 1)} required /></label><label className="field-label">Message to seller<textarea className="input" name="buyerMessage" rows="3" maxLength="1000" placeholder="Share pickup timing or your proposal" /></label><button className="button primary full-width" disabled={busy}>{busy ? "Sending…" : "Submit purchase offer"}</button></form> : user?.role === "SELLER" ? <p className="notice info">Sign in with a buyer account to make an offer.</p> : <div><Link className="button primary full-width" to="/login">Sign in to make an offer</Link><p className="muted text-center">Verified businesses can negotiate directly.</p></div>}
        </div>
        <div className="panel seller-panel"><h2>Seller business</h2><strong>{listing.seller?.businessProfile?.companyName || listing.seller?.fullName || "Verified business"}</strong><p>{listing.seller?.businessProfile?.city ? `${listing.seller.businessProfile.city}, ${listing.seller.businessProfile.state}` : listing.location}</p></div>
      </aside>
    </div>
  </div>;
}

function LoginPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    const values = new FormData(event.currentTarget);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: values.get("email"), password: values.get("password") }) });
      const user = await refreshUser();
      navigate(roleHome(user?.role), { replace: true });
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  return <AuthPage title="Welcome back" subtitle="Sign in to manage your surplus deals"><Notice message={location.state?.message} onClose={() => navigate("/login", { replace: true, state: null })} /><Notice message={error} kind="error" onClose={() => setError("")} /><form className="stack-form" onSubmit={submit}><label className="field-label">Business email<input className="input" name="email" type="email" autoComplete="email" required /></label><label className="field-label">Password<input className="input" name="password" type="password" autoComplete="current-password" required /></label><button className="button primary full-width" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><p className="muted text-center">New here? <Link to="/register">Create a business account</Link></p></form></AuthPage>;
}

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify({ ...values, role: values.role, postalCode: values.postalCode || null }) });
      navigate("/login?registered=1", { state: { message: "Account created. Sign in to continue." } });
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  return <AuthPage title="Join the marketplace" subtitle="Register your business to buy or sell surplus"><Notice message={error} kind="error" onClose={() => setError("")} /><form className="form-grid" onSubmit={submit}>
    <label className="field-label">Full name<input className="input" name="fullName" required /></label><label className="field-label">Business email<input className="input" name="email" type="email" autoComplete="email" required /></label><label className="field-label">Password<input className="input" name="password" type="password" minLength="6" autoComplete="new-password" required /></label><label className="field-label">Account type<select className="input" name="role"><option value="BUYER">Buyer</option><option value="SELLER">Seller</option></select></label><label className="field-label">Business name<input className="input" name="companyName" required /></label><label className="field-label">GST / Tax ID<input className="input" name="taxId" required /></label><label className="field-label span-two">Business address<input className="input" name="address" required /></label><label className="field-label">City<input className="input" name="city" required /></label><label className="field-label">State<input className="input" name="state" required /></label><label className="field-label">Postal code<input className="input" name="postalCode" /></label><label className="field-label">Phone<input className="input" name="phone" type="tel" required /></label><label className="field-label span-two">Industry<input className="input" name="industryType" /></label><button className="button primary full-width span-two" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button><p className="muted text-center span-two">Already registered? <Link to="/login">Sign in</Link></p>
  </form></AuthPage>;
}

function AuthPage({ title, subtitle, children }) {
  return <div className="auth-background"><section className="auth-card"><Link className="brand auth-brand" to="/"><span className="brand-icon">◇</span><strong>B2B marketplace</strong></Link><h1>{title}</h1><p className="muted">{subtitle}</p>{children}</section></div>;
}

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
    else if (!loading && user && !roles.includes(user.role)) navigate(roleHome(user.role), { replace: true });
  }, [user, loading, roles, navigate]);
  if (loading || !user || !roles.includes(user.role)) return <div className="page-state"><span className="spinner" /> Checking access…</div>;
  return children;
}

function DashboardPage({ role }) {
  const endpoint = role === "ADMIN" ? null : `/api/${role.toLowerCase()}/dashboard`;
  const { data, error, loading, reload } = useLoad(() => endpoint ? api(endpoint) : Promise.resolve(null), [endpoint]);
  const { user } = useAuth();
  return <RequireRole roles={[role]}><div className="page-container">
    <div className="page-heading"><div><p className="overline">{role.toLowerCase()} workspace</p><h1>{role === "SELLER" ? "Seller dashboard" : role === "BUYER" ? "My offers" : "Platform administration"}</h1><p>Welcome back, {user?.fullName}.</p></div>{role === "SELLER" && <Link className="button primary" to="/seller/listings/new">＋ Post a listing</Link>}</div>
    {role === "ADMIN" ? <AdminDashboard reload={() => {}} /> : <PageState loading={loading} error={error}>
      {role === "BUYER" && data && <BuyerDashboard data={data} reload={reload} />}
      {role === "SELLER" && data && <SellerDashboard data={data} reload={reload} />}
    </PageState>}
  </div></RequireRole>;
}

function BuyerDashboard({ data, reload }) {
  return <><div className="stats-grid dashboard-stats"><Stat label="My offers" value={data.offers.length} /><Stat label="Confirmed deals" value={data.acceptedOfferCount} /></div><h2 className="subheading">Purchase offers</h2>{data.offers.length ? <div className="table-wrap"><table><thead><tr><th>Listing</th><th>Seller</th><th>Your offer</th><th>Quantity</th><th>Seller response</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.offers.map((offer) => <tr key={offer.id}><td><Link to={`/listings/${offer.listing.id}`}>{offer.listing.title}</Link></td><td>{offer.listing.seller?.fullName}</td><td>{formatMoney(offer.offerPrice)}<small>Total {formatMoney(offer.totalAmount)}</small></td><td>{offer.quantity} {offer.listing.unit}</td><td>{offer.counterPrice ? `${formatMoney(offer.counterPrice)} · ${offer.sellerMessage || ""}` : "—"}</td><td><Status value={offer.status} /></td><td><OfferActions offer={offer} role="BUYER" reload={reload} /></td></tr>)}</tbody></table></div> : <EmptyState title="No offers yet" text="Browse the marketplace and make an offer on a surplus listing." link="/browse" linkText="Browse listings" />}</>;
}

function SellerDashboard({ data, reload }) {
  return <><div className="stats-grid dashboard-stats"><Stat label="Active listings" value={data.listings.filter((item) => ["AVAILABLE", "UNDER_NEGOTIATION"].includes(item.status)).length} /><Stat label="Listed stock value" value={formatMoney(data.listedStockValue)} /><Stat label="Original stock value" value={formatMoney(data.tiedUpCapital)} /><Stat label="Offers to review" value={data.pendingOfferCount} /></div><div className="section-heading compact"><div><h2>My inventory</h2></div><Link className="button secondary" to="/seller/listings/new">＋ Add stock</Link></div>{data.listings.length ? <div className="table-wrap"><table><thead><tr><th>Listing</th><th>Asking price</th><th>Quantity</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.listings.map((item) => <tr key={item.id}><td><Link to={`/listings/${item.id}`}>{item.title}</Link></td><td>{formatMoney(item.price)}</td><td>{item.quantity} {item.unit}</td><td>{item.location}</td><td><Status value={item.status} /></td><td className="action-row"><Link className="button tiny secondary" to={`/seller/listings/${item.id}/edit`}>Edit</Link><button className="button tiny danger" onClick={() => confirmAction("Remove this listing?", () => api(`/api/listings/${item.id}`, { method: "DELETE" }).then(reload))}>Remove</button></td></tr>)}</tbody></table></div> : <EmptyState title="No inventory listed" text="Post your first surplus listing to reach buyers." link="/seller/listings/new" linkText="Create listing" />}
    <div className="section-heading compact top-space"><div><h2>Incoming offers</h2></div><span className="muted">{data.offers.length} total</span></div>{data.offers.length ? <div className="table-wrap"><table><thead><tr><th>Listing / buyer</th><th>Offer</th><th>Quantity</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead><tbody>{data.offers.map((offer) => <tr key={offer.id}><td><Link to={`/listings/${offer.listing.id}`}>{offer.listing.title}</Link><small>{offer.buyer?.fullName} · {offer.buyer?.email}</small></td><td>{formatMoney(offer.offerPrice)}{offer.counterPrice && <small>Counter: {formatMoney(offer.counterPrice)}</small>}</td><td>{offer.quantity} {offer.listing.unit}</td><td>{offer.buyerMessage || "—"}</td><td><Status value={offer.status} /></td><td><OfferActions offer={offer} role="SELLER" reload={reload} /></td></tr>)}</tbody></table></div> : <div className="empty-inline">No offers received yet.</div>}</>;
}

function OfferActions({ offer, role, reload }) {
  const [counterPrice, setCounterPrice] = useState(offer.counterPrice ?? offer.offerPrice);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const active = ["PENDING", "COUNTER_OFFERED"].includes(offer.status);
  const action = async (path, method = "POST", body) => {
    setWorking(true); setError("");
    try { await api(path, { method, body: body ? JSON.stringify(body) : undefined }); reload(); }
    catch (reason) { setError(reason.message); }
    finally { setWorking(false); }
  };
  if (!active) return <span className="muted">—</span>;
  return <div className="offer-actions">
    {role === "SELLER" && <form className="counter-form" onSubmit={(event) => { event.preventDefault(); action(`/api/offers/${offer.id}/counter`, "POST", { counterPrice: Number(counterPrice), sellerMessage: event.currentTarget.message.value }); }}><input aria-label="Counter-offer price" type="number" min="0.01" step="0.01" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} required /><input name="message" aria-label="Counter-offer message" placeholder="Message (optional)" /><button className="button tiny secondary" disabled={working}>Counter</button></form>}
    {role === "SELLER" && <button className="button tiny primary" disabled={working} onClick={() => action(`/api/offers/${offer.id}/accept`)}>Accept</button>}
    {role === "BUYER" && offer.status === "COUNTER_OFFERED" && <button className="button tiny primary" disabled={working} onClick={() => action(`/api/offers/${offer.id}/accept`)}>Accept counter</button>}
    <button className="button tiny danger" disabled={working} onClick={() => action(`/api/offers/${offer.id}/reject`)}>Decline</button>
    {error && <small className="field-error">{error}</small>}
  </div>;
}

function AdminDashboard({ reload }) {
  const { data: stats, loading: statsLoading, error: statsError } = useLoad(() => api("/api/admin/stats"));
  const { data: businesses, loading: businessesLoading, error: businessesError, reload: reloadBusinesses } = useLoad(() => api("/api/admin/businesses"));
  const { data: listings, loading: listingsLoading, error: listingsError, reload: reloadListings } = useLoad(() => api("/api/admin/listings"));
  const [actionError, setActionError] = useState("");
  const update = async (url) => { await api(url, { method: "PUT" }); reloadBusinesses(); reload(); };
  const remove = async (id) => { await api(`/api/admin/listings/${id}`, { method: "DELETE" }); reloadListings(); };
  const runAction = (action) => action().catch((reason) => setActionError(reason.message));
  return <><Notice message={actionError} kind="error" onClose={() => setActionError("")} /><PageState loading={statsLoading} error={statsError}><div className="stats-grid dashboard-stats"><Stat label="Businesses" value={stats.totalUsers} /><Stat label="Sellers" value={stats.totalSellers} /><Stat label="Buyers" value={stats.totalBuyers} /><Stat label="Listings" value={stats.totalListings} /><Stat label="Active surplus value" value={formatMoney(stats.totalActiveSurplusValue)} /><Stat label="Negotiations" value={stats.totalOffers} /><Stat label="Confirmed deals" value={stats.acceptedDealsCount} /><Stat label="Accepted deal volume" value={formatMoney(stats.totalAcceptedDealVolume)} /></div></PageState>
    <div className="section-heading compact top-space"><div><h2>Business verification queue</h2><p>Review submitted business profiles.</p></div><span className="tag">{stats?.pendingVerifications ?? 0} pending</span></div>
    <PageState loading={businessesLoading} error={businessesError}>{businesses?.length ? <div className="table-wrap"><table><thead><tr><th>Business</th><th>Owner</th><th>Tax ID</th><th>Location</th><th>Status</th><th>Review</th></tr></thead><tbody>{businesses.map((business) => <tr key={business.id}><td>{business.companyName}<small>{business.industryType}</small></td><td>{business.fullName}<small>{business.email}</small></td><td>{business.taxId}</td><td>{business.city}, {business.state}</td><td><Status value={business.verificationStatus} /></td><td className="action-row">{business.verificationStatus !== "APPROVED" && <button className="button tiny primary" onClick={() => runAction(() => update(`/api/admin/verify/${business.id}`))}>Approve</button>}{business.verificationStatus !== "REJECTED" && <button className="button tiny danger" onClick={() => runAction(() => update(`/api/admin/reject/${business.id}`))}>Reject</button>}</td></tr>)}</tbody></table></div> : <EmptyState title="No businesses to review" text="New business registrations will appear here." />}</PageState>
    <div className="section-heading compact top-space"><div><h2>Listing moderation</h2></div></div><PageState loading={listingsLoading} error={listingsError}>{listings?.length ? <div className="table-wrap"><table><thead><tr><th>Listing</th><th>Seller</th><th>Category</th><th>Price</th><th>Location</th><th>Status</th><th>Moderation</th></tr></thead><tbody>{listings.map((item) => <tr key={item.id}><td><Link to={`/listings/${item.id}`}>{item.title}</Link></td><td>{item.seller?.fullName}</td><td>{item.category?.title}</td><td>{formatMoney(item.price)}</td><td>{item.location}</td><td><Status value={item.status} /></td><td><button className="button tiny danger" onClick={() => window.confirm("Remove this listing?") && runAction(() => remove(item.id))}>Remove</button></td></tr>)}</tbody></table></div> : <EmptyState title="No listings" text="Listings will appear here for moderation." />}</PageState>
  </>;
}

function ListingFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { data: categories, loading: categoriesLoading, error: categoriesError } = useLoad(() => api("/api/categories"));
  const { data: current, loading: listingLoading, error: listingError } = useLoad(() => editing ? api(`/api/listings/${id}`) : Promise.resolve(null), [id]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    values.categoryId = Number(values.categoryId);
    values.originalPrice = Number(values.originalPrice);
    values.price = Number(values.price);
    values.quantity = Number(values.quantity);
    try {
      if (editing) await api(`/api/listings/${id}`, { method: "PUT", body: JSON.stringify(values) });
      else await api("/api/listings", { method: "POST", body: JSON.stringify(values) });
      navigate("/seller/dashboard");
    } catch (reason) { setError(reason.message); } finally { setBusy(false); }
  };
  return <RequireRole roles={["SELLER"]}><div className="page-container narrow-page"><div className="page-heading"><div><p className="overline">Seller inventory</p><h1>{editing ? "Edit listing" : "Post surplus stock"}</h1><p>Share clear details so buyers can make informed offers.</p></div></div><PageState loading={categoriesLoading || listingLoading} error={categoriesError || listingError}><Notice message={error} kind="error" onClose={() => setError("")} /><form className="panel form-grid" onSubmit={submit}>
    <label className="field-label span-two">Listing title<input className="input" name="title" defaultValue={current?.title} maxLength="200" required /></label>
    <label className="field-label span-two">Description<textarea className="input" name="description" rows="5" defaultValue={current?.description} required /></label>
    <label className="field-label">Category<select className="input" name="categoryId" defaultValue={current?.category?.id ?? ""} required><option value="" disabled>Select a category</option>{categories?.map((category) => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
    <label className="field-label">Condition<select className="input" name="condition" defaultValue={current?.condition ?? "BRAND_NEW_SURPLUS"}>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field-label">Original price (₹)<input className="input" name="originalPrice" type="number" min="0.01" step="0.01" defaultValue={current?.originalPrice} required /></label>
    <label className="field-label">Surplus price (₹)<input className="input" name="price" type="number" min="0.01" step="0.01" defaultValue={current?.price} required /></label>
    <label className="field-label">Quantity<input className="input" name="quantity" type="number" min="1" step="1" defaultValue={current?.quantity} required /></label>
    <label className="field-label">Unit<input className="input" name="unit" maxLength="30" defaultValue={current?.unit} placeholder="e.g. Tons, Pieces" required /></label>
    <label className="field-label span-two">Pickup location<input className="input" name="location" maxLength="150" defaultValue={current?.location || [user?.businessProfile?.city, user?.businessProfile?.state].filter(Boolean).join(", ")} required /></label>
    <label className="field-label span-two">Product image URL <span className="muted">(optional)</span><input className="input" name="imageUrl" type="url" defaultValue={current?.imageUrl} placeholder="https://…" /></label>
    <div className="form-actions span-two"><Link className="button secondary" to="/seller/dashboard">Cancel</Link><button className="button primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Publish listing"}</button></div>
  </form></PageState></div></RequireRole>;
}

function ProfilePage() {
  const { data, error, loading, reload } = useLoad(() => api("/api/profile"));
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try { await api("/api/profile", { method: "PUT", body: JSON.stringify(values) }); setNotice("Business profile updated."); reload(); }
    catch (reason) { setNotice(reason.message); }
    finally { setBusy(false); }
  };
  return <RequireRole roles={["BUYER", "SELLER", "ADMIN"]}><div className="page-container narrow-page"><div className="page-heading"><div><p className="overline">Account settings</p><h1>Business profile</h1><p>Manage the business details shown to marketplace partners.</p></div></div><PageState loading={loading} error={error}>{data && <section className="panel"><div className="profile-summary"><span className="avatar">{data.user.fullName?.[0]?.toUpperCase()}</span><div><strong>{data.user.fullName}</strong><span>{data.user.email} · {data.user.role}</span></div><Status value={data.businessProfile?.verificationStatus} /></div><Notice message={notice} kind={notice.includes("updated") ? "success" : "error"} onClose={() => setNotice("")} /><form className="form-grid" onSubmit={submit}>
    <label className="field-label">Business name<input className="input" name="companyName" defaultValue={data.businessProfile?.companyName} required /></label><label className="field-label">GST / Tax ID<input className="input" name="taxId" defaultValue={data.businessProfile?.taxId} required /></label><label className="field-label span-two">Address<input className="input" name="address" defaultValue={data.businessProfile?.address} required /></label><label className="field-label">City<input className="input" name="city" defaultValue={data.businessProfile?.city} required /></label><label className="field-label">State<input className="input" name="state" defaultValue={data.businessProfile?.state} required /></label><label className="field-label">Postal code<input className="input" name="postalCode" defaultValue={data.businessProfile?.postalCode} /></label><label className="field-label">Phone<input className="input" name="phone" defaultValue={data.businessProfile?.phone} required /></label><label className="field-label span-two">Industry<input className="input" name="industryType" defaultValue={data.businessProfile?.industryType} /></label><button className="button primary span-two" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
  </form></section>}</PageState></div></RequireRole>;
}

function NotificationsPage() {
  const { data, error, loading, reload } = useLoad(() => api("/api/notifications"));
  const [actionError, setActionError] = useState("");
  const markAll = async () => { try { await api("/api/notifications/read-all", { method: "POST" }); reload(); } catch (reason) { setActionError(reason.message); } };
  const markRead = async (id) => { try { await api(`/api/notifications/read/${id}`, { method: "POST" }); reload(); } catch (reason) { setActionError(reason.message); } };
  return <RequireRole roles={["BUYER", "SELLER", "ADMIN"]}><div className="page-container narrow-page"><div className="page-heading"><div><p className="overline">Your account</p><h1>Notifications</h1><p>Updates about offers, deals, and business verification.</p></div><button className="button secondary" onClick={markAll}>Mark all as read</button></div><Notice message={actionError} kind="error" onClose={() => setActionError("")} /><PageState loading={loading} error={error}>{data?.length ? <div className="notification-list">{data.map((item) => <article className={item.read ? "notification read" : "notification"} key={item.id}><span className="notification-dot" /><div><strong>{item.title}</strong><p>{item.message}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : ""}</small></div>{!item.read && <button className="text-button" onClick={() => markRead(item.id)}>Mark read</button>}</article>)}</div> : <EmptyState title="You’re all caught up" text="Important marketplace updates will show here." />}</PageState></div></RequireRole>;
}

function Status({ value }) {
  return <span className={`status ${value || ""}`}>{statusLabels[value] || value || "Unknown"}</span>;
}

function EmptyState({ title, text, link, linkText }) {
  return <div className="empty-state"><span>▧</span><h2>{title}</h2><p>{text}</p>{link && <Link className="button primary" to={link}>{linkText}</Link>}</div>;
}

function confirmAction(message, action) {
  if (window.confirm(message)) action().catch((error) => window.alert(error.message));
}

function App() {
  return <BrowserRouter><AuthProvider><Routes>
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
      <Route path="/admin/dashboard" element={<DashboardPage role="ADMIN" />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="*" element={<div className="page-container"><EmptyState title="Page not found" text="The page you’re looking for doesn’t exist." link="/" linkText="Go home" /></div>} />
    </Route>
  </Routes></AuthProvider></BrowserRouter>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
