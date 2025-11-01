/* ===== Small helpers & config ===== */
const IMG_WBACK = 'https://image.tmdb.org/t/p/w1280';
const IMG_WPOST = 'https://image.tmdb.org/t/p/w500';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
window.requestIdleCallback ||= (cb)=>setTimeout(()=>cb({timeRemaining:()=>0,didTimeout:true}),1);

const store = {
  get(k,f){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):f; }catch{ return f; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch{} }
};

/* ===== State ===== */
let currentItem = null;
let heroItem = null;
let continueWatching = store.get('continue', []);
let lastSearchAbort = null;
let searchTimer = null;

/* ===== Loading ===== */
function hideLoaderSoon(){
  const loader = $('#loading');
  const kill = setTimeout(()=> loader?.classList.add('hidden'), 3000);
  requestIdleCallback(()=>{ loader?.classList.add('hidden'); clearTimeout(kill); }, {timeout: 800});
}

/* ===== Fetch through backend proxy ===== */
async function fxProxy(params, { retries=1, timeout=9000 } = {}) {
  let url = `/api/tmdb-proxy?`;
  if (params.mode) url += `mode=${encodeURIComponent(params.mode)}&`;
  if (params.type) url += `type=${encodeURIComponent(params.type)}&`;
  if (params.query !== undefined) url += `query=${encodeURIComponent(params.query)}&`;
  if (params.id !== undefined) url += `id=${encodeURIComponent(params.id)}&`;
  if (params.page !== undefined) url += `page=${encodeURIComponent(params.page)}&`;
  url = url.replace(/&$/, '');

  for (let a = 0; a <= retries; a++) {
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      if (a === retries) return { results: [] };
      await new Promise(r=>setTimeout(r, 300*(a+1)));
    }
  }
}

/* ===== Data sources ===== */
async function fetchTrending(type) {
  const d = await fxProxy({mode:'trending', type});
  return (d.results || []);
}

async function fetchTrendingAnime() {
  let bag = [];
  for (let p = 1; p <= 3; p++) {
    const d = await fxProxy({mode:'trending', type: 'tv', page:p});
    const filtered = (d.results||[]).filter(it => it.original_language==='ja' && (it.genre_ids||[]).includes(16));
    bag = bag.concat(filtered);
  }
  return bag;
}

/* ===== Renderers ===== */
function setBanner(item){
  heroItem = item;
  $('#banner').style.backgroundImage = item.backdrop ? `url('${item.backdrop}')` : '';
  $('#banner-title').textContent = item.title || 'Discover Amazing Stories';
  $('#banner-desc').textContent = item.overview || 'Stream unlimited entertainment';
}
function displayList(items, containerId){
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  items.forEach(it => {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = it.poster || 'https://via.placeholder.com/400x600?text=No+Image';
    img.alt = it.title || 'Poster';
    img.className = 'reveal';
    img.addEventListener('click', ()=> showDetails(it));
    el.appendChild(img);
  });
  revealObserve(el);
}
function displayContinue(){
  const wrap = $('#continue-list');
  if (!continueWatching.length){ wrap.innerHTML=''; return; }
  wrap.innerHTML='';
  continueWatching.slice(0,12).forEach(it=>{
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = it.poster ? (IMG_WPOST + it.poster) : 'https://via.placeholder.com/400x600?text=Resume';
    img.alt = it.title || 'Resume';
    img.title = 'Continue: ' + (it.title||'');
    img.className = 'reveal';
    img.addEventListener('click', ()=> showById(it.id, it.type));
    wrap.appendChild(img);
  });
  revealObserve(wrap);
}

/* ===== Modal ===== */
function showDetails(it){
  currentItem = it;
  $('#modal-title').textContent = it.title || 'Title';
  $('#modal-description').textContent = it.overview || 'No description available.';
  $('#modal-image').src = it.poster || 'https://via.placeholder.com/400x600?text=No+Image';
  $('#modal-rating').innerHTML = it.rating && it.rating!=='—' ? '★'.repeat(Math.max(1, Math.round(parseFloat(it.rating)/2))) : 'No rating';
  changeServer();
  $('#modal').classList.add('active');
  document.body.style.overflow = 'hidden';

  triggerPopunderOnce();
  pushContinue({ id: it.id, type: it.type, title: it.title, poster: it.poster_path || '' });
}
async function showById(id, type){
  const d = await fxProxy({mode:'title', type, id});
  const it = toItem(d, type);
  showDetails(it);
}
function closeModal(){
  $('#modal').classList.remove('active');
  $('#modal-video').src = '';
  document.body.style.overflow = 'auto';
}
function changeServer(){
  if (!currentItem) return;
  const sel = $('#server').value;
  const type = currentItem.type === 'movie' ? 'movie' : 'tv';
  let url = '';
  if (sel === 'vidsrc.cc'){
    url = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  } else if (sel === 'vidsrc.me'){
    url = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
  } else if (sel === 'player.videasy.net'){
    url = `https://player.videasy.net/${type}/${currentItem.id}`;
  }
  $('#modal-video').src = url;
}

/* ===== Continue Watching ===== */
function pushContinue(rec){
  const idx = continueWatching.findIndex(x=>x.id===rec.id && x.type===rec.type);
  if (idx>-1) continueWatching.splice(idx,1);
  continueWatching.unshift({...rec, timestamp: Date.now(), progress: 10});
  continueWatching = continueWatching.slice(0,30);
  store.set('continue', continueWatching);
  displayContinue();
}

/* ===== Search (uses proxy function) ===== */
async function doSearch(q){
  if (!q.trim()){ $('#search-results').innerHTML = ''; return; }
  try{
    if (lastSearchAbort) lastSearchAbort.abort();
    lastSearchAbort = new AbortController();
    const res = await fetch(`/api/tmdb-proxy?mode=search&query=${encodeURIComponent(q)}`, { signal: lastSearchAbort.signal });
    const data = await res.json();
    const container = $('#search-results');
    container.innerHTML = '';
    (data.results||[]).forEach(item=>{
      if (!item.poster_path) return;
      const it = toItem(item, item.media_type==='tv'?'tv':'movie');
      const img = document.createElement('img');
      img.loading='lazy';
      img.src = it.poster;
      img.alt = it.title;
      img.addEventListener('click', ()=>{
        closeSearch();
        showDetails(it);
      });
      container.appendChild(img);
    });
  }catch(e){
    if (e.name!=='AbortError'){
      $('#search-results').innerHTML = '<p style="color:#bbb">Search error. Try again.</p>';
    }
  }
}

/* ===== Reveal on scroll ===== */
function revealObserve(scopeEl){
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  },{rootMargin:'0px 0px -10% 0px', threshold:0.01});
  scopeEl.querySelectorAll('.reveal').forEach(n=> io.observe(n));
}

/* ===== Theme ===== */
function toggleTheme(){
  const html = document.documentElement;
  if (html.hasAttribute('data-theme')){
    html.removeAttribute('data-theme'); $('#theme').textContent='🌙';
  } else {
    html.setAttribute('data-theme','dark'); $('#theme').textContent='☀️';
  }
}

/* ===== Ads: Popunder + Native (cooldown + daily cap) ===== */
function dayStr(){ return new Date().toISOString().slice(0,10); }

function triggerPopunderOnce(){
  if (sessionStorage.getItem('__pu_done')==='1') return;
  if (typeof window._pu === 'function'){ window._pu(); sessionStorage.setItem('__pu_done','1'); }
}

(function(){
  const CAP_KEY = '__native_cap';
  function get(){ try{return JSON.parse(localStorage.getItem(CAP_KEY))||{day:dayStr(),count:0,last:0};}catch{return {day:dayStr(),count:0,last:0};} }
  function set(v){ try{localStorage.setItem(CAP_KEY, JSON.stringify(v));}catch{} }
  window.__nativeCap = {
    can(cooldownMs=120000, maxPerDay=4){
      const now = Date.now();
      const cap = get();
      if (cap.day !== dayStr()){ cap.day = dayStr(); cap.count = 0; }
      if (now - (cap.last||0) < cooldownMs) return false;
      if ((cap.count||0) >= maxPerDay) return false;
      return true;
    },
    mark(){ const cap = get(); cap.day = dayStr(); cap.count = (cap.count||0)+1; cap.last = Date.now(); set(cap); }
  };
})();

(function(){
  const nativeInline = $('#native-inline');
  const nativeSticky = $('#native-sticky');
  const vendorId = 'container-a4bf814c4146624bf8b42bd02f5c6d3c';

  function assignTo(el){
    const existing = document.getElementById(vendorId);
    if (existing && existing !== el) existing.id = 'native-recycled-slot';
    el.id = vendorId;
  }

  function showInline(){
    if (!nativeInline) return;
    nativeInline.style.display = 'block';
    nativeInline.setAttribute('aria-hidden','false');
    const slot = nativeInline.querySelector('.native-body > div');
    assignTo(slot);
  }

  function showSticky(){
    if (!nativeSticky) return;
    nativeSticky.style.display = 'block';
    nativeSticky.setAttribute('aria-hidden','false');
    const slot = nativeSticky.querySelector('.native-slot');
    let inner = slot.querySelector('#'+vendorId) || slot.querySelector('.any');
    if (!inner){ inner = document.createElement('div'); slot.appendChild(inner); }
    assignTo(inner);
  }

  window.__nativeAd = {
    dismiss(where){
      if (where==='inline'){ nativeInline.style.display='none'; nativeInline.setAttribute('aria-hidden','true'); }
      else { nativeSticky.style.display='none'; nativeSticky.setAttribute('aria-hidden','true'); }
    },
    cta(){ /* hook for analytics if needed */ }
  };

  function initNative(){
    if (!window.__nativeCap?.can(120000,4)) return;
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"") ||
                     (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);

    if (isMobile){
      showSticky();
      window.__nativeCap.mark();
    } else {
      const anchor = document.getElementById('tvshows-list');
      if (!anchor){ showInline(); window.__nativeCap.mark(); return; }
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (e.isIntersecting){
            showInline(); window.__nativeCap.mark(); io.disconnect();
          }
        });
      }, {rootMargin:'0px 0px -35% 0px', threshold:0.01});
      io.observe(anchor);
    }
  }

  window.addEventListener('load', ()=> setTimeout(initNative, 600));
})();

/* ===== Init ===== */
async function init(){
  // Buttons & theme
  $('#theme').addEventListener('click', toggleTheme);
  $('#openSearch').addEventListener('click', ()=>{ $('#search-modal').style.display='flex'; $('#search-input').focus(); });
  $('#closeSearch').addEventListener('click', closeSearch);
  $('#closeModal').addEventListener('click', closeModal);
  $('#playHero').addEventListener('click', ()=>{ if (heroItem) showDetails(heroItem); });

  // Navbar search (opens modal as you type)
  const q = $('#q'), qClear = $('#qClear');
  q.addEventListener('input', e=>{
    const v = e.target.value.trim();
    if (v){
      qClear.style.display='block';
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>doSearch(v), 400);
      $('#search-modal').style.display='flex';
    } else {
      qClear.style.display='none';
      closeSearch();
    }
  });
  qClear.addEventListener('click', ()=>{ q.value=''; qClear.style.display='none'; closeSearch(); });

  $('#search-input').addEventListener('input', e=>{
    const v=e.target.value.trim(); clearTimeout(searchTimer);
    if (v) searchTimer=setTimeout(()=>doSearch(v), 350);
    else $('#search-results').innerHTML='';
  });

  const [moviesRaw, tvRaw, animeRaw] = await Promise.all([
    fetchTrending('movie'),
    fetchTrending('tv'),
    fetchTrendingAnime()
  ]);

  const movies = moviesRaw.map(r=>toItem(r,'movie')).filter(x=>x.poster);
  const tvs    = tvRaw.map(r=>toItem(r,'tv')).filter(x=>x.poster);
  const anime  = animeRaw.map(r=>toItem(r,'tv')).filter(x=>x.poster);

  if (movies.length){
    const pick = movies[Math.floor(Math.random()*movies.length)];
    setBanner(pick);
  }

  displayContinue();
  displayList(movies, 'movies-list');
  displayList(tvs, 'tvshows-list');
  displayList(anime, 'anime-list');

  hideLoaderSoon();

  setInterval(async ()=>{
    const [mR, tR] = await Promise.all([fetchTrending('movie'), fetchTrending('tv')]);
    displayList(mR.map(r=>toItem(r,'movie')).filter(x=>x.poster), 'movies-list');
    displayList(tR.map(r=>toItem(r,'tv')).filter(x=>x.poster), 'tvshows-list');
  }, 3*60*60*1000);

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
}

function closeSearch(){
  $('#search-modal').style.display = 'none';
  $('#search-results').innerHTML = '';
}

window.addEventListener('load', init);

/* ===== Helper ===== */
function toItem(raw, typeGuess){
  const isTV = (typeGuess ? typeGuess==='tv' : raw.media_type==='tv');
  return {
    id: raw.id,
    type: isTV ? 'tv' : 'movie',
    title: isTV ? (raw.name || raw.title) : (raw.title || raw.name),
    overview: raw.overview || '',
    poster: raw.poster_path ? (IMG_WPOST + raw.poster_path) : '',
    poster_path: raw.poster_path || '',
    backdrop: raw.backdrop_path ? (IMG_WBACK + raw.backdrop_path) : '',
    rating: raw.vote_average ? raw.vote_average.toFixed(1) : '—',
    year: isTV ? (raw.first_air_date||'').slice(0,4) : (raw.release_date||'').slice(0,4)
  };
}
