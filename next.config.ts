import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = (() => {
  if (!supabaseUrl) return null;

  try {
    return new URL(supabaseUrl).origin;
  } catch {
    return null;
  }
})();
const supabaseRealtimeOrigin = supabaseOrigin?.replace(/^http/, "ws") ?? null;

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}${supabaseRealtimeOrigin ? ` ${supabaseRealtimeOrigin}` : ""}`,
  `img-src 'self' blob: data:${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(!isDevelopment ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
