// ============================================================
// Session Screen — Sesión activa
// ============================================================

let activeSession = null;
let restInterval = null;
let sessionInterval = null;
let restSeconds = 0;
let sessionSeconds = 0;
let restTotalSeconds = 90;

// Auto-save cada 30s para evitar pérdida de datos (#11)
let autoSaveInterval = null;

function startSession(day) {
  const { Storage, DAY_CONFIG, EXERCISES, getFavVariant, getLastSessionData } = window.GymData;
  const db = Storage.getDB();
  const config = DAY_CONFIG[day];

  const exercises = [];
  for (const groupKey of config.groups) {
    const group = EXERCISES[groupKey];
    if (!group) continue;
    for (const slot of group.slots) {
      const fav = getFavVariant(slot);
      const lastData = getLastSessionData(db, slot.id);
      const sets = [];
      const numSets = slot.sets || 4;
      for (let i = 0; i < numSets; i++) {
        if (slot.isIsometric) {
          // Ejercicios isométricos: guardar tiempo en segundos (#8)
          sets.push({
            setNum: i + 1,
            weight: 0,
            seconds: 0,   // tiempo mantenido
            completed: false,
            isIsometric: true
          });
        } else {
          sets.push({
            setNum: i + 1,
            weight: lastData ? lastData.weight : 0,
            reps: 0,
            repsLeft: slot.unilateral ? 0 : null,
            completed: false
          });
        }
      }
      exercises.push({
        exerciseId: slot.id,
        exerciseName: slot.name,
        muscleGroup: groupKey,
        focus: slot.focus,
        function: slot.function,
        unilateral: !!slot.unilateral,
        isCardio: !!slot.isCardio,
        isIsometric: !!slot.isIsometric,
        bodyweight: !!slot.bodyweight,
        cardioMinutes: slot.defaultMinutes || 10,
        variant: fav.id,
        variantLabel: fav.label,
        variants: slot.variants,
        sets,
        lastData,
        repsTarget: slot.reps,
        fixed: slot.fixed
      });
    }
  }

  activeSession = {
    day,
    dayLabel: config.label,
    title: config.title,
    date: new Date().toISOString(),
    exercises,
    currentExIndex: 0,
    currentSetIndex: 0,
    startTime: Date.now(),
    notes: ''
  };

  sessionSeconds = 0;
  startSessionTimer();
  startAutoSave();
  renderSession();
  navigateTo('session');
}

// Auto-save para evitar pérdida de datos (#11)
function startAutoSave() {
  stopAutoSave();
  autoSaveInterval = setInterval(() => {
    if (activeSession) {
      window.GymData.Storage.set('active_session_backup', {
        session: activeSession,
        sessionSeconds,
        restSeconds,
        savedAt: Date.now()
      });
    }
  }, 15000); // cada 15 segundos
}

function stopAutoSave() {
  if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
  // Limpiar backup al terminar
  window.GymData.Storage.set('active_session_backup', null);
}

function restoreSessionIfExists() {
  const backup = window.GymData.Storage.get('active_session_backup');
  if (!backup || !backup.session) return false;
  const age = Date.now() - (backup.savedAt || 0);
  if (age > 8 * 60 * 60 * 1000) return false; // Ignorar si >8h
  
  // Preguntar al usuario si quiere restaurar
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px';
  const mins = Math.round((Date.now() - new Date(backup.session.date).getTime()) / 60000);
  modal.innerHTML = `
    <div style="background:var(--bg);border-radius:20px;padding:24px 20px;width:100%;max-width:380px">
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Sesión en progreso</div>
      <div style="font-size:14px;color:var(--text3);margin-bottom:20px">Hay una sesión de ${backup.session.title} que empezó hace ~${mins} min. ¿Quieres continuar?</div>
      <button class="btn btn-primary" onclick="doRestoreSession()">Continuar sesión</button>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="discardBackup()">Descartar y empezar nuevo</button>
    </div>`;
  document.body.appendChild(modal);
  window._pendingBackup = backup;
  return true;
}

window.doRestoreSession = function() {
  const backup = window._pendingBackup;
  if (!backup) return;
  activeSession = backup.session;
  sessionSeconds = backup.sessionSeconds || 0;
  restSeconds = backup.restSeconds || 0;
  startSessionTimer();
  startAutoSave();
  if (restSeconds > 0) startRest(restSeconds, true);
  document.querySelector('[style*="z-index:999"]')?.remove();
  renderSession();
  navigateTo('session');
};

window.discardBackup = function() {
  window.GymData.Storage.set('active_session_backup', null);
  document.querySelector('[style*="z-index:999"]')?.remove();
};

function renderSession() {
  if (!activeSession) {
    document.getElementById('screen-session').innerHTML = renderNoSession();
    return;
  }
  const ex = activeSession.exercises[activeSession.currentExIndex];
  const totalEx = activeSession.exercises.length;
  const doneEx = activeSession.exercises.filter((e, i) => i < activeSession.currentExIndex).length;
  const progress = Math.round((doneEx / totalEx) * 100);
  const db = window.GymData.Storage.getDB();

  // Navegación entre ejercicios (#12)
  const canGoPrev = activeSession.currentExIndex > 0;
  const canGoNext = activeSession.currentExIndex < activeSession.exercises.length - 1;

  document.getElementById('screen-session').innerHTML = `
    <!-- Top bar -->
    <div style="position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px 10px">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${activeSession.dayLabel} · sem ${db.currentWeek}</div>
          <div style="font-size:18px;font-weight:600;color:var(--text)">${activeSession.title}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-family:var(--font-mono);font-size:22px;font-weight:500;color:var(--text)" id="session-clock">${window.GymData.formatTime(sessionSeconds)}</div>
          <div onclick="confirmFinishSession()" style="width:34px;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text)" stroke-width="1.5"><polyline points="12,4 4,4 4,12"/><polyline points="4,4 13,13"/></svg>
          </div>
        </div>
      </div>
      <!-- Progress -->
      <div style="display:flex;align-items:center;gap:10px;padding:0 20px 10px">
        <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${progress}%"></div></div>
        <span style="font-size:11px;color:var(--text3);white-space:nowrap">${doneEx + 1} / ${totalEx}</span>
      </div>
    </div>

    <!-- Exercise card -->
    <div style="padding:14px 20px 0">
      <div class="card">
        <!-- Ex header -->
        <div style="padding:14px 16px 10px">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">
            ${getGroupLabel(ex.muscleGroup)} · ${ex.function}
          </div>
          <div style="font-size:21px;font-weight:600;color:var(--text);margin-bottom:8px">${ex.exerciseName}</div>
          <!-- Variantes + ejercicio custom (#2) -->
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:11px;color:var(--text3)">Variante:</span>
            <div style="display:flex;gap:5px;flex-wrap:wrap" id="variant-row">
              ${ex.variants.map(v => `
                <span onclick="changeVariant('${v.id}','${v.label.replace(/'/g,"\\'")}', this)" class="v-chip${ex.variant === v.id ? ' active' : ''}">${v.label}</span>
              `).join('')}
              <span onclick="openCustomExercise()" class="v-chip" style="border-style:dashed;color:var(--text3)">+ otro</span>
            </div>
          </div>
        </div>

        <!-- Series -->
        ${ex.isCardio ? renderCardioEx(ex) : ex.isIsometric ? renderIsometricEx(ex) : renderSeriesTable(ex)}

        <!-- Rest timer -->
        <div style="padding:10px 14px 6px;border-top:1px solid var(--border)">
          <div class="rest-widget" id="rest-widget">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text2)" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><polyline points="8,5 8,8 10,10"/></svg>
            <span class="rest-label">Descanso</span>
            <span class="rest-time" id="rest-clock">${window.GymData.formatTime(restSeconds)}</span>
            <span class="rest-skip" onclick="skipRest()">saltar</span>
          </div>
          <div class="progress-bar" style="margin:6px 0 2px"><div class="progress-fill" id="rest-fill" style="width:${restSeconds > 0 ? Math.round((restSeconds/restTotalSeconds)*100) : 0}%;background:var(--accent)"></div></div>
        </div>
      </div>

      <!-- Prev hint -->
      ${ex.lastData ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:9px 14px;background:var(--bg2);border-radius:var(--radius-md)">
        <div>
          <div style="font-size:11px;color:var(--text3)">Semana pasada · mejor serie</div>
          <div style="font-size:13px;font-weight:500;color:var(--text);margin-top:1px">${ex.lastData.weight > 0 ? ex.lastData.weight + ' kg · ' : ''}${ex.lastData.reps} reps${ex.lastData.weight > 0 && ex.lastData.reps > 0 ? ' · 1RM est. ' + window.GymData.estimateOneRM(ex.lastData.weight, ex.lastData.reps) + ' kg' : ''}</div>
        </div>
      </div>` : ''}

      <!-- Volume chips -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">
        ${renderVolumeChips(ex)}
      </div>

      <!-- Navegación entre ejercicios (#12) -->
      <div style="display:flex;gap:8px;margin-top:10px">
        ${canGoPrev ? `
        <button class="btn btn-secondary" style="flex:1;font-size:13px" onclick="prevExercise()">
          ← ${activeSession.exercises[activeSession.currentExIndex - 1].exerciseName.split(' ').slice(0,2).join(' ')}
        </button>` : '<div style="flex:1"></div>'}
        ${canGoNext ? `
        <button class="btn btn-secondary" style="flex:1;font-size:13px" onclick="nextExercise()">
          ${activeSession.exercises[activeSession.currentExIndex + 1].exerciseName.split(' ').slice(0,2).join(' ')} →
        </button>` : `
        <button class="btn btn-primary" style="flex:1" onclick="confirmFinishSession()">Finalizar</button>`}
      </div>
    </div>
  `;
}

function renderSeriesTable(ex) {
  const isUni = ex.unilateral;
  const isBodyweight = ex.bodyweight;
  return `
    <table class="series-table" style="width:100%">
      <thead>
        <tr>
          <th class="series-th" style="width:32px">N°</th>
          <th class="series-th" style="text-align:left;padding-left:14px">Sem. anterior</th>
          ${!isBodyweight ? `<th class="series-th" style="width:60px">kg</th>` : ''}
          ${isUni ? `
            <th class="series-th" style="width:52px">Rep D</th>
            <th class="series-th" style="width:52px">Rep I</th>
          ` : `
            <th class="series-th" style="width:56px">Reps</th>
          `}
          <th class="series-th" style="width:36px"></th>
        </tr>
      </thead>
      <tbody>
        ${ex.sets.map((set, si) => {
          const isActive = si === activeSession.currentSetIndex && !set.completed;
          const isDone = set.completed;
          const prevW = ex.lastData ? ex.lastData.weight : '—';
          const prevR = ex.lastData ? ex.lastData.reps : '—';
          const warnLeft = isUni && set.repsLeft !== null && set.repsLeft > 0 && set.reps > 0 && Math.abs(set.reps - set.repsLeft) > 1;
          return `
          <tr class="series-tr ${isDone ? 'done-row' : isActive ? 'active-row' : ''}">
            <td class="series-td"><span class="series-num">${si + 1}</span></td>
            <td class="series-td" style="text-align:left;padding-left:14px">
              <span class="series-prev">${isBodyweight ? `${prevR !== '—' ? prevR + ' reps' : '— reps'}` : `${prevW} kg · ${prevR} reps`}</span>
            </td>
            ${!isBodyweight ? `
            <td class="series-td">
              <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}"
                value="${set.weight || ''}" placeholder="kg" min="0" step="0.5"
                style="width:54px;font-size:16px"
                ${isDone ? 'readonly' : ''}
                oninput="updateSetWeight(${si}, this.value)">
            </td>` : ''}
            ${isUni ? `
              <td class="series-td">
                <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}"
                  value="${set.reps || ''}" placeholder="—" min="0"
                  style="width:46px;font-size:16px"
                  ${isDone ? 'readonly' : ''}
                  oninput="updateSetReps(${si}, this.value, 'right')">
              </td>
              <td class="series-td">
                <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}${warnLeft ? '' : ''}"
                  value="${set.repsLeft || ''}" placeholder="—" min="0"
                  style="width:46px;font-size:16px${warnLeft ? ';border-color:var(--amber)' : ''}"
                  ${isDone ? 'readonly' : ''}
                  oninput="updateSetReps(${si}, this.value, 'left')">
              </td>
            ` : `
              <td class="series-td">
                <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}"
                  value="${set.reps || ''}" placeholder="—" min="0"
                  style="width:50px;font-size:16px"
                  ${isDone ? 'readonly' : ''}
                  oninput="updateSetReps(${si}, this.value)">
              </td>
            `}
            <td class="series-td">
              <div class="check-btn${isDone ? ' done' : ''}" onclick="completeSet(${si})">
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2,6 5,9 10,3"/></svg>
              </div>
            </td>
          </tr>
          ${warnLeft ? `
          <tr><td colspan="${isBodyweight ? (isUni ? 4 : 3) : (isUni ? 5 : 4)}" style="padding:4px 14px 6px;background:var(--amber-bg)">
            <span style="font-size:11px;color:var(--amber)">⚠ Diferencia entre lados — monitorear</span>
          </td></tr>` : ''}`;
        }).join('')}
      </tbody>
    </table>`;
}

// Ejercicios isométricos — timer por serie (#8)
function renderIsometricEx(ex) {
  return `
    <div style="padding:12px 14px;border-top:1px solid var(--border)">
      ${ex.sets.map((set, si) => {
        const isActive = si === activeSession.currentSetIndex && !set.completed;
        const isDone = set.completed;
        const seconds = set.seconds || 0;
        return `
        <div class="series-tr ${isDone ? 'done-row' : isActive ? 'active-row' : ''}" 
             style="display:flex;align-items:center;padding:10px 2px;border-radius:8px;margin-bottom:4px">
          <span class="series-num" style="margin-right:12px">${si + 1}</span>
          <div style="flex:1">
            ${isActive ? `
            <div style="display:flex;align-items:center;gap:12px">
              <div id="iso-timer-display" style="font-family:var(--font-mono);font-size:32px;font-weight:600;color:var(--text)">${formatIsometricTime(seconds)}</div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <button class="btn btn-primary" style="padding:6px 16px;font-size:13px" id="iso-start-btn" onclick="toggleIsometricTimer(${si})">
                  ${window._isoTimerRunning ? '⏹ Stop' : '▶ Start'}
                </button>
              </div>
            </div>` : `
            <div style="font-family:var(--font-mono);font-size:20px;color:${isDone ? 'var(--green)' : 'var(--text3)'}">
              ${isDone ? '✓ ' + formatIsometricTime(set.seconds || 0) : '—'}
            </div>`}
          </div>
          ${!isActive ? `
          <div class="check-btn${isDone ? ' done' : ''}" onclick="completeSet(${si})">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2,6 5,9 10,3"/></svg>
          </div>` : `
          <div class="check-btn" onclick="stopAndCompleteIso(${si})" style="background:var(--green);border-color:var(--green)">
            <svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2"><polyline points="2,6 5,9 10,3"/></svg>
          </div>`}
        </div>`;
      }).join('')}
    </div>`;
}

let _isoTimerInterval = null;
window._isoTimerRunning = false;

function formatIsometricTime(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

window.toggleIsometricTimer = function(si) {
  if (window._isoTimerRunning) {
    clearInterval(_isoTimerInterval);
    _isoTimerInterval = null;
    window._isoTimerRunning = false;
    const btn = document.getElementById('iso-start-btn');
    if (btn) btn.textContent = '▶ Start';
  } else {
    window._isoTimerRunning = true;
    const btn = document.getElementById('iso-start-btn');
    if (btn) btn.textContent = '⏹ Stop';
    _isoTimerInterval = setInterval(() => {
      const ex = activeSession.exercises[activeSession.currentExIndex];
      if (!ex || !ex.sets[si]) return;
      ex.sets[si].seconds = (ex.sets[si].seconds || 0) + 1;
      const display = document.getElementById('iso-timer-display');
      if (display) display.textContent = formatIsometricTime(ex.sets[si].seconds);
    }, 1000);
  }
};

window.stopAndCompleteIso = function(si) {
  if (_isoTimerInterval) { clearInterval(_isoTimerInterval); _isoTimerInterval = null; }
  window._isoTimerRunning = false;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  if (!ex) return;
  ex.sets[si].completed = true;
  const next = ex.sets.findIndex((s, i) => i > si && !s.completed);
  activeSession.currentSetIndex = next !== -1 ? next : 0;
  startRest(window.GymData.Storage.getDB().settings?.restSeconds || 90);
  renderSession();
};

function renderCardioEx(ex) {
  return `
    <div style="padding:16px 14px;text-align:center;border-top:1px solid var(--border)">
      <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Duración del cardio</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:16px">
        <div onclick="adjustCardio(-5)" style="width:44px;height:44px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;color:var(--text)">−</div>
        <div>
          <span style="font-size:44px;font-weight:600;color:var(--text);font-family:var(--font-mono)">${ex.cardioMinutes}</span>
          <span style="font-size:18px;color:var(--text3)"> min</span>
        </div>
        <div onclick="adjustCardio(5)" style="width:44px;height:44px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;color:var(--text)">+</div>
      </div>
      <button class="btn btn-primary" onclick="completeCardio()">Cardio completado ✓</button>
    </div>`;
}

function renderVolumeChips(ex) {
  const { Storage, getWeeklyVolume } = window.GymData;
  const db = Storage.getDB();
  const vol = getWeeklyVolume(db, ex.muscleGroup);
  const completedSets = ex.sets.filter(s => s.completed).length;
  
  let mainStat, mainLabel;
  if (ex.isIsometric) {
    const totalSec = ex.sets.filter(s => s.completed).reduce((a, s) => a + (s.seconds || 0), 0);
    mainStat = totalSec > 0 ? formatIsometricTime(totalSec) : '—';
    mainLabel = 'tiempo total';
  } else {
    const bestW = ex.sets.filter(s => s.completed && s.weight > 0).reduce((b, s) => Math.max(b, s.weight), 0);
    const bestR = ex.sets.filter(s => s.completed && s.reps > 0).reduce((b, s) => Math.max(b, s.reps), 0);
    const oneRM = bestW && bestR ? window.GymData.estimateOneRM(bestW, bestR) : null;
    mainStat = oneRM ? oneRM : (ex.bodyweight && bestR ? bestR : '—');
    mainLabel = oneRM ? '1RM est.' : (ex.bodyweight ? 'mejor reps' : '—');
  }

  return `
    <div class="stat-card" style="text-align:center">
      <div class="stat-num" style="font-size:20px">${completedSets}<small>/${ex.sets.length}</small></div>
      <div class="stat-label">series hoy</div>
    </div>
    <div class="stat-card" style="text-align:center">
      <div class="stat-num" style="font-size:20px">${vol}<small>/16</small></div>
      <div class="stat-label">series semana</div>
    </div>
    <div class="stat-card" style="text-align:center">
      <div class="stat-num" style="font-size:${ex.isIsometric ? '16px' : '20px'}">${mainStat}<small>${typeof mainStat === 'number' ? ' kg' : ''}</small></div>
      <div class="stat-label">${mainLabel}</div>
    </div>`;
}

function renderNoSession() {
  const { DAY_CONFIG } = window.GymData;
  const days = ['lunes', 'miercoles', 'viernes'];
  
  return `
    <div style="padding:20px">
      <div style="font-size:20px;font-weight:600;margin-bottom:4px">Iniciar sesión</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:20px">Selecciona la rutina del día</div>
      ${days.map(day => {
        const config = DAY_CONFIG[day];
        return `
        <div onclick="openSessionEdit('${day}')" style="display:flex;align-items:center;padding:14px 16px;background:var(--bg2);border-radius:var(--radius-md);margin-bottom:8px;cursor:pointer;border:1px solid var(--border)">
          <div style="flex:1">
            <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${config.label}</div>
            <div style="font-size:16px;font-weight:500;color:var(--text)">${config.title}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">~${config.estimatedMin} min</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" stroke-width="1.5"><polyline points="6,4 10,8 6,12"/></svg>
        </div>`;
      }).join('')}
    </div>`;
}

function getGroupLabel(groupKey) {
  const labels = {
    pecho: 'Pecho', triceps: 'Tríceps', hombro_lunes: 'Hombro',
    espalda: 'Espalda', biceps: 'Bíceps', hombro_miercoles: 'Hombro',
    abdomen: 'Abdomen', pierna: 'Pierna', gluteo: 'Glúteo', cardio: 'Cardio'
  };
  return labels[groupKey] || groupKey;
}

// ---- Ejercicio custom (#2) ----
window.openCustomExercise = function() {
  const { EXERCISE_LIBRARY } = window.GymData;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:500;display:flex;align-items:flex-end';
  modal.innerHTML = `
    <div style="background:var(--bg);border-radius:20px 20px 0 0;padding:20px 20px 40px;width:100%;max-height:75vh;display:flex;flex-direction:column">
      <div style="font-size:16px;font-weight:600;margin-bottom:12px">Cambiar ejercicio</div>
      <input id="ex-search" type="text" placeholder="Buscar o escribir ejercicio…"
        style="width:100%;padding:10px 14px;border-radius:10px;border:1.5px solid var(--border2);background:var(--bg2);color:var(--text);font-size:15px;margin-bottom:12px;outline:none"
        oninput="filterExercises(this.value)">
      <div id="ex-list" style="overflow-y:auto;flex:1">
        ${renderExerciseList(EXERCISE_LIBRARY, ex.muscleGroup)}
      </div>
      <button class="btn btn-ghost" style="margin-top:12px" onclick="this.closest('[style*=fixed]').remove()">Cancelar</button>
    </div>`;
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('ex-search')?.focus(), 100);
};

function renderExerciseList(list, currentMuscle) {
  // Mostrar primero los del mismo músculo
  const sorted = [...list].sort((a, b) => {
    if (a.muscle === currentMuscle && b.muscle !== currentMuscle) return -1;
    if (b.muscle === currentMuscle && a.muscle !== currentMuscle) return 1;
    return 0;
  });
  return sorted.map(e => `
    <div onclick="selectCustomExercise('${e.id}','${e.name.replace(/'/g,"\\'")}','${e.function}')" 
         style="display:flex;align-items:center;padding:11px 4px;border-bottom:1px solid var(--border);cursor:pointer">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:500;color:var(--text)">${e.name}</div>
        <div style="font-size:11px;color:var(--text3)">${e.muscle} · ${e.function}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" stroke-width="1.5"><polyline points="6,4 10,8 6,12"/></svg>
    </div>`).join('');
}

window.filterExercises = function(query) {
  const { EXERCISE_LIBRARY } = window.GymData;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  const q = query.toLowerCase();
  let filtered;
  if (!q) {
    filtered = EXERCISE_LIBRARY;
  } else {
    filtered = EXERCISE_LIBRARY.filter(e => e.name.toLowerCase().includes(q));
  }
  
  // Opción para crear ejercicio personalizado si no hay resultado exacto
  const list = document.getElementById('ex-list');
  if (!list) return;
  let html = renderExerciseList(filtered, ex.muscleGroup);
  if (query.length > 2 && !EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === q)) {
    html += `<div onclick="selectCustomExercise('custom_${Date.now()}','${query.replace(/'/g,"\\'")}','personalizado')" 
      style="display:flex;align-items:center;padding:12px 4px;cursor:pointer;color:var(--green);border-bottom:1px solid var(--border)">
      <div style="flex:1"><div style="font-size:14px;font-weight:500">+ Agregar "${query}"</div><div style="font-size:11px;color:var(--text3)">Ejercicio personalizado</div></div>
    </div>`;
  }
  list.innerHTML = html;
};

window.selectCustomExercise = function(id, name, func) {
  const ex = activeSession.exercises[activeSession.currentExIndex];
  ex.exerciseId = id;
  ex.exerciseName = name;
  ex.function = func;
  ex.variants = [{ id: 'custom', label: name }];
  ex.variant = 'custom';
  ex.variantLabel = name;
  document.querySelector('[style*="z-index:500"]')?.remove();
  renderSession();
};

// ---- Actions ----

function updateSetWeight(setIdx, val) {
  if (!activeSession) return;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  ex.sets[setIdx].weight = parseFloat(val) || 0;
  ex.sets.forEach((s, i) => { if (i > setIdx && !s.completed) s.weight = parseFloat(val) || 0; });
}

function updateSetReps(setIdx, val, side = null) {
  if (!activeSession) return;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  if (side === 'right') ex.sets[setIdx].reps = parseInt(val) || 0;
  else if (side === 'left') ex.sets[setIdx].repsLeft = parseInt(val) || 0;
  else ex.sets[setIdx].reps = parseInt(val) || 0;
}

function completeSet(setIdx) {
  if (!activeSession) return;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  const set = ex.sets[setIdx];
  
  // Permitir peso 0 para ejercicios de peso corporal (#7)
  if (!ex.bodyweight && !ex.isIsometric && set.weight === 0 && !ex.isCardio) {
    showToast('Ingresa el peso antes de completar');
    return;
  }
  set.completed = true;
  set.reps = set.reps || 0;

  const lastBest = ex.lastData ? ex.lastData.weight : 0;
  if (set.weight > lastBest && set.reps > 0 && set.weight > 0) {
    showToast('🏆 Nuevo PR en ' + ex.exerciseName + '!');
  }

  const nextSet = ex.sets.findIndex((s, i) => i > setIdx && !s.completed);
  activeSession.currentSetIndex = nextSet !== -1 ? nextSet : 0;

  const restSecs = window.GymData.Storage.getDB().settings?.restSeconds || 90;
  startRest(restSecs);
  renderSession();
}

function changeVariant(variantId, variantLabel, el) {
  if (!activeSession) return;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  ex.variant = variantId;
  ex.variantLabel = variantLabel;
  document.querySelectorAll('#variant-row .v-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function adjustCardio(delta) {
  if (!activeSession) return;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  ex.cardioMinutes = Math.max(5, Math.min(60, (ex.cardioMinutes || 10) + delta));
  renderSession();
}

function completeCardio() { nextExercise(); }

// Ir al siguiente ejercicio — avance automático al completar serie (#6)
function nextExercise() {
  if (!activeSession) return;
  if (_isoTimerInterval) { clearInterval(_isoTimerInterval); _isoTimerInterval = null; window._isoTimerRunning = false; }
  if (activeSession.currentExIndex < activeSession.exercises.length - 1) {
    activeSession.currentExIndex++;
    activeSession.currentSetIndex = 0;
    // Mantener el timer de descanso corriendo (#6)
    renderSession();
    document.getElementById('screen-session').scrollTop = 0;
  } else {
    confirmFinishSession();
  }
}

// Volver al ejercicio anterior (#12)
function prevExercise() {
  if (!activeSession || activeSession.currentExIndex === 0) return;
  if (_isoTimerInterval) { clearInterval(_isoTimerInterval); _isoTimerInterval = null; window._isoTimerRunning = false; }
  activeSession.currentExIndex--;
  activeSession.currentSetIndex = 0;
  renderSession();
  document.getElementById('screen-session').scrollTop = 0;
}

// Auto-avance cuando se completan todas las series de un ejercicio (#6)
function checkAutoAdvance() {
  if (!activeSession) return;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  if (ex.isCardio || ex.isIsometric) return;
  const allDone = ex.sets.every(s => s.completed);
  if (allDone && activeSession.currentExIndex < activeSession.exercises.length - 1) {
    setTimeout(() => {
      if (!activeSession) return;
      const stillAllDone = activeSession.exercises[activeSession.currentExIndex]?.sets.every(s => s.completed);
      if (stillAllDone) {
        showToast('✓ Ejercicio completado — siguiente');
        nextExercise();
      }
    }, 1500);
  }
}

function confirmFinishSession() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:flex-end';
  modal.innerHTML = `
    <div style="background:var(--bg);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;animation:slideUp .2s ease">
      <div style="font-size:17px;font-weight:600;margin-bottom:6px">Finalizar sesión</div>
      <div style="font-size:14px;color:var(--text3);margin-bottom:20px">Duración: ${window.GymData.formatTime(sessionSeconds)}</div>
      <button class="btn btn-primary" onclick="finishSession()">Guardar y finalizar</button>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="this.closest('div[style*=fixed]').remove()">Continuar entrenando</button>
    </div>`;
  document.body.appendChild(modal);
}

function finishSession() {
  if (!activeSession) return;
  const { Storage } = window.GymData;
  const db = Storage.getDB();
  const session = { ...activeSession, endTime: Date.now(), durationSeconds: sessionSeconds };
  db.sessions = db.sessions || [];
  db.sessions.push(session);

  const weekDone = window.GymData.getThisWeekDone(db);
  if (weekDone.lunes && weekDone.miercoles && weekDone.viernes) {
    db.currentWeek = (db.currentWeek || 1) % 4 + 1;
    if (db.currentWeek === 1) db.currentCycle = (db.currentCycle || 1) + 1;
  }

  Storage.saveDB(db);
  stopSession();
  stopAutoSave();
  document.querySelector('div[style*="fixed"]')?.remove();
  activeSession = null;
  showToast('¡Sesión guardada! 💪');
  renderDashboard();
  navigateTo('dashboard');
}

// ---- Timers ----

function startSessionTimer() {
  stopSession();
  // Fix: guardar referencia estable para no perder el reloj global (#13)
  sessionInterval = setInterval(() => {
    sessionSeconds++;
    const el = document.getElementById('session-clock');
    if (el) el.textContent = window.GymData.formatTime(sessionSeconds);
  }, 1000);
}

function stopSession() {
  if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
}

function startRest(seconds, resume = false) {
  stopRest();
  if (!resume) restTotalSeconds = seconds;
  restSeconds = resume ? seconds : seconds;
  updateRestUI();
  restInterval = setInterval(() => {
    if (restSeconds > 0) {
      restSeconds--;
      updateRestUI();
    } else {
      stopRest();
      triggerRestEndAlert(); // Vibración + beep (#3)
      checkAutoAdvance();    // Auto-avance al siguiente ejercicio (#6)
    }
  }, 1000);
}

function stopRest() {
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
}

function updateRestUI() {
  const clock = document.getElementById('rest-clock');
  const fill = document.getElementById('rest-fill');
  if (clock) clock.textContent = window.GymData.formatTime(restSeconds);
  if (fill) fill.style.width = Math.round((restSeconds / restTotalSeconds) * 100) + '%';
}

function skipRest() {
  restSeconds = 0;
  updateRestUI();
  stopRest();
  checkAutoAdvance();
}

// Vibración y beep al terminar descanso (#3)
function triggerRestEndAlert() {
  // Vibración
  try {
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 500]);
  } catch(e) {}
  
  // Beep con Web Audio API
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.1);
    };
    beep(800, 0, 0.15);
    beep(800, 0.2, 0.15);
    beep(1000, 0.4, 0.4);
  } catch(e) {}
  
  showToast('¡A entrenar! 💪');
}

// Notificación push cuando pantalla bloqueada (#3)
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendRestEndNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('GymTracker', {
        body: '¡Descanso terminado! Es hora de la siguiente serie.',
        icon: '/icons/icon-192.png',
        tag: 'rest-end',
        requireInteraction: false,
        silent: false
      });
    } catch(e) {}
  }
}

window.startSession = startSession;
window.renderSession = renderSession;
window.completeSet = completeSet;
window.updateSetWeight = updateSetWeight;
window.updateSetReps = updateSetReps;
window.changeVariant = changeVariant;
window.nextExercise = nextExercise;
window.prevExercise = prevExercise;
window.confirmFinishSession = confirmFinishSession;
window.finishSession = finishSession;
window.skipRest = skipRest;
window.adjustCardio = adjustCardio;
window.completeCardio = completeCardio;
window.restoreSessionIfExists = restoreSessionIfExists;
window.requestNotificationPermission = requestNotificationPermission;
