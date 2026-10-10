/**
 * Agenda Grátis – App principal
 * Ordenação por data/hora crescente · localStorage · PWA notifications
 * Vanilla JS moderno (ES modules ready)
 */

const STORAGE_KEY = 'agenda-gratis-eventos';
const DEFAULT_EVENTS = [
  {
    id: 'demo-1',
    titulo: 'Concerto ao ar livre – Jazz no Jardim',
    data: getOffsetDate(2),
    hora: '19:30',
    local: 'Jardim da Estrela, Lisboa',
    maps: 'https://maps.google.com/?q=Jardim+da+Estrela+Lisboa',
    categoria: 'Música',
    preco: 'Gratuito',
    descricao: 'Entrada livre. Levar manta ou cadeira. Em caso de chuva passa para o dia seguinte.',
    organizador: 'Câmara Municipal de Lisboa'
  },
  {
    id: 'demo-2',
    titulo: 'Exposição: Luz e Sombra – Fotografia Contemporânea',
    data: getOffsetDate(5),
    hora: '10:00',
    local: 'Museu de Arte Contemporânea, Porto',
    maps: 'https://maps.google.com/?q=Museu+de+Arte+Contemporanea+Porto',
    categoria: 'Exposição',
    preco: 'Gratuito',
    descricao: 'Aberto de terça a domingo. Visitas guiadas às 15h (mediante inscrição).',
    organizador: 'Fundação Serralves'
  },
  {
    id: 'demo-3',
    titulo: 'Sessão de cinema ao ar livre – Clássicos portugueses',
    data: getOffsetDate(0),
    hora: '21:00',
    local: 'Parque Eduardo VII, Lisboa',
    maps: 'https://maps.google.com/?q=Parque+Eduardo+VII+Lisboa',
    categoria: 'Cinema',
    preco: 'Gratuito',
    descricao: 'Filme: “Os Verdes Anos”. Trazer pipocas e boa disposição.',
    organizador: 'Cinemateca Portuguesa'
  }
];

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
let eventos = [];
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
function init() {
  loadEventos();
  render();
  bindEvents();
  checkNotifPermission();
  registerServiceWorker();
  scheduleLocalNotifications();
}

function loadEventos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      eventos = JSON.parse(raw);
    } else {
      eventos = [...DEFAULT_EVENTS];
      saveEventos();
    }
  } catch {
    eventos = [...DEFAULT_EVENTS];
  }
  // Remove eventos passados há mais de 2 dias (opcional)
  const limite = new Date();
  limite.setDate(limite.getDate() - 2);
  eventos = eventos.filter(e => parseDateTime(e) >= limite);
}

function saveEventos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
  updateExportBar();
}

function updateExportBar() {
  const temLocais = eventos.some(e => !e.id.startsWith('demo-'));
  $exportBar.classList.toggle('hidden', !temLocais);
}

// Render
function getEventosFiltrados() {
  let lista = [...eventos];

  // Ordenar por data/hora crescente
  lista.sort((a, b) => parseDateTime(a) - parseDateTime(b));

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
      </div>
    </div>
    <div class="evento-actions">
      <button class="btn-icon" data-action="edit" title="Editar">✏️</button>
      <button class="btn-icon danger" data-action="delete" title="Apagar">🗑</button>
    </div>
  `;

  card.querySelector('[data-action="edit"]').addEventListener('click', () => abrirModal(e));
  card.querySelector('[data-action="delete"]').addEventListener('click', () => apagarEvento(e.id));

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
  $modalTitle.textContent = evento ? 'Editar evento' : 'Novo evento';

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
    const idx = eventos.findIndex(ev => ev.id === editandoId);
    if (idx !== -1) eventos[idx] = dados;
  } else {
    eventos.push(dados);
  }

  saveEventos();
  render();
  fecharModal();
  showToast(editandoId ? 'Evento atualizado. Já estava na hora.' : 'Evento adicionado. Que o povo apareça!');
  scheduleLocalNotifications();
}

function apagarEvento(id) {
  if (!confirm('Tens a certeza que queres apagar este evento? Não há volta a dar.')) return;
  eventos = eventos.filter(e => e.id !== id);
  saveEventos();
  render();
  showToast('Evento apagado. Adeus e obrigado pelos peixes.');
}

// Toast
function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 3200);
}

// Notificações locais (Android / browsers que suportem)
function checkNotifPermission() {
  if (!('Notification' in window)) {
    $btnNotif.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    $btnNotif.querySelector('.btn-text').textContent = 'Ativas';
    $btnNotif.classList.add('active');
  }
}

async function pedirNotificacoes() {
  if (!('Notification' in window)) {
    showToast('O teu browser não suporta notificações. Que pena.');
    return;
  }

  if (Notification.permission === 'granted') {
    showToast('Notificações já estão ativas. Relaxa.');
    return;
  }

  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    $btnNotif.querySelector('.btn-text').textContent = 'Ativas';
    showToast('Notificações ativadas! Vais ser avisado dos próximos eventos.');
    scheduleLocalNotifications();
  } else {
    showToast('Permissão negada. Continuas no escuro.');
  }
}

function scheduleLocalNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Limpa timeouts anteriores (simples – em produção usarias uma queue)
  // Para cada evento nas próximas 24h, agenda uma notificação 1h antes
  const agora = Date.now();
  const em24h = agora + 24 * 60 * 60 * 1000;

  eventos.forEach(e => {
    const dt = parseDateTime(e).getTime();
    const aviso = dt - 60 * 60 * 1000; // 1 hora antes

    if (aviso > agora && aviso < em24h) {
      const delay = aviso - agora;
      setTimeout(() => {
        new Notification('Evento a começar em breve', {
          body: `${e.titulo} · ${e.hora} · ${e.local}`,
          icon: 'icons/icon-192.png',
          tag: e.id,
          requireInteraction: false
        });
      }, delay);
    }
  });
}

// Service Worker (PWA)
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registado – offline ready'))
      .catch(err => console.warn('SW falhou:', err));
  }
}

// Export JSON
function exportarJSON() {
  const dataStr = JSON.stringify(eventos, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eventos-agenda.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSON exportado. Agora é só fazer commit no GitHub.');
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

  // Fechar modal com Escape (já nativo no dialog, mas garantimos)
  $modal.addEventListener('cancel', fecharModal);
}

// Arranque
init();
