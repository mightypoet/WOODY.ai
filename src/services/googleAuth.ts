import { supabase } from '../utils/supabase';

// We map User type locally, matching what was there
export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

let cachedAccessToken: string | null = localStorage.getItem('google_provider_token');

export const initAuth = (
  onAuthSuccess?: (user: AuthUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  let initialCheckDone = false;

  // Manually check session first
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error("Session check error:", error);
    }
    
    if (session?.user) {
      if (session.provider_token) {
        cachedAccessToken = session.provider_token;
        localStorage.setItem('google_provider_token', session.provider_token);
      }
      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email || null,
        displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || null,
      };
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || "");
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('google_provider_token');
      if (onAuthFailure) onAuthFailure();
    }
    initialCheckDone = true;
  }).catch((err) => {
    console.error("Failed to get session:", err);
    if (!initialCheckDone && onAuthFailure) onAuthFailure();
    initialCheckDone = true;
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      // Skip the very first event if we already handled the explicit check
      if (event === 'INITIAL_SESSION' && initialCheckDone) return;

      if (session?.user) {
        if (session.provider_token) {
          cachedAccessToken = session.provider_token;
          localStorage.setItem('google_provider_token', session.provider_token);
        }
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email || null,
          displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || null,
        };
        if (onAuthSuccess) {
          onAuthSuccess(user, cachedAccessToken || "");
        }
      } else {
        cachedAccessToken = null;
        localStorage.removeItem('google_provider_token');
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
    // Open window synchronously to avoid popup blockers
    const authWindow = window.open('', 'oauth_popup', 'width=600,height=700');
    if (!authWindow) {
      throw new Error("Popup blocked. Please allow popups for this site to connect your Google account.");
    }
    authWindow.document.write("Loading Google Secure Login...");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets'
      }
    });

    if (error) {
      authWindow.close();
      throw error;
    }
    
    if (data?.url) {
      authWindow.location.href = data.url;
      
      // Wait for the popup to redirect back to our origin and capture the hash
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
          try {
            // This will throw a DOMException if the popup is still on google.com (cross-origin)
            const popupUrl = authWindow.location.href;
            const popupHash = authWindow.location.hash;
            
            if (popupHash && popupHash.includes('access_token=')) {
              clearInterval(checkInterval);
              
              const params = new URLSearchParams(popupHash.substring(1));
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              
              if (accessToken && refreshToken) {
                await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              }
              
              // If there's a google provider_token explicitly passed back
              const providerToken = params.get('provider_token');
              if (providerToken) {
                cachedAccessToken = providerToken;
                localStorage.setItem('google_provider_token', providerToken);
              }
              
              authWindow.close();
              
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session?.user) {
                const u = sessionData.session.user;
                if (sessionData.session.provider_token) {
                  cachedAccessToken = sessionData.session.provider_token;
                  localStorage.setItem('google_provider_token', cachedAccessToken);
                }
                resolve({
                  user: {
                    id: u.id,
                    email: u.email || null,
                    displayName: u.user_metadata?.full_name || null,
                  },
                  accessToken: cachedAccessToken!
                });
              } else {
                resolve(null);
              }
              return;
            }
          } catch (e) {
            // Ignore cross-origin errors while navigating
          }

          if (authWindow.closed) {
            clearInterval(checkInterval);
            // Fallback check
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              const u = sessionData.session.user;
              if (sessionData.session.provider_token) {
                cachedAccessToken = sessionData.session.provider_token;
                localStorage.setItem('google_provider_token', cachedAccessToken);
              }
              resolve({
                user: {
                  id: u.id,
                  email: u.email || null,
                  displayName: u.user_metadata?.full_name || null,
                },
                accessToken: cachedAccessToken!
              });
            } else {
              resolve(null);
            }
          }
        }, 500);
      });
    }

    authWindow.close();
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
  localStorage.removeItem('google_provider_token');
};
