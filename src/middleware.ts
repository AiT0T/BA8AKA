import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./utils/auth";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

type RouteRule = {
  pattern: RegExp;
  methods?: Method[];
  public?: boolean;
  rateLimit?: {
    limit: number;
    windowMs: number;
  };
};

const ONE_MINUTE = 60_000;

const publicApiRules: RouteRule[] = [
  { pattern: /^\/api\/auth$/, public: true, methods: ["GET", "POST", "DELETE"], rateLimit: { limit: 20, windowMs: ONE_MINUTE } },
  { pattern: /^\/api\/site$/, public: true, methods: ["GET", "PATCH"], rateLimit: { limit: 120, windowMs: ONE_MINUTE } },

  { pattern: /^\/api\/articles(?:\/.*)?$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/articles\/[^/]+\/like$/, public: true, methods: ["POST"], rateLimit: { limit: 60, windowMs: ONE_MINUTE } },
  { pattern: /^\/api\/articles\/[^/]+\/view$/, public: true, methods: ["POST"], rateLimit: { limit: 120, windowMs: ONE_MINUTE } },

  { pattern: /^\/api\/bookmarks(?:\/.*)?$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/fitness$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/friends$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/friends\/submit$/, public: true, methods: ["POST"], rateLimit: { limit: 10, windowMs: ONE_MINUTE } },
  { pattern: /^\/api\/inspirations(?:\/.*)?$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/inspirations\/[^/]+\/stats$/, public: true, methods: ["POST"], rateLimit: { limit: 120, windowMs: ONE_MINUTE } },
  { pattern: /^\/api\/photos$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/projects(?:\/categories)?$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/rss$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/screenshot$/, public: true, methods: ["GET"], rateLimit: { limit: 60, windowMs: ONE_MINUTE } },
  { pattern: /^\/api\/social-links$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/timelines(?:\/.*)?$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/travel$/, public: true, methods: ["GET"] },
  { pattern: /^\/api\/workspaces$/, public: true, methods: ["GET"] },

  { pattern: /^\/api\/captcha\/available$/, public: true, methods: ["GET"], rateLimit: { limit: 30, windowMs: ONE_MINUTE } },
  { pattern: /^\/api\/captcha\/[^/]+$/, public: true, methods: ["GET", "PUT"], rateLimit: { limit: 30, windowMs: ONE_MINUTE } },
  { pattern: /^\/api\/captcha$/, public: true, methods: ["POST", "DELETE"], rateLimit: { limit: 10, windowMs: ONE_MINUTE } },

  { pattern: /^\/api\/proxy-content$/, public: true, methods: ["GET"], rateLimit: { limit: 120, windowMs: ONE_MINUTE } },
];

const protectedApiRules: RouteRule[] = [
  { pattern: /^\/api\/captcha$/, methods: ["GET"] },
  { pattern: /^\/api\/demos(?:\/.*)?$/ },
  { pattern: /^\/api\/exif$/ },
  { pattern: /^\/api\/image-analysis$/ },
  { pattern: /^\/api\/project-requirements(?:\/.*)?$/ },
  { pattern: /^\/api\/proxy-image$/ },
  { pattern: /^\/api\/stacks$/ },
  { pattern: /^\/api\/todos(?:\/.*)?$/ },
  { pattern: /^\/api\/upload$/ },
  { pattern: /^\/api\/work-experience$/ },
];

const rateLimit = new Map<string, { count: number; timestamp: number }>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function findRule(rules: RouteRule[], pathname: string, method: Method) {
  return rules.find((rule) => {
    return rule.pattern.test(pathname) && (!rule.methods || rule.methods.includes(method));
  });
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = rateLimit.get(key) || { count: 0, timestamp: now };

  if (now - current.timestamp > windowMs) {
    current.count = 0;
    current.timestamp = now;
  }

  current.count += 1;
  rateLimit.set(key, current);

  return current.count > limit;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function applyRateLimit(request: NextRequest, rule?: RouteRule) {
  if (!rule?.rateLimit) {
    return null;
  }

  const ip = getClientIp(request);
  const key = `${ip}:${request.nextUrl.pathname}:${request.method}`;

  if (isRateLimited(key, rule.rateLimit.limit, rule.rateLimit.windowMs)) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rule.rateLimit.windowMs / 1000).toString(),
        },
      }
    );
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method as Method;
  const token = request.cookies.get("admin_token")?.value;
  const isValidToken = token ? await verifyToken(token) : false;

  const isAdminRoute = pathname.startsWith("/admin");
  const isTodoPage = pathname === "/todos" || pathname.startsWith("/todos/");
  const isProjectRequirementsPage =
    pathname === "/project-requirements" || pathname.startsWith("/project-requirements/");
  const isHiddenPublicPage =
    pathname === "/demos" ||
    pathname.startsWith("/demos/") ||
    pathname === "/stack" ||
    pathname.startsWith("/stack/");
  const isLoginPage = pathname === "/login";
  const isApiRoute = pathname.startsWith("/api");

  if (method === "OPTIONS") {
    return NextResponse.next();
  }

  if (isLoginPage && isValidToken) {
    return NextResponse.redirect(new URL("/admin/bookmarks", request.url));
  }

  if (isHiddenPublicPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if ((isAdminRoute || isTodoPage || isProjectRequirementsPage) && !isValidToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isApiRoute) {
    return NextResponse.next();
  }

  const publicRule = findRule(publicApiRules, pathname, method);
  const protectedRule = findRule(protectedApiRules, pathname, method);
  const isUnsafeMethod = method !== "GET";

  const rateLimitResponse = applyRateLimit(request, publicRule || protectedRule);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (publicRule?.public) {
    return NextResponse.next();
  }

  if ((protectedRule || isUnsafeMethod) && !isValidToken) {
    return jsonError("Unauthorized", 401);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/todos/:path*",
    "/todos",
    "/project-requirements/:path*",
    "/project-requirements",
    "/demos/:path*",
    "/demos",
    "/stack/:path*",
    "/stack",
    "/login",
    "/api/:path*",
  ],
};
