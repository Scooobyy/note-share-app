'use client';

import Link from 'next/link';
import { FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

type RecentNote = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  shareCount: number;
  active: boolean;
};

export function RecentNotes({ notes }: { notes: RecentNote[] }) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const matchingNotes = normalizedQuery
    ? notes.filter((note) =>
        `${note.title} ${note.content}`.toLowerCase().includes(normalizedQuery)
      )
    : notes;
  const visibleNotes = showAll ? matchingNotes : matchingNotes.slice(0, 10);

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Recent notes</h2>
          <p className="mt-1 text-xs text-muted-foreground">Your latest secure notes and share links</p>
        </div>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground sm:w-60">
          <Search className="size-4 shrink-0" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes..."
            aria-label="Search notes"
            className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </label>
      </div>

      {visibleNotes.length ? (
        visibleNotes.map((note) => (
          <Link
            key={note.id}
            href={`/notes/${note.id}`}
            className="group flex items-center gap-4 border-b border-border px-5 py-4 transition-colors hover:bg-muted/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {note.title}
                <StatusPill active={note.active} />
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {note.content.slice(0, 54)}{note.content.length > 54 ? '...' : ''}
              </span>
            </span>
            <span className="hidden w-20 text-right text-xs text-muted-foreground sm:block">
              {note.shareCount} {note.shareCount === 1 ? 'share' : 'shares'}
            </span>
            <span className="w-24 text-right text-xs text-muted-foreground">
              {formatRelativeDate(new Date(note.createdAt))}
            </span>
          </Link>
        ))
      ) : (
        <div className="px-5 py-16 text-center">
          <Search className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No matching notes</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different title or keyword.</p>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground">
        <span>
          {normalizedQuery
            ? `Showing ${visibleNotes.length} of ${matchingNotes.length} matches`
            : `Showing ${visibleNotes.length} of ${notes.length} notes`}
        </span>
        {matchingNotes.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="font-semibold text-[#8a3ffc] hover:underline"
          >
            {showAll ? 'Show less' : 'View all'} <span aria-hidden="true">-&gt;</span>
          </button>
        )}
      </div>
    </>
  );
}

function formatRelativeDate(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${active ? 'bg-[#dff8ed] text-[#1aa979]' : 'bg-[#fff0df] text-[#dc8b31]'}`}>{active ? 'Active' : 'Expired'}</span>;
}
