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
  maximumFractionDigits: 2,
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

export function imageUrl(value) {
  return value || "/images/listing-placeholder.svg";
}

export function roleHome(role) {
  if (role === "SELLER") return "/seller/dashboard";
  if (role === "BUYER") return "/buyer/dashboard";
  if (role === "ADMIN") return "/admin/dashboard";
  return "/";
}
