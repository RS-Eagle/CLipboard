import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { parseClipboards, MAX_CONTENT_LENGTH } from '../../../lib/live-clipboard';
import crypto from 'node:crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    let initialText = '';
    try {
      const body = await request.json() as { content?: unknown; clipboards?: unknown };
      if (typeof body.content === 'string') {
        initialText = body.content.slice(0, MAX_CONTENT_LENGTH);
      }
    } catch {
      // Empty body is acceptable when creating a fresh live session
    }

    const clipboards = parseClipboards(initialText);
    const serialized = JSON.stringify(clipboards);

    // Generate a unique 6-digit session code
    let code = '';
    let inserted = false;
    let sessionId = '';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry

    for (let attempts = 0; attempts < 5; attempts++) {
      code = crypto.randomInt(100000, 999999).toString();
      const dbCode = `live_${code}`;

      // Check if code is already active
      const { data: existing } = await supabaseAdmin
        .from('clipboard_items')
        .select('id, expires_at')
        .eq('code', dbCode)
        .maybeSingle();

      if (existing && new Date(existing.expires_at) > new Date()) {
        continue; // Collision with active session, retry
      }

      // If expired session existed with this code, delete it first
      if (existing) {
        await supabaseAdmin.from('clipboard_items').delete().eq('id', existing.id);
      }

      const { data, error } = await supabaseAdmin
        .from('clipboard_items')
        .insert([{ code: dbCode, content: serialized, expires_at: expiresAt }])
        .select('id')
        .single();

      if (!error && data) {
        sessionId = data.id;
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      return new Response(JSON.stringify({ error: 'Could not generate a unique session code. Please try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      code,
      sessionId,
      clipboards,
      content: clipboards[0].content, // backward compatibility
      expiresAt
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Live create error:', error);
    return new Response(JSON.stringify({ error: 'Server error creating live clipboard.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
