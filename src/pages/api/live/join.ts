import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { parseClipboards } from '../../../lib/live-clipboard';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code } = await request.json() as { code?: unknown };

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Session code is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanCode = code.trim().replace(/[-\s]/g, '');

    if (!/^\d{6}$/.test(cleanCode)) {
      return new Response(JSON.stringify({ error: 'Invalid 6-digit session code.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const dbCode = `live_${cleanCode}`;

    const { data, error } = await supabaseAdmin
      .from('clipboard_items')
      .select('id, content, expires_at')
      .eq('code', dbCode)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Live clipboard session not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (new Date(data.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Live clipboard session has expired.' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const clipboards = parseClipboards(data.content);

    return new Response(JSON.stringify({
      success: true,
      code: cleanCode,
      sessionId: data.id,
      clipboards,
      content: clipboards[0]?.content ?? '', // backward compatibility
      expiresAt: data.expires_at
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Live join error:', error);
    return new Response(JSON.stringify({ error: 'Server error joining live clipboard.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
