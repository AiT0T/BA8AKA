import { ApiErrors, errorResponse, successResponse, withErrorHandler } from "../data";
import { createApiParams, RequestValidator } from "@/utils/api-helpers";

export const dynamic = "force-dynamic";

const configuredOssDomain =
  process.env.OSS_BUCKET && process.env.OSS_REGION
    ? `${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`
    : "";

const ALLOWED_DOMAINS = [
  "next-blog.oss-cn-beijing.aliyuncs.com",
  configuredOssDomain,
].filter(Boolean);

interface ProxyContentResponse {
  content: string;
  contentType: string;
}

export const GET = withErrorHandler<[Request], ProxyContentResponse>(async (request: Request) => {
  const apiParams = createApiParams(request);
  const url = apiParams.getString("url");

  RequestValidator.validateRequired({ url }, ["url"]);

  const urlString = url as string;
  let urlObj: URL;

  try {
    urlObj = new URL(urlString);
  } catch {
    return errorResponse(ApiErrors.BAD_REQUEST("Invalid URL format"));
  }

  const isAllowedDomain = ALLOWED_DOMAINS.some((domain) => urlObj.hostname === domain);

  if (!isAllowedDomain || !["https:", "http:"].includes(urlObj.protocol)) {
    return errorResponse(ApiErrors.FORBIDDEN("Domain is not allowed"));
  }

  const response = await fetch(urlString, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      "User-Agent": "NextJS-Proxy/1.0",
    },
  });

  if (!response.ok) {
    return errorResponse(
      ApiErrors.EXTERNAL_API_ERROR(
        `Failed to fetch file: ${response.status} ${response.statusText}`
      )
    );
  }

  const content = await response.text();
  const contentType = response.headers.get("content-type") || "text/plain";

  return successResponse({
    content,
    contentType,
  });
});
