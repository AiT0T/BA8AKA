'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// 动态引入 GitHub 日历组件（只在浏览器渲染）
const Calendar = dynamic(() => import('react-github-calendar'), {
  ssr: false,
}) as any;

type Props = { username: string };

const WEEKS = 53;

export default function GithubHeatmap({ username }: Props) {
  const cardRef = useRef<HTMLElement | null>(null);

  // 桌面端块尺寸，自适应容器宽度
  const [size, setSize] = useState(12);
  // 是否视口较窄（手机）
  const [isMobile, setIsMobile] = useState(false);

  // 监听窗口宽度，判断是否为移动端
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /**
   * 桌面端：根据卡片实际宽度反推 blockSize，
   * 保证 53 周的总宽度 <= 卡片宽度，这样不会产生横向滚动条。
   */
  useEffect(() => {
    if (!cardRef.current || isMobile || typeof window === 'undefined') return;

    const calc = () => {
      const el = cardRef.current;
      if (!el) return;
      const w = el.clientWidth; // 卡片内容区宽度（含内边距）
      const BLOCK_MARGIN = 3;
      const MAX_BLOCK = 14;
      const MIN_BLOCK = 8;

      // 53 * (blockSize + BLOCK_MARGIN) <= w
      const candidate = Math.floor(w / WEEKS) - BLOCK_MARGIN;
      const s = Math.max(MIN_BLOCK, Math.min(MAX_BLOCK, candidate));
      setSize(s);
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isMobile]);

  // 手机端：固定一套尺寸，用横向滚动查看
  const MOBILE_SIZE = 12;
  const MOBILE_MARGIN = 3;

  const blockSize = isMobile ? MOBILE_SIZE : size;
  const blockMargin = isMobile ? MOBILE_MARGIN : 3;

  // 贡献格子实际宽度（不额外加左右 padding）
  const graphWidth = WEEKS * (blockSize + blockMargin);

  const year = new Date().getFullYear(); // 想写死 2025 就改成 2025

  return (
    <section
      ref={cardRef}
      className="
        w-full rounded-2xl border border-zinc-200/60 bg-white/70 p-4
        dark:border-zinc-800/60 dark:bg-zinc-950/40
        overflow-x-auto overscroll-x-contain touch-pan-x
      "
    >
      {/* 内框：宽度与贡献格子一致，居中，标题/日历/图例都在这个宽度内布局 */}
      <div
        className="mx-auto"
        style={{
          width: `${graphWidth}px`,
          maxWidth: '100%', // 小屏时不要超过卡片宽度，靠外层滚动
        }}
      >
        {/* 标题行：左右文字在同一宽度上，和下面格子右边缘对齐 */}
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {year} GitHub 贡献活动
          </h3>
          <span className="text-[11px] text-zinc-400">
            数据来自 github.com/{username}
          </span>
        </header>

        {/* 日历本体 */}
        <div className="inline-block">
          <Calendar
            username={username}
            blockSize={blockSize}
            blockMargin={blockMargin}
            weekStart={1}
            hideTotalCount
            hideColorLegend
            theme={{
              light: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
              dark: ['#111827', '#0e4429', '#006d32', '#26a641', '#39d353'],
            }}
          />
        </div>

        {/* 右下角 Less — More 图例：宽度跟上面格子一致，右对齐 */}
        <footer className="mt-2 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
          <span>Less</span>
          <span className="h-3 w-3 rounded-[2px] bg-[#ebedf0]" />
          <span className="h-3 w-3 rounded-[2px] bg-[#9be9a8]" />
          <span className="h-3 w-3 rounded-[2px] bg-[#40c463]" />
          <span className="h-3 w-3 rounded-[2px] bg-[#30a14e]" />
          <span className="h-3 w-3 rounded-[2px] bg-[#216e39]" />
          <span>More</span>
        </footer>
      </div>
    </section>
  );
}
