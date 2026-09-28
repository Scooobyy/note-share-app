'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await api.logout();
        toast.success('Logged out');
        router.push('/login');
        router.refresh();
      }}
    >
      Log out
    </Button>
  );
}