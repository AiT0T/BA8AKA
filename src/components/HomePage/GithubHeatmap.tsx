'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import ErrorBoundary from '../common/ErrorBoundary';

// 关键：拿 default，并放宽 TS（避免属性类型报错）
const Calendar = dynamic<any>(
  () => import('react-github-calendar').then(m => m.default),
  { ssr: false }
);

export default function GithubHeatmap({ username }: { username: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  // 兜底：静态图片版热力图（不会报错、体积小）
  const fallback = (
    <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" className="block">
      <img
        src={`https://ghchart.rshah.org/219653/${username}`}
        alt={`${username} GitHub contributions`}
        className="w-full rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60"
        loading="lazy"
      />
    </a>
  );

  if (!ready) return fallback;

  return (
    <ErrorBoundary fallback={fallback}>
      <div className="w-full overflow-x-auto rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/60">
        <Calendar
          username={username}
          blockSize={12}
          blockMargin={4}
          weekStart={1}
          hideTotalCount
          hideColorLegend
          theme={{
            level0: '#161B22',
            level1: '#0e4429',
            level2: '#006d32',
            level3: '#26a641',
            level4: '#39d353',
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
