// ============================================================
// Session Screen — Sesión activa
// ============================================================

let activeSession = null;
let restInterval = null;
let sessionInterval = null;
let restSeconds = 0;
let sessionSeconds = 0;

function startSession(day) {
  const { Storage, DAY_CONFIG, EXERCISES, getFavVariant, getLastSessionData } = window.GymData;
  const db = Storage.getDB();
  const config = DAY_CONFIG[day];

  // Build exercise list for session
  const exercises = [];
  for (const groupKey of config.groups) {
    const group = EXERCISES[groupKey];
    if (!group) continue;
    for (const slot of group.slots) {
      if (slot.optional) continue; // hombro opcional no se agrega por defecto
      const fav = getFavVariant(slot);
      const lastData = getLastSessionData(db, slot.id);
      const sets = [];
      const numSets = slot.sets || 4;
      for (let i = 0; i < numSets; i++) {
        sets.push({
          setNum: i + 1,
          weight: lastData ? lastData.weight : 0,
          reps: 0,
          repsLeft: slot.unilateral ? 0 : null,
          completed: false
        });
      }
      exercises.push({
        exerciseId: slot.id,
        exerciseName: slot.name,
        muscleGroup: groupKey,
        focus: slot.focus,
        function: slot.function,
        unilateral: !!slot.unilateral,
        isCardio: !!slot.isCardio,
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
  renderSession();
  navigateTo('session');
}

function renderSession() {
  if (!activeSession) {
    document.getElementById('screen-session').innerHTML = renderNoSession();
    return;
  }
  const ex = activeSession.exercises[activeSession.currentExIndex];
  const totalEx = activeSession.exercises.length;
  const doneEx = activeSession.exercises.filter((e, i) => i < activeSession.currentExIndex).length;
  const progress = Math.round((doneEx / totalEx) * 100);

  document.getElementById('screen-session').innerHTML = `
    <!-- Top bar -->
    <div style="position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px 10px">
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${activeSession.dayLabel} · sem ${window.GymData.Storage.getDB().currentWeek}</div>
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
          <div style="font-size:19px;font-weight:600;color:var(--text);margin-bottom:6px">${ex.exerciseName}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:var(--text3)">Variante:</span>
            <div style="display:flex;gap:5px;flex-wrap:wrap" id="variant-row">
              ${ex.variants.map(v => `
                <span onclick="changeVariant('${v.id}','${v.label.replace(/'/g,"\\'")}', this)" class="v-chip${ex.variant === v.id ? ' active' : ''}">${v.label}</span>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Series -->
        ${ex.isCardio ? renderCardioEx(ex) : renderSeriesTable(ex)}

        <!-- Rest timer -->
        <div style="padding:10px 14px 6px;border-top:1px solid var(--border)">
          <div class="rest-widget" id="rest-widget">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text2)" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><polyline points="8,5 8,8 10,10"/></svg>
            <span class="rest-label">Descanso</span>
            <span class="rest-time" id="rest-clock">${window.GymData.formatTime(restSeconds)}</span>
            <span class="rest-skip" onclick="skipRest()">saltar</span>
          </div>
          <div class="progress-bar" style="margin:6px 0 2px"><div class="progress-fill" id="rest-fill" style="width:${restSeconds > 0 ? Math.round((restSeconds/90)*100) : 0}%;background:var(--accent)"></div></div>
        </div>
      </div>

      <!-- Prev hint -->
      ${ex.lastData ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding:9px 14px;background:var(--bg2);border-radius:var(--radius-md)">
        <div>
          <div style="font-size:11px;color:var(--text3)">Semana pasada · mejor serie</div>
          <div style="font-size:13px;font-weight:500;color:var(--text);margin-top:1px">${ex.lastData.weight} kg · ${ex.lastData.reps} reps${window.GymData.estimateOneRM(ex.lastData.weight, ex.lastData.reps) > 0 ? ' · 1RM est. ' + window.GymData.estimateOneRM(ex.lastData.weight, ex.lastData.reps) + ' kg' : ''}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" stroke-width="1.5"><polyline points="6,4 10,8 6,12"/></svg>
      </div>` : ''}

      <!-- Volume chips -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px">
        ${renderVolumeChips(ex)}
      </div>

      <!-- Next exercise -->
      ${activeSession.currentExIndex < activeSession.exercises.length - 1 ? `
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px;padding:11px 14px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer" onclick="nextExercise()">
        <div style="flex:1">
          <div style="font-size:11px;color:var(--text3);margin-bottom:2px">Siguiente ejercicio</div>
          <div style="font-size:13px;font-weight:500;color:var(--text)">${activeSession.exercises[activeSession.currentExIndex + 1].exerciseName} · ${activeSession.exercises[activeSession.currentExIndex + 1].repsTarget} reps</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" stroke-width="1.5"><polyline points="6,4 10,8 6,12"/></svg>
      </div>` : `
      <button class="btn btn-primary" style="margin-top:14px" onclick="confirmFinishSession()">Finalizar sesión</button>`}
    </div>
  `;
}

function renderSeriesTable(ex) {
  const isUni = ex.unilateral;
  return `
    <table class="series-table" style="width:100%">
      <thead>
        <tr>
          <th class="series-th" style="width:32px">N°</th>
          <th class="series-th" style="text-align:left;padding-left:14px">Sem. anterior</th>
          <th class="series-th" style="width:60px">kg</th>
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
              <span class="series-prev">${prevW} kg · ${prevR} reps</span>
            </td>
            <td class="series-td">
              <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}"
                value="${set.weight || ''}" placeholder="kg" min="0" step="0.5"
                style="width:54px;font-size:15px"
                ${isDone ? 'readonly' : ''}
                oninput="updateSetWeight(${si}, this.value)">
            </td>
            ${isUni ? `
              <td class="series-td">
                <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}"
                  value="${set.reps || ''}" placeholder="—" min="0"
                  style="width:46px;font-size:15px"
                  ${isDone ? 'readonly' : ''}
                  oninput="updateSetReps(${si}, this.value, 'right')">
              </td>
              <td class="series-td">
                <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}${warnLeft ? '' : ''}"
                  value="${set.repsLeft || ''}" placeholder="—" min="0"
                  style="width:46px;font-size:15px${warnLeft ? ';border-color:var(--amber)' : ''}"
                  ${isDone ? 'readonly' : ''}
                  oninput="updateSetReps(${si}, this.value, 'left')">
              </td>
            ` : `
              <td class="series-td">
                <input type="number" class="input-num${isDone ? ' done' : isActive ? ' active' : ''}"
                  value="${set.reps || ''}" placeholder="—" min="0"
                  style="width:50px;font-size:15px"
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
          <tr><td colspan="${isUni ? 6 : 5}" style="padding:4px 14px 6px;background:var(--amber-bg)">
            <span style="font-size:11px;color:var(--amber)">⚠ Diferencia entre lados — monitorear próxima semana</span>
          </td></tr>` : ''}`;
        }).join('')}
      </tbody>
    </table>`;
}

function renderCardioEx(ex) {
  return `
    <div style="padding:16px 14px;text-align:center;border-top:1px solid var(--border)">
      <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Duración del cardio</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:16px">
        <div onclick="adjustCardio(-5)" style="width:40px;height:40px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;color:var(--text)">−</div>
        <div>
          <span style="font-size:40px;font-weight:600;color:var(--text);font-family:var(--font-mono)">${ex.cardioMinutes}</span>
          <span style="font-size:16px;color:var(--text3)"> min</span>
        </div>
        <div onclick="adjustCardio(5)" style="width:40px;height:40px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;color:var(--text)">+</div>
      </div>
      <button class="btn btn-primary" onclick="completeCardio()">Cardio completado ✓</button>
    </div>`;
}

function renderVolumeChips(ex) {
  const { Storage, getWeeklyVolume } = window.GymData;
  const db = Storage.getDB();
  const vol = getWeeklyVolume(db, ex.muscleGroup);
  const target = 12;
  const completedSets = ex.sets.filter(s => s.completed).length;
  const bestW = ex.sets.filter(s => s.completed && s.weight > 0).reduce((b, s) => Math.max(b, s.weight), 0);
  const bestR = ex.sets.filter(s => s.completed && s.reps > 0).reduce((b, s) => Math.max(b, s.reps), 0);
  const oneRM = bestW && bestR ? window.GymData.estimateOneRM(bestW, bestR) : null;

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
      <div class="stat-num" style="font-size:20px">${oneRM ? oneRM : '—'}<small>${oneRM ? ' kg' : ''}</small></div>
      <div class="stat-label">1RM est.</div>
    </div>`;
}

function renderNoSession() {
  const { getUpcomingDay, DAY_CONFIG } = window.GymData;
  const day = getUpcomingDay();
  const config = DAY_CONFIG[day];
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;padding:20px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">💪</div>
      <div style="font-size:20px;font-weight:600;margin-bottom:8px">Sin sesión activa</div>
      <div style="font-size:14px;color:var(--text3);margin-bottom:24px">Inicia tu entrenamiento de hoy</div>
      <button class="btn btn-primary" style="max-width:260px" onclick="openSessionEdit('${day}')">
        Preparar sesión de ${config.label}
      </button>
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

// ---- Actions ----

function updateSetWeight(setIdx, val) {
  if (!activeSession) return;
  const ex = activeSession.exercises[activeSession.currentExIndex];
  ex.sets[setIdx].weight = parseFloat(val) || 0;
  // sync all pending sets
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
  if (set.weight === 0) { showToast('Ingresa el peso antes de completar'); return; }
  set.completed = true;
  set.reps = set.reps || 0;

  // Check PR
  const lastBest = ex.lastData ? ex.lastData.weight : 0;
  if (set.weight > lastBest && set.reps > 0) {
    showToast('🏆 Nuevo PR en ' + ex.exerciseName + '!');
  }

  // Advance set index
  const nextSet = ex.sets.findIndex((s, i) => i > setIdx && !s.completed);
  if (nextSet !== -1) {
    activeSession.currentSetIndex = nextSet;
  } else {
    activeSession.currentSetIndex = 0;
  }

  // Start rest timer
  startRest(90);
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

function completeCardio() {
  nextExercise();
}

function nextExercise() {
  if (!activeSession) return;
  if (activeSession.currentExIndex < activeSession.exercises.length - 1) {
    activeSession.currentExIndex++;
    activeSession.currentSetIndex = 0;
    stopRest();
    renderSession();
    document.getElementById('screen-session').scrollTop = 0;
  } else {
    confirmFinishSession();
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
  const session = {
    ...activeSession,
    endTime: Date.now(),
    durationSeconds: sessionSeconds
  };
  db.sessions = db.sessions || [];
  db.sessions.push(session);

  // Update week/cycle
  const weekDone = window.GymData.getThisWeekDone(db);
  if (weekDone.lunes && weekDone.miercoles && weekDone.viernes) {
    db.currentWeek = (db.currentWeek || 1) % 4 + 1;
    if (db.currentWeek === 1) db.currentCycle = (db.currentCycle || 1) + 1;
  }

  Storage.saveDB(db);
  stopSession();
  document.querySelector('div[style*="fixed"]')?.remove();
  activeSession = null;
  showToast('¡Sesión guardada! 💪');
  renderDashboard();
  navigateTo('dashboard');
}

// ---- Timers ----

function startSessionTimer() {
  stopSession();
  sessionInterval = setInterval(() => {
    sessionSeconds++;
    const el = document.getElementById('session-clock');
    if (el) el.textContent = window.GymData.formatTime(sessionSeconds);
  }, 1000);
}

function stopSession() {
  if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
}

function startRest(seconds) {
  stopRest();
  restSeconds = seconds;
  updateRestUI();
  restInterval = setInterval(() => {
    if (restSeconds > 0) {
      restSeconds--;
      updateRestUI();
    } else {
      stopRest();
      showToast('¡Descanso terminado!');
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
  if (fill) fill.style.width = Math.round((restSeconds / 90) * 100) + '%';
}

function skipRest() {
  restSeconds = 0;
  updateRestUI();
  stopRest();
}

window.startSession = startSession;
window.renderSession = renderSession;
window.completeSet = completeSet;
window.updateSetWeight = updateSetWeight;
window.updateSetReps = updateSetReps;
window.changeVariant = changeVariant;
window.nextExercise = nextExercise;
window.confirmFinishSession = confirmFinishSession;
window.finishSession = finishSession;
window.skipRest = skipRest;
window.adjustCardio = adjustCardio;
window.completeCardio = completeCardio;
