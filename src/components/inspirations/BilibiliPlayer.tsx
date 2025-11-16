'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

interface BilibiliVideoProps {
  bvid: string;
  page?: number;
  title?: string;
  isMobile?: boolean;
  cover?: string;         // 可选：封面图，未播放时展示
}

/** 全局只允许一个播放器在播的小总线 */
const BUS_EVENT = 'bili:nowplaying';
function notifyNowPlaying(id: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail: id }));
  }
}
function useStopWhenOthersPlay(id: string, stop: () => void) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail !== id) stop();
    };
    window.addEventListener(BUS_EVENT, handler);
    return () => window.removeEventListener(BUS_EVENT, handler);
  }, [id, stop]);
}

/** B 站视频播放器：离开视口自动停止 + 只允许一个在播 */
export const BilibiliPlayer: React.FC<BilibiliVideoProps> = ({
  bvid,
  page = 1,
  title,
  isMobile = false,
  cover,
}) => {
  const id = useId();
  const [playing, setPlaying] = useState(false);

  // 视口检测：离开视口就停止（卸载 iframe）
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setPlaying(false);
      },
      { threshold: 0.25 } // 可按需调整
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 别的播放器开始时，停止自己
  useStopWhenOthersPlay(id, () => setPlaying(false));

  // 仅在“播放”时挂载 iframe；停止时卸载（等同于暂停）
  const src = useMemo(
    () =>
      `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(
        bvid
      )}&page=${page}&autoplay=1&danmaku=0&high_quality=1`,
    [bvid, page]
  );

  return (
    <div
      ref={containerRef}
      className="w-full max-w-full sm:max-w-5xl mx-auto mb-4"
    >
      <div
        className={`relative w-full aspect-video ${
          isMobile ? '' : 'min-h-[240px] sm:min-h-[480px]'
        }`}
      >
        {playing ? (
          <iframe
            key={src} // 切换播放状态时强制重建，确保停止
            src={src}
            title={title || bvid}
            scrolling="no"
            style={{ border: 'none' }}
            frameBorder="0"
            loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            // 允许脚本/同源/用户激活的顶层导航/展示
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation allow-top-navigation-by-user-activation"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full rounded-lg shadow-lg"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              notifyNowPlaying(id);
              setPlaying(true);
            }}
            className="absolute inset-0 w-full h-full rounded-lg shadow-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 grid place-items-center"
            aria-label={`播放 ${title || bvid}`}
          >
            {cover && (
              <img
                src={cover}
                alt={title || bvid}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="relative z-10 flex items-center justify-center">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-black/60 text-white flex items-center justify-center text-2xl">
                ▶
              </div>
            </div>
          </button>
        )}
      </div>

      <div className="flex items-center space-x-2 mt-2 text-xs sm:text-sm text-gray-500 px-2 sm:px-0">
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M306.005333 117.632L444.330667 256h135.296l138.368-138.325333a42.666667 42.666667 0 0 1 60.373333 60.373333L700.330667 256H789.333333A149.333333 149.333333 0 0 1 938.666667 405.333333v341.333334a149.333333 149.333333 0 0 1-149.333334 149.333333h-554.666666A149.333333 149.333333 0 0 1 85.333333 746.666667v-341.333334A149.333333 149.333333 0 0 1 234.666667 256h88.96L245.632 177.962667a42.666667 42.666667 0 0 1 60.373333-60.373334zM789.333333 341.333333h-554.666666a64 64 0 0 0-63.701334 57.856L170.666667 405.333333v341.333334a64 64 0 0 0 57.856 63.701333L234.666667 810.666667h554.666666a64 64 0 0 0 63.701334-57.856L853.333333 746.666667v-341.333334A64 64 0 0 0 789.333333 341.333333zM341.333333 469.333333a42.666667 42.666667 0 0 1 42.666667 42.666667v85.333333a42.666667 42.666667 0 0 1-85.333333 0v-85.333333a42.666667 42.666667 0 0 1 42.666666-42.666667z m341.333334 0a42.666667 42.666667 0 0 1 42.666666 42.666667v85.333333a42.666667 42.666667 0 0 1-85.333333 0v-85.333333a42.666667 42.666667 0 0 1 42.666667-42.666667z"
            fill="#00AEEC"
          />
        </svg>
        <span>BV号: {bvid}</span>
        {title && <span className="truncate">标题: {title}</span>}
      </div>
    </div>
  );
};

export default BilibiliPlayer;
