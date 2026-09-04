import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid 6-digit code.' }), { status: 400 });
    }

    // Fetch and validate expiration in one go
    const { data, error } = await supabaseAdmin
      .from('clipboard_items')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Code not found.' }), { status: 404 });
    }

    if (new Date(data.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Code has expired.' }), { status: 410 });
    }

    // Optional One-Time Retrieval: Delete immediately after reading
    await supabaseAdmin.from('clipboard_items').delete().eq('id', data.id);

    return new Response(JSON.stringify({ success: true, content: data.content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Retrieve error:', error);
    return new Response(JSON.stringify({ error: 'Server error retrieving text.' }), { status: 500 });
  }
};