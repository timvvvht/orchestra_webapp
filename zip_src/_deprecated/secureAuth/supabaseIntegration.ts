import { supabase } from '@/services/supabase/supabaseClient';
import { authConfig } from './config';
import { SecureUser } from './types';

export async function exchangeCurrentSession(): Promise<
  { success: true;  user: SecureUser } |
  { success: false; error: string     }
> {
  const { data:{ session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    return { success:false, error: error?.message || 'No session' };
  }

  const res = await fetch(`${authConfig.baseUrl}/api/v1/auth/oauth/exchange`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      provider: 'supabase',
      access_token : session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id   : session.user.id,
        email: session.user.email
        // Removed extra fields that cause 422 errors:
        // - name, avatar, provider are not expected by ACS endpoint
      }
    })
  });

  if (!res.ok) {
    const msg = (await res.json()).message ?? res.statusText;
    return { success:false, error:`ACS exchange failed: ${msg}` };
  }
  const data = await res.json();
  return { success:true, user:data.user };
}
