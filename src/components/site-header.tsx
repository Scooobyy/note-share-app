import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 text-sm font-semibold tracking-tight ${dark ? 'text-[#111]' : 'text-white'}`}>
      <span className={`flex size-9 items-center justify-center rounded-xl ${dark ? 'bg-[#792cff] text-white shadow-[0_0_0_1px_rgba(121,44,255,0.2)]' : 'bg-white text-[#101010] shadow-[0_0_0_1px_rgba(255,255,255,0.18)]'}`}>
        <Shield className="size-4.5" strokeWidth={2.2} />
      </span>
      <span>Noteshare</span>
    </Link>
  );
}

export function SiteHeader({ auth = false }: { auth?: boolean }) {
  return (
    <header className="relative z-10 border-b border-white/8">
      <div className="mx-auto flex h-17.5 w-full max-w-335 items-center justify-between px-6 lg:px-10">
        <BrandMark />
        {!auth && (
          <nav className="hidden items-center gap-8 text-sm text-white/45 md:flex">
            <Link className="transition-colors hover:text-white" href="/">Overview</Link>
            <Link className="transition-colors hover:text-white" href="/notes/new">Create note</Link>
            <Link className="transition-colors hover:text-white" href="/notes/new">Note detail</Link>
            <Link className="transition-colors hover:text-white" href="/share/demo">Public share</Link>
          </nav>
        )}
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="outline" className="h-8 border-white/12 bg-transparent px-3 text-xs text-white hover:bg-white/8 hover:text-white">
              Log in
            </Button>
          </Link>
          {!auth && (
            <Link href="/register">
              <Button className="h-8 bg-white px-3 text-xs text-[#101010] hover:bg-white/85">Get started</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}