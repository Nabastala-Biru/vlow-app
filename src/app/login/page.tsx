'use client';

import { useActionState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { unlockVault } from './actions';

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(unlockVault, null);

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 bg-neutral-800 border border-neutral-700 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Personal Task Vault</h1>
            <p className="text-sm text-neutral-400 mt-1">Masukkan Master Password untuk membuka papan.</p>
            </div>

            <form action={formAction} className="space-y-4">
            <div>
                <input
                type="password"
                name="password"
                placeholder="Master Password"
                required
                autoFocus
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            {state?.error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 px-3 py-2 rounded-lg">
                {state.error}
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
                {isPending ? 'Memverifikasi...' : 'Buka Vault'}
                {!isPending && <ArrowRight className="w-4 h-4" />}
            </button>
            </form>
        </div>
        </main>
    );
}