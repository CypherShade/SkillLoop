// Keeps auth state in sync across browser tabs: logging in or out in one tab
// updates every other open tab straight away.
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('skillloop-session') : null;

export const broadcastSession = (type) => channel?.postMessage({ type, at: Date.now() });

export function onSessionMessage(handler) {
  if (!channel) return () => {};
  const listener = (e) => handler(e.data);
  channel.addEventListener('message', listener);
  return () => channel.removeEventListener('message', listener);
}
