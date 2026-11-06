// A po tu le da? · Autor del código de la aplicación — Yandel Diaz
const {app, BrowserWindow, dialog, ipcMain, shell} = require('electron');
const {spawn} = require('node:child_process');
const {existsSync, mkdirSync, readdirSync} = require('node:fs');
const path = require('node:path');
const {tiktokInputMode} = require('./tiktok-input');

let window;
let folder;
const jobs = new Map();
const pending = [];
const running = new Map();
let listing = false;
const children = new Set();
const platforms = {tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube'};

function parse(value, platform, profile) {
  if (!Object.hasOwn(platforms, platform)) throw Error('Elige una plataforma.');
  if (typeof value !== 'string' || value.length > 2048) throw Error('Pega un enlace válido.');
  let url;
  try { url = new URL(profile && /^@[\w.]+$/.test(value) ? 'https://www.tiktok.com/' + value : value); }
  catch { throw Error('Pega un enlace válido.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.port || url.username || url.password) throw Error('Enlace no válido.');
  const host = url.hostname;
  const pathname = url.pathname;
  const tiktok = ['tiktok.com','www.tiktok.com','m.tiktok.com'].includes(host);
  const shortTikTok = ['vm.tiktok.com','vt.tiktok.com'].includes(host) && /^\/[\w-]+\/?$/.test(pathname);
  const youtube = ['youtube.com','www.youtube.com','m.youtube.com'].includes(host);
  const instagram = ['instagram.com','www.instagram.com'].includes(host);
  if (profile) {
    if (platform !== 'tiktok' || !tiktok || !/^\/@[\w.]{1,24}\/?$/.test(pathname)) {
      throw Error('Pega el enlace de un perfil de TikTok.');
    }
    return 'https://www.tiktok.com' + pathname.replace(/\/$/, '');
  }
  if (platform === 'youtube' && youtube && pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') || '')) {
    return 'https://www.youtube.com/watch?v=' + url.searchParams.get('v');
  }
  const matches = {
    tiktok: shortTikTok || tiktok && /^\/@[\w.]+\/video\/\d+\/?$/.test(pathname),
    instagram: instagram && /^\/(reel|reels|p|tv)\/[\w-]+\/?$/.test(pathname),
    youtube: youtube && /^\/(shorts|live)\/[\w-]{11}\/?$/.test(pathname)
      || host === 'youtu.be' && /^\/[\w-]{11}\/?$/.test(pathname)
  };
  if (!matches[platform]) throw Error('Pega el enlace de un video de ' + platforms[platform] + '.');
  return 'https://' + host + pathname;
}
function send(channel, value) {
  if (window && !window.isDestroyed()) window.webContents.send(channel, value);
}
function executable(name) {
  const filename = name + (process.platform === 'win32' ? '.exe' : '');
  const roots = [path.join(app.isPackaged ? process.resourcesPath : __dirname, 'tools'), '/opt/homebrew/bin', '/usr/local/bin'];
  return roots.map(root => path.join(root, filename)).find(existsSync) || filename;
}
function run(args, onLine, done) {
  const engine = executable('yt-dlp');
  const child = spawn(engine, ['--ignore-config', '--no-cache-dir', '--encoding', 'utf-8', '--color', 'never', '--socket-timeout', '25', ...args], {
    windowsHide: true, shell: false, env: {...process.env, ELECTRON_RUN_AS_NODE: '1', PATH: [path.dirname(engine), '/opt/homebrew/bin', '/usr/local/bin', process.env.PATH].join(path.delimiter)}
  });
  children.add(child);
  const readers = [child.stdout, child.stderr].map(stream => {
    const lines = require('node:readline').createInterface({input: stream});
    lines.on('line', onLine);
    return lines;
  });
  let failure;
  child.on('error', error => { failure = error; });
  child.on('close', code => {
    children.delete(child);
    readers.forEach(reader => reader.close());
    done(code, failure);
  });
  return child;
}
function update(job, fields) {
  Object.assign(job, fields);
  send('job', job);
}
function progressUpdate(line) {
  const prefix = 'APOTULE_PROGRESS ';
  if (!line.startsWith(prefix)) return null;
  try {
    const payload = JSON.parse(line.slice(prefix.length));
    const data = payload.progress;
    if (!data || !['downloading', 'finished'].includes(data.status)) return null;
    const total = data.total_bytes || data.total_bytes_estimate;
    const downloaded = data.downloaded_bytes;
    const percent = Number.isFinite(total) && total > 0 && Number.isFinite(downloaded)
      ? Math.min(100, Math.max(0, downloaded / total * 100)) : null;
    return {
      state: data.status === 'finished' ? 'Completando archivo…' : 'Descargando',
      title: typeof payload.title === 'string' ? payload.title : '',
      progress: data.status === 'finished' ? 100 : percent,
      downloadedBytes: Number.isFinite(downloaded) ? downloaded : null,
      speed: Number.isFinite(data.speed) ? data.speed : null,
      eta: Number.isFinite(data.eta) ? data.eta : null
    };
  } catch {
    return null;
  }
}
function completedVideos(destination, platform) {
  const completed = new Map();
  if (!existsSync(destination)) return completed;
  for (const entry of readdirSync(destination, {withFileTypes: true})) {
    if (!entry.isFile()) continue;
    const match = /\[(TikTok|Instagram|youtube)-([\w-]+)\]\.(?:mp4|mkv|webm|mov)$/i.exec(entry.name);
    if (match && match[1].toLowerCase() === platform) {
      completed.set(match[2], entry.name.slice(0, match.index).trim());
    }
  }
  return completed;
}
function queue(url, platform, turbo, destination, completed) {
  if (pending.some(job => job.url === url) || [...running.keys()].some(id => jobs.get(id)?.url === url)) return;
  const link = new URL(url);
  const videoId = link.searchParams.get('v') || link.pathname.split('/').filter(Boolean).at(-1);
  const title = completed.get(videoId);
  const job = {id: require('node:crypto').randomUUID(), url, platform, destination, turbo,
    title, state: title ? 'Listo' : 'En cola', progress: title ? 100 : 0};
  if (!title) {
    jobs.set(job.id, job);
    pending.push(job);
  }
  update(job, {});
}
function pump() {
  while (running.size < 4 && pending.length) {
    const job = pending.shift();
    let detail = '';
    let cancelled = false;
    update(job, {state: 'Preparando…', progress: null});
    const args = ['--no-playlist','--newline','--progress','--progress-delta','0.5','--no-overwrites','--retries','5','--fragment-retries','5',
      '--abort-on-unavailable-fragments','-N', job.turbo ? '5' : '1',
      '--format','bv*+ba/b','--format-sort','res,fps,hdr,br',
      '--merge-output-format','mkv','--windows-filenames','--trim-filenames','160',
      '--no-mtime','--ffmpeg-location',executable('ffmpeg'),'--js-runtimes','node:' + process.execPath,
      '--progress-template','download:APOTULE_PROGRESS {"title":%(info.title)j,"progress":%(progress)j}',
      '-P',job.destination,'-o','%(title)s [%(extractor)s-%(id)s].%(ext)s','--',job.url];
    const child = run(args, line => {
      if (cancelled) return;
      const progress = progressUpdate(line);
      if (progress) update(job, progress);
      else if (line.startsWith('[download]')) update(job, {state: 'Descargando', progress: null});
      else if (line.includes('Downloading webpage') || line.includes('Downloading API')) update(job, {state: 'Buscando video…'});
      else if (line.startsWith('[info]')) update(job, {state: 'Eligiendo calidad…'});
      else if (line.startsWith('[Merger]') || line.startsWith('[VideoRemuxer]')) update(job, {state: 'Uniendo video y audio…', progress: 100});
      if (line.startsWith('ERROR:')) detail = line.replace(/https?:\/\/\S+/g, '[enlace]').slice(0, 400);
    }, (code, error) => {
      running.delete(job.id);
      update(job, cancelled ? {state:'Cancelado'} : code === 0 ? {state:'Listo', progress:100} :
        {state:'Falló', detail:error ? 'No pude iniciar el motor de descarga. Comprueba que yt-dlp está instalado o usa el paquete completo de la app.' : detail || 'La descarga se interrumpió.'});
      jobs.delete(job.id);
      pump();
    });
    running.set(job.id, () => { cancelled = true; update(job, {state:'Cancelando…'}); child.kill(); });
  }
}
function register(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw Error('Origen no autorizado.');
    return handler(...args);
  });
}
if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(() => {
  folder = path.join(app.getPath('downloads'), 'A po tu le da');
  window = new BrowserWindow({width: 1040,height: 760,minWidth: 640,minHeight: 580,backgroundColor:'#100c1b',
    autoHideMenuBar: true, webPreferences:{preload:path.join(__dirname,'preload.js'),partition:'apotule-local',sandbox:true,contextIsolation:true,nodeIntegration:false}});
  window.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents,_permission,callback) => callback(false));
  register('folder', () => folder);
  register('pick', async () => {
    const result = await dialog.showOpenDialog(window,{properties:['openDirectory','createDirectory'],defaultPath:folder});
    if (!result.canceled) folder = result.filePaths[0];
    return folder;
  });
  register('open', () => { mkdirSync(folder,{recursive:true}); return shell.openPath(folder); });
  register('add', (input, platform, profile, turbo) => {
    const isProfile = profile === true || platform === 'tiktok' && tiktokInputMode(input) === 'profile';
    const url = parse(input, platform, isProfile);
    const destination = folder;
    const completed = completedVideos(destination, platform);
    if (!isProfile) { queue(url,platform,turbo === true,destination,completed); pump(); return 'Enlace añadido.'; }
    if (listing) throw Error('Ya estamos buscando videos de un perfil.');
    listing = true;
    let count = 0;
    let failure = '';
    run(['--flat-playlist','--lazy-playlist','--print','%(id)s','--',url], line => {
      if (line.startsWith('ERROR:')) failure = line.replace(/https?:\/\/\S+/g, '[enlace]').slice(0, 400);
      if (!/^\d{12,25}$/.test(line)) return;
      count++;
      queue(url + '/video/' + line,platform,turbo === true,destination,completed);
      pump();
    }, (code, error) => {
      listing = false;
      const message = code === 0 && count ? 'Videos del perfil encontrados: ' + count : count ?
        'TikTok interrumpió la búsqueda. Se añadieron ' + count + ' videos.' :
        error ? 'No pude iniciar el motor de descarga. Comprueba que yt-dlp está instalado o usa el paquete completo de la app.' :
        failure || 'No pude encontrar videos en ese perfil.';
      send('notice', {platform, message});
    });
    return 'Buscando videos en el perfil…';
  });
  register('cancel', id => {
    const index = pending.findIndex(job => job.id === id);
    if (index >= 0) {
      const [job] = pending.splice(index,1);
      update(job,{state:'Cancelado'});
      jobs.delete(id);
    } else running.get(id)?.();
  });
  window.loadFile('index.html');
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { for (const child of children) child.kill(); });
module.exports = {parse, progressUpdate, completedVideos};
