import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: appUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: appUrl("/signup"), lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: appUrl("/login"), lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
