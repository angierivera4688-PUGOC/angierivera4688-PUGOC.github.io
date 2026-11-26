const C='homecount-v22';const A=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','billing.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&!x.startsWith('hc-')).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});

self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>l.length?l[0].focus():self.clients.openWindow('./')))});
self.addEventListener('periodicsync',e=>{if(e.tag==='hc-due')e.waitUntil(checkDue())});
async function checkDue(){try{const c=await caches.open('hc-remind'),r=await c.match(self.registration.scope+'remind.json');if(!r)return;const d=await r.json(),pad=n=>String(n).padStart(2,'0');
  const now=new Date(),t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),td=t0.getFullYear()+'-'+pad(t0.getMonth()+1)+'-'+pad(t0.getDate());
  const ym=iso=>{let y=+iso.slice(0,4),m=+iso.slice(5,7);if(+iso.slice(8,10)<(d.pday||1)){m--;if(m<1){m=12;y--}}return y+'-'+pad(m)};
  const sc=await caches.open('hc-sent');
  for(const f of d.fijos){const dd=parseInt(f.day),rem=f.rem;if(!(dd>=1&&dd<=31)||rem<0)continue;if(f.kind==='deuda'&&f.total>0&&f.amt*f.np>=f.total)continue;
    for(const o of[-1,0,1]){const y=t0.getFullYear(),m=t0.getMonth()+o,last=new Date(y,m+1,0).getDate(),dt=new Date(y,m,Math.min(dd,last)),diff=Math.round((dt-t0)/864e5);if(diff>rem||diff<-7)continue;
      const iso=dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());if(f.paid&&f.paid[ym(iso)])continue;
      const k=f.id+'|'+iso+'|'+td,key=self.registration.scope+'sent/'+encodeURIComponent(k);if(await sc.match(key))continue;await sc.put(key,new Response('1'));
      const txt=diff===0?'Vence hoy':diff===1?'Vence mañana':diff>1?'Vence en '+diff+' días':'Venció hace '+(-diff)+' día(s)';
      await self.registration.showNotification('Pago por vencer: '+f.n,{body:txt+' · '+d.cur+' '+Number(f.amt).toFixed(2),icon:'icon-192.png',badge:'icon-192.png',tag:k,data:{url:'./'}})}}}catch(e){}}
