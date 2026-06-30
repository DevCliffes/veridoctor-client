import { MetadataRoute } from "next";

interface Provider {
  id: string;
  updated_at?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://veridoctor.com";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://veridoctor-backend-1.onrender.com";

async function getProviders(): Promise<Provider[]> {
  try {
    const res = await fetch(`${apiUrl}/provider/list`, {
      // Revalidate periodically rather than on every request, since this
      // runs at build/request time for the sitemap and the provider list
      // doesn't change every minute.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/book`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Add any other static marketing pages here, e.g.:
    // { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    // { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const providers = await getProviders();

  const providerRoutes: MetadataRoute.Sitemap = providers.map((p) => ({
    url: `${baseUrl}/book/provider/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...providerRoutes];
}
