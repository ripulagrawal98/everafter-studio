/* Everafter Studio — wedding website builder. No dependencies. */
(() => {
  'use strict';
  const STORAGE_KEY = 'everafter:draft:v1';
  const EDIT_KEYS = 'everafter:owned-sites:v1';
  const THEMES = [
    { id: 'blossom', name: 'Blossom', desc: 'Soft florals & romance' },
    { id: 'heritage', name: 'Royal Heritage', desc: 'Regal & timeless' },
    { id: 'minimal', name: 'Modern Minimal', desc: 'Quietly elegant' }
  ];
  const EXAMPLE = {
    theme: 'blossom', partner1: 'Anaya', partner2: 'Kabir',
    tagline: 'A little destiny, a lifetime of love.',
    message: 'Together with our families, we invite you to celebrate the beginning of our forever.',
    events: [
      { id: 'e1', name: 'Haldi', date: '2026-12-10', time: '11:00', venue: 'The Garden Courtyard, Jaipur' },
      { id: 'e2', name: 'Sangeet', date: '2026-12-10', time: '19:00', venue: 'The Royal Ballroom, Jaipur' },
      { id: 'e3', name: 'Wedding', date: '2026-12-11', time: '19:00', venue: 'The Palace Gardens, Jaipur' }
    ]
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attribute = escapeHtml;
  const slugify = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const safeArray = (value) => Array.isArray(value) ? value : [];
  const validTheme = (theme) => THEMES.some(x => x.id === theme) ? theme : 'blossom';
  const normalize = (v) => ({
    theme: validTheme(v?.theme),
    partner1: String(v?.partner1 ?? '').slice(0, 70),
    partner2: String(v?.partner2 ?? '').slice(0, 70),
    tagline: String(v?.tagline ?? '').slice(0, 180),
    message: String(v?.message ?? '').slice(0, 240),
    events: safeArray(v?.events).slice(0, 12).map((e, i) => ({
      id: String(e.id || `e${i}`), name: String(e.name ?? '').slice(0, 60),
      date: String(e.date ?? '').slice(0, 10), time: String(e.time ?? '').slice(0, 5),
      venue: String(e.venue ?? '').slice(0, 140)
    }))
  });
  let draft = readJSON(STORAGE_KEY, clone(EXAMPLE));
  draft = normalize(draft);
  let step = 0;
  let published = null;
  let publishBusy = false;
  function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function saveDraft() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch {} }
  function savedSites() { return readJSON(EDIT_KEYS, {}); }
  function storeSite(slug, editToken) { try { const s = savedSites(); s[slug] = editToken; localStorage.setItem(EDIT_KEYS, JSON.stringify(s)); } catch {} }
  function formatDate(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
    const d = new Date(`${date}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    const display = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!time || !/^\d\d:\d\d$/.test(time)) return display;
    const [hour, minutes] = time.split(':').map(Number);
    const clock = `${hour % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''} ${hour >= 12 ? 'PM' : 'AM'}`;
    return `${display} · ${clock}`;
  }
  function renderInvitation(data) {
    const d = normalize(data);
    const names = `<span>${escapeHtml(d.partner1 || 'Partner one')}</span><span class="ampersand">&amp;</span><span>${escapeHtml(d.partner2 || 'Partner two')}</span>`;
    const events = d.events.map(e => {
      const when = formatDate(e.date, e.time);
      const venue = e.venue.trim();
      const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
      return `<article class="invite-event"><h3 class="invite-event-title">${escapeHtml(e.name || 'Our celebration')}</h3>${when ? `<div class="invite-event-when">${escapeHtml(when)}</div>` : ''}${venue ? `<p class="invite-event-venue">${escapeHtml(venue)}</p><a href="${attribute(maps)}" target="_blank" rel="noopener noreferrer">Get directions ↗</a>` : ''}</article>`;
    }).join('');
    return `<div class="invite-inner"><p class="invite-overline">Together with their families</p><div class="invite-ornament" aria-hidden="true">✦</div><div class="invite-names">${names}</div>${d.tagline.trim() ? `<p class="invite-tagline">${escapeHtml(d.tagline.trim())}</p>` : ''}<div class="invite-divider"></div>${d.message.trim() ? `<p class="invite-welcome">${escapeHtml(d.message.trim())}</p>` : ''}<h2 class="invite-heading">A celebration in ${d.events.length === 1 ? 'one beautiful act' : `${d.events.length} beautiful acts`}</h2>${events || '<p class="invite-welcome">Your celebrations will appear here.</p>'}<p class="invite-signoff">A beautiful beginning, made sweeter by your presence.</p><div class="invite-end" aria-hidden="true">❦</div></div>`;
  }
  function preview() { const stage = $('#previewStage'); if (!stage) return; stage.className = 'invitation ' + validTheme(draft.theme); stage.innerHTML = renderInvitation(draft); }
  function themeEditor() {
    return `<div class="section-kicker">Step 01 · Set the mood</div><h2 class="editor-title">Find your forever aesthetic.</h2><p class="editor-hint">Three unique invitations. One beautiful love story. You can switch themes anytime.</p><div class="theme-picker">${THEMES.map(t => `<button type="button" class="theme-option ${draft.theme === t.id ? 'active' : ''}" data-theme="${t.id}" aria-pressed="${draft.theme === t.id}"><div class="theme-picture ${t.id}"><span class="mini-top">THE WEDDING OF</span><span class="mini-names">A &amp; K</span><span class="mini-date">FOREVER BEGINS HERE</span></div><span class="theme-label">${t.name}</span><span class="theme-desc">${t.desc}</span></button>`).join('')}</div>`;
  }
  function inputField(label, key, placeholder, maxlength, type = 'text') {
    return `<div class="field"><label for="field-${key}">${label}</label><input id="field-${key}" name="${key}" data-field="${key}" type="${type}" maxlength="${maxlength}" value="${attribute(draft[key] || '')}" placeholder="${attribute(placeholder)}" /></div>`;
  }
  function coupleEditor() {
    return `<div class="section-kicker">Step 02 · Two become one</div><h2 class="editor-title">Introduce the happy couple.</h2><p class="editor-hint">Your names are the heart of the invitation. Make it personal with a few words of your own.</p><div class="field-grid">${inputField('Partner one', 'partner1', 'First name', 70)}${inputField('Partner two', 'partner2', 'First name', 70)}</div>${inputField('A little line about your story', 'tagline', 'Our forever begins here', 180)}<div class="field"><label for="field-message">Invitation message</label><textarea id="field-message" data-field="message" maxlength="240" placeholder="We would love to celebrate with you.">${escapeHtml(draft.message)}</textarea></div><p class="mini-note">Tip: short, heartfelt words look especially lovely on mobile.</p>`;
  }
  function eventsEditor() {
    return `<div class="section-kicker">Step 03 · The celebrations</div><h2 class="editor-title">Every moment deserves its place.</h2><p class="editor-hint">Add your Haldi, Sangeet, wedding, or any other event. Up to 12 celebrations.</p><div class="events-list">${draft.events.map((event, index) => `<div class="event-editor"><div class="event-head"><span class="event-count">Celebration ${String(index + 1).padStart(2, '0')}</span><button type="button" class="text-button" data-remove-event="${attribute(event.id)}" aria-label="Remove ${attribute(event.name || 'event')}">Remove</button></div><div class="field"><label for="event-name-${index}">Event name</label><input id="event-name-${index}" data-event-id="${attribute(event.id)}" data-event-field="name" maxlength="60" value="${attribute(event.name)}" placeholder="Haldi, Sangeet, Wedding..." /></div><div class="field-grid"><div class="field"><label for="event-date-${index}">Date</label><input id="event-date-${index}" type="date" data-event-id="${attribute(event.id)}" data-event-field="date" value="${attribute(event.date)}" /></div><div class="field"><label for="event-time-${index}">Time</label><input id="event-time-${index}" type="time" data-event-id="${attribute(event.id)}" data-event-field="time" value="${attribute(event.time)}" /></div></div><div class="field"><label for="event-venue-${index}">Venue</label><input id="event-venue-${index}" data-event-id="${attribute(event.id)}" data-event-field="venue" maxlength="140" value="${attribute(event.venue)}" placeholder="Venue name, city" /></div></div>`).join('')}</div><button class="add-event" type="button" id="addEvent" ${draft.events.length >= 12 ? 'disabled' : ''}>+ Add another celebration</button>`;
  }
  function publishEditor() {
    const link = published ? `<div class="published-links"><h3>✓ Your website is published</h3><div class="share-url">${escapeHtml(published.url)}</div><div class="published-actions"><button type="button" id="copyShare">Copy link</button><a href="${attribute(published.url)}" target="_blank" rel="noopener noreferrer">Open website ↗</a></div></div>` : '';
    return `<div class="section-kicker">Step 04 · Almost forever</div><h2 class="editor-title">Ready to share the joy?</h2><p class="editor-hint">One more look before your wedding website goes live.</p><div class="publish-summary"><div class="summary-line"><span>Invitation for</span><strong>${escapeHtml(draft.partner1)} &amp; ${escapeHtml(draft.partner2)}</strong></div><div class="summary-line"><span>Theme</span><strong>${escapeHtml(THEMES.find(t => t.id === draft.theme)?.name || 'Blossom')}</strong></div><div class="summary-line"><span>Celebrations</span><strong>${draft.events.length}</strong></div><div class="summary-line"><span>Suggested link</span><strong>/s/${escapeHtml(slugify(`${draft.partner1}-${draft.partner2}`) || 'our-wedding')}</strong></div></div><p class="publish-help">Publishing creates a public, shareable invitation. Anyone with the link can view event details. Your private edit key stays in this browser; keep a copy before clearing browser data.</p>${link}`;
  }
  function validatePage(specificStep = step) {
    if (specificStep >= 1 && (!draft.partner1.trim() || !draft.partner2.trim())) return 'Please enter both names before continuing.';
    if (specificStep >= 2) {
      if (!draft.events.length) return 'Please add at least one celebration.';
      for (let i = 0; i < draft.events.length; i++) {
        const e = draft.events[i];
        if (!e.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !e.time || !e.venue.trim()) return `Complete the name, date, time and venue for celebration ${i + 1}.`;
        const d = new Date(`${e.date}T12:00:00`);
        if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== e.date) return `Please use a valid date for celebration ${i + 1}.`;
      }
    }
    return '';
  }
  function notice(message) { const n = $('#appNotice'); n.textContent = message; n.hidden = !message; }
  function setStep(next) {
    step = Math.max(0, Math.min(3, next));
    $('#editor').innerHTML = [themeEditor, coupleEditor, eventsEditor, publishEditor][step]();
    $$('.step').forEach(b => { const selected = +b.dataset.step === step; b.classList.toggle('active', selected); b.setAttribute('aria-current', selected ? 'step' : 'false'); });
    const back = $('#backButton'); back.style.visibility = step === 0 ? 'hidden' : 'visible';
    const nextButton = $('#nextButton'); nextButton.textContent = step === 3 ? published ? 'Update website ↗' : 'Publish website ↗' : 'Continue →';
    nextButton.disabled = publishBusy;
    notice('');
  }
  function refresh() { saveDraft(); preview(); if (step === 3) setStep(3); }
  async function publishSite() {
    if (publishBusy) return;
    const error = validatePage(3);
    if (error) return notice(error);
    publishBusy = true; $('#nextButton').disabled = true; $('#nextButton').textContent = 'Publishing…'; notice('');
    try {
      const token = published?.slug ? savedSites()[published.slug] : null;
      const endpoint = token ? `/api/sites/${encodeURIComponent(published.slug)}` : '/api/sites';
      const method = token ? 'PATCH' : 'POST';
      const response = await fetch(endpoint, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(draft)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `Publishing failed (${response.status}).`);
      if (!result?.slug || !result?.url) throw new Error('The server returned an unexpected response.');
      if (result.editToken) storeSite(result.slug, result.editToken);
      published = { slug: result.slug, url: new URL(result.url, location.origin).href };
      notice('');
      setStep(3);
    } catch (err) {
      notice(err instanceof TypeError || /Publishing failed \(40[45]|501\)/.test(err.message) ? 'Publishing is not available in static preview mode. Deploy to Cloudflare Pages and bind a D1 database to enable it.' : err.message);
    } finally { publishBusy = false; $('#nextButton').disabled = false; $('#nextButton').textContent = published ? 'Update website ↗' : 'Publish website ↗'; }
  }
  function setupBuilder() {
    const editSlug = new URLSearchParams(location.search).get('edit');
    if (editSlug && /^[a-z0-9-]{1,80}$/.test(editSlug) && savedSites()[editSlug]) {
      fetch(`/api/sites/${editSlug}`).then(r => { if (!r.ok) throw Error('Unable to load your wedding.'); return r.json(); }).then(site => {
        draft = normalize(site); published = {slug: editSlug, url: `${location.origin}/s/${editSlug}`}; saveDraft(); preview(); setStep(1);
      }).catch(() => notice('The published site could not be loaded. Your local draft is still available.'));
    }
    $('#editor').addEventListener('click', (evt) => {
      const theme = evt.target.closest('[data-theme]');
      if (theme) { draft.theme = theme.dataset.theme; refresh(); setStep(0); return; }
      const remove = evt.target.closest('[data-remove-event]');
      if (remove) {
        if (draft.events.length < 2) return notice('Please keep at least one celebration.');
        draft.events = draft.events.filter(e => e.id !== remove.dataset.removeEvent);
        refresh(); setStep(2); return;
      }
      if (evt.target.closest('#addEvent')) {
        draft.events.push({ id: crypto.randomUUID(), name: '', date: '', time: '', venue: '' });
        refresh(); setStep(2);
        const list = $('.events-list'); if (list) list.scrollTop = list.scrollHeight;
      }
      if (evt.target.closest('#copyShare') && published) {
        navigator.clipboard?.writeText(published.url).then(() => notice('Website link copied.')).catch(() => notice('Copy the link shown above.'));
      }
    });
    $('#editor').addEventListener('input', (evt) => {
      const el = evt.target;
      if (el.dataset.field) draft[el.dataset.field] = el.value;
      if (el.dataset.eventField) { const e = draft.events.find(v => v.id === el.dataset.eventId); if (e) e[el.dataset.eventField] = el.value; }
      notice(''); refresh();
    });
    $('#editor').addEventListener('change', (evt) => {
      const el = evt.target;
      if (el.dataset.eventField) { const e = draft.events.find(v => v.id === el.dataset.eventId); if (e) e[el.dataset.eventField] = el.value; refresh(); }
    });
    $('#backButton').addEventListener('click', () => setStep(step - 1));
    $('#nextButton').addEventListener('click', () => { if (step === 3) return publishSite(); const error = validatePage(step); if (error) return notice(error); setStep(step + 1); });
    $$('.step').forEach(b => b.addEventListener('click', () => { const to = +b.dataset.step; if (to > step && validatePage(to - 1)) return notice(validatePage(to - 1)); setStep(to); }));
    $('#headerPreview').addEventListener('click', () => { $('.preview-column').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $$('.preview-toggle button').forEach(b => b.addEventListener('click', () => {
      $('#previewShell').className = 'preview-shell ' + b.dataset.size;
      $$('.preview-toggle button').forEach(x => { const active = x === b; x.classList.toggle('selected', active); x.setAttribute('aria-pressed', active ? 'true' : 'false'); });
    }));
    preview(); setStep(0);
  }
  async function setupPublished(slug) {
    $('#builderApp').hidden = true;
    const mount = $('#publishedApp'); mount.hidden = false;
    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(slug)}`);
      if (!response.ok) throw Error('We couldn’t find this invitation.');
      const data = normalize(await response.json());
      document.title = `${data.partner1} & ${data.partner2} — Wedding Invitation`;
      mount.innerHTML = `<div class="published-top"><a class="published-brand" href="/">✳ everafter studio</a><a href="/">Create your own ↗</a></div><main class="invitation published-card ${data.theme}">${renderInvitation(data)}</main><div class="published-foot">Made with love · Everafter Studio</div>`;
    } catch (e) {
      mount.innerHTML = `<div class="published-error"><h1>A little detour…</h1><p>${escapeHtml(e.message)}</p><a href="/">Return to the studio</a></div>`;
    }
  }
  const match = location.pathname.match(/^\/s\/([a-z0-9-]{1,80})\/?$/);
  if (match) setupPublished(match[1]); else setupBuilder();
})();