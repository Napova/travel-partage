// travel_app · Textes de la page de partage, par langue.
// Pour ajouter une langue : copier le bloc « fr », traduire, l'ajouter à LANGS.
const LANGS = [{ code: 'fr', label: '🇫🇷 Français', locale: 'fr-FR' }];

const I18N = {
  fr: {
    loading: 'Chargement…',
    sharesTrip: (by) => `${by} vous partage son voyage`,
    firstName: 'Votre prénom',
    firstNameHint: 'Ex. : Marie',
    language: 'Langue',
    code: 'Code à 4 chiffres',
    codeWarn: 'Attention : après 3 codes incorrects, le lien est bloqué 15 minutes, puis 1 heure.',
    see: 'Voir le voyage',
    nameNote: (by) => `Votre prénom n'est montré qu'à ${by}, avec vos réactions.`,
    needName: 'Indiquez votre prénom.',
    needCode: 'Saisissez les 4 chiffres du code.',
    badCode: (n, next) => `Code incorrect. Encore ${n} essai${n > 1 ? 's' : ''} avant un blocage de ${next === 60 ? '1 heure' : '15 minutes'}.`,
    lockedTitle: 'Lien bloqué',
    lockedText: (min, at) => `Trop de codes incorrects. Réessayez dans ${min >= 60 ? '1 heure' : min + ' minute' + (min > 1 ? 's' : '')}${at ? ' (à ' + at + ')' : ''}.`,
    goneTitle: "Ce lien n'est plus valable",
    goneText: "Il a expiré ou le voyageur l'a désactivé.",
    incompleteTitle: 'Lien incomplet',
    incompleteText: 'Vérifiez que vous avez bien copié tout le lien.',
    offlineTitle: 'Pas de connexion',
    offlineText: 'Vérifiez votre connexion internet puis rechargez la page.',
    errorTitle: 'Voyage indisponible',
    errorText: 'Réessayez un peu plus tard.',
    by: (name) => `par ${name}`,
    tabs: ['Carte', 'Étapes', 'Photos'],
    live: 'En direct',
    near: (city) => `près de ${city}`,
    steps: 'étapes', km: 'km', photos: 'photos', countries: 'pays',
    dayOf: (d, n) => `Jour ${d} sur ${n}`,
    before: (n) => `Départ dans ${n} jour${n > 1 ? 's' : ''}`,
    done: 'Voyage terminé',
    nights: (n) => `${n} nuit${n > 1 ? 's' : ''}`,
    now: 'en ce moment',
    more: 'Lire la suite',
    less: 'Réduire',
    noSteps: 'Aucune étape pour le moment.',
    noPhotos: 'Aucune photo pour le moment.',
    validUntil: (d) => `Lien privé · valable jusqu'au ${d}`,
    discover: 'Découvrir travel_app',
    ago: (m) => (m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : null),
    weather: {
      0: '☀️ ciel dégagé', 1: '🌤️ peu nuageux', 2: '⛅ nuageux', 3: '☁️ couvert', 45: '🌫️ brouillard', 48: '🌫️ brouillard',
      51: '🌦️ bruine', 53: '🌦️ bruine', 55: '🌦️ bruine', 61: '🌧️ pluie faible', 63: '🌧️ pluie', 65: '🌧️ forte pluie',
      66: '🌧️ pluie verglaçante', 67: '🌧️ pluie verglaçante', 71: '🌨️ neige faible', 73: '🌨️ neige', 75: '❄️ forte neige',
      77: '🌨️ grésil', 80: '🌦️ averses', 81: '🌧️ averses', 82: '⛈️ fortes averses', 85: '🌨️ averses de neige',
      86: '❄️ averses de neige', 95: '⛈️ orage', 96: '⛈️ orage et grêle', 99: '⛈️ orage et grêle',
    },
  },
};

// Langue choisie (retenue par le navigateur) et fonctions d'accès.
let lang = 'fr';
try { const l = localStorage.getItem('tp_lang'); if (I18N[l]) lang = l; } catch {}
const T = () => I18N[lang];
const locale = () => (LANGS.find((l) => l.code === lang) || LANGS[0]).locale;
