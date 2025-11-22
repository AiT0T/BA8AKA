// src/app/api/bilibili/cover/route.ts
import { NextResponse } from "next/server";

// 如果你是 app router，建议显式声明运行时
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bvid = searchParams.get("bvid");

    if (!bvid) {
      return new NextResponse("Missing bvid", { status: 400 });
    }

    // 1）先请求 B 站 API 拿视频信息（包含封面 URL）
    const apiRes = await fetch(
      `https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(
        bvid
      )}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.bilibili.com",
        },
        // 简单给点缓存，减轻你服务器压力（1 小时）
        next: { revalidate: 3600 },
      }
    );

    if (!apiRes.ok) {
      return new NextResponse("Upstream API error", { status: 502 });
    }

    const json = await apiRes.json();
    let pic: string | undefined = json?.data?.pic;

    if (!pic) {
      return new NextResponse("No pic", { status: 404 });
    }

    // 有些返回是 http，强制改为 https，避免 mixed-content
    if (pic.startsWith("http://")) {
      pic = pic.replace(/^http:\/\//, "https://");
    }

    // 2）再由服务器去拉封面图
    const imgRes = await fetch(pic, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.bilibili.com",
      },
    });

    if (!imgRes.ok || !imgRes.body) {
      return new NextResponse("Upstream image error", { status: 502 });
    }

    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imgRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 浏览器端再缓存一天
      },
    });
  } catch (err) {
    console.error("Bilibili cover proxy error", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
