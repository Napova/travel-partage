// travel_app · Carte de la page de partage (Mapbox, noms dans la langue choisie).
// Une seule carte, déplacée entre l'onglet Carte et l'onglet Étapes.
const MAPBOX_TOKEN = 'pk.eyJ1IjoibmFwb3ZhIiwiYSI6ImNtd2k0bndtejA5bHgyeHNjdzh0bXJ4dXYifQ.bfeeqLuNdQBNKv20Egn5pg';
const MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

const TripMap = {
  map: null, el: null, pins: [], me: null, pts: [], ready: false, hi: -1, onPin: null,

  // Crée la carte (une fois) dans l'emplacement [slot].
  place(slot) {
    if (!window.mapboxgl) return;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.id = 'map';
    }
    slot.appendChild(this.el);
    if (!this.map) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      this.map = new mapboxgl.Map({ container: this.el, style: MAP_STYLE, center: [2, 46], zoom: 3,
        attributionControl: true, cooperativeGestures: false, dragRotate: false, pitchWithRotate: false });
      this.map.on('style.load', () => { this.localize(); this.ready = true; this.drawRoute(); });
    }
    requestAnimationFrame(() => this.map.resize());
  },

  // Remplace les noms des lieux par ceux de la langue choisie (s'ils existent).
  localize() {
    const swap = (e) => {
      if (Array.isArray(e)) {
        if (e[0] === 'get' && e.length === 2 && /^name(_[a-zA-Z-]+)?$/.test(e[1])) return ['coalesce', ['get', `name_${lang}`], ['get', 'name']];
        return e.map(swap);
      }
      if (typeof e === 'string' && /\{name(_[a-zA-Z-]+)?\}/.test(e)) return ['coalesce', ['get', `name_${lang}`], ['get', 'name']];
      return e;
    };
    for (const layer of this.map.getStyle().layers) {
      if (layer.type !== 'symbol') continue;
      const tf = this.map.getLayoutProperty(layer.id, 'text-field');
      if (!tf) continue;
      try { this.map.setLayoutProperty(layer.id, 'text-field', swap(tf)); } catch {}
    }
  },

  // Étapes (ordre chronologique), étape en cours et position en direct.
  show(steps, current, position) {
    if (!this.map) return;
    this.pins.forEach((p) => p.remove());
    this.me?.remove();
    this.pins = [];
    this.pts = [];
    steps.forEach((s, i) => {
      if (typeof s.lat !== 'number' || typeof s.lon !== 'number') { this.pins.push({ remove() {}, getElement: () => null }); return; }
      // Mapbox déplace l'élément extérieur ; l'animation reste sur l'intérieur.
      const el = document.createElement('div');
      const dot = document.createElement('div');
      dot.className = 'pin' + (i === current ? ' cur' : '');
      dot.textContent = i + 1;
      el.appendChild(dot);
      el.onclick = (ev) => { ev.stopPropagation(); this.onPin?.(i); };
      this.pins.push(new mapboxgl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(this.map));
      this.pts.push([s.lon, s.lat]);
    });
    this.setPosition(position);
    this.drawRoute();
    this.fit(position);
  },

  // Point « je suis ici » déplacé sans recadrer la carte.
  setPosition(position) {
    if (!this.map) return;
    this.me?.remove();
    this.me = null;
    if (!position || typeof position.lat !== 'number') return;
    const el = document.createElement('div');
    el.className = 'me';
    this.me = new mapboxgl.Marker({ element: el }).setLngLat([position.lon, position.lat]).addTo(this.map);
  },

  drawRoute() {
    if (!this.ready || !this.map) return;
    const data = { type: 'Feature', geometry: { type: 'LineString', coordinates: this.pts } };
    const src = this.map.getSource('route');
    if (src) { src.setData(data); return; }
    this.map.addSource('route', { type: 'geojson', data });
    this.map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#FF7A45', 'line-width': 3, 'line-dasharray': [0.5, 2.5] } });
  },

  fit(position) {
    const all = [...this.pts];
    if (position && typeof position.lat === 'number') all.push([position.lon, position.lat]);
    if (!all.length) return;
    if (all.length === 1) { this.map.jumpTo({ center: all[0], zoom: 9 }); return; }
    const b = all.reduce((bb, p) => bb.extend(p), new mapboxgl.LngLatBounds(all[0], all[0]));
    this.map.fitBounds(b, { padding: 40, maxZoom: 10, duration: 0 });
  },

  // Met en avant l'étape [i] (pastille agrandie) et la garde visible.
  highlight(i) {
    if (!this.map || i === this.hi) return;
    this.pins[this.hi]?.getElement()?.firstChild?.classList.remove('hi');
    this.hi = i;
    const el = this.pins[i]?.getElement()?.firstChild;
    if (!el) return;
    el.classList.add('hi');
    const ll = this.pins[i].getLngLat();
    if (!this.map.getBounds().contains(ll)) this.map.easeTo({ center: ll, duration: 600 });
  },

  focus(i) {
    const p = this.pins[i];
    if (!this.map || !p?.getLngLat) return;
    this.map.flyTo({ center: p.getLngLat(), zoom: Math.max(this.map.getZoom(), 9), duration: 900 });
  },
};
