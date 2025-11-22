// src/app/api/bilibili/cover/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bvid = searchParams.get("bvid");

  if (!bvid) {
    return NextResponse.json(
      { error: "Missing bvid" },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(
        bvid
      )}`,
      {
        // 伪装一下正常浏览器请求，减少被风控概率
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.bilibili.com",
        },
        // 封面一般不会频繁变，这里给一点缓存时间（1 小时）
        next: { revalidate: 3600 },
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream error" },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const pic = data?.data?.pic ?? null;

    return NextResponse.json({ pic });
  } catch (err) {
    console.error("Bilibili cover fetch error", err);
    return NextResponse.json(
      { error: "Fetch failed" },
      { status: 500 }
    );
  }
}
