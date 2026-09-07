// Placeholder runtime config.
// In a container, docker-entrypoint.sh overwrites this file from env vars.
// Left empty here so `npm run dev` falls back to import.meta.env, then to
// the localhost defaults in src/config.ts.
window.__DRINKSAVER_CONFIG__ = {};
