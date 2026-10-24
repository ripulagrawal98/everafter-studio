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

  // Optional custom colors: without a selection, keep the theme's original design.
  const PALETTES = [
    {id:'rose',name:'Rose Garden',colors:{background:'#FCEFEB',surface:'#FFFAF6',text:'#634455',accent:'#96566D'}},
    {id:'sage',name:'Soft Sage',colors:{background:'#EDF2E9',surface:'#FFFEF8',text:'#344D40',accent:'#50735C'}},
    {id:'champagne',name:'Champagne',colors:{background:'#FAF0DE',surface:'#FFFDF5',text:'#56452F',accent:'#845B32'}},
    {id:'midnight',name:'Midnight',colors:{background:'#211D33',surface:'#302B44',text:'#FAF1E6',accent:'#E5B9C0'}},
    {id:'royal',name:'Royal Plum',colors:{background:'#331623',surface:'#4D2031',text:'#F6DEC1',accent:'#E1B881'}}
  ];
  const THEME_DEFAULTS = {
    blossom:{background:'#FCF5EF',surface:'#FFFAF5',text:'#654C55',accent:'#AB7584'},
    heritage:{background:'#331623',surface:'#4D2031',text:'#F6DEC1',accent:'#E1B881'},
    minimal:{background:'#F6F5EE',surface:'#FFFEFA',text:'#435447',accent:'#6F8A75'}
  };
  const COLOR_FIELDS = [
    ['background','Page background'],
    ['surface','Cards & sections'],
    ['text','Text color'],
    ['accent','Accent color']
  ];
  const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
  const validColors = (colors) => colors && typeof colors === 'object' && COLOR_FIELDS.every(([key]) => typeof colors[key] === 'string' && COLOR_RE.test(colors[key])) ?
    Object.fromEntries(COLOR_FIELDS.map(([key]) => [key, colors[key].toUpperCase()])) : null;
  const activeColors = () => validColors(draft.colors) || THEME_DEFAULTS[draft.theme];
  function colorContrast(a, b) {
    const brightness = (hex) => {
      const parts = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
      const luminance = parts.map(c => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4));
      return 0.2126*luminance[0]+0.7152*luminance[1]+0.0722*luminance[2];
    };
    const l1 = brightness(a), l2 = brightness(b);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  }
  function selectedPalette() {
    const custom = validColors(draft.colors);
    if (!custom) return 'theme';
    return PALETTES.find(p => COLOR_FIELDS.every(([key]) => p.colors[key].toUpperCase() === custom[key]))?.id || 'custom';
  }
  function updateColorNotice() {
    const el = $('#colorContrastNotice');
    if (!el) return;
    const c = activeColors();
    const lowText = Math.min(colorContrast(c.text,c.background), colorContrast(c.text,c.surface)) < 4.5;
    const lowAccent = Math.min(colorContrast(c.accent,c.background),colorContrast(c.accent,c.surface)) < 3;
    el.textContent = lowText ? '⚠ Text and background colors are too similar. Try increasing contrast for readability.' :
      lowAccent ? 'Tip: Your accent color may be difficult to read on the selected backgrounds.' :
      '✓ The chosen text color has good contrast on both backgrounds.';
    el.classList.toggle('contrast-warning',lowText||lowAccent);
  }
  function syncColorControls() {
    const colors = activeColors();
    COLOR_FIELDS.forEach(([key]) => {
      const picker = $('#picker-' + key), hex = $('#hex-' + key);
      if (picker) picker.value = colors[key];
      if (hex && document.activeElement !== hex) hex.value = colors[key];
    });
    $('#editor [data-palette]').forEach(button => {
      const active = button.dataset.palette === selectedPalette();
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const state = $('#paletteSelection');
    if (state) state.textContent = draft.colors ? 'Custom palette applied' : 'Using original theme colors';
    updateColorNotice();
  }
  const SECTION_LAYOUTS = {
    hero: [['centered','Romantic Center','Classic centered names'],['split','Editorial Split','Contemporary two-column welcome'],['framed','Invitation Frame','Formal bordered welcome']],
    story: [['classic','Poetic Center','Soft centered narrative'],['editorial','Editorial','Left-aligned magazine style'],['letter','Love Letter','Personal letter on paper']],
    events: [['cards','Event Cards','Individual event cards'],['timeline','Timeline','Events arranged chronologically'],['rows','Elegant List','Minimal, numbered rows']],
    gallery: [['grid','Photo Grid','Balanced photo tiles'],['mosaic','Mosaic','Playful editorial arrangement'],['filmstrip','Filmstrip','Horizontal photo sequence']],
    venue: [['cards','Venue Cards','Separate venue panels'],['list','Travel List','Simple vertical directions'],['highlight','Destination','Large highlighted destination']],
    closing: [['classic','Simple Sign-off','Centered closing message'],['framed','Framed Blessing','A decorative farewell'],['banner','Statement','Full-width modern finale']]
  };
  const DEFAULT_SECTION_LAYOUTS = Object.fromEntries(Object.entries(SECTION_LAYOUTS).map(([key,options])=>[key,options[0][0]]));
  function cleanSectionLayouts(input) {
    return Object.fromEntries(Object.entries(SECTION_LAYOUTS).map(([key,options])=>[
      key, options.some(([id])=>id===input?.[key]) ? input[key] : DEFAULT_SECTION_LAYOUTS[key]
    ]));
  }
  const EXAMPLE = {
    theme: 'blossom', colors: null, sectionDesigns:{hero:'centered',story:'classic',events:'cards',gallery:'grid',venue:'cards',closing:'classic'}, partner1: 'Anaya', partner2: 'Kabir',
    tagline: 'A little destiny, a lifetime of love.',
    message: 'Together with our families, we invite you to celebrate the beginning of our forever.',
    story: 'Our paths crossed, our families brought us together, and a beautiful journey began. From that first conversation to the memories we are yet to make, we are so grateful to share this chapter with you.',
    travelNote: 'We would be delighted to celebrate with you.',
    sections: {story:true,gallery:true,venue:true},
    photos: [],
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
    colors: validColors(v?.colors),
    sectionDesigns: cleanSectionLayouts(v?.sectionDesigns),
    partner1: String(v?.partner1 ?? '').slice(0, 70),
    partner2: String(v?.partner2 ?? '').slice(0, 70),
    tagline: String(v?.tagline ?? '').slice(0, 180),
    message: String(v?.message ?? '').slice(0, 240),
    story: String(v?.story ?? '').slice(0, 1200),
    travelNote: String(v?.travelNote ?? '').slice(0, 240),
    sections: {story:v?.sections?.story !== false,gallery:v?.sections?.gallery !== false,venue:v?.sections?.venue !== false},
    photos: safeArray(v?.photos).filter(p => typeof p === 'string').slice(0, 6).map(p => p.slice(0, 2048)),
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
  function preview() {
    const stage = $('#previewStage');
    if (!stage) return;
    const keep = stage.scrollTop;
    stage.innerHTML = window.EverafterSite.render(draft, {preview:true});
    stage.scrollTop = keep;
    requestAnimationFrame(syncPreviewScroll);
  }
  // The vertical rail is independent of the editor's page scrolling.
  function syncPreviewScroll() {
    const stage = $('#previewStage'), slider = $('#previewVerticalSlider');
    if (!stage || !slider) return;
    const limit = Math.max(0, stage.scrollHeight - stage.clientHeight);
    const position = Math.min(Math.max(0, stage.scrollTop), limit);
    slider.value = String(limit ? Math.round(position / limit * 1000) : 0);
    slider.disabled = limit <= 1;
    const up = $('#previewScrollUp'), down = $('#previewScrollDown');
    if (up) up.disabled = position <= 1;
    if (down) down.disabled = limit <= 1 || position >= limit - 1;
  }
  function setupPreviewScroll() {
    const stage = $('#previewStage'), slider = $('#previewVerticalSlider');
    if (!stage || !slider) return;
    stage.addEventListener('scroll', syncPreviewScroll, {passive:true});
    slider.addEventListener('input', () => {
      const limit = Math.max(0, stage.scrollHeight - stage.clientHeight);
      stage.scrollTop = limit * (Number(slider.value) / 1000);
      syncPreviewScroll();
    });
    const scrollStep = (direction) => {
      stage.scrollBy({top: direction * Math.max(180, stage.clientHeight * 0.65), behavior:'smooth'});
    };
    $('#previewScrollUp').addEventListener('click', () => scrollStep(-1));
    $('#previewScrollDown').addEventListener('click', () => scrollStep(1));
    window.addEventListener('resize', syncPreviewScroll);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(syncPreviewScroll);
      observer.observe(stage);
      const watchPage = () => {
        observer.disconnect();
        observer.observe(stage);
        if (stage.firstElementChild) observer.observe(stage.firstElementChild);
        syncPreviewScroll();
      };
      // Content is re-rendered on every draft edit; refresh the height observer.
      const contentObserver = new MutationObserver(watchPage);
      contentObserver.observe(stage, {childList:true});
    }
    syncPreviewScroll();
  }
  function themeEditor() {
    const colors = activeColors();
    const palettes = PALETTES.map(p => {
      const dots = COLOR_FIELDS.map(([key]) => '<span style="background:' + p.colors[key] + '" aria-hidden="true"></span>').join('');
      return `<button type="button" class="palette-option" data-palette="${p.id}" aria-pressed="false"><span class="palette-dots">${dots}</span><span>${p.name}</span></button>`;
    }).join('');
    const controls = COLOR_FIELDS.map(([key,label]) =>
      `<div class="color-control"><label for="picker-${key}">${label}</label><div class="color-control-inputs"><input type="color" id="picker-${key}" data-color-picker="${key}" value="${colors[key]}" aria-label="Pick ${label.toLowerCase()}" /><input type="text" id="hex-${key}" data-color-hex="${key}" value="${colors[key]}" maxlength="7" spellcheck="false" aria-label="${label} hex code" pattern="#[0-9a-fA-F]{6}" /></div></div>`
    ).join('');
    return `<div class="section-kicker">Step 01 · Set the mood</div><h2 class="editor-title">Find your forever aesthetic.</h2><p class="editor-hint">Choose a layout, then personalize every color. Your changes appear instantly.</p><div class="theme-picker">${THEMES.map(t => `<button type="button" class="theme-option ${draft.theme === t.id ? 'active' : ''}" data-theme="${t.id}" aria-pressed="${draft.theme === t.id}"><div class="theme-picture ${t.id}"><span class="mini-top">THE WEDDING OF</span><span class="mini-names">A &amp; K</span><span class="mini-date">FOREVER BEGINS HERE</span></div><span class="theme-label">${t.name}</span><span class="theme-desc">${t.desc}</span></button>`).join('')}</div>` +
      `<section class="palette-panel" aria-label="Customize invitation colors"><div class="palette-head"><div><h3>Make it your own</h3><p id="paletteSelection">Using original theme colors</p></div><button type="button" class="reset-colors" data-reset-colors>↺ Reset theme colors</button></div><p class="palette-subheading">COLOR PALETTES</p><div class="palette-presets"><button type="button" class="palette-option" data-palette="theme" aria-pressed="true"><span class="palette-dots">${COLOR_FIELDS.map(([key])=>`<span style="background:${THEME_DEFAULTS[draft.theme][key]}" aria-hidden="true"></span>`).join('')}</span><span>Original</span></button>${palettes}</div><p class="palette-subheading">PICK INDIVIDUAL COLORS</p><div class="color-controls">${controls}</div><p class="color-contrast" id="colorContrastNotice" role="status"></p></section>`;
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
  function sectionsEditor() {
    const switches = [
      ['story','Our Story','A dedicated section with your journey together.'],
      ['gallery','Photo Gallery','Show your favourite moments using public photo links.'],
      ['venue','Venue & Directions','Automatically use locations from the event details.']
    ];
    return `<div class="section-kicker">Step 04 · More of your story</div><h2 class="editor-title">Make room for every chapter.</h2><p class="editor-hint">Your invitation is now a complete multi-section website. Choose which sections your guests will see.</p>` +
      switches.map(([key,title,desc]) => `<div class="ws-section-toggle"><div><label for="toggle-${key}">${title}</label><p>${desc}</p></div><input type="checkbox" id="toggle-${key}" data-section="${key}" ${draft.sections[key] ? 'checked' : ''} /></div>`).join('') +
      `<div class="section-layout-panel"><h3>Choose each section's design</h3><p class="ws-editor-note">Mix designs freely. Every combination inherits your selected theme and colors.</p>` +
      Object.entries(SECTION_LAYOUTS).map(([key,choices]) => {
        const displayName = {hero:'Welcome',story:'Our Story',events:'Celebrations',gallery:'Gallery',venue:'Venue',closing:'Closing'}[key];
        const disabled = key==='story' && !draft.sections.story || key==='gallery' && !draft.sections.gallery || key==='venue' && !draft.sections.venue;
        return `<fieldset class="layout-choice" ${disabled ? 'disabled' : ''}><legend>${displayName}</legend><div class="layout-choice-grid">` +
          choices.map(([id,title,description],index) =>
            `<button type="button" class="layout-choice-card ${draft.sectionDesigns[key]===id ? 'active' : ''}" data-layout-section="${key}" data-layout-id="${id}" aria-pressed="${draft.sectionDesigns[key]===id}" title="${description}"><span class="layout-sketch sketch-${key}-${id}" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="layout-choice-name">${title}</span></button>`).join('') +
          `</div></fieldset>`;
      }).join('') + `</div>` +
      `<div class="field" style="margin-top:20px"><label for="storyField">Your story</label><textarea id="storyField" rows="5" data-field="story" maxlength="1200" placeholder="How it all began...">${escapeHtml(draft.story)}</textarea></div>` +
      `<div class="field"><label for="travelField">A note for your guests</label><textarea id="travelField" rows="3" data-field="travelNote" maxlength="240" placeholder="Travel notes, if any...">${escapeHtml(draft.travelNote)}</textarea></div>` +
      `<div class="ws-photo-edit"><h3>Gallery photographs (up to six)</h3><p class="ws-editor-note">Paste public HTTPS image links. Image uploads will be added in the next phase.</p>` +
      draft.photos.map((photo,i) => `<div class="ws-photo-field"><input type="url" aria-label="Photo link ${i+1}" data-photo-index="${i}" value="${attribute(photo)}" placeholder="https://example.com/photo.jpg" /><button type="button" aria-label="Remove photo ${i+1}" data-remove-photo="${i}">×</button></div>`).join('') +
      `<button type="button" class="add-event" data-add-photo ${draft.photos.length >= 6 ? 'disabled' : ''}>+ Add photo link</button></div>`;
  }
  function publishEditor() {
    const link = published ? `<div class="published-links"><h3>✓ Your website is published</h3><div class="share-url">${escapeHtml(published.url)}</div><div class="published-actions"><button type="button" id="copyShare">Copy link</button><a href="${attribute(published.url)}" target="_blank" rel="noopener noreferrer">Open website ↗</a></div></div>` : '';
    return `<div class="section-kicker">Step 05 · Almost forever</div><h2 class="editor-title">Ready to share the joy?</h2><p class="editor-hint">One more look before your wedding website goes live.</p><div class="publish-summary"><div class="summary-line"><span>Invitation for</span><strong>${escapeHtml(draft.partner1)} &amp; ${escapeHtml(draft.partner2)}</strong></div><div class="summary-line"><span>Theme</span><strong>${escapeHtml(THEMES.find(t => t.id === draft.theme)?.name || 'Blossom')}</strong></div><div class="summary-line"><span>Celebrations</span><strong>${draft.events.length}</strong></div><div class="summary-line"><span>Suggested link</span><strong>/s/${escapeHtml(slugify(`${draft.partner1}-${draft.partner2}`) || 'our-wedding')}</strong></div></div><p class="publish-help">Publishing creates a public, shareable invitation. Anyone with the link can view event details. Your private edit key stays in this browser; keep a copy before clearing browser data.</p>${link}`;
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
    step = Math.max(0, Math.min(4, next));
    $('#editor').innerHTML = [themeEditor, coupleEditor, eventsEditor, sectionsEditor, publishEditor][step]();
    $$('.step').forEach(b => { const selected = +b.dataset.step === step; b.classList.toggle('active', selected); b.setAttribute('aria-current', selected ? 'step' : 'false'); });
    const back = $('#backButton'); back.style.visibility = step === 0 ? 'hidden' : 'visible';
    const nextButton = $('#nextButton'); nextButton.textContent = step === 4 ? published ? 'Update website ↗' : 'Publish website ↗' : 'Continue →';
    nextButton.disabled = publishBusy;
    notice('');
  }
  function refresh() { saveDraft(); preview(); if (step === 4) setStep(4); }
  async function publishSite() {
    if (publishBusy) return;
    const error = validatePage(4);
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
      setStep(4);
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
      const layout = evt.target.closest('[data-layout-section][data-layout-id]');
      if (layout) {
        const section = layout.dataset.layoutSection, design = layout.dataset.layoutId;
        if (SECTION_LAYOUTS[section]?.some(([id])=>id===design)) {
          draft.sectionDesigns[section]=design;
          refresh(); setStep(3);
        }
        return;
      }
      const theme = evt.target.closest('[data-theme]');
      if (theme) { draft.theme = theme.dataset.theme; refresh(); setStep(0); syncColorControls(); return; }
      const preset = evt.target.closest('[data-palette]');
      if (preset) {
        const match = PALETTES.find(p => p.id === preset.dataset.palette);
        draft.colors = match ? {...match.colors} : null;
        refresh(); setStep(0); syncColorControls(); return;
      }
      if (evt.target.closest('[data-reset-colors]')) {
        draft.colors = null; refresh(); setStep(0); syncColorControls(); return;
      }
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
      if (evt.target.closest('[data-add-photo]')) { if (draft.photos.length < 6) { draft.photos.push(''); refresh(); setStep(3); } return; }
      const photoRemove = evt.target.closest('[data-remove-photo]');
      if (photoRemove) { draft.photos.splice(+photoRemove.dataset.removePhoto,1); refresh(); setStep(3); return; }
      if (evt.target.closest('#copyShare') && published) {
        navigator.clipboard?.writeText(published.url).then(() => notice('Website link copied.')).catch(() => notice('Copy the link shown above.'));
      }
    });
    $('#editor').addEventListener('input', (evt) => {
      const el = evt.target;
      if (el.dataset.colorPicker || el.dataset.colorHex) {
        const key = el.dataset.colorPicker || el.dataset.colorHex;
        if (COLOR_FIELDS.some(([field]) => field === key) && COLOR_RE.test(el.value)) {
          draft.colors = {...activeColors(),[key]:el.value.toUpperCase()};
          refresh();
          syncColorControls();
        }
        return;
      }
      if (el.dataset.field) draft[el.dataset.field] = el.value;
      if (el.dataset.photoIndex !== undefined) draft.photos[+el.dataset.photoIndex] = el.value;
      if (el.dataset.eventField) { const e = draft.events.find(v => v.id === el.dataset.eventId); if (e) e[el.dataset.eventField] = el.value; }
      notice(''); refresh();
    });
    $('#editor').addEventListener('change', (evt) => {
      const el = evt.target;
      if (el.dataset.colorHex) { if (!COLOR_RE.test(el.value)) el.value = activeColors()[el.dataset.colorHex]; syncColorControls(); }
      if (el.dataset.eventField) { const e = draft.events.find(v => v.id === el.dataset.eventId); if (e) e[el.dataset.eventField] = el.value; refresh(); }
      if (el.dataset.section) { draft.sections[el.dataset.section] = el.checked; refresh(); }
    });
    $('#backButton').addEventListener('click', () => setStep(step - 1));
    $('#nextButton').addEventListener('click', () => { if (step === 4) return publishSite(); const error = validatePage(step); if (error) return notice(error); setStep(step + 1); });
    $$('.step').forEach(b => b.addEventListener('click', () => { const to = +b.dataset.step; if (to > step && validatePage(to - 1)) return notice(validatePage(to - 1)); setStep(to); }));
    $('#headerPreview').addEventListener('click', () => { $('.preview-column').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $$('.preview-toggle button').forEach(b => b.addEventListener('click', () => {
      $('#previewShell').className = 'preview-shell ' + b.dataset.size;
      $('.preview-toggle button').forEach(x => { const active = x === b; x.classList.toggle('selected', active); x.setAttribute('aria-pressed', active ? 'true' : 'false'); });
      requestAnimationFrame(syncPreviewScroll);
    }));
    setupPreviewScroll();
    preview(); setStep(0); syncColorControls();
  }
  async function setupPublished(slug) {
    $('#builderApp').hidden = true;
    const mount = $('#publishedApp'); mount.hidden = false;
    try {
      const response = await fetch(`/api/sites/${encodeURIComponent(slug)}`);
      if (!response.ok) throw Error('We couldn’t find this invitation.');
      const data = normalize(await response.json());
      document.title = `${data.partner1} & ${data.partner2} — Wedding Invitation`;
      mount.innerHTML = window.EverafterSite.render(data);
    } catch (e) {
      mount.innerHTML = `<div class="published-error"><h1>A little detour…</h1><p>${escapeHtml(e.message)}</p><a href="/">Return to the studio</a></div>`;
    }
  }
  const match = location.pathname.match(/^\/s\/([a-z0-9-]{1,80})\/?$/);
  if (match) setupPublished(match[1]); else setupBuilder();
})();