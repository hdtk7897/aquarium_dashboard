export const runtime = 'nodejs';

interface GraphQLRequest {
  query: string;
}

export async function POST(request: Request) {
  try {
    const body: GraphQLRequest = await request.json();

    const upstream = await fetch('https://hanpen.f5.si/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-REQUEST-TYPE': 'GraphQL',
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'Upstream error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('graphql proxy error:', err);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
