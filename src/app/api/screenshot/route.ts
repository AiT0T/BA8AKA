import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const screenshotCache = new Map<string, { screenshot?: string; expiresAt: number }>();

function parseTargetUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = parseTargetUrl(searchParams.get("url"));

  if (!targetUrl) {
    return NextResponse.json({ error: "Valid http(s) URL is required" }, { status: 400 });
  }

  const cacheKey = targetUrl.toString();
  const cached = screenshotCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { screenshot: cached.screenshot },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  }

  try {
    const microlinkUrl = new URL("https://api.microlink.io/");
    microlinkUrl.searchParams.set("url", cacheKey);
    microlinkUrl.searchParams.set("screenshot", "true");
    microlinkUrl.searchParams.set("meta", "false");

    const response = await fetch(microlinkUrl, {
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Screenshot provider failed: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const screenshot = data.data?.screenshot?.url;

    screenshotCache.set(cacheKey, {
      screenshot,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(
      { screenshot },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Screenshot error:", error);
    return NextResponse.json(
      { error: "Failed to get screenshot" },
      { status: 500 }
    );
  }
}
