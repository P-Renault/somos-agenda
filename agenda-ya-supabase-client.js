/* Agenda YA · Supabase Client Registry
 * Una sola instancia de supabase-js por página y configuración.
 * Cargar después de config.js y antes de cualquier módulo de la aplicación.
 */
(() => {
  'use strict';
  if (window.AgendaYaSupabase?.getClient) return;

  let client = null;
  let clientKey = null;

  function getClient() {
    const cfg = window.SOMOS_CONFIG || {};
    const url = String(cfg.SUPABASE_URL || '').trim();
    const anonKey = String(cfg.SUPABASE_ANON_KEY || '').trim();

    if (!url || !anonKey) {
      throw new Error('Agenda YA: falta SUPABASE_URL o SUPABASE_ANON_KEY en config.js.');
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Agenda YA: la biblioteca supabase-js no está cargada.');
    }

    const requestedKey = `${url}|${anonKey}`;
    if (client && clientKey !== requestedKey) {
      throw new Error('Agenda YA: se intentó reutilizar el cliente con una configuración Supabase diferente.');
    }
    if (!client) {
      client = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      clientKey = requestedKey;
    }
    return client;
  }

  window.AgendaYaSupabase = Object.freeze({
    version: '1.0.0',
    getClient,
    isInitialized: () => Boolean(client)
  });
})();
