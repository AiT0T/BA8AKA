import React from "react";
import { IPhoto } from "@/app/model/photo";

interface VideoGridProps {
  videos: IPhoto[];
}

const formatDate = (date?: string) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const VideoGrid: React.FC<VideoGridProps> = ({ videos }) => {
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-100 bg-white py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">还没有视频</h3>
        <p className="mt-2 text-sm text-gray-500">在后台相册管理里上传视频后会显示在这里。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <article
          key={video._id || video.src}
          className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm"
        >
          <div className="aspect-video bg-black">
            <video
              src={video.src}
              poster={video.thumbnail}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="space-y-2 p-4">
            <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
              {video.title || "未命名视频"}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              {video.location && <span>{video.location}</span>}
              {video.date && <span>{formatDate(video.date)}</span>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default React.memo(VideoGrid);
