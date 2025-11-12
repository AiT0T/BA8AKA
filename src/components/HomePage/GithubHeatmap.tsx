'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const Calendar = dynamic(() => import('react-github-calendar'), { ssr: false }) as any;

type Props = { username: string };

export default function GithubHeatmap({ username }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [size, setSize] = useState(12); // 桌面端自适应块尺寸

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // 桌面端根据容器宽度自适应块尺寸（与正文对齐）
  useEffect(() => {
    if (!wrapRef.current || isMobile) return;
    const calc = () => {
      const w = wrapRef.current!.clientWidth;
      const s = Math.max(10, Math.min(14, Math.floor((w - 40) / 53 - 2)));
      setSize(s);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [isMobile]);

  // ✅ 手机端适中一点，且只让日历自己滚动
  const MOBILE_SIZE = 12;      // 原来 16 太高了
  const MOBILE_MARGIN = 3;

  const blockSize = isMobile ? MOBILE_SIZE : size;
  const blockMargin = isMobile ? MOBILE_MARGIN : 3;

  // 只给内部容器设宽度；外层用 overflow-x-auto 截断，防止 body 出现横向滚动条
  const contentWidth = 53 * (blockSize + blockMargin) + 40; // 53 周 + 左右留白

  return (
    <div
      ref={wrapRef}
      className="
        w-full rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/60
        overflow-x-auto md:overflow-visible           /* ⬅️ 小屏允许横向滚动，桌面正常 */
        overscroll-x-contain touch-pan-x              /* ⬅️ 只捕获日历的横向滑动 */
      "
      style={{ maxWidth: '100%' }}                     /* ⬅️ 防止外层撑出页面 */
    >
      <div
        className="inline-block"
        style={{ width: isMobile ? `${contentWidth}px` : '100%' }}
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
            dark:  ['#111827', '#0e4429', '#006d32', '#26a641', '#39d353'],
          }}
        />
      </div>
    </div>
  );
}
