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