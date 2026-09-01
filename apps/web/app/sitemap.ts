import type { MetadataRoute } from "next";
import { LANDINGS } from "./_landing/conteudo";

/**
 * Só as landings públicas entram. Hoje é uma; quando as variantes por produto
 * do §5.1 forem publicadas, elas aparecem aqui sozinhas — o sitemap lê o mesmo
 * mapa que a página (decisão D4).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_URL_BASE ?? "http://localhost:3000";

  return Object.values(LANDINGS).map((l) => ({
    url: l.slug ? `${base}/${l.slug}` : base,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: l.slug ? 0.8 : 1,
  }));
}
