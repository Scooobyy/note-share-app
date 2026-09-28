import { ShareView } from './share-view';
import { BrandMark } from '@/components/site-header';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="min-h-screen bg-[#0b0b0b]">
      <header className="mx-auto flex h-28 w-full max-w-167.5 items-center justify-between px-6">
        <BrandMark />
      </header>
      <div className="flex min-h-[calc(100vh-112px)] items-start justify-center px-6 pb-16 pt-2">
        <ShareView token={token} />
      </div>
    </main>
  );
}