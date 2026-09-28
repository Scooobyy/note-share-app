import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, inArray } from 'drizzle-orm';
import { FileText, Link2, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notes, shares } from '@/lib/db/schema';
import { LogoutButton } from '@/components/ui/logout-button';
import { BrandMark } from '@/components/site-header';
import { RecentNotes } from './recent-notes';

function formatRelativeDate(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 172800) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function NotesDashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, session.userId))
    .orderBy(desc(notes.createdAt));

  const userShares = userNotes.length
    ? await db
        .select({
          id: shares.id,
          noteId: shares.noteId,
          expiresAt: shares.expiresAt,
          revokedAt: shares.revokedAt,
          usedAt: shares.usedAt,
          shareType: shares.shareType,
        })
        .from(shares)
        .where(inArray(shares.noteId, userNotes.map((note) => note.id)))
    : [];

  const sharesByNote = new Map<string, typeof userShares>();
  for (const share of userShares) {
    const noteShares = sharesByNote.get(share.noteId) ?? [];
    noteShares.push(share);
    sharesByNote.set(share.noteId, noteShares);
  }

  const activeShares = userShares.filter(
    (share) =>
      !share.revokedAt &&
      share.expiresAt > new Date() &&
      !(share.shareType === 'ONE_TIME' && share.usedAt)
  ).length;

  const recentNotes = userNotes.map((note) => {
    const noteShares = sharesByNote.get(note.id) ?? [];
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      shareCount: noteShares.length,
      active: noteShares.some(
        (share) =>
          !share.revokedAt &&
          share.expiresAt > new Date() &&
          !(share.shareType === 'ONE_TIME' && share.usedAt)
      ),
    };
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-285 items-center justify-between px-6">
          <BrandMark />
          <div className="flex items-center gap-3">
            <Link href="/notes/new">
              <Button className="h-9 bg-[#792cff] px-3 text-sm text-white shadow-[0_5px_16px_rgba(121,44,255,0.2)] hover:bg-[#6820e8]"><Plus /> New note</Button>
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#792cff]/15 text-xs font-semibold text-[#a36bff]">{session.email.slice(0, 2).toUpperCase()}</span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-285 px-6 py-12">
        <div className="mb-9">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#a36bff]">Workspace</p>
          <h1 className="text-4xl font-semibold tracking-tighter">Your notes</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create secure links that disappear when you want them to.</p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={<FileText />} value={userNotes.length} label="Notes created" detail="All time" color="purple" />
          <StatCard icon={<Link2 />} value={userShares.length} label="Shares generated" detail="Across all notes" color="green" />
          <StatCard icon={<ShieldCheck />} value={activeShares} label="Active links" detail="Currently available" color="orange" />
        </section>

        <section className="mt-9 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          <RecentNotes notes={recentNotes} />
        </section>
      </div>
    </main>
  );
}

function StatCard({ icon, value, label, detail, color }: { icon: React.ReactNode; value: number; label: string; detail: string; color: 'purple' | 'green' | 'orange' }) {
  const colors = { purple: 'bg-[#f2eaff] text-[#933cff]', green: 'bg-[#e2f8f0] text-[#35b98c]', orange: 'bg-[#fff1dc] text-[#f39a29]' };
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"><div className="flex items-start justify-between"><span className={`flex size-9 items-center justify-center rounded-xl ${colors[color]}`}>{icon}</span><span className="text-xs text-muted-foreground">{detail}</span></div><p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>;
}

function StatusPill({ active }: { active: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${active ? 'bg-[#dff8ed] text-[#1aa979]' : 'bg-[#fff0df] text-[#dc8b31]'}`}>{active ? 'Active' : 'Expired'}</span>;
}