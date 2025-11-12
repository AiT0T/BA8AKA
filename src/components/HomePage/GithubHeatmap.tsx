'use client';

import dynamic from 'next/dynamic';

const Calendar = dynamic(() => import('react-github-calendar'), { ssr: false });

type Props = {
  username: string;
};

export default function GithubHeatmap({ username }: Props) {
  return (
    <div className="w-full rounded-xl border border-zinc-200/50 p-4">
      {/* 这里的组件是第三方的，类名/主题你可后续再美化 */}
      <Calendar username={username} />
    </div>
  );
}
