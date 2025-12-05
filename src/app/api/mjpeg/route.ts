export const runtime = 'nodejs';

export async function GET() {
  try {
    const upstream = await fetch('https://hanpen.f5.si/mjpeg', {
      method: 'GET',
      headers: { Accept: 'multipart/x-mixed-replace' },
    });

    if (!upstream.ok) {
      return new Response('Upstream error', { status: 502 });
    }

    // Copy important headers from upstream and set caching headers
    const headers = new Headers(upstream.headers);
    headers.set('Cache-Control', 'no-cache, private');
    headers.set('Pragma', 'no-cache');
    headers.set('Content-Type', upstream.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame');

    // Restrict CORS to same-origin (allow only browser pages served from this app)
    // If you need more strict controls, replace '*' with your exact origin.
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    console.error('mjpeg proxy error:', err);
    return new Response('Proxy error', { status: 500 });
  }
}
