import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app",
          "/api",
          "/invite",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
          "/welcome",
        ],
      },
    ],
    sitemap: appUrl("/sitemap.xml"),
  };
}
