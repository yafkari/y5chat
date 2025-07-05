import type { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        "/",
        "/chat",
        "/terms",
        "/privacy",
      ],
      disallow: [
        "/api",
        "/cdn-cgi/",
        "/_next",
        "/_static",
      ]
    },
    sitemap: 'https://y5.chat/sitemap.xml',
  }
}