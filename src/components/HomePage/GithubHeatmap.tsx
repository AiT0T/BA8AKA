'use client';

import dynamic from 'next/dynamic';

const Calendar = dynamic(() => import('react-github-calendar'), { ssr: false });

type Props = {
  username?: string;
};

// 颜色用你站内的绿色系做一版主题
const theme = {
  level0: '#e5e7eb', // gray-200
  level1: '#bbf7d0', // green-200
  level2: '#86efac', // green-300
  level3: '#34d399', // green-400
  level4: '#10b981', // green-500
};

export default function GithubHeatmap({ username }: Props) {
  const user = username || process.env.NEXT_PUBLIC_GITHUB_USER || 'AiT0T'; // 把 AiT0T 换成你的

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-zinc-200/60 p-4 dark:border-zinc-800/60">
      <Calendar
        username={user}
        blockSize={12}
        blockMargin={4}
        weekStart={1}
        hideColorLegend
        hideTotalCount
        theme={theme}
      />
    </div>
  );
}
