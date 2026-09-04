import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'Content is required.' }), { status: 400 });
    }
    if (content.length > 20000) {
      return new Response(JSON.stringify({ error: 'Text exceeds maximum length.' }), { status: 400 });
    }

    // Generate a secure 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    // Expiration: 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from('clipboard_items')
      .insert([{ code, content, expires_at: expiresAt }]);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, code, expiresAt }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create error:', error);
    return new Response(JSON.stringify({ error: 'Server error generating code.' }), { status: 500 });
  }
};