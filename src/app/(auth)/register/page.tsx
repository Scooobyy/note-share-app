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
import { ArrowRight, LoaderCircle, Shield } from 'lucide-react';
import { BrandMark } from '@/components/site-header';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.register(String(fd.get('email')), String(fd.get('password')));
      toast.success('Account created');
      router.push('/notes');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
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
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-white/[0.08] text-white"><Shield className="size-6" strokeWidth={1.8} /></div>
          <CardTitle className="text-3xl font-medium tracking-[-0.04em] text-white">Create your account</CardTitle>
          <CardDescription className="text-white/50">Start sharing private notes with confidence.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80" htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
              <p className="text-xs text-white/40">Use at least 8 characters</p>
            </div>
            <Button type="submit" disabled={loading} className="h-10 w-full bg-white text-[#111] hover:bg-white/85">
              {loading ? <><LoaderCircle className="animate-spin" /> Creating...</> : <>Create account <ArrowRight /></>}
            </Button>
            <p className="text-center text-sm text-white/50">
              Already have one?{' '}
              <Link href="/login" className="text-white underline underline-offset-4">Log in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}