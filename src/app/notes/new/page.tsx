import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LogoutButton } from '@/components/ui/logout-button';
import { NewNoteForm } from './new-note-form';
import { BrandMark } from '@/components/site-header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewNotePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <main className="min-h-screen">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-17.5 max-w-335 items-center justify-between px-6 lg:px-10">
          <BrandMark />
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
        <div>
          <Link href="/notes" className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"><ArrowLeft className="size-4" /> Back to notes</Link>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/40">Private workspace</p>
            <div className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-medium tracking-[-0.04em]">New note</h1><p className="mt-2 text-sm text-muted-foreground">Create a shareable note with expiry controls</p></div></div>
          <p className="mt-2 text-sm text-muted-foreground">Signed in as {session.email}</p>
        </div>
        <NewNoteForm />
      </div>
    </main>
  );
}