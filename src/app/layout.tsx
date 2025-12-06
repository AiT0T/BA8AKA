import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/notion-scrollbar.css";
import SiteProvider from "@/components/providers/SiteProvider";
import { getDb } from "@/lib/mongodb";
import LayoutWrapper from "@/components/LayoutWrapper";
import GoogleTagManagerHead from "@/components/GoogleTagManagerHead";
import GoogleTagManagerBody from "@/components/GoogleTagManagerBody";
import Loading from "./Loading";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const site = await db.collection("sites").findOne({});
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BA8AKA 子谦的个人博客网站',
    url: 'https://ba8aka.com',
    logo: site?.logo || 'https://ba8aka.com/favicon.ico',
    sameAs: [
      site?.social?.github || 'https://github.com/AiT0T',
      // 其他社交媒体链接
    ]
  };
  return {
    title: site?.title || "BA8AKA's blog",
    description:
      site?.seo?.description || "ObjectX's articles about programming and life",
    keywords: site?.seo?.keywords || [],
    openGraph: {
      title: 'BA8AKA’ 子谦的个人博客网站,',
      siteName: "BA8AKA·子谦的个人博客",
      description: site?.seo?.description || "BA8AKA's articles about programming and life",
      type: "website",
    },
    other: {
      ...site?.isOpenAdsense && site?.googleAdsenseId
        ? {
          "google-adsense-account": `ca-pub-${site.googleAdsenseId}`,
        }
        : {},
      'script:ld+json': JSON.stringify(jsonLd),
    },
  };
}

const jsonLdData = {
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "如何优化 Next.js 网站的 SEO",
  "author": {
    "@type": "Person",
    "name": "BA8AKA"
  },
  "datePublished": "2025-03-18",
  "publisher": {
    "@type": "Organization",
    "name": "BA8AKA 博客",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManagerHead />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className={`${cn(inter.className)} h-dvh w-dvw`}>
        <SiteProvider>
          <GoogleTagManagerBody />
          <LayoutWrapper>
            <Suspense fallback={<Loading />}>
              {children}
            </Suspense>
          </LayoutWrapper>
        </SiteProvider>
      </body>
    </html>
  );
}
