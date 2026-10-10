/**
 * Eventos culturais gratuitos
 * Fonte única: eventos.json
 * Ao guardar → descarrega automaticamente o JSON atualizado para fazeres push
 */

const EVENTOS_JSON = './eventos.json';

function getOffsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseDateTime(evento) {
  return new Date(`${evento.data}T${evento.hora || '00:00'}`);
}

function formatDia(dataStr) {
  return new Date(dataStr + 'T12:00:00').getDate();
}

function formatMes(dataStr) {
  return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase();
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

let eventos = [];
let filtroAtual = 'all';
let termoPesquisa = '';
let editandoId = null;

const $lista = document.getElementById('eventos');
const $empty = document.getElementById('empty-state');
const $modal = document.getElementById('modal-add');
const $form = document.getElementById('form-evento');
const $toast = document.getElementById('toast');
const $search = document.getElementById('search');
const $btnAdd = document.getElementById('btn-add');
const $btnNotif = document.getElementById('btn-notif');
const $btnClose = document.getElementById('btn-close-modal');
const $btnCancel = document.getElementById('btn-cancel');
const $modalTitle = document.getElementById('modal-title');

async function init() {
  await loadEventos();
  render();
  bindEvents();
  checkNotifPermission();
  registerServiceWorker();
  scheduleLocalNotifications();
}

async function loadEventos() {
  try {
    const res = await fetch(EVENTOS_JSON + '?t=' + Date.now());
    if (!res.ok) throw new Error('erro');
    eventos = await res.json();
  } catch {
    eventos = [];
  }
}

function getEventosFiltrados() {
  let lista = [...eventos];

  lista.sort((a, b) => parseDateTime(a) - parseDateTime(b));

  const limite = new Date();
  limite.setDate(limite.getDate() - 2);
  lista = lista.filter(e => parseDateTime(e) >= limite);

  if (filtroAtual === 'hoje') lista = lista.filter(e => isHoje(e.data));
  else if (filtroAtual === 'semana') lista = lista.filter(e => isEstaSemana(e.data));
  else if (filtroAtual === 'proximos') lista = lista.filter(e => isProximos30(e.data));

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

  lista.forEach(e => $lista.appendChild(criarCard(e)));
}

function criarCard(e) {
  const card = document.createElement('article');
  card.className = 'evento-card';

  const mapsHtml = e.maps
    ? `<a href="${e.maps}" target="_blank" rel="noopener">📍 ${escapeHtml(e.local)}</a>`
    : `<span>📍 ${escapeHtml(e.local)}</span>`;

  card.innerHTML = `
    <div class="evento-data">
      <span class="dia">${formatDia(e.data)}</span>
      <span class="mes">${formatMes(e.data)}</span>
      <span class="hora">${e.hora || '—'}</span>
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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

  // Descarrega automaticamente o JSON atualizado
  descarregarJSON();

  render();
  fecharModal();
  showToast('JSON descarregado. Substitui o eventos.json no GitHub e faz push.');
  scheduleLocalNotifications();
}

function apagarEvento(id) {
  if (!confirm('Apagar este evento?')) return;
  eventos = eventos.filter(e => e.id !== id);
  descarregarJSON();
  render();
  showToast('JSON descarregado. Substitui o eventos.json no GitHub e faz push.');
}

function descarregarJSON() {
  const dataStr = JSON.stringify(eventos, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eventos.json';
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 4000);
}

function checkNotifPermission() {
  if (!('Notification' in window)) {
    $btnNotif.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    $btnNotif.title = 'Notificações ativas';
  }
}

async function pedirNotificacoes() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    showToast('Notificações já ativas.');
    return;
  }

  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    showToast('Notificações ativadas.');
    scheduleLocalNotifications();
  } else {
    showToast('Permissão negada.');
  }
}

function scheduleLocalNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const agora = Date.now();
  const em24h = agora + 24 * 60 * 60 * 1000;

  eventos.forEach(e => {
    const dt = parseDateTime(e).getTime();
    const aviso = dt - 60 * 60 * 1000;

    if (aviso > agora && aviso < em24h) {
      setTimeout(() => {
        new Notification('Evento em breve', {
          body: `${e.titulo} · ${e.hora} · ${e.local}`,
          icon: 'icons/icon-192.png',
          tag: e.id
        });
      }, aviso - agora);
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

function bindEvents() {
  $btnAdd.addEventListener('click', () => abrirModal());
  $btnClose.addEventListener('click', fecharModal);
  $btnCancel.addEventListener('click', fecharModal);
  $form.addEventListener('submit', guardarEvento);
  $btnNotif.addEventListener('click', pedirNotificacoes);

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

init();
