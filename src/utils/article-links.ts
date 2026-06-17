import { Article } from "@/app/model/article";

export function getArticleExternalUrl(article: Article) {
  const externalUrl = article.externalUrl?.trim();
  if (!externalUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(externalUrl)) {
    return externalUrl;
  }

  return "";
}

export function isExternalArticle(article: Article) {
  return Boolean(getArticleExternalUrl(article));
}

export function getArticleHref(article: Article) {
  return getArticleExternalUrl(article) || `/articles/${article._id?.toString() || ""}`;
}
