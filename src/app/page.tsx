import { Suspense } from 'react';
import { getActiveTasks } from './actions/tasks';
import { getShareConfig } from './actions/share';
import KanbanBoard from '@/components/KanbanBoard';

async function BoardDataLoader() {
  const [tasks, shareConfig] = await Promise.all([getActiveTasks(), getShareConfig()]);
  return <KanbanBoard initialTasks={tasks} initialShareConfig={shareConfig} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">
          Memuat data Vault...
        </div>
      }
    >
      <BoardDataLoader />
    </Suspense>
  );
}