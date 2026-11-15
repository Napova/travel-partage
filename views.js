// travel_app · Affichage du voyage : en-tête, onglets Carte / Étapes / Photos.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const flag = (iso) => (iso && iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '');
const day = (d) => (d ? new Date(d).toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) : '');
const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); return T().ago(m) ?? day(d); };
const dateOnly = (d) => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()); };
const EMO = { heart: '❤️', wow: '😮', clap: '👏' };
const DISCOVER_URL = 'decouvrir.html';

const View = {
  v: null, steps: [], cur: -1, tab: 0, photos: [], listEl: null, opened: false,

  render(v, keep) {
    const listTop = keep ? this.listEl?.scrollTop : null;
    this.v = v;
    // Étapes de la plus ancienne (en haut) à la plus récente (en bas).
    this.steps = [...v.steps].sort((a, b) => (a.arrival || '9').localeCompare(b.arrival || '9'));
    this.cur = this.currentIndex();
    this.photos = this.steps.flatMap((s) => s.photos);
    const tabs = T().tabs.map((t, i) => `<button data-tab="${i}">${esc(t)}</button>`).join('');
    app.innerHTML = `<div class="trip">
      <div class="hero" ${v.cover ? `style="background-image:url('${esc(v.cover)}')"` : ''}>
        <h1>${flag(this.steps[0]?.iso)} ${esc(v.name)}</h1>
        <div class="by">${esc(T().by(v.by))} · ${day(v.start)}${v.end ? ' – ' + day(v.end) : ''}</div>
        <div class="tabs">${tabs}</div></div>
      <div class="pane" data-pane="0"><div class="scroll" style="display:flex;flex-direction:column">
        ${this.liveCard()}${this.stats()}<div class="mapbig slot"></div></div></div>
      <div class="pane" data-pane="1"><div class="mapsmall slot"></div><div class="scroll list">${this.timeline()}</div></div>
      <div class="pane" data-pane="2"><div class="scroll">${this.gallery()}</div></div>
      <div class="foot">${esc(T().validUntil(day(v.expires)))} · <a href="${DISCOVER_URL}" target="_blank" rel="noopener">${esc(T().discover)}</a></div>
    </div>`;
    document.title = v.name;
    this.listEl = app.querySelector('.list');
    app.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => this.setTab(+b.dataset.tab)));
    this.bindSteps();
    app.querySelectorAll('img[data-k]').forEach((im) => (im.onclick = () => Zoom.open(+im.dataset.k)));
    TripMap.onPin = (i) => { this.setTab(1); this.scrollTo(i, true); };
    this.setTab(keep ? this.tab : 0);
    TripMap.show(this.steps, this.cur, v.position);
    if (listTop != null) this.listEl.scrollTop = listTop;
    this.weather();
  },

  // Étape en cours : la dernière commencée, si le voyage n'est pas fini.
  currentIndex() {
    const today = dateOnly(Date.now());
    if (this.v.end && dateOnly(this.v.end) < today) return -1;
    let c = -1;
    this.steps.forEach((s, i) => { if (s.arrival && dateOnly(s.arrival) <= today) c = i; });
    return c;
  },

  setTab(i) {
    this.tab = i;
    app.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', +b.dataset.tab === i));
    app.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', +p.dataset.pane === i));
    const slot = app.querySelector(`.pane[data-pane="${i}"] .slot`);
    if (slot) TripMap.place(slot);
    // À la première ouverture des étapes : on arrive sur l'étape en cours.
    if (i === 1 && !this.opened) {
      this.opened = true;
      requestAnimationFrame(() => this.scrollTo(this.cur >= 0 ? this.cur : this.steps.length - 1, false));
    }
  },

  liveCard() {
    const p = this.v.position;
    const s = this.steps[this.cur];
    if (!p && !s) return '';
    const what = p ? `${esc(T().live)} · ${esc(T().near(p.city || s?.name || '…'))}` : `📍 ${esc(s.name)}`;
    const when = p ? `<small>${esc(ago(p.at))}</small>` : '';
    return `<div class="live">${p ? '<div class="dot"></div>' : ''}<div>${what}${when}</div><div class="w" id="wx"></div></div>`;
  },

  stats() {
    const st = this.steps.filter((s) => typeof s.lat === 'number');
    let km = 0;
    for (let i = 1; i < st.length; i++) km += haversine(st[i - 1], st[i]);
    const countries = new Set(this.steps.map((s) => s.iso || s.country).filter(Boolean)).size;
    const n = (x) => x.toLocaleString(locale());
    const box = (v, l) => `<div><b>${n(v)}</b>${esc(l)}</div>`;
    let prog = '';
    const start = dateOnly(this.v.start), end = this.v.end ? dateOnly(this.v.end) : null, today = dateOnly(Date.now());
    if (end) {
      const total = Math.round((end - start) / 864e5) + 1, d = Math.round((today - start) / 864e5) + 1;
      const label = d < 1 ? T().before(1 - d) : d > total ? T().done : T().dayOf(d, total);
      const pct = Math.min(100, Math.max(0, (d / total) * 100));
      prog = `<div class="prog">${esc(label)}<div class="pb"><i style="width:${pct}%"></i></div></div>`;
    }
    return `<div class="stats">${box(this.steps.length, T().steps)}${box(Math.round(km), T().km)}${box(this.photos.length, T().photos)}${box(countries, T().countries)}</div>${prog}`;
  },

  timeline() {
    if (!this.steps.length) return `<div class="empty">${esc(T().noSteps)}</div>`;
    let k = 0;
    const items = this.steps.map((s, i) => {
      const nights = s.arrival && s.departure ? Math.round((dateOnly(s.departure) - dateOnly(s.arrival)) / 864e5) : 0;
      const dates = `${day(s.arrival)}${nights > 0 ? ' – ' + day(s.departure) + ' · ' + T().nights(nights) : ''}`;
      const now = i === this.cur ? ` · <span class="nowtag">● ${esc(T().now)}</span>` : '';
      const long = s.notes && (s.notes.length > 180 || s.notes.split('\n').length > 3);
      const imgs = s.photos.map((u) => `<img src="${esc(u)}" data-k="${k++}" loading="lazy" alt="">`).join('');
      return `<div class="st${i === this.cur ? ' cur' : ''}" data-i="${i}"><div class="rail"><div class="n">${i + 1}</div></div>
        <div class="card"><h3>${flag(s.iso)} ${esc(s.name)}</h3><small>${esc(dates)}${now}</small>
        ${s.notes ? `<p class="${long ? 'clamp' : ''}">${esc(s.notes)}</p>${long ? `<button class="morebtn">${esc(T().more)}</button>` : ''}` : ''}
        ${imgs ? `<div class="strip">${imgs}</div>` : ''}
        <div class="react" data-step="${esc(s.id)}">${this.reactButtons(s.id)}</div></div></div>`;
    });
    return `<div class="tl">${items.join('')}</div>`;
  },

  reactButtons(stepId) {
    const c = this.v.reactions?.[stepId] || {};
    const mine = new Set(this.v.mine || []);
    return Object.entries(EMO).map(([k, e]) =>
      `<button data-emoji="${k}" class="${mine.has(`${stepId}:${k}`) ? 'mine' : ''}">${e}${c[k] ? ' ' + c[k] : ''}</button>`).join('');
  },

  refreshReactions() {
    app.querySelectorAll('.react').forEach((r) => (r.innerHTML = this.reactButtons(r.dataset.step)));
  },

  bindSteps() {
    if (!this.listEl) return;
    this.listEl.addEventListener('click', (ev) => {
      const more = ev.target.closest('.morebtn');
      if (more) {
        const p = more.previousElementSibling;
        p.classList.toggle('clamp');
        more.textContent = p.classList.contains('clamp') ? T().more : T().less;
        return;
      }
      const btn = ev.target.closest('.react button');
      if (btn) return App.react(btn.parentElement.dataset.step, btn.dataset.emoji, !btn.classList.contains('mine'));
      if (ev.target.closest('img')) return;
      const st = ev.target.closest('.st');
      if (st) { this.mark(+st.dataset.i); TripMap.focus(+st.dataset.i); }
    });
    // L'étape en haut de la liste est mise en avant sur la carte.
    let busy = false;
    this.listEl.addEventListener('scroll', () => {
      if (busy) return;
      busy = true;
      requestAnimationFrame(() => {
        busy = false;
        const top = this.listEl.getBoundingClientRect().top + 30;
        const sts = [...this.listEl.querySelectorAll('.st')];
        const atEnd = this.listEl.scrollTop + this.listEl.clientHeight >= this.listEl.scrollHeight - 4;
        const st = atEnd ? sts[sts.length - 1] : sts.find((e) => e.getBoundingClientRect().bottom > top);
        if (st) this.mark(+st.dataset.i);
      });
    }, { passive: true });
  },

  mark(i) {
    this.listEl.querySelectorAll('.st.hi').forEach((e) => e.classList.remove('hi'));
    this.listEl.querySelector(`.st[data-i="${i}"]`)?.classList.add('hi');
    TripMap.highlight(i);
  },

  scrollTo(i, smooth) {
    const el = this.listEl?.querySelector(`.st[data-i="${i}"]`);
    if (!el) return;
    this.listEl.scrollTo({ top: el.offsetTop - this.listEl.offsetTop - 6, behavior: smooth ? 'smooth' : 'auto' });
    this.mark(i);
  },

  gallery() {
    if (!this.photos.length) return `<div class="empty">${esc(T().noPhotos)}</div>`;
    let k = 0;
    return this.steps.map((s) => {
      if (!s.photos.length) return '';
      const imgs = s.photos.map((u) => `<img src="${esc(u)}" data-k="${k++}" loading="lazy" alt="">`).join('');
      return `<div class="gh">${esc(s.name)} · ${day(s.arrival)}</div><div class="grid">${imgs}</div>`;
    }).join('') + '<div style="height:16px"></div>';
  },

  // Météo actuelle sur place (Open-Meteo, gratuit, sans clé).
  async weather() {
    const box = document.getElementById('wx');
    const p = this.v.position, s = this.steps[this.cur];
    const at = p && typeof p.lat === 'number' ? p : s && typeof s.lat === 'number' ? s : null;
    if (!box || !at) return;
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${at.lat}&longitude=${at.lon}&current=temperature_2m,weather_code`);
      const c = (await r.json()).current;
      const label = T().weather[c.weather_code] || '';
      box.innerHTML = `${esc(label.split(' ')[0])} ${Math.round(c.temperature_2m)}°<small>${esc(label.split(' ').slice(1).join(' '))}</small>`;
    } catch {}
  },
};

function haversine(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Plein écran : glisser d'une photo à l'autre.
const Zoom = {
  open(k) {
    const z = document.getElementById('zoom');
    const list = View.photos;
    z.innerHTML = `<div class="slides">${list.map((u) => `<div><img src="${esc(u)}" alt=""></div>`).join('')}</div>
      <button class="x" aria-label="Fermer">✕</button><div class="cnt"></div>`;
    z.style.display = 'block';
    const sl = z.querySelector('.slides'), cnt = z.querySelector('.cnt');
    const upd = () => (cnt.textContent = `${Math.round(sl.scrollLeft / sl.clientWidth) + 1} / ${list.length}`);
    sl.scrollLeft = k * sl.clientWidth;
    upd();
    sl.addEventListener('scroll', upd, { passive: true });
    z.querySelector('.x').onclick = () => { z.style.display = 'none'; z.innerHTML = ''; };
  },
};
