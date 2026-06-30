import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://veridoctor.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://veridoctor.com/about", lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: "https://veridoctor.com/faq", lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: "https://veridoctor.com/for-healthcare-providers", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://veridoctor.com/for-patients", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}
