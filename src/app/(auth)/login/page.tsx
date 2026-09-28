'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { BrandMark } from '@/components/site-header';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.login(String(fd.get('email')), String(fd.get('password')));
      toast.success('Welcome back');
      router.push('/notes');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex h-[70px] max-w-[1340px] items-center px-6 lg:px-10"><BrandMark /></div>
      <div className="flex min-h-[calc(100vh-70px)] items-center justify-center px-6 py-14">
      <Card className="w-full max-w-[460px] border-white/[0.1] bg-[#101010]/95 py-8 shadow-2xl shadow-black/30">
        <CardHeader className="items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-white/[0.08] text-white"><LockKeyhole className="size-6" strokeWidth={1.8} /></div>
          <CardTitle className="text-3xl font-medium tracking-[-0.04em] text-white">Welcome back</CardTitle>
          <CardDescription className="text-white/50">Log in to manage your secure notes and share links.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <Button type="submit" disabled={loading} className="h-10 w-full bg-white text-[#111] hover:bg-white/85">
              {loading ? 'Signing in...' : <>Log in <ArrowRight /></>}
            </Button>
            <p className="text-center text-sm text-white/50">
              No account?{' '}
              <Link href="/register" className="text-white underline underline-offset-4">Create an account</Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}