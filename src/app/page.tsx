import { Suspense } from 'react';
import { getActiveTasks } from './actions/tasks';
import { getShareConfig } from './actions/share';
import { getTodayAgentMessages, getTodayFreeStatus } from './actions/agent';
import KanbanBoard from '@/components/KanbanBoard';

async function BoardDataLoader() {
  const [tasks, shareConfig, agentMessages, isFreeDay] = await Promise.all([
    getActiveTasks(),
    getShareConfig(),
    getTodayAgentMessages(),
    getTodayFreeStatus(),
  ]);

  return (
    <KanbanBoard
      initialTasks={tasks}
      initialShareConfig={shareConfig}
      initialAgentMessages={agentMessages}
      initialIsFreeDay={isFreeDay}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">
          Sabar yo boss, iki sek ndelok datamu...
        </div>
      }
    >
      <BoardDataLoader />
    </Suspense>
  );
}