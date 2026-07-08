"use client";
import { useState, useRef, useEffect, type FormEvent } from 'react';
import { askQuestion, type Source } from '../../lib/api';
import CitationCard from './CitationCard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserMessage {
  role: 'user';
  text: string;
}

interface AssistantMessage {
  role: 'assistant';
  text: string;
  sources: Source[];
}

type Message = UserMessage | AssistantMessage;

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Thinking…
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message after each update.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    // Append user message immediately so the UI feels responsive.
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');
    setError(null);
    setLoading(true);

    try {
      const res = await askQuestion(trimmed);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, sources: res.sources },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full rounded-lg border border-white/10 bg-[#0d0d10] shadow-sm overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-72 max-h-[60vh]">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-8">
            Ask a question about the ingested repository.
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-last' : ''}`}>
              {/* Bubble */}
              <div
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#1a1a24] text-gray-200'
                }`}
              >
                {msg.text}
              </div>

              {/* Citations — only on assistant messages */}
              {msg.role === 'assistant' && msg.sources.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.sources.map((src, j) => (
                    <CitationCard key={j} source={src} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a24] rounded-lg px-3 py-2">
              <Spinner />
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-600">✗ {error}</p>
        )}

        {/* Invisible anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-white/10 bg-[#0d0d10] p-3"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this repo…"
          disabled={loading}
          className="flex-1 rounded border border-white/10 bg-[#16161a] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
