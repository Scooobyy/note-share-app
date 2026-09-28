'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Copy, FileText, KeyRound, LockKeyhole, Plus, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Note = { title: string; content: string; expiresAt?: string; createdAt?: string };
type State =
  | { kind: 'loading' }
  | { kind: 'ready_to_view' }
  | { kind: 'needs_password' }
  | { kind: 'ok'; note: Note }
  | { kind: 'error'; message: string };

export function ShareView({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.inspectShare(token).then(({ data }) => {
      if (cancelled) return;
      if (data.status === 'ready_to_view') setState({ kind: 'ready_to_view' });
      else if (data.status === 'needs_password') setState({ kind: 'needs_password' });
      else if (data.status) setState({ kind: 'error', message: friendlyMessage(data.status) });
      else setState({ kind: 'error', message: friendlyMessage('invalid') });
    });
    return () => { cancelled = true; };
  }, [token]);

  async function reveal(event?: React.FormEvent) {
    event?.preventDefault();
    setRevealing(true);
    try {
      const { data } = await api.viewShare(token, password || undefined);
      if (data.status === 'ok') {
        setState({ kind: 'ok', note: data.note });
        toast.success('Note unlocked');
      } else if (data.status === 'wrong_password') {
        toast.error('Wrong password');
        setState({ kind: 'needs_password' });
      } else {
        setState({ kind: 'error', message: friendlyMessage(data.status) });
      }
    } finally {
      setRevealing(false);
    }
  }

  if (state.kind === 'loading') return <div className="pt-24 text-sm text-white/45">Loading secure note...</div>;

  if (state.kind === 'error') {
    return <div className="w-full max-w-167.5 rounded-2xl border border-white/10 bg-[#171717] p-10 text-center text-white"><ShieldCheck className="mx-auto size-8 text-white/60" /><h1 className="mt-5 text-2xl font-medium">Link unavailable</h1><p className="mt-3 text-sm text-white/50">{state.message}</p></div>;
  }

  if (state.kind === 'ok') return <UnlockedNote note={state.note} />;

  if (state.kind === 'needs_password') {
    return <PasswordGate password={password} setPassword={setPassword} onSubmit={reveal} revealing={revealing} />;
  }

  return <ReadyGate onReveal={() => reveal()} revealing={revealing} />;
}

function PasswordGate({ password, setPassword, onSubmit, revealing }: { password: string; setPassword: (value: string) => void; onSubmit: (event: React.FormEvent) => void; revealing: boolean }) {
  return <section className="w-full max-w-167.5 rounded-2xl border border-white/8 bg-[#171717] px-8 py-16 text-white shadow-[0_10px_50px_rgba(0,0,0,0.18)] sm:px-14 sm:py-20"><div className="mx-auto max-w-140 text-center"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/8 text-white/80"><LockKeyhole className="size-7" strokeWidth={1.7} /></span><h1 className="mt-7 text-3xl font-medium tracking-[-0.04em]">Password required</h1><p className="mt-4 text-base text-white/50">Enter the access key you received from the sender.</p><form onSubmit={onSubmit} className="mt-10 text-left"><Label className="text-sm text-white/80" htmlFor="access-password">Access password</Label><Input id="access-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter access key" autoFocus required className="mt-2 h-10 border-white/15 bg-transparent text-center font-mono tracking-[0.28em] text-white placeholder:text-white/20" /><Button type="submit" disabled={revealing} className="mt-5 h-10 w-full bg-white text-sm text-black hover:bg-white/85">{revealing ? 'Unlocking...' : <>Unlock note <ArrowRight /></>}</Button><p className="mt-5 text-center text-xs text-white/40">Wrong attempts are rate-limited.</p></form></div></section>;
}

function ReadyGate({ onReveal, revealing }: { onReveal: () => void; revealing: boolean }) {
  return <section className="w-full max-w-167.5 rounded-2xl border border-white/8 bg-[#171717] px-8 py-16 text-center text-white sm:px-14 sm:py-20"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/8 text-white/80"><KeyRound className="size-7" /></span><h1 className="mt-7 text-3xl font-medium">Note ready</h1><p className="mx-auto mt-4 max-w-md text-base text-white/50">This secure note is ready to reveal. Opening it may consume a one-time link.</p><Button onClick={onReveal} disabled={revealing} className="mt-9 h-10 bg-white text-black hover:bg-white/85">{revealing ? 'Revealing...' : <>Reveal note <ArrowRight /></>}</Button></section>;
}

function UnlockedNote({ note }: { note: Note }) {
  return <div className="w-full max-w-[1540px] text-white"><div className="mb-12 flex items-center justify-between px-6"><Link href="/notes" className="inline-flex items-center gap-5 text-xl text-white transition-colors hover:text-white/70"><ArrowLeft className="size-7" /> Back to notes</Link><Link href="/notes/new"><Button className="h-11 bg-white px-5 text-base text-black hover:bg-white/85"><Plus /> New note</Button></Link></div><article className="rounded-2xl border border-white/10 bg-[#171717] p-7 shadow-[0_10px_50px_rgba(0,0,0,0.16)] sm:p-8 lg:p-9"><div className="flex flex-col gap-6 border-b border-white/10 pb-9 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-4xl font-medium tracking-[-0.045em] sm:text-5xl">{note.title}</h1><p className="mt-5 flex items-center gap-3 text-xl text-white/55"><Clock3 className="size-6" /> {note.expiresAt ? `Expires ${new Date(note.expiresAt).toLocaleString()}` : 'Secure shared note'}{note.createdAt ? ` · Created ${new Date(note.createdAt).toLocaleString()}` : ''}</p></div><CopyButton content={note.content} /></div><div className="pt-14"><p className="whitespace-pre-wrap text-xl leading-[1.9] text-white/90 sm:text-2xl">{note.content}</p></div></article></div>;
}

function CopyButton({ content }: { content: string }) {
  return <Button variant="outline" className="h-11 shrink-0 border-white/15 bg-transparent text-base text-white hover:bg-white/8 hover:text-white" onClick={() => { navigator.clipboard.writeText(content); toast.success('Content copied'); }}><Copy /> Copy content</Button>;
}

function friendlyMessage(code: string): string {
  switch (code) {
    case 'used': return 'This one-time link has already been used.';
    case 'expired': return 'This link has expired.';
    case 'revoked': return 'This link has been revoked by the owner.';
    case 'wrong_password': return 'Incorrect password.';
    default: return 'This link is invalid or no longer exists.';
  }
}
