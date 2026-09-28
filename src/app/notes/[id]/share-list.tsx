'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Share = {
  id: string;
  shareType: string;
  accessType: string;
  expiresAt: string;
  revokedAt: string | null;
  usedAt: string | null;
  viewCount: number;
};

export function ShareList({ shares }: { shares: Share[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function revoke(id: string) {
    if (!confirm('Revoke this link? This cannot be undone.')) return;
    setBusy(id);
    try {
      await api.revokeShare(id);
      toast.success('Share revoked');
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (shares.length === 0) {
    return <p className="text-sm text-muted-foreground">No shares yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {shares.map((s) => {
        const revoked = !!s.revokedAt;
        const used = !!s.usedAt;
        const expired = new Date(s.expiresAt) < new Date();
        return (
          <li key={s.id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
            <div className="space-y-1">
              <div className="flex gap-2 items-center">
                <Badge variant="outline">{s.shareType}</Badge>
                <Badge variant="outline">{s.accessType}</Badge>
                {revoked && <Badge variant="destructive">Revoked</Badge>}
                {!revoked && used && <Badge variant="secondary">Used</Badge>}
                {!revoked && !used && expired && <Badge variant="destructive">Expired</Badge>}
                {!revoked && !used && !expired && <Badge>Active</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                Expires {new Date(s.expiresAt).toLocaleString()} · Views: {s.viewCount}
              </p>
            </div>
            {!revoked && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy === s.id}
                onClick={() => revoke(s.id)}
              >
                {busy === s.id ? 'Revoking…' : 'Revoke'}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}