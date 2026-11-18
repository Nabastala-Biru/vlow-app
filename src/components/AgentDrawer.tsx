'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AgentMessage,
  clearTodayAgentMessages,
  markAgentMessagesRead,
} from '@/app/actions/agent';

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessages: AgentMessage[];
}

const QUICK_CHIPS = [
  'Iya, hari ini memang libur',
  'Ada kerjaan baru hari ini',
  'Cek status jadwal hari ini',
];

export default function AgentDrawer({
  isOpen,
  onClose,
  initialMessages,
}: AgentDrawerProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (isOpen) {
      markAgentMessagesRead();
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  async function handleClearChat() {
    if (messages.length === 0 || isClearing || isLoading) return;
    setIsClearing(true);
    setMessages([]);
    try {
      await clearTodayAgentMessages();
      router.refresh();
    } finally {
      setIsClearing(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const tempUserMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      is_read: true,
      created_at: new Date().toISOString(),
    };

    const updatedHistory = [...messages, tempUserMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error('Gagal menghubungi agen');

      const data = await res.json();
      if (data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.text,
            is_read: true,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      if (data.hasTaskUpdate || data.isFreeConfirmed) {
        router.refresh();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Terjadi gangguan koneksi. Coba kirim ulang sebentar lagi.',
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl animate-drawer-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase">
              Vlow Assistant
            </h2>
            <p className="text-xs text-neutral-400">
              Pengingat &amp; pencatat jadwal harian
            </p>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                disabled={isClearing || isLoading}
                className="border border-neutral-800 px-2.5 py-1 text-xs text-rose-400 transition hover:border-rose-800 hover:bg-rose-950/40 active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                {isClearing ? 'Menghapus...' : 'Bersihkan'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 transition hover:border-neutral-600 hover:text-white active:scale-95 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Area Pesan */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Belum ada pengingat hari ini. Kamu bisa langsung mencatat tugas harian di bawah.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] border px-3.5 py-2.5 text-sm whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'border-neutral-700 bg-neutral-900 text-neutral-100'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-xs text-neutral-500">Memproses...</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Chips */}
        <div className="flex flex-wrap gap-1.5 border-t border-neutral-900 px-4 pt-3">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isLoading}
              onClick={() => sendMessage(chip)}
              className="border border-neutral-800 bg-neutral-900/60 px-2.5 py-1 text-xs text-neutral-300 transition hover:border-neutral-600 hover:text-white active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Kolom Input Teks */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2 p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik tugas hari ini atau balasan..."
            disabled={isLoading}
            className="flex-1 border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="border border-neutral-200 bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-950 transition hover:bg-white active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            Kirim
          </button>
        </form>
      </div>
    </div>
  );
}