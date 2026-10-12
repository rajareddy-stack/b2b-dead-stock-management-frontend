export default async function handler(request, response) {
  const backendUrl = process.env.BACKEND_API_URL?.replace(/\/+$/, "");
  if (!backendUrl) {
    response.status(500).json({ error: "BACKEND_API_URL is not configured." });
    return;
  }

  const incomingUrl = new URL(request.url, "http://localhost");
  const apiPath = incomingUrl.searchParams.get("path") ?? "";
  if (
    !apiPath ||
    apiPath.startsWith("/") ||
    apiPath.includes("\\") ||
    apiPath.includes("?") ||
    apiPath.includes("#") ||
    apiPath.split("/").some((part) => part === "." || part === "..")
  ) {
    response.status(400).json({ error: "Invalid API path." });
    return;
  }
  incomingUrl.searchParams.delete("path");
  const query = incomingUrl.searchParams.toString();
  const destination = `${backendUrl}/api/${apiPath}${query ? `?${query}` : ""}`;

  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "authorization"]) {
    const value = request.headers[name];
    if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (request.body != null) {
      body = Buffer.isBuffer(request.body)
        ? request.body
        : Buffer.from(typeof request.body === "string" ? request.body : JSON.stringify(request.body));
    } else {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }
  }

  try {
    const upstream = await fetch(destination, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(90_000),
    });

    response.status(upstream.status);
    for (const name of ["content-type", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }
    const cookies = upstream.headers.getSetCookie?.() ?? [];
    if (cookies.length) response.setHeader("set-cookie", cookies);

    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("Backend API proxy failed:", error);
    response.status(502).json({ error: "The application API is temporarily unavailable." });
  }
}
