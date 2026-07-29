import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_SCHEMA, SUPABASE_BUCKET }
  from '../assets/js/config.js';
import { mediaURL } from '../assets/js/data.js';

/* ═══════════════════════════════════════════════════════════
   Fruit Pop Comic — content editor

   Talks to Supabase over plain REST, same as the site. No SDK,
   no build step. Auth is Supabase's password grant; the token
   lives in sessionStorage so closing the tab signs you out.

   Write access is not granted by logging in — the database
   checks membership of fruitpop.editors on every statement.
   Auth is shared with the other site in this project, so a
   valid login here is necessary but not sufficient.
   ═══════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

const store = {
  get token(){ return sessionStorage.getItem('fp.token'); },
  set token(v){ v ? sessionStorage.setItem('fp.token', v) : sessionStorage.removeItem('fp.token'); },
  get refresh(){ return sessionStorage.getItem('fp.refresh'); },
  set refresh(v){ v ? sessionStorage.setItem('fp.refresh', v) : sessionStorage.removeItem('fp.refresh'); },
  get email(){ return sessionStorage.getItem('fp.email') || ''; },
  set email(v){ v ? sessionStorage.setItem('fp.email', v) : sessionStorage.removeItem('fp.email'); },
};

/* ── transport ──────────────────────────────────────────── */

function headers(write = false, extra = {}){
  const h = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${store.token || SUPABASE_KEY}`,
    ...extra,
  };
  h[write ? 'Content-Profile' : 'Accept-Profile'] = SUPABASE_SCHEMA;
  return h;
}

async function refreshToken(){
  if (!store.refresh) return false;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method:'POST',
    headers:{ apikey: SUPABASE_KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ refresh_token: store.refresh }),
  });
  if (!res.ok) return false;
  const j = await res.json();
  store.token = j.access_token; store.refresh = j.refresh_token;
  return true;
}

async function rest(table, { method = 'GET', query = '', body, retry = true } = {}){
  const write = method !== 'GET';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, {
    method,
    headers: headers(write, {
      ...(body ? { 'Content-Type':'application/json' } : {}),
      ...(write ? { Prefer:'return=representation' } : {}),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && await refreshToken())
    return rest(table, { method, query, body, retry:false });

  const text = await res.text();
  if (!res.ok){
    if (text.includes('PGRST106'))
      throw new Error(`The "${SUPABASE_SCHEMA}" schema is not exposed. ` +
                      `Add it under Settings → API → Exposed schemas.`);
    if (res.status === 401 || res.status === 403)
      throw new Error('Not permitted. This account is signed in but is not a Fruit Pop editor.');
    throw new Error(text.slice(0, 300) || `HTTP ${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}

async function upload(file, folder){
  const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
  const key   = `${folder}/${Date.now()}-${clean}`;
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURI(key)}`, {
      method:'POST',
      headers:{ apikey: SUPABASE_KEY, Authorization:`Bearer ${store.token}`,
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert':'true' },
      body: file,
    });
  if (!res.ok) throw new Error('Upload failed: ' + (await res.text()).slice(0, 200));
  return key;
}

/* ── what can be edited ─────────────────────────────────── */

const STAGES = ['magenta','sanguine','blue','inked','final'];

const TABS = [
  {
    id:'pages', table:'pages', label:'Pages', title:'Comic pages',
    order:'position.asc,created_at.asc',
    blank:() => ({ position:0, image_path:'', thumb_path:'', stage:'blue',
                   is_draft:true, alt:'', published:true }),
    row:r => ({
      thumb: r.thumb_path || r.image_path,
      title: `${String(r.position ?? 0).padStart(2,'0')} · ${r.stage}`,
      sub:   r.alt || (r.image_path || '').split('/').pop(),
      flags: [!r.published && 'hidden', r.is_draft && 'draft'],
    }),
    fields:[
      { k:'position',   t:'number', label:'Reading order',
        hint:'The array order is the reading order. It is provisional until the creator sets it.' },
      { k:'image_path', t:'image',  label:'Page image', folder:'pages' },
      { k:'thumb_path', t:'image',  label:'Thumbnail', folder:'thumbs',
        hint:'Optional. A ~300px-wide copy; the full image is used if this is blank.' },
      { k:'stage',      t:'select', label:'Pencil stage', opts:STAGES,
        hint:'Which pencil the rough was drawn in. Set “final” once it stops being a draft.' },
      { k:'is_draft',   t:'bool',   label:'Still a rough draft' },
      { k:'alt',        t:'text',   label:'Alt text',
        hint:'Lettering is drawn into the artwork, so describe the page rather than transcribing it.' },
      { k:'published',  t:'bool',   label:'Visible on the site' },
    ],
  },
  {
    id:'sheets', table:'sheets', label:'Cast & Art', title:'Character and art sheets',
    order:'kind.asc,position.asc,created_at.asc',
    blank:() => ({ position:0, kind:'cast', image_path:'', figures:1,
                   description:'', display_name:'', published:true }),
    row:r => ({
      thumb: r.image_path,
      title: r.display_name || r.description.slice(0, 40) || '(untitled)',
      sub:   `${r.kind} · ${r.figures} figure${r.figures === 1 ? '' : 's'}`,
      flags: [!r.published && 'hidden'],
    }),
    fields:[
      { k:'kind',        t:'select', label:'Shows in', opts:['cast','art'],
        hint:'“cast” lands in the Cast view, “art” in Art.' },
      { k:'position',    t:'number', label:'Order' },
      { k:'image_path',  t:'image',  label:'Sheet image', folder:'sheets' },
      { k:'display_name',t:'text',   label:'Name',
        hint:'Leave blank unless the name is genuinely known. Descriptions are honest; invented names are not.' },
      { k:'figures',     t:'number', label:'Figures on the sheet',
        hint:'Summed into the Cast counter in the top strip.' },
      { k:'description', t:'area',   label:'Description',
        hint:'Doubles as the image’s alt text.' },
      { k:'published',   t:'bool',   label:'Visible on the site' },
    ],
  },
  {
    id:'wiki', table:'wiki_entries', label:'Wiki', title:'Wiki entries',
    order:'category.asc,position.asc,title.asc',
    blank:() => ({ slug:'', title:'', category:'lore', summary:'', body:'',
                   image_path:'', position:0, published:false }),
    row:r => ({
      thumb: r.image_path,
      title: r.title || '(untitled)',
      sub:   `${r.category} · /${r.slug}`,
      flags: [!r.published && 'draft'],
    }),
    fields:[
      { k:'title',     t:'text',   label:'Title' },
      { k:'slug',      t:'text',   label:'Slug', hint:'The URL: #/wiki/your-slug' },
      { k:'category',  t:'select', label:'Category', opts:['character','place','term','lore'] },
      { k:'position',  t:'number', label:'Order within its category' },
      { k:'summary',   t:'text',   label:'Summary', hint:'One line, shown on the index card.' },
      { k:'image_path',t:'image',  label:'Image', folder:'wiki' },
      { k:'body',      t:'area',   label:'Body',
        hint:'Plain text is auto-paragraphed. HTML is passed through if you use it.' },
      { k:'published', t:'bool',   label:'Published',
        hint:'Unpublished entries are invisible to the public — the database enforces it, not just the UI.' },
    ],
  },
  {
    id:'status', table:'build_status', label:'Status', title:'Build status',
    order:'position.asc',
    blank:() => ({ position:0, label:'', state:'wip', note:'', chip:'' }),
    row:r => ({ title:r.label || '(untitled)', sub:`${r.state} · ${r.note}`, flags:[] }),
    fields:[
      { k:'position', t:'number', label:'Order' },
      { k:'label',    t:'text',   label:'Label' },
      { k:'state',    t:'select', label:'State', opts:['done','wip','none'] },
      { k:'note',     t:'text',   label:'Note' },
      { k:'chip',     t:'text',   label:'Chip', hint:'The small pill on the right. Leave blank to omit it.' },
    ],
    notice:'This panel is the site’s honesty surface. Every row should be checkable ' +
           'against the actual repository — if one stops being true, change it here.',
  },
  {
    id:'text', table:'site_text', label:'Copy', title:'Site copy',
    order:'key.asc', pk:'key', noCreate:true, noDelete:true,
    row:r => ({ title:r.key, sub:r.value.replace(/<[^>]+>/g,'').slice(0, 60), flags:[] }),
    fields:[
      { k:'key',   t:'text', label:'Key', readonly:true },
      { k:'value', t:'area', label:'Text', hint:'Basic HTML is allowed in the notice blocks.' },
    ],
  },
];

/* ── state ──────────────────────────────────────────────── */

let tab = TABS[0];
let rows = [];
let editing = null;
let dirty = {};

const pkOf = t => t.pk || 'id';

function banner(msg, bad = false){
  const n = $('banner');
  n.hidden = !msg;
  n.textContent = msg || '';
  n.classList.toggle('adm__banner--bad', !!bad);
}

/* ── list ───────────────────────────────────────────────── */

function renderTabs(){
  $('tabs').innerHTML = TABS.map(t =>
    `<button class="adm__tab" type="button" data-tab="${t.id}"
             aria-current="${t.id === tab.id}">${esc(t.label)}</button>`).join('');
}

function renderList(){
  $('list-title').textContent = tab.title;
  $('new').hidden = !!tab.noCreate;

  if (!rows.length){
    $('list').innerHTML = `<p class="adm__empty">Nothing here yet.${
      tab.noCreate ? '' : ' Use <strong>+ New</strong> to add the first one.'}</p>`;
    return;
  }

  const canOrder = tab.fields.some(f => f.k === 'position');
  $('list').innerHTML = rows.map((r, i) => {
    const v = tab.row(r);
    const flags = (v.flags || []).filter(Boolean)
      .map(f => `<span class="adm__flag">${esc(f)}</span>`).join('');
    return `
      <div class="adm__row" data-id="${esc(r[pkOf(tab)])}"
           data-active="${editing && editing[pkOf(tab)] === r[pkOf(tab)]}">
        ${v.thumb ? `<img src="${esc(mediaURL(v.thumb))}" alt="" loading="lazy">` : ''}
        <span class="adm__row-body">
          <span class="adm__row-title">${esc(v.title)} ${flags}</span>
          <span class="adm__row-sub">${esc(v.sub || '')}</span>
        </span>
        <span class="adm__row-tools">
          ${canOrder ? `
            <button class="adm__icon" type="button" data-move="-1" data-i="${i}"
                    aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="adm__icon" type="button" data-move="1" data-i="${i}"
                    aria-label="Move down" ${i === rows.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
          <button class="adm__icon" type="button" data-edit="${esc(r[pkOf(tab)])}"
                  aria-label="Edit">✎</button>
        </span>
      </div>`;
  }).join('');
}

async function loadTab(){
  banner(tab.notice || '');
  $('list').innerHTML = '<p class="adm__empty">Loading…</p>';
  try {
    rows = await rest(tab.table, { query:`select=*&order=${tab.order}` });
    renderList();
  } catch (e){
    rows = [];
    $('list').innerHTML = '';
    banner(e.message, true);
  }
}

/* ── edit ───────────────────────────────────────────────── */

function field(f, val){
  const id = 'f-' + f.k;
  const hint = f.hint ? `<span class="fld__hint">${esc(f.hint)}</span>` : '';

  if (f.t === 'bool') return `
    <label class="fld fld--bool">
      <input type="checkbox" id="${id}" data-k="${f.k}" ${val ? 'checked' : ''}>
      <span class="fld__label">${esc(f.label)}</span>
    </label>${hint}`;

  if (f.t === 'select') return `
    <label class="fld">
      <span class="fld__label">${esc(f.label)}</span>
      <select class="fld__select" id="${id}" data-k="${f.k}">
        ${f.opts.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}
      </select>${hint}
    </label>`;

  if (f.t === 'area') return `
    <label class="fld">
      <span class="fld__label">${esc(f.label)}</span>
      <textarea class="fld__area" id="${id}" data-k="${f.k}">${esc(val)}</textarea>${hint}
    </label>`;

  if (f.t === 'image') return `
    <div class="fld">
      <span class="fld__label">${esc(f.label)}</span>
      <div class="fld__media">
        <img id="${id}-pv" src="${val ? esc(mediaURL(val)) : ''}" alt=""
             ${val ? '' : 'style="visibility:hidden"'}>
        <span class="fld__media-side">
          <input class="fld__input" type="text" id="${id}" data-k="${f.k}"
                 value="${esc(val)}" placeholder="upload below, or paste a path">
          <input class="fld__file" type="file" accept="image/*"
                 data-upload="${f.k}" data-folder="${f.folder}">
          ${hint}
        </span>
      </div>
    </div>`;

  return `
    <label class="fld">
      <span class="fld__label">${esc(f.label)}</span>
      <input class="fld__input" type="${f.t === 'number' ? 'number' : 'text'}"
             id="${id}" data-k="${f.k}" value="${esc(val)}"
             ${f.readonly ? 'readonly' : ''}>${hint}
    </label>`;
}

function openEditor(rec){
  editing = rec;
  dirty = {};
  $('edit-pane').hidden = false;
  $('edit-title').textContent = rec[pkOf(tab)] ? 'Edit' : 'New';
  $('del').hidden = !rec[pkOf(tab)] || !!tab.noDelete;
  $('saved').hidden = true;
  $('form').innerHTML = tab.fields.map(f => field(f, rec[f.k] ?? '')).join('');
  renderList();
}

function collect(){
  const out = { ...dirty };
  $('form').querySelectorAll('[data-k]').forEach(n => {
    const f = tab.fields.find(x => x.k === n.dataset.k);
    if (!f || f.readonly) return;
    out[f.k] = f.t === 'bool'   ? n.checked
             : f.t === 'number' ? (n.value === '' ? 0 : Number(n.value))
             : n.value;
  });
  return out;
}

async function save(){
  const pk = pkOf(tab);
  const patch = collect();
  const isNew = !editing[pk];

  if (tab.id === 'wiki' && !patch.slug && patch.title){
    patch.slug = patch.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }

  try {
    $('save').disabled = true;
    if (isNew){
      const [made] = await rest(tab.table, { method:'POST', body:patch });
      editing = made;
    } else {
      const [upd] = await rest(tab.table, {
        method:'PATCH', query:`${pk}=eq.${encodeURIComponent(editing[pk])}`, body:patch });
      editing = upd || { ...editing, ...patch };
    }
    await loadTab();
    openEditor(editing);
    $('saved').hidden = false;
    setTimeout(() => { $('saved').hidden = true; }, 2200);
  } catch (e){
    banner(e.message, true);
  } finally {
    $('save').disabled = false;
  }
}

async function remove(){
  const pk = pkOf(tab);
  const label = tab.row(editing).title;
  if (!confirm(`Delete “${label}”? This cannot be undone.`)) return;
  try {
    await rest(tab.table, { method:'DELETE', query:`${pk}=eq.${encodeURIComponent(editing[pk])}` });
    editing = null;
    $('edit-pane').hidden = true;
    await loadTab();
  } catch (e){ banner(e.message, true); }
}

/* Reordering writes both neighbours so positions stay dense and the
   site's ordering never depends on ties. */
async function move(i, dir){
  const j = i + dir;
  if (j < 0 || j >= rows.length) return;
  const a = rows[i], b = rows[j];
  const pk = pkOf(tab);
  try {
    await Promise.all([
      rest(tab.table, { method:'PATCH', query:`${pk}=eq.${encodeURIComponent(a[pk])}`, body:{ position:j + 1 } }),
      rest(tab.table, { method:'PATCH', query:`${pk}=eq.${encodeURIComponent(b[pk])}`, body:{ position:i + 1 } }),
    ]);
    await loadTab();
  } catch (e){ banner(e.message, true); }
}

/* ── wiring ─────────────────────────────────────────────── */

$('tabs').addEventListener('click', async e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = TABS.find(t => t.id === b.dataset.tab);
  editing = null;
  $('edit-pane').hidden = true;
  renderTabs();
  await loadTab();
});

$('list').addEventListener('click', e => {
  const mv = e.target.closest('[data-move]');
  if (mv) return move(+mv.dataset.i, +mv.dataset.move);
  const ed = e.target.closest('[data-edit]');
  if (ed) openEditor(rows.find(r => String(r[pkOf(tab)]) === ed.dataset.edit));
});

$('new').addEventListener('click', () => openEditor(tab.blank()));
$('close-edit').addEventListener('click', () => { editing = null; $('edit-pane').hidden = true; renderList(); });
$('save').addEventListener('click', save);
$('del').addEventListener('click', remove);

$('form').addEventListener('change', async e => {
  const inp = e.target.closest('[data-upload]');
  if (!inp || !inp.files?.length) return;
  const key = inp.dataset.upload;
  banner('Uploading…');
  try {
    const path = await upload(inp.files[0], inp.dataset.folder);
    dirty[key] = path;
    const text = $('f-' + key);
    if (text) text.value = path;
    const pv = $('f-' + key + '-pv');
    if (pv){ pv.src = mediaURL(path); pv.style.visibility = 'visible'; }
    banner('Uploaded. Remember to save.');
  } catch (err){ banner(err.message, true); }
});

/* ── sign in ────────────────────────────────────────────── */

async function enter(){
  let me;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers() });
    if (!res.ok) throw new Error('expired');
    me = await res.json();
  } catch {
    if (!await refreshToken()) return signOut();
    return enter();
  }

  store.email = me.email || '';
  $('who').textContent = store.email;
  $('gate').hidden = true;
  $('shell').hidden = false;

  /* Auth is shared with the other site in this project, so say plainly
     whether this account is actually allowed to write. */
  try {
    const ed = await rest('editors', { query:'select=user_id&limit=1' });
    if (!ed.length){
      banner('Signed in, but this account is not in fruitpop.editors — ' +
             'everything will be read-only until it is added. See docs/cms.md.', true);
    }
  } catch { /* the tab load will surface anything real */ }

  renderTabs();
  await loadTab();
}

function signOut(){
  store.token = null; store.refresh = null; store.email = null;
  $('shell').hidden = true;
  $('gate').hidden = false;
}

$('login').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('login-err');
  err.hidden = true;
  $('login-go').disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:'POST',
      headers:{ apikey: SUPABASE_KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ email:$('email').value, password:$('password').value }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error_description || j.msg || 'Could not sign in.');
    store.token = j.access_token;
    store.refresh = j.refresh_token;
    await enter();
  } catch (e2){
    err.textContent = e2.message;
    err.hidden = false;
  } finally {
    $('login-go').disabled = false;
  }
});

$('signout').addEventListener('click', signOut);

if (store.token) enter(); else $('email').focus();
