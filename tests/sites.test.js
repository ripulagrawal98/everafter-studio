import test from 'node:test';
import assert from 'node:assert/strict';
import {validate, slugify, validSlug, tokenHash} from '../lib/sites.js';

const valid = {
  theme:'blossom',partner1:'Anaya',partner2:'Kabir',tagline:'Forever',message:'Join us',
  events:[{id:'one',name:'Wedding',date:'2026-12-11',time:'19:00',venue:'Jaipur'}]
};

test('validates wedding details and returns normalized data', () => {
  assert.equal(validate(valid).events[0].name, 'Wedding');
  assert.equal(validate(valid).partner1, 'Anaya');
  assert.equal(slugify('Anaya & Kabir'), 'anaya-kabir');
  assert.equal(validSlug('anaya-kabir'), true);
});

test('rejects malformed event dates and themes', () => {
  assert.throws(() => validate({...valid, theme:'unknown'}), /valid theme/);
  assert.throws(() => validate({...valid,events:[{...valid.events[0],date:'2026-02-30'}]}), /valid date/);
});

test('hashes private edit keys', async () => {
  const hash = await tokenHash('secret');
  assert.equal(hash.length,64);
  assert.notEqual(hash,'secret');
});
test('persists independent wedding page sections', () => {
 const d=validate({...valid,story:'Our beautiful beginning',travelNote:'Join us',sections:{story:true,gallery:false,venue:true},photos:['https://example.org/photo.jpg']});
 assert.equal(d.story,'Our beautiful beginning');
 assert.equal(d.sections.gallery,false);
 assert.deepEqual(d.photos,['https://example.org/photo.jpg']);
 assert.throws(()=>validate({...valid,photos:['http://example.org/insecure.jpg']}),/HTTPS/);
});

test('accepts custom wedding color themes and normalizes hex values', () => {
  const colors = {background:'#fcefeb',surface:'#fffaf6',text:'#634455',accent:'#96566d'};
  const result = validate({...valid,colors});
  assert.deepEqual(result.colors,{background:'#FCEFEB',surface:'#FFFAF6',text:'#634455',accent:'#96566D'});
  assert.equal(validate(valid).colors,null);
  assert.equal(validate({...valid,colors:null}).colors,null);
});
test('rejects unsafe CSS color strings and incomplete palettes', () => {
  const good = {background:'#FCEFEB',surface:'#FFFAF6',text:'#634455',accent:'#96566D'};
  assert.throws(()=>validate({...valid,colors:{...good,accent:'red;display:none'}}),/HEX/);
  assert.throws(()=>validate({...valid,colors:{...good,background:'var(--x)'}}),/HEX/);
  assert.throws(()=>validate({...valid,colors:{background:'#000000'}}),/HEX/);
  assert.throws(()=>validate({...valid,colors:{...good,extra:'#123456'}}),/HEX/);
  assert.throws(()=>validate({...valid,colors:[]}),/HEX/);
});

test('renderer safely applies custom CSS variables to published and preview sites', async () => {
  const {readFileSync} = await import('node:fs');
  const {runInNewContext} = await import('node:vm');
  const source = readFileSync(new URL('../public/wedding-site.js', import.meta.url),'utf8');
  const context={window:{},Date,Intl,Map};
  runInNewContext(source,context);
  const good={background:'#FCEFEB',surface:'#FFFAF6',text:'#634455',accent:'#96566D'};
  const output=context.window.EverafterSite.render({...valid,colors:good},{preview:true});
  assert.match(output,/ws-custom-colors/);
  assert.match(output,/--ws-bg:#FCEFEB/);
  assert.match(output,/--ws-accent:#96566D/);
  assert.match(output,/id="celebrations"/);
  assert.match(output,/id="welcome"/);
  assert.doesNotMatch(context.window.EverafterSite.render(valid),/ws-custom-colors/);
  const bad=context.window.EverafterSite.render({...valid,colors:{...good,accent:'#000000";onmouseover="alert(1)'}});
  assert.doesNotMatch(bad,/ws-custom-colors/);
  assert.doesNotMatch(bad,/onmouseover/);
});

test('app and shared renderer have valid JavaScript syntax', async () => {
  const {readFileSync} = await import('node:fs');
  const {Script} = await import('node:vm');
  for (const filename of ['app.js','wedding-site.js'])
    assert.doesNotThrow(()=>new Script(readFileSync(new URL('../public/'+filename,import.meta.url),'utf8')));
});

test('validates and retains per-section design selections for publishing', () => {
 const design={hero:'split',story:'letter',events:'timeline',gallery:'mosaic',venue:'list',closing:'framed'};
 assert.deepEqual(validate({...valid,sectionDesigns:design}).sectionDesigns,design);
 assert.equal(validate(valid).sectionDesigns.events,'cards');
 assert.throws(()=>validate({...valid,sectionDesigns:{hero:'<script>'}}),/Invalid section design/);
 assert.throws(()=>validate({...valid,sectionDesigns:{unknown:'cards'}}),/Invalid section design/);
 assert.throws(()=>validate({...valid,sectionDesigns:[]}),/Invalid section design/);
});
test('shared website renderer switches styles per section independently and safely', async () => {
 const {readFileSync}=await import('node:fs');
 const {runInNewContext}=await import('node:vm');
 const context={window:{},Date,Intl,Map};
 runInNewContext(readFileSync(new URL('../public/wedding-site.js',import.meta.url),'utf8'),context);
 const opts={...valid,story:'Our beginning',photos:['https://example.org/one.jpg'],sectionDesigns:{
  hero:'framed',story:'editorial',events:'rows',gallery:'filmstrip',venue:'highlight',closing:'banner'
 }};
 const rendered=context.window.EverafterSite.render(opts);
 for (const cls of ['ws-hero ws-layout-framed','ws-story ws-layout-editorial',
 'ws-celebrations ws-layout-rows','ws-gallery ws-layout-filmstrip',
 'ws-venue ws-layout-highlight','ws-closing ws-layout-banner']) assert.ok(rendered.includes(cls),cls);
 const bad=context.window.EverafterSite.render({...opts,sectionDesigns:{hero:'bad" onclick="evil()'}});
 assert.ok(bad.includes('ws-hero ws-layout-centered'));
 assert.ok(!bad.includes('onclick="evil()'));
});


test('editor and preview have separate, full-column scroll rails', async () => {
  const {readFileSync} = await import('node:fs');
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  const script=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  const style=readFileSync(new URL('../public/wedding-site.css',import.meta.url),'utf8');
  for (const id of ['editorScrollPane','editorVerticalSlider','editorScrollUp','editorScrollDown',
    'previewStage','previewVerticalSlider','previewScrollUp','previewScrollDown']) {
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.ok(html.includes('class="workspace" tabindex="0"'));
  assert.ok(html.includes('class="preview-column" tabindex="0"'));
  assert.match(script,/setupColumnScroll\(\$\('\.workspace'\)/);
  assert.match(script,/setupColumnScroll\(\$\('\.preview-column'\)/);
  assert.match(script,/column\.addEventListener\('scroll', sync/);
  assert.match(script,/column\.scrollTop = limit \* \(Number\(slider\.value\) \/ 1000\)/);
  assert.match(style,/#builderApp \.workspace, #builderApp \.preview-column/);
  assert.match(style,/#builderApp \.preview-shell\.phone \.wedding-preview-host/);
  assert.match(style,/height:auto; min-height:660px; overflow:visible/);
  assert.doesNotMatch(script,/stage\.addEventListener\('scroll'/);
});
