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

  const siteUrl = "https://ba8aka.com";
  const siteName = site?.title || "BA8AKA · 子谦的个人博客网站";
  const siteDesc =
    site?.seo?.description ||
    "子谦BA8AKA的个人博客：聚焦业余无线电（HAM）、AI 研学与前端开发实践，也有旅行、摄影与生活方式笔记。";
  const siteLogo = site?.logo || `${siteUrl}/favicon.ico`;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: siteLogo,
    sameAs: [
      site?.social?.github || "https://github.com/AiT0T",
      // 其他社交媒体链接可继续加
    ],
  };

  return {
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
    /**
     * 这里把你放在 public/ 下的 favicon 全部声明出来
     * /favicon.ico      -> 经典 ico
     * /favicon-96x96.png
     * /favicon.svg
     * /apple-touch-icon.png
     */
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180" },
      ],
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
    other: {
      ...(site?.isOpenAdsense && site?.googleAdsenseId
        ? {
            "google-adsense-account": `ca-pub-${site.googleAdsenseId}`,
          }
        : {}),
      // 把 Organization 的 JSON-LD 序列化放在 meta 里，下面 <head> 里也会再输出一次 script，
      // 不想重复的话也可以只保留下面那一份。
      "ba8aka:organization-jsonld": JSON.stringify(organizationJsonLd),
    },
  };
}

/**
 * 这里给 Google 一份静态的 Organization 结构化数据就够用了，
 * 不再用之前那个“如何优化 Next.js SEO”的 Article。
 */
const jsonLdData = {
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
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <GoogleTagManagerHead />
        {/* Organization JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      </head>
      <body className={`${cn(inter.className)} h-dvh w-dvw`}>
        <SiteProvider>
          <GoogleTagManagerBody />
          <LayoutWrapper>
            <Suspense fallback={<Loading />}>{children}</Suspense>
          <
