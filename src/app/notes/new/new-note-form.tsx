'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Clock3, Copy, FileText, Globe2, KeyRound, Link2, LockKeyhole, Sparkles, Zap } from 'lucide-react';

function defaultNoteExpiry() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

function formatExpiry(value: string) {
  if (!value) return 'Tomorrow, 6:00 PM';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Tomorrow, 6:00 PM';
  return date.toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
}

export function NewNoteForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState(defaultNoteExpiry);
  const [shareType, setShareType] = useState<'ONE_TIME' | 'TIME_BASED'>('ONE_TIME');
  const [accessType, setAccessType] = useState<'PUBLIC' | 'PASSWORD'>('PUBLIC');
  const [result, setResult] = useState<null | { shareUrl: string; password: string | null; noteId: string }>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createNote({ title, content, expiresAt: new Date(expiresAt).toISOString(), shareType, accessType });
      setResult({ shareUrl: res.share.shareUrl, password: res.share.password, noteId: res.note.id });
      toast.success('Note created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create note');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <Card className="border-white/10 bg-[#171717] text-white">
        <CardContent className="space-y-5 p-6">
          <Alert className="border-emerald-400/20 bg-emerald-400/10 text-white">
            <AlertTitle>Note created successfully</AlertTitle>
            <AlertDescription className="text-white/60">{result.password ? 'Save the password now - it will not be shown again.' : 'Your public link is ready.'}</AlertDescription>
          </Alert>
          <div className="space-y-2"><Label className="text-white/70">Share link</Label><div className="flex gap-2"><Input readOnly value={result.shareUrl} className="border-white/10 bg-white/3 text-white" /><Button type="button" size="icon" className="shrink-0 bg-white text-black hover:bg-white/85" onClick={() => { navigator.clipboard.writeText(result.shareUrl); toast.success('Link copied'); }} aria-label="Copy share link"><Copy /></Button></div></div>
          {result.password && <div className="space-y-2"><Label className="text-white/70">Access password</Label><div className="flex gap-2"><Input readOnly value={result.password} className="border-white/10 bg-white/3 font-mono text-white" /><Button type="button" size="icon" className="shrink-0 bg-white text-black hover:bg-white/85" onClick={() => { navigator.clipboard.writeText(result.password!); toast.success('Password copied'); }} aria-label="Copy password"><Copy /></Button></div></div>}
          <div className="flex flex-wrap gap-2 pt-2"><Button variant="outline" onClick={() => setResult(null)} className="border-white/15 bg-transparent text-white hover:bg-white/8 hover:text-white">Create another</Button><Button onClick={() => router.push(`/notes/${result.noteId}`)} className="bg-white text-black hover:bg-white/85">View note</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
      <Card className="border-white/8 bg-[#171717] text-white shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="text-sm font-medium">Note details</h2><p className="mt-1 text-xs text-white/45">Only people with the generated link can see this note.</p></div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs text-white/75" htmlFor="title">Title</Label><Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} className="h-9 border-white/15 bg-transparent text-xs text-white placeholder:text-white/25" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-white/75" htmlFor="content">Content</Label><Textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} required rows={7} maxLength={50000} className="min-h-36.25 resize-y border-white/15 bg-transparent text-xs leading-5 text-white placeholder:text-white/25" /></div>
            <div className="space-y-1.5"><Label className="text-xs text-white/75" htmlFor="expiresAt">Expires at</Label><div className="relative"><Clock3 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/45" /><Input id="expiresAt" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" required className="scheme-dark h-9 border-white/15 bg-transparent pl-8 text-xs text-white" /></div></div>
            <div className="pt-1"><p className="text-xs font-medium text-white/80">Share settings</p><p className="mt-1 text-[11px] text-white/40">Choose how recipients can access this note.</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><OptionTile selected={shareType === 'ONE_TIME'} icon={<Zap />} title="One-time" description="Consumed after first successful view" onClick={() => setShareType('ONE_TIME')} /><OptionTile selected={shareType === 'TIME_BASED'} icon={<Clock3 />} title="Time-based" description="Accessible until it expires" onClick={() => setShareType('TIME_BASED')} /></div></div>
            <div className="pt-1"><p className="text-xs font-medium text-white/80">Access type</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><OptionTile selected={accessType === 'PUBLIC'} icon={<Globe2 />} title="Public" description="Anyone with the link can open it" onClick={() => setAccessType('PUBLIC')} /><OptionTile selected={accessType === 'PASSWORD'} icon={<LockKeyhole />} title="Password-protected" description="Requires a generated access key" onClick={() => setAccessType('PASSWORD')} /></div></div>
            <Button type="submit" disabled={loading} className="h-9 w-full bg-white text-xs text-black hover:bg-white/85"><Sparkles /> {loading ? 'Creating...' : 'Create note & generate link'}</Button>
          </form>
        </CardContent>
      </Card>
      <Preview title={title} content={content} expiresAt={expiresAt} shareType={shareType} accessType={accessType} />
    </div>
  );
}

function OptionTile({ selected, icon, title, description, onClick }: { selected: boolean; icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`relative flex min-h-15.5 items-start gap-2 rounded-lg border p-2.5 text-left transition-colors ${selected ? 'border-white/80 bg-white/3' : 'border-white/10 bg-transparent hover:border-white/30'}`}><span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-white text-black' : 'bg-white/6 text-white/50'}`}>{icon}</span><span className="min-w-0"><span className="block text-[11px] font-medium text-white">{title}</span><span className="mt-1 block text-[9px] leading-3 text-white/45">{description}</span></span><span className={`absolute right-2.5 top-3 size-3 rounded-full border ${selected ? 'border-white bg-white shadow-[inset_0_0_0_3px_#171717]' : 'border-white/25'}`} /></button>;
}

function Preview({ title, content, expiresAt, shareType, accessType }: { title: string; content: string; expiresAt: string; shareType: 'ONE_TIME' | 'TIME_BASED'; accessType: 'PUBLIC' | 'PASSWORD' }) {
  return <Card className="border-white/8 bg-[#171717] text-white shadow-none"><CardContent className="p-4 sm:p-5"><div className="mb-4"><h2 className="text-sm font-medium">Live preview</h2><p className="mt-1 text-xs text-white/45">Recipient view</p><span className="mt-2 inline-flex rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/60">Preview</span></div><div className="rounded-lg border border-white/10 bg-[#1b1b1b] p-4"><div className="flex items-center gap-2 text-[10px] text-white/45"><span className="flex size-5 items-center justify-center rounded-full bg-white/8"><KeyRound className="size-2.5" /></span> Ready to view</div><h3 className="mt-5 text-sm font-medium">{title || 'Untitled note'}</h3><p className="mt-3 whitespace-pre-wrap text-[10px] leading-5 text-white/70">{content || 'Your note preview will appear here.'}</p><div className="mt-5 border-t border-white/10 pt-3"><div className="flex flex-wrap gap-1.5 text-[9px] text-white/65"><span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1"><Link2 className="size-2.5" /> {shareType === 'ONE_TIME' ? 'One-time' : 'Time-based'}</span><span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1"><FileText className="size-2.5" /> {accessType === 'PUBLIC' ? 'Public' : 'Password'}</span><span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-300"><Clock3 className="size-2.5" /> {formatExpiry(expiresAt)}</span></div></div></div><p className="mt-3 text-center text-[10px] text-white/35">This is how recipients will see it after unlocking.</p></CardContent></Card>;
}
