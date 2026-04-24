// ============================================================
// Session Edit Screen
// ============================================================

function openSessionEdit(day) {
  const { DAY_CONFIG, EXERCISES, Storage, getLastSessionData, getFavVariant } = window.GymData;
  const db = Storage.getDB();
  const config = DAY_CONFIG[day];

  // Build groups for this day
  const groups = config.groups.map(gk => ({ key: gk, ...EXERCISES[gk] })).filter(Boolean);
  const firstGroup = groups[0]?.key;

  document.getElementById('screen-edit').innerHTML = `
    <div style="position:sticky;top:0;z-index:10;background:var(--bg)">
      <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border)">
        <div onclick="navigateTo('dashboard')" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text)" stroke-width="1.5"><polyline points="10,4 6,8 10,12"/></svg>
        </div>
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">${config.label} · semana ${db.currentWeek} de 4</div>
          <div style="font-size:17px;font-weight:600;color:var(--text)">${config.title}</div>
        </div>
      </div>
      <!-- Group tabs -->
      <div style="display:flex;overflow-x:auto;border-bottom:1px solid var(--border);padding:0 20px;scrollbar-width:none">
        ${groups.map((g, i) => `
          <div class="edit-tab${i === 0 ? ' active' : ''}" data-group="${g.key}"
            onclick="switchEditTab('${g.key}')"
            style="font-size:13px;font-weight:500;padding:10px 14px;color:${i === 0 ? 'var(--text)' : 'var(--text3)'};border-bottom:${i === 0 ? '2px solid var(--text)' : '2px solid transparent'};cursor:pointer;white-space:nowrap;flex-shrink:0">
            ${g.label}
          </div>`).join('')}
      </div>
    </div>

    <!-- Group panels -->
    ${groups.map((g, i) => `
      <div id="edit-panel-${g.key}" style="display:${i === 0 ? 'block' : 'none'};padding:14px 20px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:12px;font-weight:500;color:var(--text2)">${g.label} · ${g.slots?.filter(s=>!s.optional&&!s.isCardio).length || 0} ejercicios</span>
          <span style="font-size:11px;color:var(--text3)">${g.isCardio ? 'Cardio final' : ''}</span>
        </div>
        ${(g.slots || []).map(slot => renderEditSlot(slot, g.key, db)).join('')}
      </div>`).join('')}

    <!-- Footer -->
    <div style="padding:16px 20px 0">
      <div style="background:var(--bg2);border-radius:var(--radius-md);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--text)">Total: ~${config.estimatedMin} min</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">+ 10 min cardio</div>
        </div>
        <span class="badge badge-green">Dentro del límite</span>
      </div>
      <button class="btn btn-primary" onclick="startSession('${day}')">Iniciar sesión →</button>
    </div>
  `;

  navigateTo('edit');
}

function renderEditSlot(slot, groupKey, db) {
  const last = window.GymData.getLastSessionData(db, slot.id);
  const fav = window.GymData.getFavVariant(slot);
  const isCardio = slot.isCardio;
  return `
    <div class="ex-item selected" id="edit-${slot.id}">
      <div class="ex-main" onclick="${slot.optional ? `toggleEditEx('${slot.id}')` : `toggleEditDetail('${slot.id}')`}">
        <div class="ex-select-circle">
          <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2,5 4,7 8,3"/></svg>
        </div>
        <div class="ex-body">
          <div class="ex-name">${slot.name}</div>
          <div class="ex-focus">${slot.focus}</div>
          <div class="ex-tags" style="margin-top:4px">
            <span class="badge badge-gray">${slot.function}</span>
            ${slot.fixed ? '<span class="badge badge-green">Fijo</span>' : '<span class="badge badge-amber">Rotativo</span>'}
            ${slot.optional ? '<span class="badge badge-gray">Opcional</span>' : ''}
            ${slot.unilateral ? '<span class="badge badge-purple">Unilateral</span>' : ''}
          </div>
        </div>
        <div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" stroke-width="1.5" id="chev-${slot.id}"><polyline points="4,6 8,10 12,6"/></svg>
        </div>
      </div>
      <div class="ex-detail" id="detail-${slot.id}">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px">Variante</div>
        <div class="variant-chips" style="margin-bottom:12px">
          ${slot.variants.map(v => `
            <span class="v-chip${v.id === fav.id ? ' active' : ''}" onclick="selectEditVariant(this, '${slot.id}', '${v.id}')">${v.label}${v.fav ? ' ★' : ''}</span>
          `).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <span style="font-size:11px;color:var(--text3);flex:1">${isCardio ? 'Duración' : 'Series'}</span>
          <div style="display:flex;align-items:center;gap:10px">
            <div onclick="adjustEditSeries('${slot.id}', -1${isCardio ? ', true' : ''})" style="width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px">−</div>
            <span id="series-count-${slot.id}" style="font-size:15px;font-weight:500;color:var(--text);min-width:24px;text-align:center">${isCardio ? (slot.defaultMinutes || 10) : slot.sets}</span>
            <div onclick="adjustEditSeries('${slot.id}', 1${isCardio ? ', true' : ''})" style="width:28px;height:28px;border-radius:7px;border:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px">+</div>
            <span style="font-size:11px;color:var(--text3)">${isCardio ? 'min' : '× ' + slot.reps + ' reps'}</span>
          </div>
        </div>
        ${last ? `<div style="font-size:11px;color:var(--text3)">Semana pasada: <strong style="color:var(--text)">${last.weight} kg · ${last.reps} reps</strong></div>` : `<div style="font-size:11px;color:var(--text3)">Sin datos previos — primera vez</div>`}
      </div>
    </div>`;
}

function switchEditTab(groupKey) {
  document.querySelectorAll('.edit-tab').forEach(t => {
    const active = t.dataset.group === groupKey;
    t.style.color = active ? 'var(--text)' : 'var(--text3)';
    t.style.borderBottom = active ? '2px solid var(--text)' : '2px solid transparent';
  });
  document.querySelectorAll('[id^="edit-panel-"]').forEach(p => {
    p.style.display = p.id === `edit-panel-${groupKey}` ? 'block' : 'none';
  });
}

function toggleEditDetail(slotId) {
  const detail = document.getElementById(`detail-${slotId}`);
  const chev = document.getElementById(`chev-${slotId}`);
  const open = detail.style.display === 'block';
  detail.style.display = open ? 'none' : 'block';
  if (chev) chev.querySelector('polyline').setAttribute('points', open ? '4,6 8,10 12,6' : '4,10 8,6 12,10');
}

function toggleEditEx(slotId) {
  const item = document.getElementById(`edit-${slotId}`);
  item.classList.toggle('selected');
}

function selectEditVariant(el, slotId, variantId) {
  el.closest('.variant-chips').querySelectorAll('.v-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function adjustEditSeries(slotId, delta, isMinutes = false) {
  const el = document.getElementById(`series-count-${slotId}`);
  if (!el) return;
  let val = parseInt(el.textContent) + delta;
  val = isMinutes ? Math.max(5, Math.min(60, val)) : Math.max(1, Math.min(6, val));
  el.textContent = val;
}

window.openSessionEdit = openSessionEdit;
window.switchEditTab = switchEditTab;
window.toggleEditDetail = toggleEditDetail;
window.toggleEditEx = toggleEditEx;
window.selectEditVariant = selectEditVariant;
window.adjustEditSeries = adjustEditSeries;


// ============================================================
// Progress Screen
// ============================================================

function renderProgress() {
  const { Storage, EXERCISES, estimateOneRM, formatDate } = window.GymData;
  const db = Storage.getDB();

  document.getElementById('screen-progress').innerHTML = `
    <div class="screen-header">
      <h1>Progreso</h1>
      <p>Ciclo ${db.currentCycle || 1} · semana ${db.currentWeek || 1} de 4</p>
      <div class="seg-control" style="margin-top:12px">
        <div class="seg-btn active" onclick="switchProgressTab(this,'prog-ejercicios')">Ejercicios</div>
        <div class="seg-btn" onclick="switchProgressTab(this,'prog-musculos')">Músculos</div>
        <div class="seg-btn" onclick="switchProgressTab(this,'prog-cuerpo')">Cuerpo</div>
        <div class="seg-btn" onclick="switchProgressTab(this,'prog-asistencia')">Asistencia</div>
      </div>
    </div>

    <!-- Ejercicios -->
    <div id="prog-ejercicios">
      <div class="section">
        <div class="section-top"><span class="section-title">Evolución por ejercicio</span></div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;margin-bottom:12px" id="prog-ex-pills">
          ${getProgressExercises(db).map((ex, i) => `
            <div class="v-chip${i===0?' active':''}" onclick="selectProgressEx(this,'${ex.id}')" data-exid="${ex.id}" style="flex-shrink:0">${ex.name}</div>
          `).join('')}
        </div>
        <div id="prog-chart-card" style="background:var(--bg2);border-radius:var(--radius-md);padding:14px">
          ${renderProgressChart(db, getProgressExercises(db)[0]?.id)}
        </div>
      </div>

      <div class="section" style="padding-top:20px">
        <div class="section-top"><span class="section-title">Records personales</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${getPRCards(db)}
        </div>
      </div>
    </div>

    <!-- Músculos -->
    <div id="prog-musculos" style="display:none">
      <div class="section">
        <div class="section-top"><span class="section-title">Progresión de carga</span></div>
        ${getMuscleProgress(db)}
        <div style="margin-top:16px">
          <div class="section-top"><span class="section-title">Toneladas por semana</span></div>
          ${renderVolumeBars(db)}
        </div>
      </div>
    </div>

    <!-- Cuerpo -->
    <div id="prog-cuerpo" style="display:none">
      <div class="section">
        <div class="section-top">
          <span class="section-title">Peso corporal</span>
          <span class="section-link" onclick="openWeightLog()">+ registrar</span>
        </div>
        ${renderBodyWeightChart(db)}
        <div class="section-top" style="margin-top:20px">
          <span class="section-title">Medidas</span>
          <span class="section-link" onclick="openMeasuresLog()">+ registrar</span>
        </div>
        ${renderMeasures(db)}
      </div>
    </div>

    <!-- Asistencia -->
    <div id="prog-asistencia" style="display:none">
      <div class="section">
        ${renderAttendance(db)}
      </div>
    </div>
  `;
}

function getProgressExercises(db) {
  const ids = ['press_plano','press_inclinado','jalon','remo_bilateral','curl_martillo','hip_thrust','press_frances','prensa'];
  return ids.map(id => {
    const allEx = Object.values(window.GymData.EXERCISES).flatMap(g => g.slots || []);
    const ex = allEx.find(e => e.id === id);
    return ex ? { id, name: ex.name } : null;
  }).filter(Boolean);
}

function renderProgressChart(db, exId) {
  if (!exId || !db.sessions.length) return `<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Sin datos aún. ¡Registra tu primera sesión!</div>`;
  const allEx = Object.values(window.GymData.EXERCISES).flatMap(g => g.slots || []);
  const ex = allEx.find(e => e.id === exId);
  if (!ex) return '';
  const data = [];
  for (const session of db.sessions) {
    for (const sEx of (session.exercises || [])) {
      if (sEx.exerciseId === exId) {
        const best = (sEx.sets || []).reduce((b, s) => (!b || s.weight > b.weight) ? s : b, null);
        if (best) data.push({ date: session.date, weight: best.weight, reps: best.reps });
      }
    }
  }
  if (!data.length) return `<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">Sin datos para este ejercicio</div>`;
  const last = data[data.length - 1];
  const first = data[0];
  const delta = (last.weight - first.weight).toFixed(1);
  const oneRM = window.GymData.estimateOneRM(last.weight, last.reps);
  const vals = data.map(d => d.weight);
  const mn = Math.min(...vals) - 2, mx = Math.max(...vals) + 2;
  const W = 300, H = 70;
  const pts = vals.map((v, i) => {
    const x = Math.round((i / Math.max(1, vals.length - 1)) * W);
    const y = Math.round(H - ((v - mn) / (mx - mn)) * H);
    return `${x},${y}`;
  }).join(' ');
  const lp = pts.split(' ').pop().split(',');
  return `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">${ex.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${ex.reps} reps</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:600;color:var(--text);letter-spacing:-.5px">${last.weight} kg</div>
        <div style="font-size:12px;font-weight:500;color:var(--green)">${parseFloat(delta) >= 0 ? '+' : ''}${delta} kg</div>
      </div>
    </div>
    <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polyline fill="none" stroke="var(--text)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
      <circle cx="${lp[0]}" cy="${lp[1]}" r="3" fill="var(--text)"/>
    </svg>
    <div style="display:flex;justify-content:space-between;margin-top:4px">
      <span style="font-size:10px;color:var(--text3)">${window.GymData.formatDate(first.date)}</span>
      <span style="font-size:10px;color:var(--text3)">1RM est. ${oneRM} kg</span>
      <span style="font-size:10px;color:var(--text3)">${window.GymData.formatDate(last.date)}</span>
    </div>`;
}

function selectProgressEx(el, exId) {
  document.querySelectorAll('#prog-ex-pills .v-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const db = window.GymData.Storage.getDB();
  document.getElementById('prog-chart-card').innerHTML = renderProgressChart(db, exId);
}

function getPRCards(db) {
  if (!db.sessions.length) return `<div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--text3);font-size:13px">Sin sesiones registradas</div>`;
  const prs = {};
  for (const session of db.sessions) {
    for (const ex of (session.exercises || [])) {
      const best = (ex.sets || []).reduce((b, s) => (!b || s.weight > b.weight) ? s : b, null);
      if (best && best.weight > 0) {
        if (!prs[ex.exerciseId] || best.weight > prs[ex.exerciseId].weight) {
          prs[ex.exerciseId] = { name: ex.exerciseName, weight: best.weight, reps: best.reps };
        }
      }
    }
  }
  return Object.values(prs).slice(0, 6).map(pr => `
    <div style="background:var(--bg2);border-radius:var(--radius-md);padding:10px 12px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px;line-height:1.3">${pr.name}</div>
      <div style="font-size:20px;font-weight:600;color:var(--text);line-height:1">${pr.weight} <span style="font-size:12px;color:var(--text3)">kg</span> <span class="badge badge-green" style="font-size:9px">PR</span></div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px">1RM est. ${window.GymData.estimateOneRM(pr.weight, pr.reps)} kg</div>
    </div>`).join('') || `<div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--text3);font-size:13px">Sin PRs registrados aún</div>`;
}

function getMuscleProgress(db) {
  const muscles = [
    { key: 'pecho', label: 'Pecho', color: '#534AB7' },
    { key: 'espalda', label: 'Espalda', color: '#185FA5' },
    { key: 'triceps', label: 'Tríceps', color: '#3C3489' },
    { key: 'biceps', label: 'Bíceps', color: '#BA7517' },
    { key: 'pierna', label: 'Pierna', color: '#3B6D11' },
    { key: 'gluteo', label: 'Glúteo', color: '#0F6E56' },
  ];
  return `<div style="display:flex;flex-direction:column;gap:10px">` +
    muscles.map(m => {
      const vol = window.GymData.getWeeklyVolume(db, m.key);
      const pct = Math.min(100, Math.round((vol / 16) * 100));
      return `
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:8px;height:8px;border-radius:50%;background:${m.color};flex-shrink:0"></div>
          <span style="font-size:13px;color:var(--text);width:72px;flex-shrink:0">${m.label}</span>
          <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%;background:${m.color}"></div></div>
          <span style="font-size:12px;font-weight:500;color:var(--text2);width:36px;text-align:right">${vol}/16</span>
        </div>`;
    }).join('') + `</div>`;
}

function renderVolumeBars(db) {
  if (!db.sessions.length) return `<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px">Sin datos</div>`;
  const last8 = db.sessions.slice(-8);
  const maxVol = Math.max(...last8.map(s => (s.exercises || []).reduce((t, e) => t + (e.sets||[]).filter(se=>se.completed).length, 0)), 1);
  return `
    <div style="background:var(--bg2);border-radius:var(--radius-md);padding:12px 14px">
      <div style="display:flex;align-items:flex-end;gap:6px;height:60px">
        ${last8.map((s, i) => {
          const vol = (s.exercises || []).reduce((t, e) => t + (e.sets||[]).filter(se=>se.completed).length, 0);
          const h = Math.round((vol / maxVol) * 52) + 8;
          const isLast = i === last8.length - 1;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end">
            <div style="width:100%;height:${h}px;border-radius:4px 4px 0 0;background:${isLast ? 'var(--text)' : 'var(--bg3)'}"></div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <span style="font-size:10px;color:var(--text3)">sesiones anteriores</span>
        <span style="font-size:11px;font-weight:500;color:var(--text)">${(db.sessions.slice(-1)[0]?.exercises||[]).reduce((t,e)=>t+(e.sets||[]).filter(s=>s.completed).length,0)} series · última sesión</span>
      </div>
    </div>`;
}

function renderBodyWeightChart(db) {
  const weights = db.bodyWeight || [];
  if (!weights.length) return `
    <div style="background:var(--bg2);border-radius:var(--radius-md);padding:16px;text-align:center;color:var(--text3);font-size:13px">
      Sin registros de peso. <span style="color:var(--text);text-decoration:underline;cursor:pointer" onclick="openWeightLog()">Registrar ahora</span>
    </div>`;
  const last = weights[weights.length - 1];
  const prev = weights.length > 4 ? weights[weights.length - 5] : weights[0];
  const delta = (last.value - prev.value).toFixed(1);
  const vals = weights.slice(-8).map(w => w.value);
  const mn = Math.min(...vals) - 1, mx = Math.max(...vals) + 1;
  const W = 300, H = 60;
  const pts = vals.map((v, i) => {
    const x = Math.round((i / Math.max(1, vals.length - 1)) * W);
    const y = Math.round(H - ((v - mn) / (mx - mn)) * H);
    return `${x},${y}`;
  }).join(' ');
  const lp = pts.split(' ').pop().split(',');
  return `
    <div style="background:var(--bg2);border-radius:var(--radius-md);padding:12px 14px">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px">
        <span style="font-size:32px;font-weight:600;color:var(--text);letter-spacing:-.5px">${last.value}</span>
        <span style="font-size:15px;color:var(--text3)">kg</span>
        <span style="font-size:13px;font-weight:500;color:${parseFloat(delta) < 0 ? 'var(--green)' : parseFloat(delta) > 0 ? 'var(--amber)' : 'var(--text3)'}">${parseFloat(delta) > 0 ? '+' : ''}${delta} kg</span>
      </div>
      <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <polyline fill="none" stroke="var(--text)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>
        <circle cx="${lp[0]}" cy="${lp[1]}" r="3" fill="var(--text)"/>
      </svg>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:10px;color:var(--text3)">${weights.length > 1 ? window.GymData.formatDate(weights[Math.max(0,weights.length-8)].date) : ''}</span>
        <span style="font-size:10px;color:var(--text3)">hoy</span>
      </div>
    </div>`;
}

function renderMeasures(db) {
  const measures = db.bodyMeasures || [];
  const fields = [
    { key: 'chest', label: 'Pecho' },
    { key: 'waist', label: 'Cintura' },
    { key: 'arm', label: 'Brazo' },
    { key: 'thigh', label: 'Muslo' },
  ];
  if (!measures.length) return `
    <div style="background:var(--bg2);border-radius:var(--radius-md);padding:16px;text-align:center;color:var(--text3);font-size:13px">
      Sin medidas registradas. <span style="color:var(--text);text-decoration:underline;cursor:pointer" onclick="openMeasuresLog()">Registrar ahora</span>
    </div>`;
  const last = measures[measures.length - 1];
  const prev = measures.length > 1 ? measures[measures.length - 2] : null;
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">` +
    fields.map(f => {
      const val = last[f.key];
      const pval = prev ? prev[f.key] : null;
      const delta = (val && pval) ? (val - pval).toFixed(1) : null;
      return `
        <div style="background:var(--bg2);border-radius:var(--radius-md);padding:10px 12px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${f.label}</div>
          <div style="font-size:20px;font-weight:600;color:var(--text)">${val || '—'} <span style="font-size:12px;color:var(--text3)">${val ? 'cm' : ''}</span></div>
          ${delta !== null ? `<div style="font-size:11px;font-weight:500;margin-top:3px;color:${parseFloat(delta) > 0 ? 'var(--green)' : 'var(--red)'}">${parseFloat(delta) > 0 ? '+' : ''}${delta} cm</div>` : ''}
        </div>`;
    }).join('') + `</div>`;
}

function renderAttendance(db) {
  const sessions = db.sessions || [];
  const total = sessions.length;
  const streak = window.GymData.getStreak(db);
  const weekDone = window.GymData.getThisWeekDone(db);
  const consistency = total > 0 ? Math.round((total / Math.max(1, streak * 3 || 1)) * 100) : 0;

  // Group sessions by week
  const byWeek = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    const weekStart = new Date(d);
    const dow = d.getDay();
    weekStart.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const key = weekStart.toISOString().split('T')[0];
    byWeek[key] = byWeek[key] || [];
    byWeek[key].push(s.day);
  });
  const weeks = Object.entries(byWeek).slice(-8).reverse();

  return `
    <div style="background:var(--bg2);border-radius:var(--radius-md);padding:12px 14px;margin-bottom:14px">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;text-align:center">
        <div>
          <div style="font-size:26px;font-weight:600;color:var(--text);letter-spacing:-.5px">${total}</div>
          <div style="font-size:11px;color:var(--text3)">sesiones totales</div>
        </div>
        <div>
          <div style="font-size:26px;font-weight:600;color:var(--text);letter-spacing:-.5px">${streak}</div>
          <div style="font-size:11px;color:var(--text3)">semanas seguidas</div>
        </div>
        <div>
          <div style="font-size:26px;font-weight:600;color:var(--text);letter-spacing:-.5px">${total > 0 ? Math.min(100,Math.round(total/(Math.max(streak,1)*3)*100)) : 0}%</div>
          <div style="font-size:11px;color:var(--text3)">consistencia</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">L · M · V por semana</div>
      ${weeks.length ? weeks.map(([weekKey, days]) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:10px;color:var(--text3);width:60px">${window.GymData.formatDate(weekKey + 'T00:00:00')}</span>
          ${['lunes','miercoles','viernes'].map(d => `
            <div style="width:20px;height:20px;border-radius:4px;background:${days.includes(d) ? 'var(--text)' : 'var(--bg3)'};border:1px solid var(--border)"></div>
          `).join('')}
        </div>`).join('') : `<div style="text-align:center;padding:12px;color:var(--text3);font-size:13px">Sin sesiones registradas aún</div>`}
    </div>

    <div style="background:var(--bg2);border-radius:var(--radius-md);padding:12px 14px">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px">Duración promedio</div>
      ${sessions.length ? (() => {
        const avg = Math.round(sessions.reduce((t, s) => t + (s.durationSeconds || 0), 0) / sessions.length);
        return `
          <div style="display:flex;align-items:baseline;gap:6px">
            <span style="font-size:28px;font-weight:600;color:var(--text);letter-spacing:-.5px">${Math.floor(avg/60)}:${String(avg%60).padStart(2,'0')}</span>
            <span style="font-size:13px;color:var(--text3)">min promedio</span>
            <span style="font-size:12px;font-weight:500;color:var(--green);margin-left:auto">${avg <= 105*60 ? 'dentro del límite' : 'sobre el límite'}</span>
          </div>`;
      })() : `<div style="color:var(--text3);font-size:13px">Sin datos aún</div>`}
    </div>`;
}

function switchProgressTab(el, panelId) {
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  ['prog-ejercicios','prog-musculos','prog-cuerpo','prog-asistencia'].forEach(id => {
    const p = document.getElementById(id);
    if (p) p.style.display = id === panelId ? 'block' : 'none';
  });
}

function openMeasuresLog() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:flex-end';
  modal.className = 'measures-modal';
  modal.innerHTML = `
    <div style="background:var(--bg);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;animation:slideUp .25s ease">
      <div style="font-size:17px;font-weight:600;margin-bottom:16px">Registrar medidas</div>
      ${[{k:'chest',l:'Pecho (cm)'},{k:'waist',l:'Cintura (cm)'},{k:'arm',l:'Brazo (cm)'},{k:'thigh',l:'Muslo (cm)'}].map(f => `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px">${f.l}</div>
          <input id="m-${f.k}" type="number" step="0.5" min="20" max="200" placeholder="—"
            style="width:100%;font-size:20px;font-weight:500;border:none;border-bottom:1.5px solid var(--border2);background:transparent;color:var(--text);padding:4px 0;outline:none;font-family:var(--font-mono)">
        </div>`).join('')}
      <button class="btn btn-primary" style="margin-top:8px" onclick="saveMeasures()">Guardar</button>
      <button class="btn btn-ghost" style="margin-top:8px" onclick="document.querySelector('.measures-modal').remove()">Cancelar</button>
    </div>`;
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
}

function saveMeasures() {
  const db = window.GymData.Storage.getDB();
  db.bodyMeasures = db.bodyMeasures || [];
  const entry = { date: new Date().toISOString() };
  ['chest','waist','arm','thigh'].forEach(k => {
    const v = parseFloat(document.getElementById('m-' + k)?.value);
    if (v) entry[k] = v;
  });
  if (!Object.keys(entry).length > 1) { showToast('Ingresa al menos una medida'); return; }
  db.bodyMeasures.push(entry);
  window.GymData.Storage.saveDB(db);
  document.querySelector('.measures-modal')?.remove();
  showToast('Medidas guardadas ✓');
  renderProgress();
}

window.renderProgress = renderProgress;
window.switchProgressTab = switchProgressTab;
window.selectProgressEx = selectProgressEx;
window.openMeasuresLog = openMeasuresLog;
window.saveMeasures = saveMeasures;
