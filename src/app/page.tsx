import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Clock3, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';

export default async function Home() {
  const session = await getSession();
  if (session) redirect('/notes');

  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader />
      <section className="mx-auto flex min-h-[calc(100vh-70px)] max-w-[1340px] flex-col items-center px-6 pt-[140px] text-center lg:pt-[140px]">
        <div className="mb-8 flex size-[70px] items-center justify-center rounded-[20px] bg-white text-[#111] shadow-[0_0_0_1px_rgba(255,255,255,0.2)]">
          <ShieldCheck className="size-9" strokeWidth={1.7} />
        </div>
        <p className="mb-6 text-sm font-medium tracking-wide text-white/90">Private by design</p>
        <h1 className="max-w-[760px] text-[clamp(3.1rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-white">
          Share notes that self-destruct.
        </h1>
        <p className="mt-8 max-w-[610px] text-base leading-7 text-white/55 sm:text-lg">
          One-time or time-based links. Public or password-protected. Revoke anytime.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/register"><Button className="h-10 bg-white px-4 text-sm text-[#111] hover:bg-white/85">Get started <ArrowRight /></Button></Link>
          <Link href="/login"><Button variant="outline" className="h-10 border-white/[0.14] bg-transparent px-4 text-sm text-white hover:bg-white/[0.08] hover:text-white">Log in</Button></Link>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs text-white/65">
          <span className="flex items-center gap-1.5"><KeyRound className="size-3.5" /> Encrypted</span>
          <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> Auto-expiring</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Revocable</span>
        </div>
      </section>
    </main>
  );
}