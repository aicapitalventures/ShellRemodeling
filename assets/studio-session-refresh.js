(() => {
  const SUPABASE_URL = 'https://mlxboidajkqyayxjdcvh.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_fA2sw0bUz0DipHRI07y1bA_gbLEwz5L';
  const SESSION_KEY = 'shellco_studio_auth';
  const rawFetch = window.fetch.bind(window);
  let refreshPromise = null;

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function accessTokenExpiresSoon(token, leadMs = 60000) {
    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
      return !decoded.exp || decoded.exp * 1000 <= Date.now() + leadMs;
    } catch {
      return true;
    }
  }

  async function refreshSession(force = false) {
    if (refreshPromise) return refreshPromise;

    const current = readSession();
    if (!current?.refresh_token) return null;
    if (!force && current.access_token && !accessTokenExpiresSoon(current.access_token)) return current;

    refreshPromise = (async () => {
      const response = await rawFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          apikey: PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
        cache: 'no-store',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.access_token) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      const renewed = {
        ...current,
        ...data,
        user: data.user || current.user,
      };
      saveSession(renewed);
      return renewed;
    })().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  function withBearer(request, accessToken) {
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return new Request(request, { headers });
  }

  window.fetch = async function shellCoSessionAwareFetch(input, init) {
    const originalRequest = new Request(input, init);
    const url = new URL(originalRequest.url, location.href);
    const isSupabase = url.origin === SUPABASE_URL;
    const isRefresh = url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token';
    const hasBearer = /^Bearer\s+/i.test(originalRequest.headers.get('Authorization') || '');

    if (!isSupabase || isRefresh || !hasBearer) {
      return rawFetch(originalRequest);
    }

    let request = originalRequest;
    let session = readSession();

    if (session?.refresh_token && (!session.access_token || accessTokenExpiresSoon(session.access_token))) {
      const renewed = await refreshSession(false);
      if (renewed?.access_token) request = withBearer(originalRequest, renewed.access_token);
    }

    let response = await rawFetch(request.clone());
    if (response.status !== 401) return response;

    session = readSession();
    if (!session?.refresh_token) return response;

    const renewed = await refreshSession(true);
    if (!renewed?.access_token) return response;

    return rawFetch(withBearer(originalRequest, renewed.access_token));
  };
})();
