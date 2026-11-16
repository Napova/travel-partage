// travel_app · Page de partage : accès (prénom, langue, code), chargement,
// actualisation toutes les 5 minutes et réactions.
const FUNCTION_URL = 'https://xvpuidmnyfoovubgxvqz.supabase.co/functions/v1/share';
const PUBLIC_KEY = 'sb_publishable_DpoqNnIxMXCT4P2-38bMkA_DDnUkcgd';

const app = document.getElementById('app');
const token = decodeURIComponent(location.hash.slice(1));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
// Identifiant de ce navigateur (pour retrouver ses propres réactions).
let visitor = store.get('tp_visitor');
if (!visitor) {
  visitor = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
  store.set('tp_visitor', visitor);
}
let firstName = store.get('tp_name') || '';
let pin = '';

const App = {
  async call(extra) {
    const r = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUBLIC_KEY },
      body: JSON.stringify({ t: token, pin, v: visitor, ...extra }),
    });
    return { status: r.status, ok: r.ok, data: await r.json().catch(() => ({})) };
  },

  async start(error) {
    if (!token) return this.message(T().incompleteTitle, T().incompleteText);
    let r;
    try { r = await this.call({}); } catch { return this.message(T().offlineTitle, T().offlineText); }
    const d = r.data;
    if (r.ok) return firstName ? View.render(d) : this.access(d, false, '', d);
    if (r.status === 401) return this.access(d.preview, true, error);
    if (r.status === 403) return this.access(d.preview, true, T().badCode(d.tries ?? 0, d.next));
    if (r.status === 429) {
      const until = d.until ? new Date(d.until) : null;
      const min = until ? Math.max(1, Math.ceil((until - Date.now()) / 60000)) : 15;
      const at = until ? until.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }) : '';
      return this.message(T().lockedTitle, T().lockedText(min, at), d.preview);
    }
    if (r.status === 410) return this.message(T().goneTitle, T().goneText, d.preview);
    this.message(T().errorTitle, T().errorText, d.preview);
  },

  // Fond : vraie photo si le voyage est déjà ouvert (lien sans code),
  // sinon petite image floutée.
  background(preview, data) {
    if (data?.cover) return `<div class="bg" style="background-image:url('${esc(data.cover)}')"></div><div class="veil"></div>`;
    if (preview?.blur) return `<div class="bg blur" style="background-image:url('${esc(preview.blur)}')"></div><div class="veil"></div>`;
    return '<div class="bg"></div><div class="veil"></div>';
  },

  message(title, text, preview) {
    app.innerHTML = `${this.background(preview)}<div class="access"><div class="inner msg">
      <div class="logo">🧭</div><h1>${esc(title)}</h1><p>${esc(text)}</p></div></div>`;
  },

  // Écran d'accès : prénom, langue et, si le lien en a un, code à 4 chiffres.
  access(preview, needPin, error, data) {
    const p = preview || {};
    const langs = LANGS.map((l) => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${esc(l.label)}</option>`).join('');
    const code = needPin ? `<label class="lab">${esc(T().code)}</label>
      <div class="code">${[0, 1, 2, 3].map(() => '<input inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off">').join('')}</div>
      <div class="warn">${esc(T().codeWarn)}</div>` : '';
    app.innerHTML = `${this.background(p, data)}<div class="access"><form class="inner" novalidate>
      <div class="logo">🧭</div><h1>${esc(T().sharesTrip(p.by || ''))}</h1>
      <div class="s">${esc(p.name || '')}${p.start ? ' · ' + day(p.start) : ''}${p.end ? ' – ' + day(p.end) : ''}</div>
      <label class="lab" for="fn">${esc(T().firstName)}</label>
      <input class="in" id="fn" maxlength="30" autocomplete="given-name" placeholder="${esc(T().firstNameHint)}" value="${esc(firstName)}">
      <label class="lab" for="lg">${esc(T().language)}</label><select class="in" id="lg">${langs}</select>
      ${code}<button class="btn" type="submit">${esc(T().see)}</button>
      ${error ? `<div class="err">${esc(error)}</div>` : ''}
      <div class="note">${esc(T().nameNote(p.by || ''))}</div></form></div>`;
    const form = app.querySelector('form');
    const fn = form.querySelector('#fn');
    const inputs = [...form.querySelectorAll('.code input')];
    form.querySelector('#lg').onchange = (e) => {
      lang = e.target.value;
      store.set('tp_lang', lang);
      firstName = fn.value.trim();
      this.access(preview, needPin, '', data);
    };
    inputs.forEach((el, i) => {
      el.addEventListener('input', () => {
        const digits = el.value.replace(/\D/g, '');
        if (digits.length > 1) { digits.slice(0, 4).split('').forEach((c, j) => inputs[j] && (inputs[j].value = c)); inputs[Math.min(3, digits.length - 1)].focus(); return; }
        el.value = digits;
        if (digits && inputs[i + 1]) inputs[i + 1].focus();
      });
      el.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !el.value && inputs[i - 1]) inputs[i - 1].focus(); });
    });
    (firstName && inputs[0] ? inputs[0] : fn).focus();
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = fn.value.trim();
      const code = inputs.map((x) => x.value).join('');
      const fail = !name ? T().needName : needPin && code.length !== 4 ? T().needCode : '';
      if (fail) {
        form.querySelector('.err')?.remove();
        form.querySelector('.btn').insertAdjacentHTML('afterend', `<div class="err">${esc(fail)}</div>`);
        return;
      }
      firstName = name;
      store.set('tp_name', name);
      if (data) return View.render(data);
      pin = code;
      app.querySelector('.btn').textContent = T().loading;
      this.start();
    };
  },

  // Réaction : affichée tout de suite, puis confirmée par le serveur.
  async react(stepId, emoji, on) {
    const v = View.v;
    const key = `${stepId}:${emoji}`;
    const mine = new Set(v.mine || []);
    const c = ((v.reactions ||= {})[stepId] ||= {});
    if (on && !mine.has(key)) { mine.add(key); c[emoji] = (c[emoji] || 0) + 1; }
    if (!on && mine.has(key)) { mine.delete(key); c[emoji] = Math.max(0, (c[emoji] || 1) - 1); }
    v.mine = [...mine];
    View.refreshReactions();
    try {
      const r = await this.call({ name: firstName, react: { step: stepId, emoji, on } });
      if (r.ok) { v.reactions = r.data.reactions; v.mine = r.data.mine; View.refreshReactions(); }
    } catch {}
  },

  // Mise à jour en direct toutes les 5 minutes : position et réactions
  // seulement. Tout est relu toutes les 50 minutes (adresses des photos
  // valables 1 heure, nouvelles étapes).
  lastFull: Date.now(),
  async refresh() {
    if (!View.v || document.hidden) return;
    try {
      const full = Date.now() - this.lastFull > 3000000;
      const r = await this.call({ refresh: full ? true : 'live' });
      if (!r.ok) return;
      if (full) { this.lastFull = Date.now(); View.render(r.data, true); } else View.live(r.data);
    } catch {}
  },
};

document.documentElement.lang = lang;
app.innerHTML = `<div class="access"><div class="inner msg" style="color:var(--muted)">${esc(T().loading)}</div></div>`;
App.start();
setInterval(() => App.refresh(), 300000);
// Retour sur la page après une longue absence : mise à jour tout de suite.
document.addEventListener('visibilitychange', () => { if (!document.hidden) App.refresh(); });
