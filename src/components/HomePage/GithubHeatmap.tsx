'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// 动态加载，禁用 SSR
const Calendar = dynamic(() => import('react-github-calendar'), { ssr: false }) as any;

type Props = { username: string };

export default function GithubHeatmap({ username }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [size, setSize] = useState(12); // 桌面端块尺寸

  // 监听是否为小屏
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // 桌面端自适应宽度：根据容器宽度计算 blockSize，自动与正文对齐
  useEffect(() => {
    if (!wrapRef.current || isMobile) return;
    const calc = () => {
      const w = wrapRef.current!.clientWidth;
      // 目标：53 周列，预留左右 40px，块间距约 2px，限制范围 10~14
      const s = Math.max(10, Math.min(14, Math.floor((w - 40) / 53 - 2)));
      setSize(s);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isMobile]);

  const blockSize = isMobile ? 16 : size;       // 手机端方块更大
  const blockMargin = isMobile ? 4 : 3;

  // 计算一个最小宽度，手机端允许横向滚动，不压缩方块
  const minWidth = 53 * (blockSize + blockMargin) + 40; // 53 周 + 两侧留白

  return (
    <div
      ref={wrapRef}
      className="w-full rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/60
                 sm:overflow-x-auto"  // 小屏可横向滚动
    >
      <div style={{ minWidth: isMobile ? `${minWidth}px` : undefined }}>
        <Calendar
          username={username}
          blockSize={blockSize}
          blockMargin={blockMargin}
          weekStart={1}
          hideTotalCount
          hideColorLegend
          theme={{
            light: ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
            dark:  ['#111827', '#0e4429', '#006d32', '#26a641', '#39d353'],
          }}
        />
      </div>
    </div>
  );
}
