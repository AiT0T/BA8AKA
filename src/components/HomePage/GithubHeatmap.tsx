'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// 动态引入 GitHub 日历组件（只在浏览器渲染）
const Calendar = dynamic(() => import('react-github-calendar'), {
  ssr: false,
}) as any;

type Props = { username: string };

export default function GithubHeatmap({ username }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

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
   * 桌面端：根据容器宽度反推 blockSize，使“53 周的总宽度 ≤ 容器宽度”
   * 这样即便中间列是 max-w-3xl，也不会溢出，不会出现横向滚动条。
   */
  useEffect(() => {
    if (!wrapRef.current || isMobile || typeof window === 'undefined') return;

    const calc = () => {
      const el = wrapRef.current;
      if (!el) return;
      const w = el.clientWidth; // 当前容器宽度
      const LEFT_RIGHT_PADDING = 40; // 给日历左右预留一点空白
      const BLOCK_MARGIN = 3;        // 周块之间的间距
      const MAX_BLOCK = 14;
      const MIN_BLOCK = 8;

      const usable = w - LEFT_RIGHT_PADDING;
      // 53 * (blockSize + BLOCK_MARGIN) <= usable
      const candidate = Math.floor(usable / 53) - BLOCK_MARGIN;
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

  // 理论总宽度：53 周 + 左右预留 40px
  const contentWidth = 53 * (blockSize + blockMargin) + 40;

  const year = new Date().getFullYear(); // 如果想写死“2025”，直接改成 2025 即可

  return (
    <section
      ref={wrapRef}
      className="
        w-full rounded-2xl border border-zinc-200/60 bg-white/70 p-4
        dark:border-zinc-800/60 dark:bg-zinc-950/40
        overflow-x-auto overscroll-x-contain touch-pan-x
      "
    >
      {/* 标题：类似 GitHub 上 “2025 contributions in 2025” */}
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {year} GitHub 贡献活动
        </h3>
        <span className="text-[11px] text-zinc-400">
          数据来自 github.com/{username}
        </span>
      </header>

      {/* 日历本体：宽屏时铺满容器，窄屏时使用固定理论宽度，配合横向滚动 */}
      <div
        className="inline-block"
        style={{
          width: isMobile ? `${contentWidth}px` : '100%',
        }}
      >
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

      {/* 右下角 Less — More 图例，完全照 GitHub 配色 */}
      <footer className="mt-2 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[2px] bg-[#ebedf0]" />
        <span className="h-3 w-3 rounded-[2px] bg-[#9be9a8]" />
        <span className="h-3 w-3 rounded-[2px] bg-[#40c463]" />
        <span className="h-3 w-3 rounded-[2px] bg-[#30a14e]" />
        <span className="h-3 w-3 rounded-[2px] bg-[#216e39]" />
        <span>More</span>
      </footer>
    </section>
  );
}
