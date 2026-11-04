// A po tu le da? · Autor del código de la aplicación — Yandel Diaz
const api = window.downloads;
const byId = id => document.getElementById(id);
const url = byId('url');
const tabs = [...document.querySelectorAll('[role=tab]')];
const platforms = {
  tiktok: {
    name: 'TikTok',
    description: 'Baja un video suelto o los videos disponibles de un perfil público.',
    placeholder: 'Pega el enlace de TikTok'
  },
  instagram: {
    name: 'Instagram',
    description: 'Baja un reel o una publicación pública con video.',
    placeholder: 'Pega el enlace del reel o la publicación'
  },
  youtube: {
    name: 'YouTube',
    description: 'Baja un video o un Short en la mejor calidad disponible.',
    placeholder: 'Pega el enlace de YouTube'
  }
};
for (const platform of Object.values(platforms)) {
  platform.draft = '';
  platform.message = '';
  platform.rows = new Map();
}
let active = 'tiktok';

const profile = () => active === 'tiktok' && document.querySelector('[value=profile]').checked;
const showFolder = folder => { byId('folder').textContent = folder; };
const errorMessage = error => error.message.replace(/^.*?Error: /,'');
const settingsNotice = message => { byId('settings-notice').textContent = message || ''; };
const settingsError = error => settingsNotice(errorMessage(error));

function notice(platform, message) {
  platforms[platform].message = message;
  if (platform === active) byId('notice').textContent = message;
}
function showPlaceholder() {
  url.placeholder = profile() ? '@usuario o enlace del perfil' : platforms[active].placeholder;
}
function renderRows(platform) {
  if (platform !== active) return;
  const rows = [...platforms[platform].rows.values()];
  for (const [group, target] of [['active', 'jobs'], ['waiting', 'waiting-jobs'], ['history', 'history-jobs']]) {
    byId(target).replaceChildren(...rows.filter(row => row.dataset.group === group));
  }
  const waiting = byId('waiting-jobs').children.length;
  const history = byId('history-jobs').children.length;
  byId('waiting').hidden = waiting === 0;
  byId('history').hidden = history === 0;
  byId('waiting-summary').textContent = 'En espera · ' + waiting;
  byId('history-summary').textContent = 'Terminadas · ' + history;
  byId('empty').hidden = rows.length > 0;
}
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let amount = Math.max(0, bytes);
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit++;
  }
  return amount.toLocaleString('es', {maximumFractionDigits: 1}) + ' ' + units[unit];
}
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) return Math.floor(minutes / 60) + ' h ' + minutes % 60 + ' min';
  return minutes > 0 ? minutes + ' min ' + Math.floor(seconds % 60) + ' s' : Math.floor(seconds) + ' s';
}
function videoTitle(job) {
  if (job.title) return job.title;
  const link = new URL(job.url);
  const id = link.searchParams.get('v') || link.pathname.split('/').filter(Boolean).at(-1);
  return 'Video de ' + platforms[job.platform].name + ' · ' + id;
}
function select(tab) {
  active = tab.dataset.platform;
  const platform = platforms[active];
  for (const button of tabs) {
    button.setAttribute('aria-selected', String(button === tab));
    button.tabIndex = button === tab ? 0 : -1;
  }
  const panel = byId('platform-panel');
  panel.dataset.platform = active;
  panel.setAttribute('aria-labelledby', tab.id);
  byId('platform-title').textContent = platform.name;
  byId('platform-description').textContent = platform.description;
  byId('tiktok-mode').hidden = active !== 'tiktok';
  byId('queue-title').textContent = 'Descargas de ' + platform.name;
  byId('empty').textContent = 'Los videos de ' + platform.name + ' aparecerán aquí.';
  renderRows(active);
  url.value = platform.draft;
  showPlaceholder();
  notice(active, platform.message);
}

for (const [index, tab] of tabs.entries()) {
  tab.onclick = () => select(tab);
  tab.onkeydown = event => {
    const target = {
      ArrowLeft: tabs[(index + tabs.length - 1) % tabs.length],
      ArrowRight: tabs[(index + 1) % tabs.length],
      Home: tabs[0],
      End: tabs.at(-1)
    }[event.key];
    if (!target) return;
    event.preventDefault();
    select(target);
    target.focus();
  };
}
select(tabs[0]);
url.oninput = () => { platforms[active].draft = url.value; };
byId('tiktok-mode').onchange = showPlaceholder;
api.folder().then(showFolder).catch(settingsError);
byId('pick').onclick = () => api.pick().then(folder => { showFolder(folder); settingsNotice(''); }).catch(settingsError);
byId('open').onclick = () => api.open().then(settingsNotice).catch(settingsError);
byId('form').onsubmit = async event => {
  event.preventDefault();
  const platform = active;
  const draft = url.value;
  platforms[platform].draft = draft;
  try {
    notice(platform, await api.add(draft.trim(),platform,profile(),byId('turbo').checked));
    if (platforms[platform].draft === draft) {
      platforms[platform].draft = '';
      if (active === platform) url.value = '';
    }
  } catch (error) { notice(platform,errorMessage(error)); }
};
api.onNotice(({platform, message}) => notice(platform, message));
api.onJob(job => {
  const rows = platforms[job.platform].rows;
  let row = rows.get(job.id);
  if (!row) {
    row = document.createElement('article');
    row.className = 'job';
    const head = document.createElement('div');
    head.className = 'job-head';
    head.append(document.createElement('strong'), document.createElement('span'));
    const progress = document.createElement('progress');
    progress.setAttribute('aria-label', 'Progreso del archivo actual');
    const transfer = document.createElement('p');
    transfer.className = 'transfer';
    const error = document.createElement('p');
    error.className = 'job-error';
    row.append(head, progress, transfer, error, document.createElement('button'));
    rows.set(job.id,row);
  }
  const [head,progress,transfer,error,button] = row.children;
  const [title,state] = head.children;
  title.textContent = videoTitle(job);
  title.title = job.title || job.url;
  state.textContent = job.state;
  error.textContent = job.detail || '';
  error.hidden = !job.detail;
  progress.max = 100;
  if (Number.isFinite(job.progress)) progress.value = job.progress;
  else progress.removeAttribute('value');
  const metrics = [];
  if (Number.isFinite(job.downloadedBytes)) metrics.push(formatBytes(job.downloadedBytes));
  if (job.state === 'Descargando' && job.speed > 0) metrics.push(formatBytes(job.speed) + '/s');
  if (job.state === 'Descargando' && Number.isFinite(job.eta)) metrics.push('Quedan ' + formatTime(job.eta));
  transfer.textContent = metrics.join(' · ');
  transfer.hidden = metrics.length === 0;
  const group = job.state === 'En cola' ? 'waiting' :
    ['Listo', 'Falló', 'Cancelado'].includes(job.state) ? 'history' : 'active';
  progress.hidden = group !== 'active';
  if (row.dataset.group !== group) {
    row.dataset.group = group;
    renderRows(job.platform);
  }
  const retry = job.state === 'Falló' || job.state === 'Cancelado';
  button.hidden = job.state === 'Listo';
  button.disabled = job.state === 'Cancelando…';
  button.textContent = retry ? 'Reintentar' : 'Cancelar';
  button.onclick = () => {
    const failed = error => notice(job.platform,errorMessage(error));
    if (retry) api.add(job.url,job.platform,false,job.turbo).then(() => {
      rows.delete(job.id);
      row.remove();
      renderRows(job.platform);
    }).catch(failed);
    else api.cancel(job.id).catch(failed);
  };
});
