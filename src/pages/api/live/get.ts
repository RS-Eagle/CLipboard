import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { parseClipboards } from '../../../lib/live-clipboard';

export const GET: APIRoute = async ({ url }) => {
  try {
    const code = url.searchParams.get('code');
    const sessionId = url.searchParams.get('sessionId');

    if (!code || !sessionId) {
      return new Response(JSON.stringify({ error: 'Session code and ID are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanCode = code.trim().replace(/[-\s]/g, '');
    const dbCode = `live_${cleanCode}`;

    const { data, error } = await supabaseAdmin
      .from('clipboard_items')
      .select('id, content, expires_at')
      .eq('id', sessionId)
      .eq('code', dbCode)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Session not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (new Date(data.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Session has expired.' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const clipboards = parseClipboards(data.content);

    return new Response(JSON.stringify({
      success: true,
      clipboards,
      content: clipboards[0]?.content ?? '',
      expiresAt: data.expires_at
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Live get error:', error);
    return new Response(JSON.stringify({ error: 'Server error retrieving live state.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
