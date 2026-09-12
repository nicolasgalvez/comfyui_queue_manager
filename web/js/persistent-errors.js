// Keep failed-job details outside ComfyUI's current-execution error store, which
// is intentionally cleared when another job starts. Never mark the current graph.
export function installPersistentErrors(api, { root = document, storage } = {}) {
  const key = 'queue-manager.failed-node-errors';
  if (!storage) {
    try { storage = window.sessionStorage; } catch { /* Browser storage disabled. */ }
  }
  let records = [];
  try {
    const saved = JSON.parse(storage?.getItem(key) || '[]');
    if (Array.isArray(saved)) records = saved.filter(r => r && typeof r.message === 'string');
  } catch { /* Storage unavailable: retain notices for this page lifetime. */ }
  const section = document.createElement('section');
  section.dataset.qmPersistentErrors = '';
  section.setAttribute('aria-label', 'Failed jobs');
  section.style.cssText = 'flex:none;max-height:40%;overflow:auto;padding:0 16px 12px;border-bottom:1px solid var(--border-color,#555);';
  function save() {
    try { storage?.setItem(key, JSON.stringify(records)); } catch { /* Keep in memory. */ }
  }
  function mount() {
    const panel = root.querySelector('[data-testid="properties-panel"]');
    if (records.length && panel && section.parentElement !== panel) {
      panel.insertBefore(section, panel.children[1] || null);
    } else if (!records.length) section.remove();
  }
  function render() {
    section.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = `Failed jobs (${records.length})`;
    heading.style.cssText = 'font-size:14px;margin:10px 0;';
    section.append(heading);
    for (const record of records) {
      const card = document.createElement('article');
      card.style.cssText = 'margin:8px 0;padding:8px;border:1px solid #a34b4b;border-radius:6px;font-size:12px;';
      const label = document.createElement('strong');
      label.textContent = `${record.nodeType || 'Unknown node'} · Node ${record.nodeId || '?'}`;
      const context = document.createElement('div');
      context.textContent = `Failed job ${record.promptId || '(unknown ID)'}`;
      context.style.cssText = 'opacity:.75;overflow-wrap:anywhere;margin:4px 0;';
      const message = document.createElement('pre');
      message.textContent = record.message;
      message.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0;font:inherit;';
      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.textContent = 'Dismiss';
      dismiss.setAttribute('aria-label', `Dismiss error for node ${record.nodeId || '?'}`);
      dismiss.addEventListener('click', () => {
        records = records.filter(r => r !== record);
        save(); render();
      });
      card.append(label, context, message, dismiss);
      section.append(card);
    }
    mount();
  }
  function onError({ detail }) {
    if (!detail) return;
    const record = {
      promptId: String(detail.prompt_id || ''),
      nodeId: String(detail.node_id ?? ''),
      nodeType: String(detail.node_type || ''),
      message: [detail.exception_type, detail.exception_message].filter(Boolean).join(': ') || 'Execution failed',
    };
    // Socket reconnections can repeat the same failed job notification.
    if (records.some(r => r.promptId === record.promptId && r.nodeId === record.nodeId && r.message === record.message)) return;
    records.push(record);
    save(); render();
  }
  api.addEventListener('execution_error', onError);
  const observer = new MutationObserver(mount);
  observer.observe(root.body || root, { childList: true, subtree: true });
  render();
  return () => { api.removeEventListener('execution_error', onError); observer.disconnect(); section.remove(); };
}
