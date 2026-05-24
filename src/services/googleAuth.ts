import { supabase } from '../utils/supabase';

// We map User type locally, matching what was there
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: AuthUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        cachedAccessToken = session.provider_token || session.access_token;
        const user: AuthUser = {
          uid: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || null,
        };
        if (onAuthSuccess) {
          onAuthSuccess(user, cachedAccessToken);
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
};

export const googleSignIn = async (): Promise<{ user: AuthUser; accessToken: string } | null> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets'
      }
    });

    if (error) throw error;
    
    // We don't get the user immediately with OAuth redirect unless we fetch session
    // In popup mode (Supabase doesn't easily do popup natively without extra code), we assume the redirect flow.
    // However, if we need it immediately:
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData?.session?.user) {
      const u = sessionData.session.user;
      cachedAccessToken = sessionData.session.provider_token || sessionData.session.access_token;
      return {
        user: {
          uid: u.id,
          email: u.email || null,
          displayName: u.user_metadata?.full_name || null,
        },
        accessToken: cachedAccessToken
      };
    }

    return null;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await supabase.auth.signOut();
  cachedAccessToken = null;
};
