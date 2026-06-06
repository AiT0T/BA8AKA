"use client";

import { useEffect, useState } from "react";
import { message } from "antd";
import { Article, ArticleStatus } from "@/app/model/article";
import { ISocialLink } from "@/app/model/social-link";
import { articlesService } from "@/app/business/articles";
import { socialLinkBusiness } from "@/app/business/social-link";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import Loading from "@/app/Loading";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import HomeHeader from "@/components/HomePage/HomeHeader";
import AuthorIntro from "@/components/HomePage/AuthorIntro";
import GithubHeatmap from "./GithubHeatmap";
import { ListSection } from "@/components/HomePage/ListSection";
import { Section } from "@/components/HomePage/Section";
import { SocialLinks } from "@/components/HomePage/SocialLinks";
import { WebRunInfo } from "@/components/HomePage/WebRunInfo";
import { WebControlInfo } from "@/components/HomePage/WebControlInfo";

export default function HomePageClient() {
  const [socialLinks, setSocialLinks] = useState<ISocialLink[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [basicDataLoading, setBasicDataLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchSocialLinks = async () => {
    try {
      const links = await socialLinkBusiness.getSocialLinks();
      setSocialLinks(links);
    } catch (error) {
      message.error("获取社交链接失败: " + error);
    }
  };

  const fetchArticles = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    }

    try {
      const response = await articlesService.getArticles({
        page: pageNum,
        limit: 20,
        status: ArticleStatus.PUBLISHED,
        sortBy: "latest",
      });

      if (isLoadMore) {
        setArticles((prev) => {
          const existingIds = new Set(prev.map((article) => article._id));
          const newArticles = (response.items as Article[]).filter(
            (article) => !existingIds.has(article._id)
          );
          return [...prev, ...newArticles];
        });
      } else {
        setArticles(response.items);
      }

      if (response.pagination) {
        setHasMore(response.pagination.hasMore);
        setPage(response.pagination.page);
      } else {
        setHasMore(response.items.length === 20);
      }
    } catch (error) {
      console.error("获取文章失败:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMoreArticles = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      void fetchArticles(nextPage, true);
    }
  };

  const scrollContainerRef = useInfiniteScroll({
    hasMore,
    isLoadingMore,
    loadMore: loadMoreArticles,
    threshold: 100,
    debounceMs: 150,
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setBasicDataLoading(true);
        await Promise.all([
          fetchSocialLinks(),
          fetchArticles(1, false),
        ]);
      } catch (error) {
        message.error("获取数据失败: " + error);
      } finally {
        setBasicDataLoading(false);
      }
    };

    void fetchInitialData();
  }, []);

  if (basicDataLoading) {
    return <Loading />;
  }

  return (
    <main
      ref={scrollContainerRef}
      className="flex h-screen w-full box-border flex-col overflow-y-auto custom-scrollbar-thin py-8 px-8"
    >
      <HomeHeader />

      <div className="w-full max-w-3xl my-0 mx-auto mt-24">
        <AuthorIntro />
        <div className="max-w-2xl">
          <Section title="社交账号">
            <SocialLinks links={socialLinks} />
          </Section>

          <Section title="运行信息">
            <WebRunInfo />
          </Section>

          <Section title="网站信息">
            <WebControlInfo />
          </Section>
        </div>

        <div className="my-6">
          <GithubHeatmap username="AiT0T" />
        </div>
      </div>

      <ListSection title="我的文章" titleLink="/articles" items={articles} />

      {isLoadingMore && (
        <div className="w-full max-w-3xl my-0 mx-auto mt-4 mb-8 flex justify-center">
          <div className="flex items-center space-x-2 text-gray-500">
            <LoadingSpinner className="w-5 h-5" />
            <span>加载更多文章中...</span>
          </div>
        </div>
      )}

      {!hasMore && articles.length > 0 && (
        <div className="w-full max-w-3xl my-0 mx-auto mt-4 mb-8 flex justify-center">
          <div className="text-gray-500 text-sm">
            已显示所有文章，共 {articles.length} 篇
          </div>
        </div>
      )}
    </main>
  );
}
