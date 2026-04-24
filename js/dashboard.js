// ============================================================
// Dashboard Screen
// ============================================================

function renderDashboard() {
  const { Storage, DAY_CONFIG, getUpcomingDay, getStreak, getThisWeekDone, EXERCISES, getWeeklyVolume, formatDate } = window.GymData;
  const db = Storage.getDB();
  const upcomingDay = getUpcomingDay();
  const dayConfig = DAY_CONFIG[upcomingDay];
  const streak = getStreak(db);
  const weekDone = getThisWeekDone(db);
  const bodyWeights = db.bodyWeight || [];
  const lastWeight = bodyWeights.length ? bodyWeights[bodyWeights.length - 1] : null;
  const prevWeight = bodyWeights.length > 4 ? bodyWeights[bodyWeights.length - 5] : null;
  const weightDelta = (lastWeight && prevWeight) ? (lastWeight.value - prevWeight.value).toFixed(1) : null;

  // Collect PRs
  const prList = [];
  const sessions = [...db.sessions].reverse();
  const seen = new Set();
  for (const session of sessions) {
    for (const ex of (session.exercises || [])) {
      if (seen.has(ex.exerciseId)) continue;
      const best = (ex.sets || []).reduce((b, s) => (!b || s.weight > b.weight) ? s : b, null);
      if (best && best.weight > 0) {
        prList.push({ name: ex.exerciseName, weight: best.weight, reps: best.reps, date: session.date, oneRM: window.GymData.estimateOneRM(best.weight, best.reps) });
        seen.add(ex.exerciseId);
      }
      if (prList.length >= 3) break;
    }
    if (prList.length >= 3) break;
  }

  // Weekly volume by muscle
  const muscleTargets = [
    { key: 'pecho', label: 'Pecho', target: 12 },
    { key: 'espalda', label: 'Espalda', target: 12 },
    { key: 'triceps', label: 'Tríceps', target: 8 },
    { key: 'biceps', label: 'Bíceps', target: 8 },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const isTodayTraining = !!window.GymData.getTodayDay();

  document.getElementById('screen-dashboard').innerHTML = `
    <div class="screen-header" style="border-bottom:none;padding-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <p style="font-size:12px;color:var(--text3);margin-bottom:2px">${getGreeting()}</p>
          <h1>Semana ${db.currentWeek} · ciclo ${db.currentCycle}</h1>
        </div>
        <div style="width:40px;height:40px;border-radius:50%;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;color:var(--text2)">
          ${getInitials()}
        </div>
      </div>

      <!-- Streak -->
      <div style="margin-top:14px;background:var(--bg2);border-radius:var(--radius-md);padding:12px 14px;display:flex;align-items:center;gap:12px">
        <div>
          <div style="font-size:30px;font-weight:600;color:var(--text);line-height:1;letter-spacing:-.5px">${streak}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">semanas seguidas</div>
        </div>
        <div style="width:1px;height:36px;background:var(--border)"></div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:6px">Esta semana</div>
          <div style="display:flex;gap:6px">
            ${['lunes','miercoles','viernes'].map(d => `
              <div style="width:28px;height:28px;border-radius:50%;
                ${weekDone[d] ? 'background:var(--text);' : d === upcomingDay && isTodayTraining ? 'background:var(--bg);border:2px solid var(--text);' : 'background:var(--bg3);'}
                display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;
                color:${weekDone[d] ? 'var(--bg)' : d === upcomingDay && isTodayTraining ? 'var(--text)' : 'var(--text3)'}">
                ${d === 'lunes' ? 'L' : d === 'miercoles' ? 'M' : 'V'}
              </div>`).join('')}
          </div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:11px;color:var(--text3)">mejor racha</div>
          <div style="font-size:16px;font-weight:600;color:var(--text)">${Math.max(streak, db.bestStreak || 0)} sem.</div>
        </div>
      </div>
    </div>

    <!-- Próxima sesión -->
    <div class="section">
      <div class="section-top">
        <span class="section-title">Próxima sesión</span>
        <span class="section-link" onclick="openSessionEdit('${upcomingDay}')">editar →</span>
      </div>
      <div class="card" style="padding:14px 16px;cursor:pointer" onclick="openSessionEdit('${upcomingDay}')">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">
          ${dayConfig.label} · ${isTodayTraining ? 'hoy' : 'próximo'}
        </div>
        <div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:4px">${dayConfig.title}</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:12px">~${dayConfig.estimatedMin} min · semana ${db.currentWeek} de 4</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px">
          ${getExercisePills(upcomingDay)}
        </div>
        <button class="btn btn-primary" onclick="event.stopPropagation();startSession('${upcomingDay}')">
          Iniciar sesión
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,4 10,8 6,12"/></svg>
        </button>
      </div>
    </div>

    <!-- Volumen semanal -->
    <div class="section" style="padding-top:20px">
      <div class="section-top">
        <span class="section-title">Volumen esta semana</span>
        <span class="section-link" onclick="navigateTo('progress')">ver más →</span>
      </div>
      <div style="background:var(--bg2);border-radius:var(--radius-md);padding:12px 14px">
        ${muscleTargets.map(m => {
          const vol = getWeeklyVolume(db, m.key);
          const pct = Math.min(100, Math.round((vol / m.target) * 100));
          const done = vol >= m.target;
          return `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="font-size:12px;color:var(--text2);width:64px;flex-shrink:0">${m.label}</span>
              <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%"></div></div>
              <span style="font-size:11px;font-weight:500;width:36px;text-align:right;color:${done ? 'var(--green)' : 'var(--text3)'}">${vol}/${m.target}</span>
            </div>`;
        }).join('')}
      </div>
    </div>

    <!-- PRs recientes -->
    <div class="section" style="padding-top:20px">
      <div class="section-top">
        <span class="section-title">PRs recientes</span>
        <span class="section-link" onclick="navigateTo('progress')">ver todos →</span>
      </div>
      ${prList.length ? prList.map(pr => `
        <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:var(--bg2);border-radius:var(--radius-md);margin-bottom:7px;cursor:pointer" onclick="navigateTo('progress')">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--text)">${pr.name}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:1px">${formatDate(pr.date)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:600;color:var(--text)">${pr.weight} kg <span class="badge badge-green" style="font-size:9px">PR</span></div>
            <div style="font-size:11px;color:var(--text3)">1RM est. ${pr.oneRM} kg</div>
          </div>
        </div>`).join('') : `
        <div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">
          Aún no hay sesiones registradas.<br>¡Inicia tu primera sesión!
        </div>`}
    </div>

    <!-- Peso corporal -->
    <div class="section" style="padding-top:20px;padding-bottom:8px">
      <div class="section-top">
        <span class="section-title">Peso corporal</span>
        <span class="section-link" onclick="openWeightLog()">+ registrar</span>
      </div>
      <div style="background:var(--bg2);border-radius:var(--radius-md);padding:12px 14px">
        ${lastWeight ? `
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
            <span style="font-size:32px;font-weight:600;color:var(--text);letter-spacing:-.5px">${lastWeight.value}</span>
            <span style="font-size:15px;color:var(--text3)">kg</span>
            ${weightDelta !== null ? `<span style="font-size:13px;font-weight:500;margin-left:4px;color:${parseFloat(weightDelta) < 0 ? 'var(--green)' : parseFloat(weightDelta) > 0 ? 'var(--amber)' : 'var(--text3)'}">${parseFloat(weightDelta) > 0 ? '+' : ''}${weightDelta} kg</span>` : ''}
          </div>
          ${renderWeightMiniChart(bodyWeights)}
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="font-size:10px;color:var(--text3)">${bodyWeights.length > 1 ? formatDate(bodyWeights[Math.max(0, bodyWeights.length-8)].date) : ''}</span>
            <span style="font-size:10px;color:var(--text3)">hoy</span>
          </div>` : `
          <div style="text-align:center;padding:16px 0;color:var(--text3);font-size:13px">
            Registra tu peso para ver la evolución
          </div>
          <button class="btn btn-secondary" style="margin-top:4px" onclick="openWeightLog()">Registrar peso</button>`}
      </div>
    </div>
  `;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getInitials() {
  return 'TU';
}

function getExercisePills(day) {
  const { DAY_CONFIG, EXERCISES } = window.GymData;
  const config = DAY_CONFIG[day];
  const pills = [];
  for (const groupKey of config.groups) {
    const group = EXERCISES[groupKey];
    if (!group) continue;
    for (const slot of (group.slots || [])) {
      if (slot.optional) continue;
      pills.push(slot.name);
    }
  }
  const shown = pills.slice(0, 4);
  const rest = pills.length - shown.length;
  return shown.map(n => `<span style="font-size:11px;padding:3px 10px;border-radius:20px;background:var(--bg3);border:1px solid var(--border);color:var(--text2)">${n}</span>`).join('') +
    (rest > 0 ? `<span style="font-size:11px;padding:3px 10px;border-radius:20px;background:var(--bg3);border:1px solid var(--border);color:var(--text3)">+${rest} más</span>` : '');
}

function renderWeightMiniChart(weights) {
  if (weights.length < 2) return '';
  const last8 = weights.slice(-8);
  const vals = last8.map(w => w.value);
  const mn = Math.min(...vals) - 0.5;
  const mx = Math.max(...vals) + 0.5;
  const W = 312, H = 48;
  const pts = vals.map((v, i) => {
    const x = Math.round((i / (vals.length - 1)) * W);
    const y = Math.round(H - ((v - mn) / (mx - mn)) * H);
    return `${x},${y}`;
  }).join(' ');
  const last = pts.split(' ').pop().split(',');
  return `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <polyline fill="none" stroke="var(--text)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="var(--text)"/>
  </svg>`;
}

function openWeightLog() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:flex-end;';
  modal.innerHTML = `
    <div style="background:var(--bg);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;animation:slideUp .25s ease">
      <div style="font-size:17px;font-weight:600;margin-bottom:16px">Registrar peso</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <input type="number" id="weight-input" step="0.1" min="30" max="200" placeholder="78.5"
          style="flex:1;font-size:32px;font-weight:500;border:none;border-bottom:2px solid var(--text);background:transparent;color:var(--text);padding:4px 0;outline:none;font-family:var(--font-mono);text-align:center">
        <span style="font-size:18px;color:var(--text3)">kg</span>
      </div>
      <button class="btn btn-primary" onclick="saveWeight()">Guardar</button>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="this.closest('.weight-modal').remove()">Cancelar</button>
    </div>`;
  modal.className = 'weight-modal';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('weight-input')?.focus(), 100);
}

function saveWeight() {
  const input = document.getElementById('weight-input');
  const val = parseFloat(input.value);
  if (!val || val < 30 || val > 250) { showToast('Ingresa un peso válido'); return; }
  const db = window.GymData.Storage.getDB();
  db.bodyWeight = db.bodyWeight || [];
  db.bodyWeight.push({ value: val, date: new Date().toISOString() });
  window.GymData.Storage.saveDB(db);
  document.querySelector('.weight-modal')?.remove();
  showToast('Peso registrado ✓');
  renderDashboard();
}

window.renderDashboard = renderDashboard;
window.openWeightLog = openWeightLog;
window.saveWeight = saveWeight;
