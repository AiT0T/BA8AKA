'use client';

import dynamic from 'next/dynamic';

// 关键：给 dynamic 指定 any，避免属性类型不匹配
const Calendar = dynamic<any>(() => import('react-github-calendar'), { ssr: false });

type Props = { username: string };

export default function GithubHeatmap({ username }: Props) {
  return (
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
  );
}
