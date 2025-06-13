import { NextResponse } from 'next/server';

export async function POST(request) {
  const { url } = await request.json();

  const API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const apiRes = await fetch(`https://api.deepseek.com/v1/extract?url=${encodeURIComponent(url)}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await apiRes.text();
    
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid response from Deepseek API', raw: text }, { status: 502 });
    }

    if (!apiRes.ok) {
      return NextResponse.json(data, { status: apiRes.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
