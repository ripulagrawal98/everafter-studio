import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminSession,validAdminSession,sessionCookie,expireSessionCookie} from '../lib/admin-session.js';
import {adminAuthorized} from '../lib/manual-publishing.js';

const secret='9a'.repeat(32);
test('admin login produces an HttpOnly secure expiring session',async()=>{
 const token=await createAdminSession(secret);
 assert.match(token,/^v1\.[0-9]{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/);
 const cookie=sessionCookie(token);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
 assert.match(expireSessionCookie(),/Max-Age=0/);
 const request=new Request('https://vowandverse.pages.dev/api/admin/requests',{headers:{Cookie:cookie}});
 assert.equal(await validAdminSession(request,secret),true);
 assert.equal(await validAdminSession(request,'something different'.repeat(3)),false);
 assert.equal(await adminAuthorized(request,{ADMIN_API_TOKEN:secret}),true);
});
test('admin session rejects absent, forged and malformed cookies',async()=>{
 const r=new Request('https://vowandverse.pages.dev/api/admin/requests');
 assert.equal(await validAdminSession(r,secret),false);
 const token=await createAdminSession(secret);
 const bad=new Request(r.url,{headers:{Cookie:sessionCookie(token.slice(0,-1)+'0')}});
 assert.equal(await validAdminSession(bad,secret),false);
});
test('admin endpoints protect customer contacts and publishing',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert.match(read('functions/api/admin/requests/index.js'),/adminAuthorized/);
 assert.match(read('functions/api/admin/requests/\[id\]/index.js'),/adminAuthorized/);
 assert.match(read('functions/api/admin/requests/\[id\]/approve.js'),/adminAuthorized/);
 assert.match(read('functions/api/admin/requests/\[id\]/approve.js'),/isSameOrigin/);
 assert.match(read('public/admin/index.html'),/name="robots" content="noindex,nofollow"/);
});
