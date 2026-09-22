import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function requireMerchant() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: members } = await supabase
    .from('merchant_members')
    .select('merchant_id, role, merchants(id, name, status, brand_color, plan_id)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1);

  if (!members || members.length === 0) redirect('/onboarding/merchant');

  return {
    user,
    merchant: (members[0] as any).merchants as {
      id: string; name: string; status: string; brand_color: string; plan_id: string;
    },
    role: members[0].role,
    supabase,
  };
}
