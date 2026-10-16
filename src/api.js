export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null
      ? payload.error ?? payload.message
      : payload;
    throw new ApiError(message || `Request failed (${response.status})`, response.status);
  }

  return payload;
}

export const formatMoney = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(Number(amount ?? 0));

export const conditionLabels = {
  BRAND_NEW_SURPLUS: "Brand New Surplus",
  OVERSTOCKED: "Overstocked Inventory",
  FACTORY_SECONDS: "Factory B-Grade / Seconds",
  OPEN_BOX: "Open Box / Unused",
  REMANUFACTURED: "Refurbished / Certified",
};

export const statusLabels = {
  AVAILABLE: "Available",
  UNDER_NEGOTIATION: "Under negotiation",
  SOLD: "Sold",
  DELISTED: "Delisted",
  PENDING: "Pending",
  COUNTER_OFFERED: "Counter-offered",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  APPROVED: "Approved",
};

// Curated high-resolution raw material images for industrial surplus
export const MATERIAL_IMAGES = {
  steel: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", // Raw structural steel I-beams
  metalCoil: "https://images.unsplash.com/photo-1535813547-99c456a41d4a?auto=format&fit=crop&w=1200&q=80", // Heavy metal coils
  sheetMetal: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80", // Industrial stainless sheets
  motor: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80", // 3-phase electric motors & machinery
  packaging: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80", // Corrugated shipping cartons on pallets
  fabric: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80", // Industrial cotton canvas & textile rolls
  timber: "https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=1200&q=80", // Dimensional lumber & raw timber planks
  chemical: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1200&q=80", // Sealed industrial drums & coatings
  machining: "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=1200&q=80", // Lathe tooling & raw mechanical parts
  pipes: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80", // Copper pipes & industrial metal tubing
  containers: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1200&q=80", // HDPE polymer drums
};

export function getMaterialImage(categoryName = "", title = "", fallbackUrl = "") {
  const text = `${categoryName} ${title}`.toLowerCase();

  if (text.includes("canvas") || text.includes("textile") || text.includes("fabric") || text.includes("cotton") || text.includes("yarn")) {
    return MATERIAL_IMAGES.fabric;
  }
  if (text.includes("beam") || text.includes("rebar") || text.includes("structural")) {
    return MATERIAL_IMAGES.steel;
  }
  if (text.includes("sheet") || text.includes("plate") || text.includes("coil") || text.includes("stainless") || text.includes("alloy") || text.includes("metal")) {
    return MATERIAL_IMAGES.metalCoil;
  }
  if (text.includes("motor") || text.includes("machinery") || text.includes("induction") || text.includes("pump") || text.includes("gear")) {
    return MATERIAL_IMAGES.motor;
  }
  if (text.includes("box") || text.includes("corrugated") || text.includes("carton") || text.includes("pallet")) {
    return MATERIAL_IMAGES.packaging;
  }
  if (text.includes("drum") || text.includes("hdpe") || text.includes("plastic") || text.includes("polymer")) {
    return MATERIAL_IMAGES.containers;
  }
  if (text.includes("timber") || text.includes("wood") || text.includes("lumber") || text.includes("plank")) {
    return MATERIAL_IMAGES.timber;
  }
  if (text.includes("pipe") || text.includes("tube") || text.includes("copper") || text.includes("conduit")) {
    return MATERIAL_IMAGES.pipes;
  }
  if (text.includes("chemical") || text.includes("coating") || text.includes("resin") || text.includes("paint") || text.includes("solvent")) {
    return MATERIAL_IMAGES.chemical;
  }
  if (fallbackUrl && fallbackUrl.startsWith("http")) {
    return fallbackUrl;
  }
  return MATERIAL_IMAGES.steel;
}

export function imageUrl(value, category = null, title = "") {
  const categoryName = typeof category === "object" && category !== null ? category.title : (category || "");
  // Return authentic raw material image matched to the material specification
  return getMaterialImage(categoryName, title, value);
}

export function roleHome(role) {
  if (role === "SELLER") return "/seller/dashboard";
  if (role === "BUYER") return "/buyer/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/";
}
