/* Shared multi-section invitation renderer — used in the builder preview and published sites. */
(function () {
  'use strict';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const themes = new Set(['blossom','heritage','minimal']);
  const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
  const COLOR_VARIABLES = {background:'--ws-bg',surface:'--ws-paper',text:'--ws-ink',accent:'--ws-accent'};
  // Strictly whitelist the CSS custom properties and hex colors to avoid style injection from saved user data.
  function colorStyle(colors) {
    if (!colors || typeof colors !== 'object') return '';
    if (!Object.keys(COLOR_VARIABLES).every(key => typeof colors[key] === 'string' && COLOR_RE.test(colors[key]))) return '';
    return Object.entries(COLOR_VARIABLES).map(([key,variable]) => variable + ':' + colors[key].toUpperCase()).join(';');
  }

  function backgroundStyle(bg) {
    if (!bg || typeof bg !== 'object' || typeof bg.image !== 'string') return '';
    const safeImage = /^data:image\/webp;base64,[A-Za-z0-9+/=]{100,900000}$/.test(bg.image) ||
      /^\/media\/backgrounds\/[a-f0-9-]{36}\.webp$/.test(bg.image);
    if (!safeImage) return '';
    const position = ['center','top','bottom'].includes(bg.position) ? bg.position : 'center';
    const overlay = Number.isInteger(bg.overlay) ? Math.max(0,Math.min(85,bg.overlay)) : 45;
    return '--ws-uploaded-background:url(' + bg.image + ');--ws-uploaded-position:' + position +
      ';--ws-uploaded-overlay:' + overlay + '%;';
  }
  const LAYOUT_OPTIONS = {
    hero:['centered','split','framed'],
    story:['classic','editorial','letter'],
    events:['cards','timeline','rows'],
    gallery:['grid','mosaic','filmstrip'],
    venue:['cards','list','highlight'],
    closing:['classic','framed','banner']
  };
  function layoutFor(data, section) {
    const choice = data?.sectionDesigns?.[section];
    return LAYOUT_OPTIONS[section].includes(choice) ? choice : LAYOUT_OPTIONS[section][0];
  }
  function prettyDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
    const value = new Date(date + 'T12:00:00Z');
    if (Number.isNaN(value.getTime()) || value.toISOString().slice(0,10) !== date) return '';
    return value.toLocaleDateString('en-IN', { timeZone:'UTC', weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }
  function prettyTime(time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return '';
    const [hour, minute] = time.split(':').map(Number);
    return (hour % 12 || 12) + (minute ? ':' + String(minute).padStart(2, '0') : '') + (hour >= 12 ? ' PM' : ' AM');
  }
  function initials(value) { return [...String(value || '').trim()][0]?.toUpperCase() || '♡'; }
  function directions(venue) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue);
  }
  function render(data, options = {}) {
    const d = data || {};
    const theme = themes.has(d.theme) ? d.theme : 'blossom';
    const designClass = (section) => ' ws-layout-' + layoutFor(d, section);
    const customColorStyle = colorStyle(d.colors);
    const uploadedStyle = backgroundStyle(d.background);
    const partner1 = String(d.partner1 || 'Partner one').trim();
    const partner2 = String(d.partner2 || 'Partner two').trim();
    const events = (Array.isArray(d.events) ? d.events : []).slice(0,12);
    const music=d.music && d.music.enabled===true ? d.music : null;
    const preset=music?.source==='preset' && ['rose-piano','royal-waltz','morning-bells'].includes(music.track);
    const upload=music?.source==='upload' && typeof music.url==='string' &&
      (/^\/api\/music\/[a-z0-9-]+\/[a-f0-9-]{36}\.(mp3|m4a|ogg|wav)$/.test(music.url) ||
      (options.preview && /^blob:https?:\/\//.test(music.url)));
    const musicButton=preset||upload?'<button type="button" class="ws-music-button" data-ws-music data-source="'+
      (preset?'preset':'upload')+'" data-track="'+esc(preset?music.track:'')+'" data-url="'+esc(upload?music.url:'')+
      '" aria-pressed="false" aria-label="Play or pause background music">♫ Play music</button>':'';
    const sections = d.sections && typeof d.sections === 'object' ? d.sections : {};
    const hasStory = sections.story !== false && !!String(d.story || '').trim();
    const venues = [...new Map(events.filter(e => String(e.venue || '').trim()).map(e => [String(e.venue).trim().toLowerCase(), String(e.venue).trim()])).values()];
    const hasVenue = sections.venue !== false && venues.length > 0;
    const photos = (Array.isArray(d.photos) ? d.photos : [])
      .filter(p => typeof p === 'string' && /^https:\/\//i.test(p) && p.length <= 2048)
      .slice(0,6);
    const hasGallery = sections.gallery !== false && (photos.length > 0 || !!options.preview);
    const showGalleryEmpty = !!options.preview && !photos.length;
    const names = esc(partner1) + ' <span class="ws-amp">&amp;</span> ' + esc(partner2);
    const logo = esc(initials(partner1)) + '<span class="ws-logo-amp">&amp;</span>' + esc(initials(partner2));
    const firstDate = events.map(e => e.date).filter(Boolean).sort()[0];
    const city = String(venues[0] || '').split(',').map(x => x.trim()).filter(Boolean).pop();
    const navigation = [
      ['welcome','Home'], ...(hasStory ? [['story','Our story']] : []),
      ['celebrations','Events'], ...(hasGallery ? [['gallery','Gallery']] : []),
      ...(hasVenue ? [['venue','Venue']] : [])
    ];
    const nav = navigation.map(([id,label]) => '<a href="#' + id + '">' + esc(label) + '</a>').join('');
    const eventCards = events.map((e, i) => {
      const name = esc(e.name || 'Celebration');
      const venue = String(e.venue || '').trim();
      return '<article class="ws-event-card">' +
        '<div class="ws-event-num">ACT ' + String(i + 1).padStart(2,'0') + '</div>' +
        '<h3>' + name + '</h3>' +
        '<div class="ws-event-date">' + esc(prettyDate(e.date)) + '</div>' +
        '<div class="ws-event-time">' + esc(prettyTime(e.time)) + '</div>' +
        (venue ? '<p class="ws-event-address">' + esc(venue) + '</p><a class="ws-directions" target="_blank" rel="noopener noreferrer" href="' + esc(directions(venue)) + '">Get directions <span aria-hidden="true">↗</span></a>' : '') +
        '</article>';
    }).join('');
    const gallery = photos.map((photo, i) =>
      '<figure class="ws-photo"><img src="' + esc(photo) + '" loading="lazy" referrerpolicy="no-referrer" alt="Couple memory ' + (i + 1) + '" /></figure>'
    ).join('');
    const placeholder = '<div class="ws-gallery-placeholder" aria-label="Photo gallery preview"><span>♡</span><p>Add photo links in the editor to fill this space with your favourite moments.</p></div>';

    return '<div class="wedding-site ws-' + theme + (customColorStyle ? ' ws-custom-colors' : '') + (uploadedStyle ? ' ws-uploaded-background ws-uploaded-' + (d.background?.scope === 'all' ? 'all' : 'hero') : '') + '"' + (customColorStyle || uploadedStyle ? ' style="' + esc(customColorStyle + uploadedStyle) + '"' : '') + '>' +
      '<header class="ws-nav"><a class="ws-monogram" href="#welcome" aria-label="Back to welcome">' + logo + '</a><nav aria-label="Wedding sections">' + nav + '</nav>' + musicButton + '</header>' +
      '<main>' +
        '<section class="ws-section ws-hero' + designClass('hero') + '" id="welcome">' +
          '<div class="ws-hero-ornament ws-ornament-left" aria-hidden="true">❀</div><div class="ws-hero-ornament ws-ornament-right" aria-hidden="true">❀</div>' +
          '<div class="ws-hero-inner"><div class="ws-kicker">TOGETHER WITH THEIR FAMILIES</div><div class="ws-flower">✦</div>' +
          '<div class="ws-name-lockup"><span>' + esc(partner1) + '</span><span class="ws-name-amp">&amp;</span><span>' + esc(partner2) + '</span></div>' +
          '<p class="ws-hero-tagline">' + esc(d.tagline || 'A beautiful beginning.') + '</p>' +
          (firstDate ? '<p class="ws-hero-date">' + esc(prettyDate(firstDate)) + (city ? ' <span class="ws-date-dot">·</span> ' + esc(city) : '') + '</p>' : '') +
          '<a class="ws-hero-button" href="#celebrations">Discover our celebrations <span aria-hidden="true">↓</span></a></div>' +
          '<div class="ws-scroll-hint">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></div>' +
        '</section>' +
        (hasStory ? '<section class="ws-section ws-story' + designClass('story') + '" id="story"><div class="ws-content"><div class="ws-section-eyebrow">THE BEGINNING OF FOREVER</div><h2>Our Story</h2><div class="ws-small-flower">✦</div><p class="ws-story-copy">' + esc(d.story) + '</p><div class="ws-story-end">and the best is yet to come.</div></div></section>' : '') +
        '<section class="ws-section ws-celebrations' + designClass('events') + '" id="celebrations"><div class="ws-content"><div class="ws-section-eyebrow">YOU ARE CORDIALLY INVITED</div><h2>The Celebrations</h2><p class="ws-section-intro">' + esc(d.message || 'Your presence will make our celebration even more special.') + '</p><div class="ws-event-grid">' + (eventCards || '<p>Celebration details coming soon.</p>') + '</div></div></section>' +
        (hasGallery ? '<section class="ws-section ws-gallery' + designClass('gallery') + '" id="gallery"><div class="ws-content"><div class="ws-section-eyebrow">LITTLE THINGS, LOVELY MEMORIES</div><h2>Our Moments</h2><p class="ws-section-intro">A few of our favourite chapters.</p>' + (showGalleryEmpty ? placeholder : '<div class="ws-photo-grid">' + gallery + '</div>') + '</div></section>' : '') +
        (hasVenue ? '<section class="ws-section ws-venue' + designClass('venue') + '" id="venue"><div class="ws-content"><div class="ws-section-eyebrow">COME CELEBRATE WITH US</div><h2>Find Your Way</h2><p class="ws-section-intro">' + esc(d.travelNote || 'We cannot wait to welcome you.') + '</p><div class="ws-venue-grid">' + venues.map((v,i) => '<article class="ws-venue-card"><span class="ws-venue-icon" aria-hidden="true">⌖</span><h3>' + esc(v) + '</h3><a class="ws-directions" href="' + esc(directions(v)) + '" target="_blank" rel="noopener noreferrer">Open directions ↗</a></article>').join('') + '</div></div></section>' : '') +
        '<section class="ws-section ws-closing' + designClass('closing') + '" id="closing"><div class="ws-content"><div class="ws-small-flower">❦</div><div class="ws-section-eyebrow">WITH ALL OUR LOVE</div><h2>Every beautiful beginning<br />is better with you.</h2><p>Your presence would mean the world to us.</p><div class="ws-closing-signature">' + names + '</div></div></section>' +
      '</main><footer class="ws-footer"><span>' + logo + '</span><span>Made with ♥ on Everafter Studio</span><a href="#welcome">Back to top ↑</a></footer>' +
    '</div>';
  }

  window.EverafterSite = { render, colorStyle };
})();