// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/styles/notion-scrollbar.css";

import { cn } from "@/lib/utils";
import SiteProvider from "@/components/providers/SiteProvider";
import LayoutWrapper from "@/components/LayoutWrapper";
import GoogleTagManagerHead from "@/components/GoogleTagManagerHead";
import GoogleTagManagerBody from "@/components/GoogleTagManagerBody";
import Loading from "./Loading";
import { Suspense, type ReactNode } from "react";
import { getDb } from "@/lib/mongodb";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  const site = await db.collection("sites").findOne({});

  const siteUrl = "https://ba8aka.com";
  const siteName = site?.title || "BA8AKA · 子谦的个人博客网站";
  const siteDesc =
    site?.seo?.description ||
    "子谦BA8AKA的个人博客：聚焦业余无线电（HAM）、AI 研学与前端开发实践，也有旅行、摄影与生活方式笔记。";
  const siteLogo = site?.logo || `${siteUrl}/favicon.ico`;

  return {
    metadataBase: new URL(siteUrl),
    title: siteName,
    description: siteDesc,
    keywords:
      site?.seo?.keywords || [
        "BA8AKA",
        "业余无线电",
        "HAM",
        "AI",
        "前端开发",
        "个人博客",
      ],
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      shortcut: ["/favicon.ico"],
    },
    manifest: "/site.webmanifest",
    openGraph: {
      title: siteName,
      siteName,
      description: siteDesc,
      type: "website",
      url: siteUrl,
      images: [siteLogo],
    },
  };
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BA8AKA · 子谦的个人博客网站",
  url: "https://ba8aka.com",
  logo: "https://ba8aka.com/favicon.ico",
  sameAs: ["https://github.com/AiT0T"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="baidu-site-verification" content="codeva-V7xyVqf0Mh" />
        <GoogleTagManagerHead />
        {/* Organization JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body className={cn(inter.className, "min-h-screen w-full")}>
        <SiteProvider>
          <GoogleTagManagerBody />
          <LayoutWrapper>
            <Suspense fallback={<Loading />}>{children}</Suspense>
          </LayoutWrapper>
        </SiteProvider>
      </body>
    </html>
  );
}
