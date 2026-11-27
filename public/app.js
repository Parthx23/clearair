import { airLevel, commutes, defaultLocation, defaults, estimateCO2, guideAnswer, households, lowestForecastWindow, makePlan } from './guidance.mjs';

const $ = (id) => document.getElementById(id);
const paths = {
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h6a3 3 0 1 1-3 3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 5h2m4 0h2m-8 3h2"/>',
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm6 11v-8h6v8"/>',
  leaf: '<path d="M20 4c-7-.3-13.5 1-15 7-1.2 5 2.2 8.2 6 7.7 6-.7 8.5-6.2 9-14.7ZM3 21l10-10"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m10 3-1 3-3 1-3 1 1 4-1 4 3 1 3 1 1 3h4l1-3 3-1 3-1-1-4 1-4-3-1-3-1-1-3z"/>',
  sparkles: '<path d="m10 2 2.4 6.6L19 11l-6.6 2.4L10 20l-2.4-6.6L1 11l6.6-2.4L10 2Zm9 11 1.1 2.9L23 17l-2.9 1.1L19 21l-1.1-2.9L15 17l2.9-1.1L19 13Zm0-10v4m-2-2h4"/>',
  right: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5" fill="#f8f7ff"/><circle cx="15" cy="17" r="2.5" fill="#f8f7ff"/>',
  activity: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
  bus: '<rect x="4" y="4" width="16" height="15" rx="3"/><path d="M4 12h16m-13 7v2m10-2v2M8 15h.01m8 0h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
document.querySelectorAll('[data-icon]').forEach((node) => { node.innerHTML = icon(node.dataset.icon); });

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be disabled. */ }
}

const sampleValues = [182, 190, 202, 209, 205, 191, 180, 169, 159, 150, 145, 141, 137, 133, 139, 148, 161, 169, 179, 194, 201, 198, 191, 186, 189, 196, 205, 216, 212, 200, 189, 174, 162, 153, 145, 137, 132, 129, 136, 147, 157, 168, 175, 189, 201, 207, 200, 194];
const example = { aqi: 182, pm: 96, sample: true, points: sampleValues.map((aqi, hour) => ({ aqi, hour, time: Date.UTC(2026, 0, 15, 0, 30) + hour * 3600000 })) };
const unavailable = { aqi: null, pm: null, points: [] };
let location = read('clearair-location', defaultLocation);
let prefs = { ...defaults, ...read('clearair-preferences', {}) };
let air = location.name === defaultLocation.name ? example : unavailable;
let hours = 24;
let dataStatus = air.sample ? 'Sample data' : 'Loading…';
let requestNumber = 0;
let cityRequest = 0;
let chatBusy = false;
$('distance').value = read('clearair-distance', 5);

function timeLabel(time, withDay = false) {
  return new Intl.DateTimeFormat('en', {
    timeZone: location.timezone || 'UTC', hour: 'numeric',
    ...(withDay ? { weekday: 'short', minute: '2-digit' } : {}),
  }).format(time);
}

function renderAir() {
  const [, name, guidance, color] = airLevel(air.aqi);
  $('location-label').textContent = location.name;
  $('data-state').lastChild.textContent = ` ${dataStatus}`;
  $('data-state').firstElementChild.hidden = dataStatus !== 'Modeled data';
  $('aqi').textContent = air.aqi ?? '—';
  $('aqi-status').textContent = name;
  $('aqi-status').style.color = color;
  $('aqi-status').style.backgroundColor = `${color}23`;
  $('aqi-status').style.borderColor = `${color}66`;
  $('air-guidance').textContent = guidance;
  $('pm').textContent = air.pm == null ? '—' : `${Math.round(air.pm)} µg/m³`;
  $('update-time').textContent = air.sample ? 'Example winter reading' : air.time ? `As of ${timeLabel(air.time, true)}` : 'No current reading';
  $('scale-marker').style.left = `${Math.min(100, Math.max(0, (air.aqi ?? 0) / 5))}%`;
  $('scale-marker').hidden = air.aqi == null;
  $('scale-marker').style.background = color;
  $('assistant-context').textContent = `${location.name} · ${air.sample ? 'Sample AQI' : 'US AQI'} ${air.aqi ?? 'unavailable'}`;
  renderPlan();
  renderChart();
}

function renderPlan() {
  $('plan-subtitle').textContent = `For ${households[prefs.household]}`;
  $('routine').innerHTML = makePlan(air.aqi, prefs).map(([time, symbol, tone, title, why]) =>
    `<article class="routine-row"><div class="tile ${tone}"><i>${icon(symbol)}</i></div><div><h3><span class="routine-time">${time}</span>${title}</h3><p>${why}</p></div></article>`
  ).join('');
}

function renderChart() {
  $('hours24').setAttribute('aria-pressed', String(hours === 24));
  $('hours48').setAttribute('aria-pressed', String(hours === 48));
  $('forecast-label').textContent = `${air.sample ? `Sample ${hours}-hour forecast` : `Next ${hours} hours`} · US AQI`;
  const points = air.points.slice(0, hours);
  const valid = points.filter((point) => point.aqi != null);
  if (valid.length < 2) {
    $('chart').innerHTML = '<div class="chart-empty">Hourly forecast unavailable.</div>';
    $('forecast-note').textContent = 'Check your local advisory before planning outdoor activities.';
    return;
  }
  const max = Math.max(100, Math.ceil(Math.max(...valid.map(({ aqi }) => aqi)) / 50) * 50);
  const x = (hour) => 36 + hour / (points.length - 1) * 475;
  const y = (aqi) => 111 - aqi / max * 99;
  const chunks = [];
  for (const point of points) {
    if (point.aqi == null) continue;
    const chunk = chunks.at(-1);
    if (chunk?.at(-1).hour === point.hour - 1) chunk.push(point);
    else chunks.push([point]);
  }
  const pointPath = ({ aqi, hour }) => `${x(hour).toFixed(1)} ${y(aqi).toFixed(1)}`;
  const axis = [max, max * 0.75, max / 2, max * 0.25, 0].map((mark) =>
    `<path d="M36 ${y(mark)}H511" stroke="#e7edf6" stroke-dasharray="3 4"/><text x="29" y="${y(mark) + 4}" text-anchor="end">${Math.round(mark)}</text>`
  ).join('');
  const times = Array.from({ length: 5 }, (_, i) => points[Math.round(i * (points.length - 1) / 4)]).map(({ hour, time }, i) =>
    `<text x="${x(hour)}" y="132" text-anchor="${i === 4 ? 'end' : i === 0 ? 'start' : 'middle'}">${timeLabel(time)}</text>`
  ).join('');
  const curves = chunks.map((chunk) => {
    const line = `M${chunk.map(pointPath).join('L')}`;
    return `<path d="${line}L${x(chunk.at(-1).hour)} 111H${x(chunk[0].hour)}Z" fill="url(#chart-fill)"/><path d="${line}" fill="none" stroke="#6958d8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  $('chart').innerHTML = `<svg viewBox="0 0 520 137" role="img" aria-label="Hourly air quality index forecast"><defs><linearGradient id="chart-fill" x2="0" y2="1"><stop stop-color="#c8bcff" stop-opacity=".75"/><stop offset="1" stop-color="#eeebff" stop-opacity=".23"/></linearGradient></defs>${axis}${curves}${times}</svg>`;
  const best = lowestForecastWindow(points);
  $('forecast-note').textContent = best
    ? `${air.sample ? 'Lowest sample window' : 'Lowest forecast window'} · ${timeLabel(best.first.time, true)}–${timeLabel(best.next.time, true)} · Avg. AQI ${Math.round(best.average)}${best.average > 100 ? ' · Air quality still elevated' : ''}`
    : 'The forecast has too few consecutive readings to suggest a lower-pollution window.';
}

async function loadAir() {
  const id = ++requestNumber;
  const { latitude, longitude } = location;
  const endpoint = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  endpoint.search = new URLSearchParams({ latitude, longitude, current: 'us_aqi,pm2_5', hourly: 'us_aqi', forecast_days: 4, timeformat: 'unixtime', timezone: 'GMT' });
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(9000) });
    if (!response.ok) throw new Error('Provider unavailable');
    const result = await response.json();
    if (id !== requestNumber) return;
    const current = result.current ?? {};
    const aqi = Number.isFinite(current.us_aqi) ? Math.round(current.us_aqi) : null;
    const pm = Number.isFinite(current.pm2_5) ? current.pm2_5 : null;
    const forecast = result.hourly?.time ?? [];
    const points = forecast.map((time, i) => ({ time: time * 1000, aqi: result.hourly.us_aqi[i] }))
      .filter(({ time }) => time >= (current.time ? current.time * 1000 : Date.now()))
      .slice(0, 48).map((point, hour) => ({ ...point, hour }));
    if (aqi == null && !points.some((point) => Number.isFinite(point.aqi))) throw new Error('No data');
    air = { aqi, pm, time: current.time ? current.time * 1000 : null, points };
    dataStatus = 'Modeled data';
  } catch {
    if (id !== requestNumber) return;
    air = location.name === defaultLocation.name ? example : unavailable;
    dataStatus = air.sample ? 'Sample data' : 'Data unavailable';
  }
  renderAir();
}

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.close').addEventListener('click', () => dialog.close());
}
$('location-button').onclick = () => $('location-dialog').showModal();
$('city-form').onsubmit = async (event) => {
  event.preventDefault();
  const query = $('city-input').value.trim();
  if (query.length < 2) return;
  const id = ++cityRequest;
  const results = $('city-results');
  results.textContent = 'Searching…';
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name: query, count: 7, language: 'en', format: 'json' });
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Search failed');
    const { results: cities = [] } = await response.json();
    if (id !== cityRequest) return;
    results.textContent = cities.length ? '' : 'No matching cities. Try a nearby city.';
    for (const city of cities) {
      const name = [...new Set([city.name, city.admin1, city.country].filter(Boolean))].join(', ');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = name;
      button.onclick = () => {
        location = { name, latitude: city.latitude, longitude: city.longitude, timezone: city.timezone };
        save('clearair-location', location);
        air = unavailable;
        dataStatus = 'Loading…';
        $('location-dialog').close();
        renderAir();
        loadAir();
      };
      results.append(button);
    }
  } catch {
    if (id === cityRequest) results.textContent = 'City search is unavailable. Try again in a moment.';
  }
};

for (const id of ['profile', 'preferences', 'customize']) {
  $(id).onclick = () => {
    for (const [key, value] of Object.entries(prefs)) $(key).value = value;
    $('preferences-dialog').showModal();
  };
}
$('preferences-form').onsubmit = (event) => {
  event.preventDefault();
  prefs = Object.fromEntries(Object.keys(defaults).map((key) => [key, $(key).value]));
  save('clearair-preferences', prefs);
  renderPlan();
  $('preferences-dialog').close();
};
for (const length of [24, 48]) {
  $(`hours${length}`).onclick = () => { hours = length; renderChart(); };
}
function renderImpact() {
  const km = Number($('distance').value);
  $('distance-label').textContent = `${km} km`;
  $('impact-total').textContent = estimateCO2(km).toFixed(2);
}
$('distance').oninput = () => { save('clearair-distance', Number($('distance').value)); renderImpact(); };
$('menu').onclick = () => {
  $('menu').setAttribute('aria-expanded', String($('sidebar').classList.toggle('open')));
};
function syncNavigation() {
  const target = window.location.hash || '#overview';
  for (const link of document.querySelectorAll('nav a')) {
    const active = link.getAttribute('href') === target;
    link.classList.toggle('active', active);
    if (active) {
      link.setAttribute('aria-current', 'location');
      $('crumb').textContent = link.textContent.trim();
    } else link.removeAttribute('aria-current');
  }
  $('sidebar').classList.remove('open');
  $('menu').setAttribute('aria-expanded', 'false');
}
window.addEventListener('hashchange', syncNavigation);

function appendMessage(text, role) {
  const message = document.createElement('div');
  message.className = `message ${role}`;
  message.textContent = text;
  $('messages').append(message);
  $('messages').scrollTop = $('messages').scrollHeight;
  return message;
}
async function ask(question) {
  question = question.trim();
  if (!question || chatBusy) return;
  chatBusy = true;
  $('assistant-form').querySelector('button').disabled = true;
  $('question').value = '';
  appendMessage(question, 'user');
  const reply = appendMessage('Checking your air-quality context…', 'assistant');
  const km = Number($('distance').value);
  const local = guideAnswer(question, location.name, air.aqi, prefs, km, Boolean(air.sample));
  try {
    const response = await fetch('./api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, location: location.name, aqi: air.aqi, sample: Boolean(air.sample), prefs, km }),
      signal: AbortSignal.timeout(18000),
    });
    if (!response.ok) throw new Error('Assistant unavailable');
    const answer = await response.json();
    if (typeof answer.text !== 'string' || !answer.text) throw new Error('No answer');
    reply.textContent = answer.text;
    $('assistant-foot').textContent = answer.mode === 'ai' ? 'AI-generated planning guidance · Always check local advisories' : 'Built-in guidance · AI is currently unavailable';
  } catch {
    reply.textContent = local;
    $('assistant-foot').textContent = 'Built-in guidance · AI is currently unavailable';
  } finally {
    chatBusy = false;
    $('assistant-form').querySelector('button').disabled = false;
    $('messages').scrollTop = $('messages').scrollHeight;
  }
}
for (const id of ['side-assistant', 'top-assistant']) {
  $(id).onclick = () => $('assistant-dialog').showModal();
}
document.querySelectorAll('[data-question]').forEach((button) => {
  button.onclick = () => ask(button.dataset.question);
});
$('assistant-form').onsubmit = (event) => { event.preventDefault(); ask($('question').value); };
syncNavigation();
renderImpact();
renderAir();
loadAir();
