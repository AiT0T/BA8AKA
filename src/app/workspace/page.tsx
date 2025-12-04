"use client";

import { useState, useEffect } from "react";
import { ItemType, Table } from "@/components/Table";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { WorkspaceSkeleton } from "@/components/workspace/WorkspaceSkeleton";
import { workspaceBusiness } from "@/app/business/workspace";
import { useSiteStore } from "@/store/site";
import { ISite } from "../model/site";

// 默认本地图片列表：现在只有一张，后面你可以随时往里面加
const DEFAULT_WORKSPACE_IMAGES: string[] = [
  "/myworkspace.jpg",
  "/myworkspace-2.jpg",
  // 例如将来你再加图，只要：把文件放到 public，然后在这里追加路径即可
  // "/myworkspace-3.jpg",
];

export default function Workspace() {
  const [workspaceItems, setWorkspaceItems] = useState<ItemType[]>([]);
  const [bgImages, setBgImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { site } = useSiteStore();

  // 根据站点配置 / 默认值，决定要展示的顶部图片数组
  useEffect(() => {
    const updateBackgroundImages = (site: ISite | null) => {
      const images: string[] = [];

      if (site?.workspaceBgUrl1) images.push(site.workspaceBgUrl1);
      if (site?.workspaceBgUrl2) images.push(site.workspaceBgUrl2);

      // 如果后台没配，就用本地默认图片列表
      if (images.length === 0) {
        setBgImages(DEFAULT_WORKSPACE_IMAGES);
      } else {
        setBgImages(images);
      }
    };

    updateBackgroundImages(site);
  }, [site]);

  // 拉取「工作空间」表格数据
  useEffect(() => {
    const fetchWorkspaceItems = async () => {
      setIsLoading(true);

      try {
        const items = await workspaceBusiness.getWorkspaceItems();
        const workspaceItemsArray = Array.isArray(items) ? items : [];

        const itemsForTable: ItemType[] = workspaceItemsArray.map((item) => ({
          id: item._id || "",
          product: item.product,
          specs: item.specs,
          buyAddress: item.buyAddress,
          buyLink: item.buyLink,
        }));

        setWorkspaceItems(itemsForTable);
      } catch (error) {
        console.error("Error fetching workspace items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaceItems();
  }, []);

  // 表格列配置
  const fields = [
    { key: "product", label: "产品" },
    { key: "specs", label: "规格" },
    {
      key: "buyAddress",
      label: "",
      align: "right" as const,
      render: (field: string | number, item: any) => (
        <Button variant="link" size="sm" asChild>
          <a href={item.buyLink} target="_blank" rel="noopener noreferrer">
            去购买
          </a>
        </Button>
      ),
    },
  ];

  // 加载骨架屏
  if (isLoading) {
    return (
      <main className="flex h-screen w-full box-border flex-col overflow-y-auto py-8 px-8">
        <WorkspaceSkeleton />
      </main>
    );
  }

  // 正常页面渲染
  return (
    <main className="flex h-screen w-full box-border flex-col overflow-y-auto py-8 px-8">
      <h1 className="text-3xl font-bold mb-6">工作空间</h1>
      <div className="mb-6 last:mb-0">工作空间，记录了工作用到的产品和工具</div>

      {/* 顶部图片：根据 bgImages 自动渲染 1 张 / 2 张 / N 张 */}
      <div className="mx-6 mb-4 flex snap-x snap-mandatory gap-6 overflow-x-scroll pb-4 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-x-auto md:pb-0">
        {bgImages.map((imgSrc, index) => (
          <div key={index} className="relative w-2/3 md:w-full h-96 md:h-72">
            <Image
              className="snap-center object-cover rounded-md shadow-md"
              src={imgSrc}
              alt={`工作空间背景图 ${index + 1}`}
              fill
              sizes="(max-width: 768px) 66vw, 50vw"
              priority
            />
          </div>
        ))}
      </div>

      <div className="border border-gray-200 rounded-xl mt-4">
        <Table
          caption="For other cool stuff, don't forget to check some.wtf"
          items={workspaceItems}
          fields={fields}
        />
      </div>
    </main>
  );
}
