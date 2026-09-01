import type { MetadataRoute } from "next";

/**
 * A landing é para ser encontrada; o admin e a API, não.
 * Bloquear /esteira e /api aqui é higiene de SEO — quem protege de verdade
 * são o middleware e a RLS.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_URL_BASE ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/esteira", "/entrar", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
