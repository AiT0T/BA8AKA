"use client";

import React, { useMemo, useState } from "react";
import { usePhotos } from "@/app/hooks/usePhotos";
import LoadingSkeleton from "./components/LoadingSkeleton";
import ErrorMessage from "./components/ErrorMessage";
import PhotoGrid from "./components/PhotoGrid";
import CustomLightbox from "./components/CustomLightbox";
import VideoGrid from "./components/VideoGrid";

type AlbumTab = "photos" | "videos";

function isVideoMedia(src: string, type?: string) {
  return type === "video" || /\.(mp4|webm|ogg|mov|m4v)$/i.test(src);
}

export default function Album() {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<AlbumTab>("photos");
  const { photos, loading, error, refetch } = usePhotos();

  const { imageItems, videoItems } = useMemo(() => {
    return photos.reduce(
      (result, item) => {
        if (isVideoMedia(item.src, item.type)) {
          result.videoItems.push({ ...item, type: "video" });
        } else {
          result.imageItems.push({ ...item, type: "image" });
        }
        return result;
      },
      { imageItems: [], videoItems: [] } as {
        imageItems: typeof photos;
        videoItems: typeof photos;
      }
    );
  }, [photos]);

  const handlePhotoClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handleTabChange = (tab: AlbumTab) => {
    setActiveTab(tab);
    setSelectedIndex(-1);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  return (
    <main className="box-border flex h-screen w-full flex-col overflow-y-auto px-8 py-8">
      <header className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">生活相册</h1>
        <p className="mb-3 text-gray-600">
          这里记录生活里的照片和视频片段。
        </p>
        {photos.length > 0 && (
          <p className="mb-5 text-sm text-gray-500">
            共 {imageItems.length} 张照片，{videoItems.length} 个视频
          </p>
        )}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => handleTabChange("photos")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "photos"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            照片
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("videos")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === "videos"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            视频
          </button>
        </div>
      </header>

      {activeTab === "photos" ? (
        <PhotoGrid photos={imageItems} onPhotoClick={handlePhotoClick} />
      ) : (
        <VideoGrid videos={videoItems} />
      )}

      <CustomLightbox
        photos={imageItems}
        currentIndex={selectedIndex}
        isOpen={selectedIndex >= 0}
        onClose={() => setSelectedIndex(-1)}
        onIndexChange={setSelectedIndex}
      />
    </main>
  );
}
