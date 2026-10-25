import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {normalizedEmail,codeHash,equalHash,newCode,sessionCookie,cookieToken} from '../lib/customer-auth.js';

test('verification codes are six digits and normalized email is validated',()=>{
 assert.match(newCode(),/^\d{6}$/);
 assert.equal(normalizedEmail(' Person@Example.COM '),'person@example.com');
 assert.throws(()=>normalizedEmail('not-an-email'),/valid email/);
});
test('verification code hashes are identity and nonce bound',async()=>{
 const a=await codeHash('secret'.repeat(9),'a@example.com','nonce123','123456');
 const b=await codeHash('secret'.repeat(9),'a@example.com','nonce123','123456');
 const c=await codeHash('secret'.repeat(9),'b@example.com','nonce123','123456');
 assert.equal(equalHash(a,b),true);assert.equal(equalHash(a,c),false);
 assert.equal(equalHash(a,a.slice(1)),false);
});
test('customer session is confined to an httpOnly secure cookie',()=>{
 const token='ab'.repeat(32);
 const cookie=sessionCookie(token);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);
 assert.equal(cookieToken(new Request('https://example.com',{headers:{Cookie:cookie}})),token);
});
test('cloud draft APIs require verified session and avoid leaking email state',()=>{
 const draft=readFileSync(new URL('../functions/api/customer/draft.js',import.meta.url),'utf8');
 assert.match(draft,/customerFromSession/);
 assert.match(draft,/version=version\+1/);
 assert.match(draft,/409/);
 const send=readFileSync(new URL('../functions/api/customer/send-code.js',import.meta.url),'utf8');
 assert.match(send,/next_send_at/);assert.match(send,/sent>=10/);
 const verify=readFileSync(new URL('../functions/api/customer/verify-code.js',import.meta.url),'utf8');
 assert.match(verify,/attempts<5/);
 assert.match(verify,/codeHash/);
});
test('builder saves to cloud and restores last step',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../public/builder/index.html',import.meta.url),'utf8');
 assert.match(html,/customer-drafts\.js/);
 assert.match(html,/id="cloudDraftBar"/);
 assert.match(app,/window\.VowCloudDrafts\?\.changed\(\)/);
 assert.match(app,/restore:\(cloud,cloudStep\)/);
 assert.match(app,/everafter:editor-step/);
 for(const script of ['customer-drafts.js','app.js'])
  assert.doesNotThrow(()=>new Script(readFileSync(new URL('../public/'+script,import.meta.url),'utf8')));
});
