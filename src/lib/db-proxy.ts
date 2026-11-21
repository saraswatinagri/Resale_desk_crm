// Builds the fetch() used by the browser's data client. It re-routes the
// Supabase client's REST calls to our own /api/db route and attaches the
// employee's login token. Kept free of browser-only globals so it can be tested.

const REST_PREFIX = '/rest/v1/';
const FORWARDED_HEADERS = ['accept', 'prefer', 'content-type', 'range'];

export function createProxyFetch(
  getToken: () => Promise<string>,
  send: typeof fetch = (input, init) => fetch(input, init)
): typeof fetch {
  return async (input, init) => {
    const href =
      typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const url = new URL(href);
    const at = url.pathname.indexOf(REST_PREFIX);
    if (at === -1) {
      return new Response(JSON.stringify({ message: 'Only table queries are supported.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const incoming = new Headers(init?.headers || {});
    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = incoming.get(name);
      if (value) headers.set(name, value);
    }
    // The anon key the client attached is dropped; the employee's token is sent instead.
    headers.set('x-db-table', url.pathname.slice(at + REST_PREFIX.length));
    const token = await getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    return send(`/api/db${url.search}`, {
      method: init?.method || 'GET',
      headers,
      body: init?.body,
      signal: init?.signal,
    });
  };
}
