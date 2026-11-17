import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSharedVaultTasks } from '@/app/actions/share';
import SharedKanbanBoard from '@/components/SharedKanbanBoard';

async function SharedVaultLoader({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tasks = await getSharedVaultTasks(token);

  if (!tasks) {
    notFound();
  }

  return <SharedKanbanBoard tasks={tasks} />;
}

export default function SharedVaultPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">
          Memuat tampilan Vault...
        </div>
      }
    >
      <SharedVaultLoader params={params} />
    </Suspense>
  );
}