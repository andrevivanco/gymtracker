// ============================================================
// GymTracker — Base de datos de ejercicios y configuración
// ============================================================

const DB_KEY = 'gymtracker_v1';

// Base de datos completa de ejercicios (para búsqueda y ejercicios custom)
const EXERCISE_LIBRARY = [
  // Pecho
  { id: 'press_inclinado', name: 'Press inclinado', muscle: 'pecho', function: 'amplitud' },
  { id: 'press_plano', name: 'Press plano', muscle: 'pecho', function: 'carga' },
  { id: 'press_declinado', name: 'Press declinado', muscle: 'pecho', function: 'carga' },
  { id: 'aperturas', name: 'Aperturas / fly', muscle: 'pecho', function: 'contracción' },
  { id: 'pullover', name: 'Pullover', muscle: 'pecho', function: 'amplitud' },
  // Tríceps
  { id: 'press_frances', name: 'Press francés', muscle: 'triceps', function: 'cabeza larga' },
  { id: 'extension_polea', name: 'Extensión en polea', muscle: 'triceps', function: 'contracción' },
  { id: 'fondos', name: 'Fondos / paralelas', muscle: 'triceps', function: 'compuesto' },
  { id: 'kickback', name: 'Kickback tríceps', muscle: 'triceps', function: 'aislado' },
  // Hombro
  { id: 'elev_laterales', name: 'Elevaciones laterales', muscle: 'hombro', function: 'lateral' },
  { id: 'elev_frontales', name: 'Elevaciones frontales', muscle: 'hombro', function: 'frontal' },
  { id: 'press_militar', name: 'Press militar', muscle: 'hombro', function: 'press' },
  { id: 'vuelos', name: 'Vuelos / pájaros', muscle: 'hombro', function: 'posterior' },
  { id: 'face_pull', name: 'Face pull', muscle: 'hombro', function: 'posterior' },
  // Espalda
  { id: 'jalon', name: 'Jalón al pecho', muscle: 'espalda', function: 'amplitud' },
  { id: 'remo_bilateral', name: 'Remo bilateral', muscle: 'espalda', function: 'densidad' },
  { id: 'remo_unilateral', name: 'Remo unilateral', muscle: 'espalda', function: 'unilateral' },
  { id: 'dominadas', name: 'Dominadas', muscle: 'espalda', function: 'amplitud' },
  { id: 'remo_maquina', name: 'Remo en máquina', muscle: 'espalda', function: 'densidad' },
  // Bíceps
  { id: 'curl_martillo', name: 'Curl martillo', muscle: 'biceps', function: 'braquial' },
  { id: 'curl_predicador', name: 'Curl predicador', muscle: 'biceps', function: 'cabeza larga' },
  { id: 'curl_pie', name: 'Curl bíceps de pie', muscle: 'biceps', function: 'cabeza corta' },
  { id: 'curl_concentrado', name: 'Curl concentrado', muscle: 'biceps', function: 'cabeza larga' },
  // Abdomen
  { id: 'crunch', name: 'Crunch con carga', muscle: 'abdomen', function: 'dinámico' },
  { id: 'abd_inclinado', name: 'Abdominal inclinado en banco', muscle: 'abdomen', function: 'dinámico' },
  { id: 'elevacion_piernas', name: 'Elevación de piernas', muscle: 'abdomen', function: 'dinámico' },
  { id: 'plancha', name: 'Plancha', muscle: 'abdomen', function: 'isométrico', isIsometric: true },
  { id: 'plancha_lateral', name: 'Plancha lateral', muscle: 'abdomen', function: 'isométrico', isIsometric: true },
  { id: 'russian_twist', name: 'Russian twist', muscle: 'abdomen', function: 'rotacional' },
  { id: 'crunch_maquina', name: 'Crunch en máquina', muscle: 'abdomen', function: 'dinámico' },
  // Pierna
  { id: 'prensa', name: 'Prensa de piernas', muscle: 'pierna', function: 'compuesto' },
  { id: 'sentadilla', name: 'Sentadilla', muscle: 'pierna', function: 'compuesto' },
  { id: 'extension_cuad', name: 'Extensión cuádriceps', muscle: 'pierna', function: 'aislado' },
  { id: 'peso_muerto_rumano', name: 'Peso muerto rumano', muscle: 'pierna', function: 'cadena post.' },
  { id: 'curl_femoral', name: 'Curl femoral', muscle: 'pierna', function: 'aislado' },
  { id: 'zancadas', name: 'Zancadas', muscle: 'pierna', function: 'compuesto' },
  // Glúteo
  { id: 'hip_thrust', name: 'Hip thrust', muscle: 'gluteo', function: 'compuesto' },
  { id: 'abductores', name: 'Abductores en máquina', muscle: 'gluteo', function: 'abductor' },
  { id: 'patada_gluteo', name: 'Patada de glúteo', muscle: 'gluteo', function: 'aislado' },
];

const EXERCISES = {
  pecho: {
    label: 'Pecho',
    color: '#534AB7',
    day: 'lunes',
    type: 'fixed_plus_finisher',
    slots: [
      {
        id: 'press_inclinado',
        name: 'Press inclinado',
        focus: 'Cabeza clavicular · apertura + empuje',
        function: 'amplitud',
        sets: 4, reps: '10–12',
        fixed: true,
        variants: [
          { id: 'mancuernas', label: 'Mancuernas', fav: true },
          { id: 'barra', label: 'Barra' }
        ]
      },
      {
        id: 'press_plano',
        name: 'Press plano',
        focus: 'Pectoral mayor · carga máxima',
        function: 'carga',
        sets: 3, reps: '8–10',
        fixed: true,
        variants: [
          { id: 'barra', label: 'Barra', fav: true },
          { id: 'mancuernas', label: 'Mancuernas' },
          { id: 'maquina', label: 'Máquina press sentado' }
        ]
      },
      {
        id: 'aperturas',
        name: 'Aperturas / fly',
        focus: 'Contracción y estiramiento',
        function: 'contracción',
        sets: 3, reps: '12–15',
        fixed: false,
        variants: [
          { id: 'maquina_fly', label: 'Máquina fly', fav: true },
          { id: 'polea_alta', label: 'Polea alta' },
          { id: 'mancuernas_plano', label: 'Mancuernas plano' }
        ]
      }
    ]
  },
  triceps: {
    label: 'Tríceps',
    color: '#3C3489',
    day: 'lunes',
    slots: [
      {
        id: 'press_frances',
        name: 'Press francés / rompe cráneo',
        focus: 'Cabeza larga en estiramiento',
        function: 'cabeza larga',
        sets: 3, reps: '10–12',
        fixed: true,
        variants: [
          { id: 'barra_z', label: 'Barra Z', fav: true },
          { id: 'mancuernas', label: 'Mancuernas' }
        ]
      },
      {
        id: 'extension_polea',
        name: 'Extensión en polea',
        focus: 'Cabeza medial y lateral · contracción',
        function: 'contracción',
        sets: 3, reps: '12–15',
        fixed: false,
        variants: [
          { id: 'cuerda', label: 'Cuerda', fav: true },
          { id: 'barra_recta', label: 'Barra recta' },
          { id: 'patada', label: 'Patada en polea' }
        ]
      },
      {
        id: 'fondos',
        name: 'Fondos en máquina / paralelas',
        focus: 'Carga compuesta · cierre de sesión',
        function: 'compuesto',
        sets: 3, reps: '10–12',
        fixed: false,
        variants: [
          { id: 'maquina', label: 'Máquina fondos', fav: true },
          { id: 'paralelas', label: 'Paralelas peso corporal', bodyweight: true }
        ]
      }
    ]
  },
  hombro_lunes: {
    label: 'Hombro',
    color: '#0F6E56',
    day: 'lunes',
    slots: [
      {
        id: 'elev_laterales_l',
        name: 'Elevaciones laterales',
        focus: 'Deltoides medio · recomendado siempre',
        function: 'lateral',
        sets: 4, reps: '15–20',
        fixed: true,
        variants: [{ id: 'mancuernas', label: 'Mancuernas', fav: true }]
      }
    ]
  },
  espalda: {
    label: 'Espalda',
    color: '#185FA5',
    day: 'miercoles',
    slots: [
      {
        id: 'jalon',
        name: 'Jalón al pecho',
        focus: 'Tracción vertical · dorsal ancho · amplitud',
        function: 'amplitud',
        sets: 4, reps: '10–12',
        fixed: true,
        variants: [
          { id: 'polea_abierta', label: 'Polea agarre abierto', fav: true },
          { id: 'maquina_jalon', label: 'Máquina jalón' }
        ]
      },
      {
        id: 'remo_bilateral',
        name: 'Remo bilateral',
        focus: 'Tracción horizontal · densidad · romboides',
        function: 'densidad',
        sets: 4, reps: '8–10',
        fixed: true,
        variants: [
          { id: 'barra', label: 'Barra', fav: true },
          { id: 'polea_sentado', label: 'Polea sentado' }
        ]
      },
      {
        id: 'remo_unilateral',
        name: 'Remo unilateral',
        focus: 'Finalizador · corrige asimetrías',
        function: 'unilateral',
        sets: 4, reps: '12–15',
        fixed: false,
        unilateral: true,
        variants: [
          { id: 'polea', label: 'Polea unilateral', fav: true },
          { id: 'mancuerna', label: 'Mancuerna' }
        ]
      }
    ]
  },
  biceps: {
    label: 'Bíceps',
    color: '#BA7517',
    day: 'miercoles',
    slots: [
      {
        id: 'curl_martillo',
        name: 'Curl martillo',
        focus: 'Braquial + braquiorradial · grosor',
        function: 'braquial',
        sets: 4, reps: '10–12',
        fixed: true,
        variants: [{ id: 'mancuernas', label: 'Mancuernas', fav: true }]
      },
      {
        id: 'curl_predicador',
        name: 'Curl predicador / concentrado',
        focus: 'Cabeza larga en estiramiento · sin impulso',
        function: 'cabeza larga',
        sets: 4, reps: '10–12',
        fixed: false,
        variants: [
          { id: 'soporte', label: 'Soporte predicador', fav: true },
          { id: 'maquina', label: 'Máquina curl' }
        ]
      },
      {
        id: 'curl_pie',
        name: 'Curl bíceps de pie',
        focus: 'Cabeza corta · carga libre',
        function: 'cabeza corta',
        sets: 4, reps: '10–12',
        fixed: false,
        variants: [
          { id: 'barra_z', label: 'Barra Z de pie', fav: true },
          { id: 'polea_barra', label: 'Polea con barra' },
          { id: 'mancuernas', label: 'Mancuernas unilateral' },
          { id: 'polea_uni', label: 'Polea unilateral' }
        ]
      }
    ]
  },
  hombro_miercoles: {
    label: 'Hombro',
    color: '#0F6E56',
    day: 'miercoles',
    slots: [
      {
        id: 'face_pull',
        name: 'Face pull',
        focus: 'Deltoides posterior + manguito rotador',
        function: 'posterior',
        sets: 4, reps: '15–20',
        fixed: true,
        variants: [{ id: 'polea_cuerda', label: 'Polea con cuerda', fav: true }]
      }
    ]
  },
  abdomen: {
    label: 'Abdomen',
    color: '#993C1D',
    day: 'viernes',
    slots: [
      {
        id: 'abd_inclinado',
        name: 'Abdominal inclinado en banco',
        focus: 'Recto abdominal · rango completo',
        function: 'dinámico',
        sets: 4, reps: '12–15',
        fixed: true,
        variants: [
          { id: 'banco_inclinado', label: 'Banco inclinado', fav: true },
          { id: 'maquina', label: 'Máquina crunch' },
          { id: 'polea', label: 'Polea arrodillado' }
        ]
      },
      {
        id: 'elevacion_piernas',
        name: 'Elevación de piernas',
        focus: 'Recto abdominal inferior',
        function: 'dinámico',
        sets: 4, reps: '10–12',
        fixed: false,
        bodyweight: true,
        variants: [
          { id: 'colgado', label: 'Colgado en barra', fav: true },
          { id: 'banco', label: 'En banco plano' }
        ]
      },
      {
        id: 'plancha',
        name: 'Plancha / oblicuos',
        focus: 'Core profundo + oblicuos',
        function: 'isométrico',
        sets: 3, reps: '35–45 seg',
        isIsometric: true,
        fixed: false,
        bodyweight: true,
        variants: [
          { id: 'frontal', label: 'Plancha frontal', fav: true },
          { id: 'lateral', label: 'Plancha lateral' },
          { id: 'russian', label: 'Russian twist' }
        ]
      }
    ]
  },
  pierna: {
    label: 'Pierna',
    color: '#3B6D11',
    day: 'viernes',
    slots: [
      {
        id: 'prensa',
        name: 'Prensa de piernas',
        focus: 'Cuádriceps · carga máxima',
        function: 'compuesto',
        sets: 4, reps: '10–12',
        fixed: true,
        variants: [{ id: 'maquina', label: 'Máquina prensa', fav: true }]
      },
      {
        id: 'extension_cuad',
        name: 'Extensión cuádriceps',
        focus: 'Aislado · rango completo de rodilla',
        function: 'aislado',
        sets: 4, reps: '12–15',
        fixed: false,
        variants: [{ id: 'maquina', label: 'Máquina extensión', fav: true }]
      }
    ]
  },
  gluteo: {
    label: 'Glúteo',
    color: '#0F6E56',
    day: 'viernes',
    slots: [
      {
        id: 'hip_thrust',
        name: 'Hip thrust / Abductores',
        focus: 'Glúteo mayor · más efectivo',
        function: 'compuesto',
        sets: 4, reps: '10–12',
        fixed: false,
        variants: [
          { id: 'barra', label: 'Hip thrust con barra', fav: true },
          { id: 'maquina', label: 'Máquina hip thrust' },
          { id: 'abductores', label: 'Abductores en máquina' }
        ]
      },
      {
        id: 'peso_muerto_rumano',
        name: 'Peso muerto rumano / Curl isquio',
        focus: 'Isquiotibiales · cadena posterior',
        function: 'cadena post.',
        sets: 4, reps: '10–12',
        fixed: false,
        variants: [
          { id: 'peso_rumano', label: 'Peso muerto rumano', fav: true },
          { id: 'curl_tumbado', label: 'Curl isquio tumbado' },
          { id: 'curl_sentado', label: 'Curl isquio sentado' }
        ]
      }
    ]
  },
  cardio: {
    label: 'Cardio',
    color: '#854F0B',
    day: 'all',
    slots: [
      {
        id: 'trote',
        name: 'Cardio final',
        focus: 'Cardio baja intensidad · 60–65% FCmax',
        function: 'cardio',
        sets: 1, reps: '10 min',
        fixed: true,
        isCardio: true,
        defaultMinutes: 10,
        variants: [
          { id: 'cinta', label: 'Cinta', fav: true },
          { id: 'bicicleta', label: 'Bicicleta estática' },
          { id: 'eliptica', label: 'Elíptica' }
        ]
      }
    ]
  }
};

const DAY_CONFIG = {
  lunes: {
    label: 'Lunes',
    title: 'Pecho · Tríceps · Hombro',
    groups: ['pecho', 'triceps', 'hombro_lunes', 'cardio'],
    color: '#534AB7',
    estimatedMin: 100
  },
  miercoles: {
    label: 'Miércoles',
    title: 'Espalda · Bíceps · Hombro',
    groups: ['espalda', 'biceps', 'hombro_miercoles', 'cardio'],
    color: '#185FA5',
    estimatedMin: 95
  },
  viernes: {
    label: 'Viernes',
    title: 'Abdomen · Pierna · Glúteo',
    groups: ['abdomen', 'pierna', 'gluteo', 'cardio'],
    color: '#3B6D11',
    estimatedMin: 90
  }
};

// ============================================================
// Storage — con auto-save periódico para evitar pérdida de datos
// ============================================================
const Storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(DB_KEY + '_' + key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(DB_KEY + '_' + key, JSON.stringify(value)); } catch(e) {
      console.error('Storage error:', e);
    }
  },
  getDB() {
    return this.get('db', {
      sessions: [],
      bodyWeight: [],
      bodyMeasures: [],
      settings: { units: 'kg', restSeconds: 90 },
      currentWeek: 1,
      currentCycle: 1,
      exercisePrefs: {}
    });
  },
  saveDB(db) { this.set('db', db); }
};

// ============================================================
// Helpers
// ============================================================
function getFavVariant(exercise) {
  return exercise.variants.find(v => v.fav) || exercise.variants[0];
}

function getTodayDay() {
  const d = new Date().getDay();
  if (d === 1) return 'lunes';
  if (d === 3) return 'miercoles';
  if (d === 5) return 'viernes';
  return null;
}

function getNextDay() {
  const d = new Date().getDay();
  if (d < 1) return 'lunes';
  if (d < 3) return 'miercoles';
  if (d < 5) return 'viernes';
  return 'lunes';
}

function getUpcomingDay() {
  return getTodayDay() || getNextDay();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function estimateOneRM(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

function getLastSessionData(db, exerciseId, variantId = null) {
  const sessions = [...db.sessions].reverse();
  for (const session of sessions) {
    for (const ex of (session.exercises || [])) {
      if (ex.exerciseId === exerciseId) {
        const sets = ex.sets || [];
        const best = sets.reduce((b, s) => (!b || s.weight > b.weight) ? s : b, null);
        if (best) return { weight: best.weight, reps: best.reps, variant: ex.variant };
      }
    }
  }
  return null;
}

function getWeeklyVolume(db, muscleGroup) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  let total = 0;
  for (const session of db.sessions) {
    if (new Date(session.date) >= weekStart) {
      for (const ex of (session.exercises || [])) {
        if (ex.muscleGroup === muscleGroup) {
          total += (ex.sets || []).filter(s => s.completed).length;
        }
      }
    }
  }
  return total;
}

function getStreak(db) {
  if (!db.sessions.length) return 0;
  let streak = 0;
  const sessionDates = db.sessions.map(s => s.date.split('T')[0]);
  const today = new Date();
  let check = new Date(today);
  check.setDate(check.getDate() - 1);
  let weeks = 0;
  while (weeks < 52) {
    const dow = check.getDay();
    if ([1, 3, 5].includes(dow)) {
      const dateStr = check.toISOString().split('T')[0];
      if (sessionDates.includes(dateStr)) {
        if (dow === 5) streak++;
      } else {
        if (dow === 5 && new Date(dateStr) < today) break;
      }
    }
    check.setDate(check.getDate() - 1);
    if (check.getDay() === 6) weeks++;
    if (weeks > 52) break;
  }
  return streak;
}

function getThisWeekDone(db) {
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  const done = { lunes: false, miercoles: false, viernes: false };
  for (const s of db.sessions) {
    const d = new Date(s.date);
    if (d >= weekStart) done[s.day] = true;
  }
  return done;
}

window.GymData = {
  EXERCISES, EXERCISE_LIBRARY, DAY_CONFIG, Storage,
  getFavVariant, getTodayDay, getNextDay, getUpcomingDay,
  formatTime, formatDate, estimateOneRM,
  getLastSessionData, getWeeklyVolume, getStreak, getThisWeekDone
};
