import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import { parseClipboards, sanitizeClipboards, MAX_CLIPBOARDS, MAX_CONTENT_LENGTH } from '../../../lib/live-clipboard';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as {
      code?: unknown;
      sessionId?: unknown;
      content?: unknown;
      clipboardId?: unknown;
      clipboards?: unknown;
      action?: unknown;
      clipboard?: unknown;
      updatedAt?: unknown;
    };

    const { code, sessionId, content, clipboardId, clipboards: incomingClipboards, action, clipboard, updatedAt } = body;

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Session code is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Session ID is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cleanCode = code.trim().replace(/[-\s]/g, '');
    const dbCode = `live_${cleanCode}`;
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Fetch existing session
    const { data: sessionRow, error: fetchErr } = await supabaseAdmin
      .from('clipboard_items')
      .select('id, content')
      .eq('id', sessionId)
      .eq('code', dbCode)
      .maybeSingle();

    if (fetchErr || !sessionRow) {
      return new Response(JSON.stringify({ error: 'Session not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let currentClipboards = parseClipboards(sessionRow.content);
    const now = Date.now();

    if (action === 'delete' && typeof clipboardId === 'string') {
      // Never delete Clipboard 1 (clip-1)
      if (clipboardId !== 'clip-1') {
        currentClipboards = currentClipboards.filter(c => c.id !== clipboardId);
      }
    } else if (action === 'add' && clipboard && typeof clipboard === 'object') {
      const obj = clipboard as Record<string, unknown>;
      const newId = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : `clip-${Date.now()}`;
      const newTitle = typeof obj.title === 'string' ? obj.title : `Clipboard ${currentClipboards.length + 1}`;
      const newContent = typeof obj.content === 'string' ? obj.content.slice(0, MAX_CONTENT_LENGTH) : '';

      if (currentClipboards.length < MAX_CLIPBOARDS && !currentClipboards.some(c => c.id === newId)) {
        currentClipboards.push({
          id: newId,
          title: newTitle,
          content: newContent,
          createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : now,
          updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : now
        });
      }
    } else if (Array.isArray(incomingClipboards)) {
      currentClipboards = sanitizeClipboards(incomingClipboards);
    } else if (typeof clipboardId === 'string' && typeof content === 'string') {
      // Targeted update of a specific clipboard
      const safeContent = content.slice(0, MAX_CONTENT_LENGTH);
      const safeUpdatedAt = typeof updatedAt === 'number' && !isNaN(updatedAt) ? updatedAt : now;
      const targetIdx = currentClipboards.findIndex(c => c.id === clipboardId);

      if (targetIdx >= 0) {
        currentClipboards[targetIdx].content = safeContent;
        currentClipboards[targetIdx].updatedAt = safeUpdatedAt;
      } else if (currentClipboards.length < MAX_CLIPBOARDS) {
        currentClipboards.push({
          id: clipboardId,
          title: `Clipboard ${currentClipboards.length + 1}`,
          content: safeContent,
          createdAt: now,
          updatedAt: safeUpdatedAt
        });
      }
    } else if (typeof content === 'string') {
      // Legacy single text update targeting Clipboard 1
      const safeContent = content.slice(0, MAX_CONTENT_LENGTH);
      if (currentClipboards.length > 0) {
        currentClipboards[0].content = safeContent;
        currentClipboards[0].updatedAt = now;
      }
    }

    // Ensure maximum 4 clipboards
    currentClipboards = currentClipboards.slice(0, MAX_CLIPBOARDS);

    const serialized = JSON.stringify(currentClipboards);

    const { error: updateErr, count } = await supabaseAdmin
      .from('clipboard_items')
      .update({
        content: serialized,
        expires_at: newExpiresAt
      })
      .eq('id', sessionId)
      .eq('code', dbCode);

    if (updateErr) {
      throw updateErr;
    }

    return new Response(JSON.stringify({
      success: true,
      updated: count !== 0,
      clipboards: currentClipboards
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Live save error:', error);
    return new Response(JSON.stringify({ error: 'Server error saving live clipboard.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
