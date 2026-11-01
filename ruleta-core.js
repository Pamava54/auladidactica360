/* =========================================================
   AULA DIDÁCTICA 360 · RULETAS
   window.MODO = 'preguntas'  → la ruleta sortea la PREGUNTA; todos responden desde el celular con tiempo.
   window.MODO = 'nombres'    → el profesor lanza la pregunta, la ruleta sortea al ESTUDIANTE que responde.
   Tipos de pregunta: 'multiple' (única respuesta), 'vf' (verdadero/falso), 'desc' (descriptiva).
   ========================================================= */
const MODO = window.MODO === 'nombres' ? 'nombres' : 'preguntas';

/* ---------------------------------------------------------
   UTILIDADES
   --------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const T_ = (s, v) => { const e = $(s); if (e) e.textContent = v; };
const H_ = (s, v) => { const e = $(s); if (e) e.innerHTML = v; };
const on = (s, ev, fn) => { const e = $(s); if (e) e.addEventListener(ev, fn); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const LET = ['A', 'B', 'C', 'D'];
const TIPOS = { multiple: 'Selección múltiple', vf: 'Verdadero / Falso', desc: 'Descriptiva' };
const TIPO_CORTO = { multiple: 'Múltiple', vf: 'V / F', desc: 'Descriptiva' };
const ES_PROFE = new URLSearchParams(location.search).has('profe');

const PT = {
  vf:       Object.assign({ ok: 50,  mal: -25, bonus: 25 }, (window.PUNTAJE || {}).vf),
  multiple: Object.assign({ ok: 100, mal: -30, bonus: 50 }, (window.PUNTAJE || {}).multiple),
  desc:     Object.assign({ ok: 150, parcial: 75, mal: 0 }, (window.PUNTAJE || {}).desc)
};

const cfg = window.FIREBASE_CONFIG || {};
const sinConfig = !cfg.apiKey || String(cfg.apiKey).includes('PEGAR') || !cfg.databaseURL || String(cfg.databaseURL).includes('PEGAR');
let db = null, offset = 0;
if (!sinConfig) {
  try {
    firebase.initializeApp(cfg);
    db = firebase.database();
    db.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
  } catch (e) { console.error(e); }
}
const ahora = () => Date.now() + offset;
const TS = () => firebase.database.ServerValue.TIMESTAMP;
const salaRef = c => db.ref('ad360/ruleta/' + c);

function mostrar(id){
  ['vEntrar', 'vEst', 'vClave', 'vProfe'].forEach(v => { $('#' + v).hidden = (v !== id); });
}
function rankear(jug){
  return Object.entries(jug || {}).map(([id, j]) => ({ id, nombre: j.nombre, puntos: j.puntos || 0 }))
    .sort((a, b) => b.puntos - a.puntos);
}
const medalla = (i, pts) => (pts > 0 && i < 3) ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.';

function tablaPuntajeHTML(){
  const bono = MODO === 'preguntas';
  const fila = (nom, t) => `<tr><td>${nom}</td><td>+${t.ok}${t.parcial ? ' (parcial +' + t.parcial + ')' : ''}</td><td>${t.mal}</td>${bono ? '<td>' + (t.bonus ? 'hasta +' + t.bonus : '—') + '</td>' : ''}</tr>`;
  return `<table class="tpt"><tr><th>Tipo</th><th>Acierto</th><th>Error</th>${bono ? '<th>Bono por rapidez</th>' : ''}</tr>
    ${fila('Verdadero / Falso', PT.vf)}${fila('Selección múltiple', PT.multiple)}${fila('Descriptiva', PT.desc)}</table>`;
}

/* ---------------------------------------------------------
   ARRANQUE
   --------------------------------------------------------- */
$$('[data-modo]').forEach(el => { if (el.dataset.modo !== MODO) el.remove(); });
T_('#titulo', MODO === 'nombres' ? '🎯 Ruleta de estudiantes' : '🎡 Ruleta de preguntas');
T_('#lblSeg', MODO === 'nombres' ? 'Segundos para que el elegido responda' : 'Segundos para responder');
$('#bannerCfg').hidden = !sinConfig;
H_('#tablaPuntaje', tablaPuntajeHTML());

/* ---------------------------------------------------------
   PROFESOR: CLAVE Y PESTAÑAS
   --------------------------------------------------------- */
on('#btnClave', 'click', validarClave);
on('#inClave', 'keydown', e => { if (e.key === 'Enter') validarClave(); });
function validarClave(){
  if ($('#inClave').value === String(window.CLAVE_PROFESOR || '')) {
    sessionStorage.setItem('ad360_ok', '1');
    abrirPanel();
  } else {
    T_('#errClave', 'Clave incorrecta');
  }
}
function abrirPanel(){
  mostrar('vProfe');
  formTipo();
  llenarBancos();
  renderPreguntas();
  actualizarInfoPartida();
}
on('#tbPreg', 'click', () => cambiarTab('preg'));
on('#tbPart', 'click', () => cambiarTab('part'));
function cambiarTab(t){
  $('#tabPreg').hidden = (t !== 'preg');
  $('#tabPartida').hidden = (t !== 'part');
  $('#tbPreg').classList.toggle('on', t === 'preg');
  $('#tbPart').classList.toggle('on', t === 'part');
  if (t === 'part') actualizarInfoPartida();
}

/* ---------------------------------------------------------
   PROFESOR: BANCO DE PREGUNTAS (compartido por las dos ruletas)
   --------------------------------------------------------- */
const KEY = 'ad360_preguntas';
function normalizar(p){
  return Object.assign({ tema: '', segundos: 20, modelo: '' }, p, { tipo: p.tipo || 'multiple' });
}
const leerP = () => { try { return (JSON.parse(localStorage.getItem(KEY)) || []).map(normalizar); } catch (e) { return []; } };
const guardarP = a => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { alert('No se pudo guardar en este navegador.'); } };
function opcionesDe(p){ return p.tipo === 'vf' ? ['Verdadero', 'Falso'] : (p.tipo === 'desc' ? null : p.opciones); }
let editId = null;

function formTipo(){
  const t = $('#pTipo').value;
  $('#boxMultiple').hidden = (t !== 'multiple');
  $('#boxVF').hidden = (t !== 'vf');
  $('#boxDesc').hidden = (t !== 'desc');
}
on('#pTipo', 'change', formTipo);

function infoCorrecta(p){
  if (p.tipo === 'multiple') return 'Correcta: ' + LET[p.correcta];
  if (p.tipo === 'vf') return 'Correcta: ' + (p.correcta === 0 ? 'Verdadero' : 'Falso');
  return p.modelo ? 'Modelo: ' + esc(p.modelo.slice(0, 60)) + (p.modelo.length > 60 ? '…' : '') : 'Sin respuesta modelo';
}
function renderPreguntas(){
  const arr = leerP();
  T_('#contP', '(' + arr.length + ')');
  const cont = $('#listaP');
  if (!arr.length) { cont.innerHTML = '<p class="muted">Aún no tienes preguntas. Agrega una arriba o carga las de ejemplo.</p>'; return; }
  cont.innerHTML = arr.map((p, i) => `
    <div class="pq">
      <div>
        <span class="badge ${p.tipo}">${TIPOS[p.tipo]}</span>
        <div class="t"><b>${i + 1}.</b> ${esc(p.texto)}</div>
        <div class="m">${p.tema ? esc(p.tema) + ' · ' : ''}${infoCorrecta(p)} · ${p.segundos}s</div>
      </div>
      <div class="row">
        <button class="sec" data-ed="${p.id}">✏️</button>
        <button class="red" data-del="${p.id}">🗑</button>
      </div>
    </div>`).join('');
}
on('#listaP', 'click', e => {
  const ed = e.target.closest('[data-ed]'), del = e.target.closest('[data-del]');
  if (ed) cargarEnForm(ed.dataset.ed);
  if (del && confirm('¿Borrar esta pregunta?')) {
    guardarP(leerP().filter(p => p.id !== del.dataset.del));
    renderPreguntas();
  }
});
function cargarEnForm(id){
  const p = leerP().find(x => x.id === id); if (!p) return;
  editId = id;
  T_('#tituloForm', 'Editar pregunta');
  $('#pTipo').value = p.tipo; formTipo();
  $('#pTema').value = p.tema || ''; $('#pTexto').value = p.texto; $('#pSeg').value = p.segundos;
  if (p.tipo === 'multiple') {
    ['pA', 'pB', 'pC', 'pD'].forEach((k, i) => { $('#' + k).value = p.opciones[i]; });
    $('#pOk').value = p.correcta;
  } else if (p.tipo === 'vf') {
    $('#pVF').value = p.correcta;
  } else {
    $('#pModelo').value = p.modelo || '';
  }
  $('#btnCancelar').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function limpiarForm(){
  editId = null; T_('#tituloForm', 'Agregar pregunta');
  ['pTema', 'pTexto', 'pA', 'pB', 'pC', 'pD', 'pModelo'].forEach(k => { $('#' + k).value = ''; });
  $('#pTipo').value = 'multiple'; $('#pOk').value = 0; $('#pVF').value = 0; $('#pSeg').value = 20;
  formTipo();
  $('#btnCancelar').hidden = true; T_('#errForm', '');
}
on('#btnCancelar', 'click', limpiarForm);
on('#btnGuardarP', 'click', () => {
  const tipo = $('#pTipo').value, texto = $('#pTexto').value.trim();
  const seg = clamp(parseInt($('#pSeg').value) || 20, 5, 600);
  T_('#errForm', '');
  if (!texto) { T_('#errForm', 'Escribe la pregunta.'); return; }
  const obj = { id: editId || uid(), tipo, tema: $('#pTema').value.trim(), texto, segundos: seg };
  if (tipo === 'multiple') {
    const ops = ['pA', 'pB', 'pC', 'pD'].map(k => $('#' + k).value.trim());
    if (ops.some(o => !o)) { T_('#errForm', 'Escribe las 4 opciones.'); return; }
    obj.opciones = ops; obj.correcta = parseInt($('#pOk').value);
  } else if (tipo === 'vf') {
    obj.correcta = parseInt($('#pVF').value);
  } else {
    obj.modelo = $('#pModelo').value.trim();
  }
  const arr = leerP();
  if (editId) { const i = arr.findIndex(x => x.id === editId); if (i >= 0) arr[i] = obj; else arr.push(obj); }
  else arr.push(obj);
  guardarP(arr); limpiarForm(); renderPreguntas();
});
on('#btnEjemplo', 'click', () => {
  const arr = leerP();
  arr.push(
    { id: uid(), tipo: 'multiple', tema: 'Activos', texto: '¿Cuál de estas cuentas es un activo?', opciones: ['Caja', 'Proveedores', 'Capital social', 'Ingresos'], correcta: 0, segundos: 20 },
    { id: uid(), tipo: 'vf', tema: 'Partida doble', texto: 'En todo asiento contable el total de los débitos es igual al total de los créditos.', correcta: 0, segundos: 15 },
    { id: uid(), tipo: 'desc', tema: 'Ecuación', texto: 'Explica con tus palabras qué es la ecuación contable.', modelo: 'Activo = Pasivo + Patrimonio: lo que tiene la empresa es igual a lo que debe más lo que es de sus dueños.', segundos: 60 }
  );
  guardarP(arr); renderPreguntas();
});
on('#btnBorrarTodo', 'click', () => { if (confirm('¿Borrar TODAS tus preguntas?')) { guardarP([]); renderPreguntas(); } });
on('#btnBajar', 'click', () => {
  const blob = new Blob([JSON.stringify(leerP(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'mis-preguntas-ruleta.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
on('#btnSubir', 'click', () => $('#fileCopia').click());
on('#fileCopia', 'change', e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      if (/\.json$/i.test(f.name)) {
        const data = JSON.parse(rd.result);
        if (!Array.isArray(data)) throw 0;
        const validas = data.map(normalizar).filter(p => p.texto && (
          (p.tipo === 'multiple' && Array.isArray(p.opciones) && p.opciones.length === 4 && p.correcta >= 0 && p.correcta <= 3) ||
          (p.tipo === 'vf' && (p.correcta === 0 || p.correcta === 1)) ||
          (p.tipo === 'desc')
        )).map(p => Object.assign({}, p, { id: uid(), segundos: +p.segundos || 20 }));
        guardarP(leerP().concat(validas)); renderPreguntas();
        alert('Se cargaron ' + validas.length + ' preguntas.');
      } else {
        T_('#resImport', importarTexto(String(rd.result)));
      }
    } catch (err) { alert('No pude leer ese archivo. Usa un .txt con el formato de las preguntas o una copia .json.'); }
    e.target.value = '';
  };
  rd.readAsText(f);
});

/* ---------- Importador inteligente: detecta el tipo de cada pregunta ---------- */
const SEG_DEF = { multiple: 20, vf: 15, desc: 60 };
function parsearPipes(lineas){
  const arr = [], malas = [];
  lineas.forEach((l, n) => {
    const p = l.split('|').map(x => x.trim());
    const k = (p[0] || '').toUpperCase();
    if (k === 'VF') {
      const c = (p[2] || '').toUpperCase(), idx = c.startsWith('V') ? 0 : (c.startsWith('F') ? 1 : -1);
      if (!p[1] || idx < 0) { malas.push('Línea ' + (n + 1)); return; }
      arr.push({ tipo: 'vf', tema: '', texto: p[1], correcta: idx, segundos: clamp(parseInt(p[3]) || SEG_DEF.vf, 5, 600) }); return;
    }
    if (k === 'D') {
      if (!p[1]) { malas.push('Línea ' + (n + 1)); return; }
      arr.push({ tipo: 'desc', tema: '', texto: p[1], modelo: p[2] || '', segundos: clamp(parseInt(p[3]) || SEG_DEF.desc, 5, 600) }); return;
    }
    const q = (k === 'M') ? p.slice(1) : p;
    const idx = LET.indexOf((q[5] || '').toUpperCase());
    if (q.length < 6 || !q[0] || q.slice(1, 5).some(x => !x) || idx < 0) { malas.push('Línea ' + (n + 1)); return; }
    arr.push({ tipo: 'multiple', tema: '', texto: q[0], opciones: q.slice(1, 5), correcta: idx, segundos: clamp(parseInt(q[6]) || SEG_DEF.multiple, 5, 600) });
  });
  return { arr, malas };
}
function parsearNatural(texto){
  const RE_NUM = /^\s*(?:pregunta\s*)?(\d+)\s*[\.\)\-:]\s*(.*)$/i;
  const RE_OPC = /^\s*\(?([A-Da-d])\s*[\.\)\-:]\s*(.+)$/;
  const RE_MODELO = /^\s*(?:respuesta\s+modelo|respuesta\s+esperada|modelo|criterio(?:\s+de\s+calificaci[oó]n)?)\s*[:\-]\s*(.+)$/i;
  const RE_RESP = /^\s*(?:respuesta(?:\s+correcta)?|correcta|rta|clave|answer)\s*[:\-]\s*(.+)$/i;
  const RE_SEG = /^\s*(?:tiempo|segundos)\s*[:\-]\s*(\d+)/i;
  const RE_TEMA = /^\s*tema\s*[:\-]\s*(.+)$/i;
  const lineas = texto.replace(/\r/g, '').split('\n').map(l => l.trim());
  const hayNum = lineas.some(l => RE_NUM.test(l) && !RE_OPC.test(l));
  const bloques = []; let cur = null;
  lineas.forEach(l => {
    if (!l) { if (!hayNum && cur) { bloques.push(cur); cur = null; } return; }
    if (hayNum && RE_NUM.test(l) && !RE_OPC.test(l)) { if (cur) bloques.push(cur); cur = [l]; }
    else { if (!cur) cur = []; cur.push(l); }
  });
  if (cur) bloques.push(cur);
  const arr = [], malas = [];
  bloques.forEach((b, bi) => {
    const nom = 'Pregunta ' + (bi + 1);
    let m = RE_NUM.exec(b[0]);
    let texto = (m && hayNum ? m[2] : b[0]).trim();
    const opciones = [], marcadas = [];
    let resp = '', modelo = '', seg = 0, tema = '', enModelo = false;
    b.slice(1).forEach(l => {
      let mm;
      if ((mm = RE_TEMA.exec(l))) { tema = mm[1].trim(); enModelo = false; }
      else if ((mm = RE_SEG.exec(l))) { seg = parseInt(mm[1]); enModelo = false; }
      else if ((mm = RE_MODELO.exec(l))) { modelo = mm[1].trim(); enModelo = true; }
      else if ((mm = RE_RESP.exec(l))) { resp = mm[1].trim(); enModelo = false; }
      else if ((mm = RE_OPC.exec(l)) && opciones.length < 4 && mm[1].toUpperCase() === LET[opciones.length]) {
        let t = mm[2].trim();
        const marca = /(?:✓|✔|\(correcta\))\s*$/i.test(t) || t.startsWith('*');
        t = t.replace(/\s*(?:✓|✔|\(correcta\))\s*$/i, '').replace(/^\*\s*/, '').trim();
        if (marca) marcadas.push(opciones.length);
        opciones.push(t); enModelo = false;
      }
      else if (enModelo) modelo += ' ' + l;
      else if (!opciones.length && !resp) texto += ' ' + l;
    });
    if (!texto) { malas.push(nom + ': sin texto'); return; }
    if (opciones.length) {
      if (opciones.length !== 4) { malas.push(nom + ': necesita 4 opciones (A, B, C y D)'); return; }
      let idx = marcadas.length ? marcadas[0] : -1;
      const ml = /^\(?([A-Da-d])\b/.exec(resp);
      if (ml) idx = LET.indexOf(ml[1].toUpperCase());
      if (idx < 0) { malas.push(nom + ': falta la respuesta correcta (ej. "Respuesta: B")'); return; }
      arr.push({ tipo: 'multiple', tema, texto, opciones, correcta: idx, segundos: clamp(seg || SEG_DEF.multiple, 5, 600) });
      return;
    }
    const rl = resp.toLowerCase();
    const prefijo = /^\s*(?:verdadero\s*(?:o|\/)\s*falso|v\s*\/\s*f)\s*[:\.\-\)]?\s*/i;
    const esVF = /^(verdadero|falso|v|f|true|false)\b/.test(rl) || prefijo.test(texto);
    if (esVF) {
      const idx = /^(verdadero|v|true)\b/.test(rl) ? 0 : (/^(falso|f|false)\b/.test(rl) ? 1 : -1);
      if (idx < 0) { malas.push(nom + ': falta "Respuesta: Verdadero" o "Falso"'); return; }
      arr.push({ tipo: 'vf', tema, texto: texto.replace(prefijo, '').trim() || texto, correcta: idx, segundos: clamp(seg || SEG_DEF.vf, 5, 600) });
      return;
    }
    arr.push({ tipo: 'desc', tema, texto, modelo: (modelo || resp).trim(), segundos: clamp(seg || SEG_DEF.desc, 5, 600) });
  });
  return { arr, malas };
}
function importarTexto(texto){
  const lineas = texto.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lineas.length) return 'No hay nada para importar.';
  const r = lineas.every(l => l.includes('|')) ? parsearPipes(lineas) : parsearNatural(texto);
  const actuales = leerP(), vistos = new Set(actuales.map(p => p.texto.toLowerCase()));
  const nuevas = r.arr.filter(p => !vistos.has(p.texto.toLowerCase())).map(p => Object.assign({ id: uid(), tema: '', modelo: '' }, p));
  guardarP(actuales.concat(nuevas)); renderPreguntas();
  const c = { multiple: 0, vf: 0, desc: 0 }; nuevas.forEach(p => { c[p.tipo]++; });
  let msg = nuevas.length + ' preguntas importadas (' + c.multiple + ' de selección múltiple, ' + c.vf + ' de verdadero/falso, ' + c.desc + ' descriptivas).';
  const rep = r.arr.length - nuevas.length; if (rep) msg += ' ' + rep + ' ya estaban y se omitieron.';
  if (r.malas.length) msg += ' No pude leer: ' + r.malas.join('; ') + '.';
  return msg;
}
on('#btnImportar', 'click', () => {
  const t = importarTexto($('#bulk').value);
  T_('#resImport', t);
  if (!/No pude leer|No hay nada/.test(t)) $('#bulk').value = '';
});

/* ---------- Bancos de preguntas listos ---------- */
function llenarBancos(){
  const sel = $('#selBanco'); if (!sel || sel.options.length) return;
  (window.BANCOS || []).forEach(b => {
    const o = document.createElement('option'); o.value = b.id;
    o.textContent = b.nombre + ' (' + b.preguntas.length + ' preguntas)'; sel.appendChild(o);
  });
}
on('#btnBanco', 'click', () => {
  const b = (window.BANCOS || []).find(x => x.id === $('#selBanco').value); if (!b) return;
  const actuales = leerP(), vistos = new Set(actuales.map(p => p.texto.toLowerCase()));
  const nuevas = b.preguntas.filter(p => !vistos.has(p.texto.toLowerCase())).map(p => Object.assign({ id: uid(), modelo: '' }, p));
  guardarP(actuales.concat(nuevas)); renderPreguntas();
  T_('#resBanco', nuevas.length ? '✅ Se agregaron ' + nuevas.length + ' preguntas de «' + b.nombre + '».' : 'Ese banco ya estaba cargado completo.');
});

/* ---------------------------------------------------------
   PROFESOR: PARTIDA (estado)
   --------------------------------------------------------- */
let room = null, code = null, usadas = new Set(), ronda = 0, fase = 'espera';
let jugadoresSnap = {}, preguntaActual = null, correctaLocal = null, inicioSrv = 0, timerT = null, respRef = null;
let elegidos = new Set(), elegido = null, posPrev = {}, lastPts = {};

function tiposActivos(){
  return ['multiple', 'vf', 'desc'].filter(t => { const c = $('#chkT_' + t); return c && c.checked; });
}
function disponibles(){
  const t = tiposActivos();
  return leerP().filter(p => !usadas.has(p.id) && t.includes(p.tipo));
}
function actualizarInfoPartida(){
  const arr = leerP(), n = arr.length;
  const c = { multiple: 0, vf: 0, desc: 0 }; arr.forEach(p => { c[p.tipo]++; });
  T_('#infoPreg', n ? ('Tienes ' + n + ' preguntas: ' + c.multiple + ' de selección múltiple, ' + c.vf + ' de verdadero/falso y ' + c.desc + ' descriptivas.') : 'Primero agrega preguntas en la pestaña "Mis preguntas".');
  const btn = $('#btnCrear'); if (btn) btn.disabled = (!n || sinConfig);
  if (room) T_('#sDisp', disponibles().length);
}
$$('.chip input').forEach(c => c.addEventListener('change', () => {
  if (!room) return;
  T_('#sDisp', disponibles().length);
  if (MODO === 'preguntas' && fase === 'espera') prepararRueda();
  actualizarBotonesNombres();
}));

function setVista(v){
  const show = (sel, b) => { const el = $(sel); if (el) el.hidden = !b; };
  if (v === 'fin') { ['#zonaRuleta', '#zonaPregunta', '#zonaLanzar'].forEach(s => show(s, false)); return; }
  if (MODO === 'preguntas') {
    show('#zonaRuleta', v === 'ruleta'); show('#zonaPregunta', v === 'pregunta');
  } else {
    show('#zonaLanzar', v === 'lanzar');
    show('#zonaPregunta', v !== 'lanzar');
    show('#zonaRuleta', v === 'sorteo');
    show('#turnoBox', v === 'turno' || v === 'resultado');
    show('#gradeBtns', v === 'turno');
    show('#btnPasar', v === 'turno');
    show('#btnSigN', v === 'resultado');
  }
}

on('#btnCrear', 'click', async () => {
  if (sinConfig) return;
  $('#btnCrear').disabled = true;
  let c, ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    c = String(Math.floor(1000 + Math.random() * 9000));
    const s = await salaRef(c).child('estado').once('value');
    ok = !s.exists();
  }
  if (!ok) { alert('No se pudo crear una sala. Intenta de nuevo.'); $('#btnCrear').disabled = false; return; }
  code = c; room = salaRef(code); usadas = new Set(); ronda = 0; fase = 'espera';
  elegidos = new Set(); elegido = null; posPrev = {}; lastPts = {}; preguntaActual = null;
  await room.set({ estado: 'espera', ronda: 0, modo: MODO, creada: TS() });
  room.child('jugadores').on('value', s => {
    jugadoresSnap = s.val() || {};
    renderRankProfe();
    if (MODO === 'nombres' && fase === 'pregunta') prepararRuedaNombres();
  });
  T_('#sCodigo', code);
  $('#pSinSala').hidden = true; $('#pSala').hidden = false;
  $('#btnSalir').hidden = true; $('#btnFin').hidden = false;
  if (MODO === 'preguntas') { setVista('ruleta'); prepararRueda(); } else setVista('lanzar');
  T_('#sDisp', disponibles().length);
});

/* ---------- Ranking en vivo (pantalla del profesor) ---------- */
function posicionesActuales(){
  const m = {}; rankear(jugadoresSnap).forEach((j, i) => { m[j.id] = i; }); return m;
}
function renderRankProfe(){
  const r = rankear(jugadoresSnap);
  T_('#sJug', r.length); T_('#tTotal', r.length);
  const li = r.map((j, i) => {
    const u = jugadoresSnap[j.id].ultimo;
    const d = (u && ronda > 0 && u.ronda === ronda) ? u : null;
    const prev = posPrev[j.id];
    let mov = '';
    if (prev != null && ronda > 0) { if (prev > i) mov = '<span class="mov up">▲</span>'; else if (prev < i) mov = '<span class="mov down">▼</span>'; }
    let badge = '';
    if (d) {
      if (d.ok === true || d.ok === 'p') badge = `<span class="delta ok">+${d.delta}</span>`;
      else if (d.ok === false) badge = `<span class="delta bad">${d.delta}</span>`;
      else badge = `<span class="delta none">sin respuesta</span>`;
    }
    const flash = (lastPts[j.id] !== undefined && lastPts[j.id] !== j.puntos) ? ' class="flash"' : '';
    return `<li${flash}><span><b class="pos">${medalla(i, j.puntos)}</b> ${esc(j.nombre)} ${mov}</span><span>${badge}<b class="pts">${j.puntos}</b></span></li>`;
  }).join('');
  H_('#sRank', li || '<li><span class="muted">Esperando estudiantes…</span></li>');
  lastPts = {}; r.forEach(j => { lastPts[j.id] = j.puntos; });
  actualizarBotonesNombres();
}

/* ---------- Ruleta (dibujo y giro, común a los dos modos) ---------- */
const COLORES = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16', '#e11d48'];
let rot = 0, segActuales = [];

function dibujar(items){
  const c = $('#rueda'), x = c.getContext('2d'), W = c.width, R = W / 2;
  x.clearRect(0, 0, W, W);
  if (!items.length) {
    x.fillStyle = '#e6e9f5'; x.beginPath(); x.arc(R, R, R - 4, 0, 2 * Math.PI); x.fill();
    x.fillStyle = '#667090'; x.font = 'bold 20px system-ui,Arial'; x.textAlign = 'center';
    x.fillText(MODO === 'nombres' ? 'Sin estudiantes' : 'Sin preguntas', R, R + 6);
    return;
  }
  const n = items.length, seg = 2 * Math.PI / n, fs = n > 12 ? 14 : 18;
  items.forEach((it, i) => {
    const a0 = -Math.PI / 2 + i * seg, a1 = a0 + seg;
    x.beginPath(); x.moveTo(R, R); x.arc(R, R, R - 4, a0, a1); x.closePath();
    x.fillStyle = COLORES[i % COLORES.length]; x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
    x.save(); x.translate(R, R); x.rotate(a0 + seg / 2);
    x.textAlign = 'right'; x.fillStyle = '#fff'; x.font = 'bold ' + fs + 'px system-ui,Arial';
    x.fillText(it.label, R - 18, fs / 3); x.restore();
  });
  x.beginPath(); x.arc(R, R, 22, 0, 2 * Math.PI); x.fillStyle = '#fff'; x.fill();
}
function resetRueda(){
  const c = $('#rueda');
  c.style.transition = 'none'; c.style.transform = 'rotate(0deg)'; rot = 0;
  return c;
}
function girarRueda(n){
  const i = Math.floor(Math.random() * n);
  const seg = 360 / n, centro = (i + 0.5) * seg, jitter = (Math.random() - 0.5) * seg * 0.6;
  const r0 = ((-(centro + jitter)) % 360 + 360) % 360;
  rot = Math.ceil(rot / 360) * 360 + 360 * 5 + r0;
  const c = $('#rueda');
  c.style.transition = 'transform 4.6s cubic-bezier(.12,.7,.1,1)';
  c.style.transform = 'rotate(' + rot + 'deg)';
  return new Promise(res => setTimeout(() => res(i), 4900));
}

/* ---------- Pintar la pregunta en la pantalla del profesor ---------- */
function pintarPregunta(p){
  $('#zonaPregunta').classList.remove('revelar');
  H_('#tTipoBox', `<span class="badge ${p.tipo}">${TIPOS[p.tipo]}</span> <span class="muted">${esc(p.tema || '')}</span>`);
  T_('#tTexto', p.texto);
  const opc = opcionesDe(p);
  H_('#tOpc', opc ? opc.map((o, i) => `<div class="opt ${i === p.correcta ? 'es-correcta' : ''}" data-i="${i}"><span class="l">${p.tipo === 'vf' ? (i ? 'F' : 'V') : LET[i]}</span><span>${esc(o)}</span></div>`).join('') : '');
  H_('#tModelo', p.tipo === 'desc'
    ? '<b>Respuesta modelo / criterio:</b><br>' + esc(p.modelo || '(no escribiste una respuesta modelo)')
    : '<b>Respuesta correcta:</b> ' + (p.tipo === 'vf' ? opc[p.correcta] : LET[p.correcta] + '. ' + esc(opc[p.correcta])));
  const bv = $('#btnVer'); if (bv) bv.textContent = '👁 Ver respuesta correcta';
}
on('#btnVer', 'click', () => {
  const z = $('#zonaPregunta'); z.classList.toggle('revelar');
  $('#btnVer').textContent = z.classList.contains('revelar') ? '🙈 Ocultar respuesta' : '👁 Ver respuesta correcta';
});

/* ---------- Puntos ---------- */
async function sumar(id, delta, ok, rr){
  await room.child('jugadores/' + id + '/puntos').transaction(c => (c || 0) + delta);
  const u = { delta, ronda: rr };
  if (ok !== null && ok !== undefined) u.ok = ok;
  await room.child('jugadores/' + id + '/ultimo').set(u);
}
async function aplicarUnaVez(id, delta, ok, rr){
  const res = await room.child('respuestas/' + rr + '/' + id + '/pts').transaction(cur => (cur === null ? delta : undefined));
  if (!res.committed) return;
  await sumar(id, delta, ok, rr);
}
function deltaNivel(tipo, nivel){
  const T = PT[tipo];
  if (nivel === 'ok') return { delta: T.ok, ok: true };
  if (nivel === 'p') return { delta: T.parcial || 0, ok: 'p' };
  return { delta: T.mal, ok: false };
}

/* =========================================================
   MODO 1 · RULETA DE PREGUNTAS (todos responden con tiempo)
   ========================================================= */
function prepararRueda(){
  resetRueda();
  const copia = disponibles().slice().sort(() => Math.random() - 0.5).slice(0, 12);
  segActuales = copia.map(p => ({ p, label: (p.tema || TIPO_CORTO[p.tipo]).slice(0, 12) }));
  dibujar(segActuales);
  void $('#rueda').offsetWidth;
  $('#btnGirar').disabled = !segActuales.length;
  T_('#avisoRonda', segActuales.length ? '' : 'No quedan preguntas de los tipos elegidos. Marca otros tipos de pregunta o termina el juego.');
}
on('#btnGirar', 'click', async () => {
  if (MODO !== 'preguntas') return;
  if (fase !== 'espera') return;
  if (!segActuales.length) { prepararRueda(); if (!segActuales.length) return; }
  fase = 'girando'; $('#btnGirar').disabled = true;
  room.update({ estado: 'girando' });
  const i = await girarRueda(segActuales.length);
  lanzarPregunta(segActuales[i].p);
});

async function lanzarPregunta(p){
  ronda += 1; usadas.add(p.id); preguntaActual = p;
  correctaLocal = (p.tipo === 'desc') ? null : p.correcta;
  posPrev = posicionesActuales();
  const opc = opcionesDe(p);
  const pregunta = { ronda, tipo: p.tipo, texto: p.texto, segundos: p.segundos };
  if (opc) pregunta.opciones = opc;
  if (MODO === 'preguntas') pregunta.inicio = TS();
  await room.update({ estado: 'pregunta', ronda, correcta: null, modelo: null, elegido: null, pregunta });
  T_('#sDisp', disponibles().length);
  pintarPregunta(p);
  if (MODO === 'preguntas') {
    const s = await room.child('pregunta/inicio').once('value');
    inicioSrv = s.val() || ahora();
    fase = 'pregunta'; setVista('pregunta');
    T_('#tResp', '0'); H_('#listaResp', '');
    $('#tRespuestas').hidden = (p.tipo !== 'desc');
    $('#btnCerrar').hidden = false; $('#btnSig').hidden = true;
    if (respRef) respRef.off();
    const rr = ronda;
    respRef = room.child('respuestas/' + rr);
    respRef.on('child_added', sn => procesarRespuesta(sn.key, sn.val(), rr));
    respRef.on('value', sn => { T_('#tResp', sn.numChildren()); });
    clearInterval(timerT); timerT = setInterval(tick, 250); tick();
  } else {
    fase = 'pregunta'; elegido = null;
    setVista('sorteo'); prepararRuedaNombres();
  }
}
function tick(){
  if (!preguntaActual || MODO !== 'preguntas') return;
  const total = preguntaActual.segundos * 1000;
  const resta = Math.max(0, inicioSrv + total - ahora());
  const seg = Math.ceil(resta / 1000);
  T_('#tTiempo', seg);
  $('#tTiempo').classList.toggle('low', seg <= 5);
  $('#tBarra').style.width = (100 * resta / total) + '%';
  if (resta <= 0 && fase === 'pregunta') { clearInterval(timerT); setTimeout(cerrarRonda, 1500); }
}
on('#btnCerrar', 'click', () => { clearInterval(timerT); cerrarRonda(); });

/* Respuesta automática (múltiple / V-F): bien = base + bono por rapidez; mal = penalización */
function deltaAuto(r){
  const p = preguntaActual, T = PT[p.tipo];
  if (!r || r.op == null || r.t == null) return { delta: 0, ok: null };
  if (r.t > inicioSrv + p.segundos * 1000 + 2000) return { delta: 0, ok: null };
  if (r.op === correctaLocal) {
    const usado = clamp((r.t - inicioSrv) / (p.segundos * 1000), 0, 1);
    return { delta: T.ok + Math.round((T.bonus || 0) * (1 - usado)), ok: true };
  }
  return { delta: T.mal, ok: false };
}
async function procesarRespuesta(id, val, rr){
  if (rr !== ronda || !preguntaActual) return;
  if (preguntaActual.tipo === 'desc') { agregarFilaDesc(id, val); return; }
  const r = deltaAuto(val);
  await aplicarUnaVez(id, r.delta, r.ok, rr);
}
function agregarFilaDesc(id, val){
  const lista = $('#listaResp'); if (!lista || document.getElementById('fr_' + id)) return;
  const nombre = (jugadoresSnap[id] || {}).nombre || 'Estudiante';
  const tarde = val && val.t && inicioSrv && val.t > inicioSrv + preguntaActual.segundos * 1000 + 2000;
  const div = document.createElement('div');
  div.className = 'ansrow'; div.id = 'fr_' + id;
  div.innerHTML = `<div class="who">${esc(nombre)} ${tarde ? '<span class="muted">(llegó tarde)</span>' : ''}</div>
    <div class="txt">${esc(val && val.txt)}</div>
    <div class="gb"><button class="green" data-g="ok" data-id="${esc(id)}">✓ Correcta +${PT.desc.ok}</button>
    <button class="amber" data-g="p" data-id="${esc(id)}">½ Parcial +${PT.desc.parcial}</button>
    <button class="red" data-g="mal" data-id="${esc(id)}">✗ Incorrecta ${PT.desc.mal}</button></div>`;
  lista.appendChild(div);
}
on('#listaResp', 'click', async e => {
  const b = e.target.closest('[data-g]'); if (!b || b.disabled) return;
  const id = b.dataset.id, nivel = b.dataset.g, fila = document.getElementById('fr_' + id);
  fila.querySelectorAll('button').forEach(x => { x.disabled = true; });
  const { delta, ok } = deltaNivel('desc', nivel);
  await aplicarUnaVez(id, delta, ok, ronda);
  const gb = fila.querySelector('.gb');
  gb.innerHTML = `<span class="delta ${ok === false ? 'bad' : 'ok'}">${delta > 0 ? '+' : ''}${delta} · ${nivel === 'ok' ? 'Correcta' : nivel === 'p' ? 'Parcial' : 'Incorrecta'}</span>`;
});

async function cerrarRonda(){
  if (fase !== 'pregunta' || MODO !== 'preguntas') return;
  fase = 'resultado'; clearInterval(timerT);
  if (respRef) respRef.off();
  const rr = ronda, p = preguntaActual;
  const [sr, sj] = await Promise.all([room.child('respuestas/' + rr).once('value'), room.child('jugadores').once('value')]);
  const resp = sr.val() || {}, jug = sj.val() || {};
  const tareas = [];
  Object.keys(jug).forEach(id => {
    const r = resp[id];
    if (!r) tareas.push(room.child('jugadores/' + id + '/ultimo').set({ delta: 0, ronda: rr }));
    else if (p.tipo !== 'desc' && r.pts === undefined) { const d = deltaAuto(r); tareas.push(aplicarUnaVez(id, d.delta, d.ok, rr)); }
  });
  await Promise.all(tareas);
  await room.update({ estado: 'resultado', correcta: correctaLocal, modelo: p.modelo || null });
  const cuenta = [0, 0, 0, 0];
  Object.values(resp).forEach(r => { if (r && r.op >= 0 && r.op <= 3) cuenta[r.op]++; });
  $$('#tOpc .opt').forEach((el, i) => {
    el.insertAdjacentHTML('beforeend', `<span class="muted" style="margin-left:auto">${cuenta[i]}</span>`);
  });
  $('#zonaPregunta').classList.add('revelar');
  $('#btnCerrar').hidden = true; $('#btnSig').hidden = false;
  $('#btnSig').disabled = false;
  T_('#btnSig', 'Siguiente → girar ruleta');
}
on('#btnSig', 'click', () => {
  fase = 'espera'; setVista('ruleta');
  room.update({ estado: 'espera' });
  prepararRueda();
});

/* =========================================================
   MODO 2 · RULETA DE ESTUDIANTES (la ruleta elige quién responde)
   ========================================================= */
function actualizarBotonesNombres(){
  if (MODO !== 'nombres') return;
  const hay = Object.keys(jugadoresSnap).length > 0;
  const bl = $('#btnLanzar'); if (bl) bl.disabled = !hay || !disponibles().length;
  const bg = $('#btnGirar'); if (bg && fase === 'pregunta') bg.disabled = !segActuales.length;
}
function prepararRuedaNombres(){
  resetRueda();
  const ids = Object.keys(jugadoresSnap);
  const noRep = $('#chkNoRepetir') && $('#chkNoRepetir').checked;
  let pool = noRep ? ids.filter(id => !elegidos.has(id)) : ids.slice();
  if (!pool.length && ids.length) { elegidos.clear(); pool = ids.slice(); T_('#avisoRonda', '🔄 Participaron todos: la lista se reinició.'); }
  else if (pool.length === ids.length) T_('#avisoRonda', '');
  segActuales = pool.sort(() => Math.random() - 0.5).slice(0, 16)
    .map(id => ({ id, nombre: jugadoresSnap[id].nombre, label: String(jugadoresSnap[id].nombre).slice(0, 14) }));
  dibujar(segActuales);
  void $('#rueda').offsetWidth;
  $('#btnGirar').disabled = !segActuales.length;
}
on('#btnLanzar', 'click', () => {
  if (fase !== 'espera') return;
  const d = disponibles();
  if (!d.length) { alert('No quedan preguntas de los tipos elegidos.'); return; }
  if (!Object.keys(jugadoresSnap).length) { alert('Agrega al menos un estudiante.'); return; }
  lanzarPregunta(d[Math.floor(Math.random() * d.length)]);
});
on('#btnGirar', 'click', async () => {
  if (MODO !== 'nombres' || fase !== 'pregunta' || !segActuales.length) return;
  fase = 'girando'; $('#btnGirar').disabled = true;
  room.update({ estado: 'girando' });
  const i = await girarRueda(segActuales.length);
  elegido = segActuales[i]; elegidos.add(elegido.id);
  fase = 'turno';
  await room.update({ estado: 'turno', elegido: { id: elegido.id, nombre: elegido.nombre } });
  T_('#turnoNombre', elegido.nombre); T_('#turnoRes', '');
  const esDesc = preguntaActual.tipo === 'desc';
  $('#gP').hidden = !esDesc;
  const T = PT[preguntaActual.tipo];
  T_('#gOk', '✓ Correcta +' + T.ok); T_('#gP', '½ Parcial +' + (T.parcial || 0)); T_('#gMal', '✗ Incorrecta ' + T.mal);
  iniciarContador(); setVista('turno');
});
function iniciarContador(){
  const fin = Date.now() + preguntaActual.segundos * 1000;
  clearInterval(timerT);
  const paso = () => {
    const rest = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    T_('#turnoTiempo', rest); $('#turnoTiempo').classList.toggle('low', rest <= 5);
    if (rest <= 0) clearInterval(timerT);
  };
  timerT = setInterval(paso, 250); paso();
}
on('#gradeBtns', 'click', async e => {
  const b = e.target.closest('[data-g]'); if (!b) return;
  if (fase !== 'turno' || !elegido) return;
  fase = 'resultado'; clearInterval(timerT);
  const { delta, ok } = deltaNivel(preguntaActual.tipo, b.dataset.g);
  await sumar(elegido.id, delta, ok, ronda);
  await room.update({ estado: 'resultado', correcta: correctaLocal, modelo: preguntaActual.modelo || null });
  T_('#turnoRes', (ok === true ? '✅ ¡Correcta! ' : ok === 'p' ? '🟡 Parcial ' : '❌ Incorrecta ') + (delta > 0 ? '+' : '') + delta + ' puntos');
  $('#zonaPregunta').classList.add('revelar');
  setVista('resultado');
});
on('#btnPasar', 'click', () => {
  if (fase !== 'turno') return;
  clearInterval(timerT); fase = 'pregunta'; elegido = null;
  room.update({ estado: 'pregunta', elegido: null });
  setVista('sorteo'); prepararRuedaNombres();
});
on('#btnSigN', 'click', () => {
  fase = 'espera'; elegido = null;
  room.update({ estado: 'espera', elegido: null });
  setVista('lanzar'); actualizarBotonesNombres();
});
/* Agregar estudiantes a mano (para quien no usa celular) */
async function agregarNombres(lista){
  if (!room) return;
  const nombres = lista.map(n => n.trim()).filter(Boolean).slice(0, 60);
  for (const n of nombres) {
    const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await room.child('jugadores/' + id).set({ nombre: n.slice(0, 24), puntos: 0, manual: true });
  }
}
on('#btnNomAdd', 'click', async () => { const v = $('#nomNuevo').value; $('#nomNuevo').value = ''; await agregarNombres([v]); });
on('#nomNuevo', 'keydown', async e => { if (e.key === 'Enter') { const v = $('#nomNuevo').value; $('#nomNuevo').value = ''; await agregarNombres([v]); } });
on('#btnNomLista', 'click', async () => { const v = $('#nomLista').value; $('#nomLista').value = ''; await agregarNombres(v.split('\n')); });

/* ---------- Terminar y salir ---------- */
on('#btnFin', 'click', async () => {
  if (!confirm('¿Terminar el juego y mostrar el ganador a todos?')) return;
  clearInterval(timerT); fase = 'fin';
  if (respRef) respRef.off();
  await room.update({ estado: 'fin' });
  setVista('fin');
  $('#btnFin').hidden = true; $('#btnSalir').hidden = false;
});
on('#btnSalir', 'click', async () => {
  if (!confirm('Se borrará la sala y los puntos. ¿Continuar?')) return;
  if (respRef) respRef.off();
  room.child('jugadores').off();
  await room.remove();
  room = null; code = null; jugadoresSnap = {};
  $('#pSala').hidden = true; $('#pSinSala').hidden = false;
  actualizarInfoPartida();
});

/* =========================================================
   ESTUDIANTE
   ========================================================= */
let ME = null, S = {}, miResp = { ronda: 0, op: null, txt: null }, timerE = null, estRoom = null, sigEst = '';

function iniciarEstudiante(){
  if (sinConfig) { $('#bannerCfg').hidden = false; }
  const guard = sessionStorage.getItem('ad360_est');
  if (guard && db) {
    try {
      const g = JSON.parse(guard);
      salaRef(g.code).child('jugadores/' + g.id).once('value').then(s => {
        if (s.exists()) { ME = g; conectarEstudiante(); } else { sessionStorage.removeItem('ad360_est'); mostrar('vEntrar'); }
      });
      return;
    } catch (e) { sessionStorage.removeItem('ad360_est'); }
  }
  mostrar('vEntrar');
}
on('#btnEntrar', 'click', entrar);
on('#inNombre', 'keydown', e => { if (e.key === 'Enter') entrar(); });
async function entrar(){
  const c = $('#inCodigo').value.trim(), nombre = $('#inNombre').value.trim();
  T_('#errEntrar', '');
  if (sinConfig || !db) { T_('#errEntrar', 'El juego aún no está configurado. Avisa al profesor.'); return; }
  if (!/^\d{4}$/.test(c)) { T_('#errEntrar', 'El código tiene 4 números.'); return; }
  if (!nombre) { T_('#errEntrar', 'Escribe tu nombre.'); return; }
  $('#btnEntrar').disabled = true;
  try {
    const [se, sm] = await Promise.all([salaRef(c).child('estado').once('value'), salaRef(c).child('modo').once('value')]);
    if (!se.exists()) { T_('#errEntrar', 'No encontré esa sala. Revisa el código.'); return; }
    if (se.val() === 'fin') { T_('#errEntrar', 'Esa partida ya terminó.'); return; }
    const modoSala = sm.val() || 'preguntas';
    if (modoSala !== MODO) {
      T_('#errEntrar', 'Esa sala es de la «' + (modoSala === 'nombres' ? 'Ruleta de estudiantes' : 'Ruleta de preguntas') + '». Pide al profesor el enlace de ese juego.');
      return;
    }
    const id = 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await salaRef(c).child('jugadores/' + id).set({ nombre, puntos: 0 });
    ME = { code: c, id, nombre };
    sessionStorage.setItem('ad360_est', JSON.stringify(ME));
    conectarEstudiante();
  } catch (e) { T_('#errEntrar', 'No se pudo conectar. Revisa tu internet.'); }
  finally { $('#btnEntrar').disabled = false; }
}
function conectarEstudiante(){
  mostrar('vEst');
  estRoom = salaRef(ME.code);
  ['estado', 'pregunta', 'correcta', 'modelo', 'elegido', 'jugadores'].forEach(k => {
    estRoom.child(k).on('value', s => {
      S[k] = s.val();
      if (k === 'jugadores') renderEstRank();
      renderEst();
    });
  });
  clearInterval(timerE); timerE = setInterval(tickEst, 250);
}

function opcionesPreg(p){ return p.tipo === 'vf' ? ['Verdadero', 'Falso'] : (p.tipo === 'desc' ? null : (p.opciones || [])); }
function letraOp(p, i){ return p.tipo === 'vf' ? (i ? 'F' : 'V') : LET[i]; }
function bloquePregunta(p, interactivo, ya, vencido){
  const opc = opcionesPreg(p);
  let cuerpo = '';
  if (opc) {
    cuerpo = opc.map((o, i) => interactivo
      ? `<button class="opt ${ya && miResp.op === i ? 'sel' : ''}" data-op="${i}" ${(ya || vencido) ? 'disabled' : ''}><span class="l">${letraOp(p, i)}</span><span>${esc(o)}</span></button>`
      : `<div class="opt"><span class="l">${letraOp(p, i)}</span><span>${esc(o)}</span></div>`).join('');
  } else if (interactivo) {
    cuerpo = `<textarea id="eTxt" maxlength="400" placeholder="Escribe tu respuesta…" ${(ya || vencido) ? 'disabled' : ''}>${ya ? esc(miResp.txt) : ''}</textarea>
      <button id="eEnviar" style="width:100%;margin-top:8px" ${(ya || vencido) ? 'disabled' : ''}>Enviar respuesta</button>`;
  }
  return `<span class="badge ${p.tipo}">${TIPOS[p.tipo]}</span><div class="qtext">${esc(p.texto)}</div>${cuerpo}`;
}
function tickEst(){
  const p = S.pregunta;
  if (MODO !== 'preguntas' || S.estado !== 'pregunta' || !p) return;
  const total = p.segundos * 1000, resta = Math.max(0, p.inicio + total - ahora());
  const t = $('#eTiempo'), b = $('#eBarra');
  if (t) { t.textContent = Math.ceil(resta / 1000); t.classList.toggle('low', resta <= 5000); }
  if (b) b.style.width = (100 * resta / total) + '%';
  if (resta <= 0) {
    $$('#estPanel .opt').forEach(el => { el.style.pointerEvents = 'none'; });
    if (p.tipo === 'desc' && miResp.ronda !== p.ronda) {
      const ta = $('#eTxt');
      if (ta && ta.value.trim()) enviarTxt(); else if (ta) { ta.disabled = true; const be = $('#eEnviar'); if (be) be.disabled = true; }
    }
  }
}
function textoResultado(ult){
  if (!ult) return '';
  if (ult.ok === true) return `<div class="res-ok">✅ ¡Correcto! +${ult.delta}</div>`;
  if (ult.ok === 'p') return `<div class="res-mid">🟡 Parcialmente correcto +${ult.delta}</div>`;
  if (ult.ok === false) return `<div class="res-bad">❌ Incorrecto ${ult.delta}</div>`;
  return `<div class="res-bad" style="color:var(--muted)">⏱ Sin respuesta (0)</div>`;
}
function respuestaCorrectaHTML(p){
  if (p.tipo === 'desc') return S.modelo ? `<p class="msg" style="margin:8px 0">Respuesta modelo:<br><b style="color:var(--ink)">${esc(S.modelo)}</b></p>` : '';
  const o = opcionesPreg(p)[S.correcta];
  return o === undefined ? '' : `<p class="msg" style="margin:8px 0">Respuesta correcta:<br><b style="color:var(--ink)">${letraOp(p, S.correcta)}. ${esc(o)}</b></p>`;
}
function renderEst(){
  const cont = $('#estPanel');
  if (!S.estado) { cont.innerHTML = '<p class="msg center">Conectando…</p>'; return; }
  const jug = S.jugadores || {}, yo = jug[ME.id], p = S.pregunta;
  H_('#miInfo', esc(ME.nombre) + ' · <b>' + (yo ? yo.puntos : 0) + '</b> pts');
  renderEstRank();

  if (S.estado === 'pregunta' && p && MODO === 'preguntas') {
    const ya = (miResp.ronda === p.ronda), vencido = ahora() > p.inicio + p.segundos * 1000;
    const key = 'p|' + p.ronda + '|' + (ya ? 1 : 0) + '|' + (vencido ? 1 : 0);
    if (key === sigEst) return;
    sigEst = key;
    cont.innerHTML = `<div class="timer" id="eTiempo">${p.segundos}</div><div class="bar"><i id="eBarra"></i></div>
      ${bloquePregunta(p, true, ya, vencido)}
      <p class="muted center">${ya ? '✔ Respuesta enviada. Espera el resultado…' : (vencido ? '⏱ Se acabó el tiempo' : (p.tipo === 'desc' ? 'Escribe y envía antes de que termine el tiempo' : 'Toca tu respuesta'))}</p>`;
    tickEst();
    return;
  }
  sigEst = '';

  if (S.estado === 'espera') {
    cont.innerHTML = `<div class="center"><div class="big">⏳</div><p class="msg">Esperando al profesor…<br>${MODO === 'nombres' ? 'Prepárate: lee y piensa cada pregunta' : 'Prepárate para la siguiente pregunta'}</p></div>
      <h3>Puntaje</h3>${tablaPuntajeHTML()}`;
  } else if (S.estado === 'girando') {
    cont.innerHTML = (MODO === 'nombres' && p ? bloquePregunta(p, false) : '') +
      `<div class="center"><div class="big">🎡</div><p class="msg">${MODO === 'nombres' ? 'Sorteando quién responde…' : '¡La ruleta está girando!'}</p></div>`;
  } else if (S.estado === 'pregunta' && p && MODO === 'nombres') {
    cont.innerHTML = bloquePregunta(p, false) + `<p class="msg center">🤔 Lee y piensa tu respuesta…<br>El profesor sorteará quién responde</p>`;
  } else if (S.estado === 'turno' && p && S.elegido) {
    const yoElegido = S.elegido.id === ME.id;
    cont.innerHTML = bloquePregunta(p, false) + (yoElegido
      ? `<div class="turnome">👉 ¡Te toca a ti, ${esc(S.elegido.nombre)}!<br><small>Responde en voz alta</small></div>`
      : `<div class="turno">Responde: <b>${esc(S.elegido.nombre)}</b></div>`);
  } else if (S.estado === 'resultado' && p) {
    const r = rankear(jug), pos = r.findIndex(x => x.id === ME.id) + 1;
    let msg = '';
    if (MODO === 'nombres') {
      const e = S.elegido, ue = e && jug[e.id] && jug[e.id].ultimo && jug[e.id].ultimo.ronda === p.ronda ? jug[e.id].ultimo : null;
      msg = e ? `<p class="msg" style="margin:0">Respondió <b style="color:var(--ink)">${esc(e.nombre)}</b></p>${textoResultado(ue)}` : '';
    } else {
      const ult = yo && yo.ultimo && yo.ultimo.ronda === p.ronda ? yo.ultimo : null;
      if (ult) msg = textoResultado(ult);
      else if (miResp.ronda === p.ronda) msg = `<div class="res-mid">⏳ El profesor está calificando tu respuesta…</div>`;
      else msg = textoResultado({ ok: null, delta: 0 });
    }
    cont.innerHTML = `<div class="center">${msg}${respuestaCorrectaHTML(p)}</div>
      <p class="muted center">Vas en el puesto ${pos} de ${r.length}. Esperando la siguiente pregunta…</p>`;
  } else if (S.estado === 'fin') {
    const r = rankear(jug), pos = r.findIndex(x => x.id === ME.id) + 1, top = r.slice(0, 3);
    cont.innerHTML = `
      <div class="center"><div class="big">🏆</div><h2>¡Juego terminado!</h2>
        ${top[0] ? `<p class="msg">Ganador: <b style="color:var(--ink)">${esc(top[0].nombre)}</b> con ${top[0].puntos} pts</p>` : ''}</div>
      <div class="podio">
        ${top[1] ? `<div class="p2">🥈<small>${esc(top[1].nombre)}</small>${top[1].puntos}</div>` : ''}
        ${top[0] ? `<div class="p1">🥇<small>${esc(top[0].nombre)}</small>${top[0].puntos}</div>` : ''}
        ${top[2] ? `<div class="p3">🥉<small>${esc(top[2].nombre)}</small>${top[2].puntos}</div>` : ''}
      </div>
      <p class="center msg">Quedaste en el puesto <b style="color:var(--ink)">${pos}</b> de ${r.length} con ${yo ? yo.puntos : 0} puntos.</p>
      ${listaRank(r, 10)}`;
    sessionStorage.removeItem('ad360_est');
  }
}
function listaRank(r, n){
  return '<ol class="rank">' + r.slice(0, n).map((j, i) =>
    `<li class="${ME && j.id === ME.id ? 'me' : ''}"><span>${medalla(i, j.puntos)} ${esc(j.nombre)}</span><b class="pts">${j.puntos}</b></li>`).join('') + '</ol>';
}
function renderEstRank(){
  const card = $('#estRankCard'); if (!card || !ME) return;
  const r = rankear(S.jugadores || {});
  if (!r.length || S.estado === 'fin') { card.hidden = true; return; }
  card.hidden = false;
  const pos = r.findIndex(x => x.id === ME.id);
  let html = listaRank(r, 5);
  if (pos >= 5) html += `<ol class="rank"><li class="me"><span>${pos + 1}. ${esc(ME.nombre)}</span><b class="pts">${r[pos].puntos}</b></li></ol>`;
  H_('#estRank', html);
}

/* Envío de respuestas */
function enviarOp(op){
  const p = S.pregunta;
  if (!p || S.estado !== 'pregunta' || miResp.ronda === p.ronda) return;
  if (ahora() > p.inicio + p.segundos * 1000) return;
  miResp = { ronda: p.ronda, op, txt: null };
  estRoom.child('respuestas/' + p.ronda + '/' + ME.id).set({ op, t: TS() });
  renderEst();
}
function enviarTxt(){
  const p = S.pregunta, ta = $('#eTxt');
  if (!p || !ta || S.estado !== 'pregunta' || miResp.ronda === p.ronda) return;
  const txt = ta.value.trim().slice(0, 400); if (!txt) return;
  miResp = { ronda: p.ronda, op: null, txt };
  estRoom.child('respuestas/' + p.ronda + '/' + ME.id).set({ txt, t: TS() });
  renderEst();
}
on('#estPanel', 'click', e => {
  const b = e.target.closest('[data-op]');
  if (b) { enviarOp(parseInt(b.dataset.op)); return; }
  if (e.target.closest('#eEnviar')) enviarTxt();
});

/* =========================================================
   ARRANQUE (al final, cuando todo ya está definido)
   ========================================================= */
if (ES_PROFE) {
  $('#linkJuegos').hidden = false;
  if (sessionStorage.getItem('ad360_ok') === '1') abrirPanel(); else mostrar('vClave');
} else {
  iniciarEstudiante();
}
