/**
 * Agenda Grátis – App principal
 * Fonte de verdade: eventos.json (partilhado no GitHub)
 * localStorage só para pré-visualização local
 * Ordenação por data/hora crescente · PWA notifications
 */

const STORAGE_KEY = 'agenda-gratis-locais';
const EVENTOS_JSON = './eventos.json';

// Helpers de data
function getOffsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseDateTime(evento) {
  return new Date(`${evento.data}T${evento.hora || '00:00'}`);
}

function formatDia(dataStr) {
  const d = new Date(dataStr + 'T12:00:00');
  return d.getDate();
}

function formatMes(dataStr) {
  const d = new Date(dataStr + 'T12:00:00');
  return d.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase();
}

function formatHora(hora) {
  return hora || '—';
}

function isHoje(dataStr) {
  return dataStr === new Date().toISOString().slice(0, 10);
}

function isEstaSemana(dataStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + (7 - fim.getDay()));
  const d = new Date(dataStr + 'T12:00:00');
  return d >= hoje && d <= fim;
}

function isProximos30(dataStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + 30);
  const d = new Date(dataStr + 'T12:00:00');
  return d >= hoje && d <= fim;
}

// Estado
let eventosOficiais = [];   // vindos do eventos.json (partilhados)
let eventosLocais = [];     // só no teu browser (pré-visualização)
let filtroAtual = 'all';
let termoPesquisa = '';
let editandoId = null;

// DOM
const $lista = document.getElementById('eventos');
const $empty = document.getElementById('empty-state');
const $modal = document.getElementById('modal-add');
const $form = document.getElementById('form-evento');
const $toast = document.getElementById('toast');
const $exportBar = document.getElementById('export-bar');
const $search = document.getElementById('search');
const $btnAdd = document.getElementById('btn-add');
const $btnNotif = document.getElementById('btn-notif');
const $btnClose = document.getElementById('btn-close-modal');
const $btnCancel = document.getElementById('btn-cancel');
const $btnExport = document.getElementById('btn-export');
const $modalTitle = document.getElementById('modal-title');

// Inicialização
async function init() {
  await loadEventosOficiais();
  loadEventosLocais();
  render();
  bindEvents();
  checkNotifPermission();
  registerServiceWorker();
  scheduleLocalNotifications();
}

async function loadEventosOficiais() {
  try {
    const res = await fetch(EVENTOS_JSON + '?t=' + Date.now()); // evita cache agressivo
    if (!res.ok) throw new Error('Falha ao carregar eventos.json');
    eventosOficiais = await res.json();
  } catch (err) {
    console.warn('Não foi possível carregar eventos.json:', err);
    eventosOficiais = [];
    showToast('Não consegui carregar a lista oficial. A mostrar só os teus eventos locais.');
  }
}

function loadEventosLocais() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    eventosLocais = raw ? JSON.parse(raw) : [];
  } catch {
    eventosLocais = [];
  }
}

function saveEventosLocais() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(eventosLocais));
  updateExportBar();
}

function updateExportBar() {
  $exportBar.classList.toggle('hidden', eventosLocais.length === 0);
}

// Todos os eventos = oficiais + locais (sem duplicados por id)
function getTodosEventos() {
  const idsOficiais = new Set(eventosOficiais.map(e => e.id));
  const locaisUnicos = eventosLocais.filter(e => !idsOficiais.has(e.id));
  return [...eventosOficiais, ...locaisUnicos];
}

// Render
function getEventosFiltrados() {
  let lista = getTodosEventos();

  // Ordenar por data/hora crescente
  lista.sort((a, b) => parseDateTime(a) - parseDateTime(b));

  // Remover eventos muito antigos (mais de 2 dias)
  const limite = new Date();
  limite.setDate(limite.getDate() - 2);
  lista = lista.filter(e => parseDateTime(e) >= limite);

  // Filtro temporal
  if (filtroAtual === 'hoje') {
    lista = lista.filter(e => isHoje(e.data));
  } else if (filtroAtual === 'semana') {
    lista = lista.filter(e => isEstaSemana(e.data));
  } else if (filtroAtual === 'proximos') {
    lista = lista.filter(e => isProximos30(e.data));
  }

  // Pesquisa
  if (termoPesquisa.trim()) {
    const t = termoPesquisa.toLowerCase();
    lista = lista.filter(e =>
      e.titulo.toLowerCase().includes(t) ||
      e.local.toLowerCase().includes(t) ||
      (e.categoria || '').toLowerCase().includes(t) ||
      (e.descricao || '').toLowerCase().includes(t)
    );
  }

  return lista;
}

function render() {
  const lista = getEventosFiltrados();
  $lista.innerHTML = '';

  if (lista.length === 0) {
    $empty.classList.remove('hidden');
    return;
  }
  $empty.classList.add('hidden');

  lista.forEach(evento => {
    $lista.appendChild(criarCard(evento));
  });
}

function criarCard(e) {
  const card = document.createElement('article');
  card.className = 'evento-card';
  card.dataset.id = e.id;

  const isLocal = eventosLocais.some(l => l.id === e.id);
  const mapsHtml = e.maps
    ? `<a href="${e.maps}" target="_blank" rel="noopener" title="Abrir no Google Maps">📍 ${escapeHtml(e.local)}</a>`
    : `<span>📍 ${escapeHtml(e.local)}</span>`;

  card.innerHTML = `
    <div class="evento-data">
      <span class="dia">${formatDia(e.data)}</span>
      <span class="mes">${formatMes(e.data)}</span>
      <span class="hora">${formatHora(e.hora)}</span>
    </div>
    <div class="evento-info">
      <h3>${escapeHtml(e.titulo)}</h3>
      <div class="evento-meta">
        ${mapsHtml}
        ${e.categoria ? `<span>🏷 ${escapeHtml(e.categoria)}</span>` : ''}
        ${e.organizador ? `<span>👤 ${escapeHtml(e.organizador)}</span>` : ''}
      </div>
      ${e.descricao ? `<p class="evento-desc">${escapeHtml(e.descricao)}</p>` : ''}
      <div class="evento-tags">
        <span class="tag preco">${escapeHtml(e.preco || 'Gratuito')}</span>
        ${isHoje(e.data) ? '<span class="tag">Hoje</span>' : ''}
        ${isLocal ? '<span class="tag local">Só no teu browser</span>' : ''}
      </div>
    </div>
    <div class="evento-actions">
      ${isLocal ? `
        <button class="btn-icon" data-action="edit" title="Editar">✏️</button>
        <button class="btn-icon danger" data-action="delete" title="Apagar">🗑</button>
      ` : ''}
    </div>
  `;

  if (isLocal) {
    card.querySelector('[data-action="edit"]')?.addEventListener('click', () => abrirModal(e));
    card.querySelector('[data-action="delete"]')?.addEventListener('click', () => apagarEventoLocal(e.id));
  }

  return card;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Modal
function abrirModal(evento = null) {
  editandoId = evento ? evento.id : null;
  $modalTitle.textContent = evento ? 'Editar evento (local)' : 'Novo evento (pré-visualização local)';

  $form.titulo.value = evento?.titulo || '';
  $form.data.value = evento?.data || getOffsetDate(0);
  $form.hora.value = evento?.hora || '18:00';
  $form.local.value = evento?.local || '';
  $form.maps.value = evento?.maps || '';
  $form.categoria.value = evento?.categoria || 'Música';
  $form.preco.value = evento?.preco || 'Gratuito';
  $form.descricao.value = evento?.descricao || '';
  $form.organizador.value = evento?.organizador || '';

  $modal.showModal();
  $form.titulo.focus();
}

function fecharModal() {
  $modal.close();
  editandoId = null;
  $form.reset();
}

function guardarEvento(e) {
  e.preventDefault();

  const dados = {
    id: editandoId || crypto.randomUUID(),
    titulo: $form.titulo.value.trim(),
    data: $form.data.value,
    hora: $form.hora.value,
    local: $form.local.value.trim(),
    maps: $form.maps.value.trim(),
    categoria: $form.categoria.value,
    preco: $form.preco.value.trim() || 'Gratuito',
    descricao: $form.descricao.value.trim(),
    organizador: $form.organizador.value.trim()
  };

  if (editandoId) {
    const idx = eventosLocais.findIndex(ev => ev.id === editandoId);
    if (idx !== -1) eventosLocais[idx] = dados;
  } else {
    eventosLocais.push(dados);
  }

  saveEventosLocais();
  render();
  fecharModal();
  showToast('Evento guardado só no teu browser. Para partilhar com toda a gente, exporta o JSON e faz commit no GitHub.');
  scheduleLocalNotifications();
}

function apagarEventoLocal(id) {
  if (!confirm('Apagar este evento local? (Os oficiais não são afetados)')) return;
  eventosLocais = eventosLocais.filter(e => e.id !== id);
  saveEventosLocais();
  render();
  showToast('Evento local apagado.');
}

// Toast
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 4200);
}

// Notificações locais
function checkNotifPermission() {
  if (!('Notification' in window)) {
    $btnNotif.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    $btnNotif.querySelector('.btn-text').textContent = 'Ativas';
  }
}

async function pedirNotificacoes() {
  if (!('Notification' in window)) {
    showToast('O teu browser não suporta notificações.');
    return;
  }

  if (Notification.permission === 'granted') {
    showToast('Notificações já estão ativas.');
    return;
  }

  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    $btnNotif.querySelector('.btn-text').textContent = 'Ativas';
    showToast('Notificações ativadas! Vais ser avisado dos próximos eventos.');
    scheduleLocalNotifications();
  } else {
    showToast('Permissão negada.');
  }
}

function scheduleLocalNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const agora = Date.now();
  const em24h = agora + 24 * 60 * 60 * 1000;

  getTodosEventos().forEach(e => {
    const dt = parseDateTime(e).getTime();
    const aviso = dt - 60 * 60 * 1000; // 1 hora antes

    if (aviso > agora && aviso < em24h) {
      const delay = aviso - agora;
      setTimeout(() => {
        new Notification('Evento a começar em breve', {
          body: `${e.titulo} · ${e.hora} · ${e.local}`,
          icon: 'icons/icon-192.png',
          tag: e.id
        });
      }, delay);
    }
  });
}

// Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registado'))
      .catch(err => console.warn('SW falhou:', err));
  }
}

// Export JSON (para o dono do site fazer commit)
function exportarJSON() {
  // Junta oficiais + locais para facilitar o commit
  const todos = getTodosEventos();
  const dataStr = JSON.stringify(todos, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eventos.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON exportado! Substitui o eventos.json no repositório e faz commit.');
}

// Event listeners
function bindEvents() {
  $btnAdd.addEventListener('click', () => abrirModal());
  $btnClose.addEventListener('click', fecharModal);
  $btnCancel.addEventListener('click', fecharModal);
  $form.addEventListener('submit', guardarEvento);
  $btnNotif.addEventListener('click', pedirNotificacoes);
  $btnExport.addEventListener('click', exportarJSON);

  $search.addEventListener('input', e => {
    termoPesquisa = e.target.value;
    render();
  });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filtroAtual = chip.dataset.filter;
      render();
    });
  });

  $modal.addEventListener('cancel', fecharModal);
}

// Arranque
init();
