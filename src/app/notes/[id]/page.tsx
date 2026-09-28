import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notes, shares } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { LogoutButton } from '@/components/ui/logout-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareList } from './share-list';
import { BrandMark } from '@/components/site-header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, id), eq(notes.userId, session.userId)),
  });
  if (!note) notFound();

  const shareList = await db
    .select()
    .from(shares)
    .where(eq(shares.noteId, note.id));

  // Never expose hashes to the client
  const sanitized = shareList.map((s) => ({
    id: s.id,
    shareType: s.shareType,
    accessType: s.accessType,
    expiresAt: s.expiresAt.toISOString(),
    revokedAt: s.revokedAt?.toISOString() ?? null,
    usedAt: s.usedAt?.toISOString() ?? null,
    viewCount: s.viewCount,
  }));

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-17.5 max-w-335 items-center justify-between px-6 lg:px-10">
          <BrandMark />
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <Link href="/notes" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white">
          <ArrowLeft className="size-4" />
          Back to notes
        </Link>
        <h1 className="text-3xl font-medium tracking-[-0.04em]">Note</h1>

        <Card>
          <CardHeader>
            <CardTitle>{note.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Expires: {note.expiresAt.toISOString()}
            </p>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{note.content}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareList shares={sanitized} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}