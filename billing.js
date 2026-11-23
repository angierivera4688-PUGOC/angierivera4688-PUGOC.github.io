/* HomeCount · suscripción con Google Play Billing (Digital Goods API)
   Solo se activa dentro de la app instalada desde Google Play (TWA).
   En el navegador normal no bloquea nada. */
(function(){
  var ENABLED=false;   // false = app abierta sin cobro (modo prueba). Cambiar a true para activar el paywall.
  var SVC='https://play.google.com/billing';
  var SKUS=['homecount_anual','homecount_mensual'];   // IDs de suscripción en Play Console
  var LIFE='homecount_vida';                          // ID del producto único (de por vida)
  var ORDER=['homecount_anual','homecount_mensual',LIFE];
  var KEY='hc_bill_v1', LKEY='hc_life_v1', GRACE=7*864e5, FRESH=864e5;
  var svc=null, busy=false;

  function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function inTWA(){
    try{if((document.referrer||'').indexOf('android-app://')===0)lsSet('hc_twa','1')}catch(e){}
    return lsGet('hc_twa')==='1';
  }
  function readOk(){var n=parseInt(lsGet(KEY),10);return isNaN(n)?0:n}
  function writeOk(t){lsSet(KEY,String(t))}

  var css='#hcpw{position:fixed;inset:0;z-index:99999;display:none;overflow:auto;background:linear-gradient(180deg,var(--bg1,#F4F8F4),var(--bg2,#E8F4EC));font-family:inherit;color:var(--ink,#1F4235)}'+
  '#hcpw .w{max-width:440px;margin:0 auto;padding:36px 22px 40px;text-align:center}'+
  '#hcpw h1{font-size:26px;margin:8px 0 6px;color:var(--pur,#2E7D5B)}'+
  '#hcpw p{font-size:15px;line-height:1.45;margin:6px 0;color:var(--grey,#6E8A7C)}'+
  '#hcpw .pl{display:block;width:100%;box-sizing:border-box;margin:12px 0 0;padding:16px;border:2px solid var(--lil,#7DC9A0);border-radius:20px;background:var(--card,#fff);color:inherit;font:inherit;text-align:left;cursor:pointer;position:relative}'+
  '#hcpw .pl.best{border-color:var(--pur,#2E7D5B);background:var(--lilL,#DAF1E4)}'+
  '#hcpw .pl b{font-size:18px;display:block}'+
  '#hcpw .pl span{font-size:14px;color:var(--grey,#6E8A7C)}'+
  '#hcpw .tag{position:absolute;top:-11px;right:14px;background:var(--pur,#2E7D5B);color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px}'+
  '#hcpw .lk{display:inline-block;margin:16px 8px 0;font-size:14px;color:var(--pur,#2E7D5B);text-decoration:underline;background:none;border:0;font-family:inherit;cursor:pointer}'+
  '#hcpw .msg{min-height:20px;font-size:14px;color:#B04A5A;margin-top:10px}'+
  '#hcpw ul{list-style:none;padding:0;margin:14px 0 6px;text-align:left;font-size:15px}'+
  '#hcpw li{padding:4px 0}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  var el=document.createElement('div');el.id='hcpw';document.body.appendChild(el);

  function periodTxt(p){ // ISO 8601 (P1M, P1Y, P7D, P30D)
    var m=/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(p||'');if(!m)return '';
    if(m[1])return m[1]==='1'?'año':m[1]+' años';
    if(m[2])return m[2]==='1'?'mes':m[2]+' meses';
    if(m[3])return m[3]+' semana(s)';
    if(m[4])return m[4]==='30'||m[4]==='31'?'mes':m[4]+' días';
    return '';
  }
  function trialTxt(p){
    var m=/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/.exec(p||'');if(!m)return '';
    if(m[2])return m[2]==='1'?'1 mes gratis':m[2]+' meses gratis';
    if(m[4])return (m[4]==='30'||m[4]==='31')?'1 mes gratis':m[4]+' días gratis';
    if(m[3])return m[3]+' semana(s) gratis';
    return '';
  }
  function money(pr){
    try{return new Intl.NumberFormat('es-PE',{style:'currency',currency:pr.currency}).format(parseFloat(pr.value))}catch(e){return (pr.currency||'')+' '+pr.value}
  }

  function hide(){el.style.display='none';document.body.style.overflow=''}
  function show(items,note){
    document.body.style.overflow='hidden';el.style.display='block';
    var html='<div class="w"><img src="icon-192.png" width="96" height="96" alt="" style="border-radius:24px"><h1>HomeCount</h1>'+
      '<p><b>Empieza tu mes gratis</b> y ordena tus cuentas. Cancela cuando quieras desde Google Play.</p>'+
      '<ul><li>✅ Gastos fijos, suscripciones y deudas</li><li>✅ Gastos muertos y metas de ahorro</li><li>✅ Tus datos quedan en tu celular</li></ul>';
    if(items&&items.length){
      items.forEach(function(d){
        var anual=d.itemId.indexOf('anual')>-1, vida=d.itemId===LIFE;
        var tr=vida?'':trialTxt(d.freeTrialPeriod);
        html+='<button class="pl'+(anual?' best':'')+'" data-sku="'+d.itemId+'">'+(anual?'<i class="tag">Mejor precio</i>':'')+
          '<b>'+(vida?'De por vida · '+money(d.price):(anual?'Anual':'Mensual')+' · '+money(d.price)+(periodTxt(d.subscriptionPeriod)?' / '+periodTxt(d.subscriptionPeriod):''))+'</b>'+
          '<span>'+(vida?'Pago único, sin renovaciones. Es tuya para siempre.':(tr?tr+', luego se cobra '+money(d.price):'Suscripción'))+'</span></button>';
      });
    }else{
      html+='<p>'+(note||'No pude conectar con Google Play. Revisa tu internet y vuelve a intentar.')+'</p>';
    }
    html+='<div class="msg" id="hcmsg"></div>'+
      '<button class="lk" id="hcrest">Ya me suscribí · Restaurar</button>'+
      '<button class="lk" id="hcexp">Exportar mis datos</button></div>';
    el.innerHTML=html;
    Array.prototype.forEach.call(el.querySelectorAll('.pl'),function(b){b.onclick=function(){buy(b.getAttribute('data-sku'))}});
    el.querySelector('#hcrest').onclick=function(){msg('Buscando tu suscripción…');check(true)};
    el.querySelector('#hcexp').onclick=function(){try{exportJSON()}catch(e){}};
  }
  function msg(t){var m=document.getElementById('hcmsg');if(m)m.textContent=t||''}

  async function getSvc(){
    if(svc)return svc;
    if(!('getDigitalGoodsService' in window))return null;
    try{svc=await window.getDigitalGoodsService(SVC)}catch(e){svc=null}
    return svc;
  }
  async function buy(sku){
    if(busy)return;busy=true;msg('Abriendo Google Play…');
    try{
      var s=await getSvc();if(!s)throw new Error('nosvc');
      var req=new PaymentRequest([{supportedMethods:SVC,data:{sku:sku}}]);
      var r=await req.show();
      var token=r.details&&r.details.purchaseToken;
      if(token){try{await s.acknowledge(token,'onetime')}catch(e){}}
      await r.complete('success');
      writeOk(Date.now());if(sku===LIFE)lsSet(LKEY,'1');hide();
    }catch(e){
      msg(e&&e.name==='AbortError'?'':'No se completó la compra. Intenta de nuevo.');
    }
    busy=false;
  }
  async function check(manual){
    var ok=readOk();
    if(!manual&&ok&&Date.now()-ok<FRESH){hide();return}
    var s=await getSvc();
    if(!s){
      if(lsGet(LKEY)==='1'||(ok&&Date.now()-ok<GRACE)){hide();return}
      show(null);return;
    }
    try{
      var list=await s.listPurchases();
      var hasLife=list.some(function(p){return p.itemId===LIFE});
      var act=hasLife||list.some(function(p){return SKUS.indexOf(p.itemId)>-1});
      if(hasLife)lsSet(LKEY,'1');else{try{localStorage.removeItem(LKEY)}catch(e){}}
      if(act){writeOk(Date.now());hide();return}
      writeOk(0);
      var d=await s.getDetails(SKUS.concat([LIFE]));
      d.sort(function(a,b){return ORDER.indexOf(a.itemId)-ORDER.indexOf(b.itemId)});
      show(d);if(manual)msg('No encontré una suscripción activa.');
    }catch(e){
      if(lsGet(LKEY)==='1'||(ok&&Date.now()-ok<GRACE)){hide();return}
      show(null);
    }
  }

  if(location.hash==='#hcdemo'){ // vista previa de la pantalla, sin cobrar
    show([
      {itemId:'homecount_anual',price:{currency:'PEN',value:'79.00'},subscriptionPeriod:'P1Y',freeTrialPeriod:'P1M'},
      {itemId:'homecount_mensual',price:{currency:'PEN',value:'9.90'},subscriptionPeriod:'P1M',freeTrialPeriod:'P1M'},
      {itemId:'homecount_vida',price:{currency:'PEN',value:'199.00'}}]);
    return;
  }
  if(!ENABLED||!inTWA())return;
  var ok0=readOk();
  if(!(lsGet(LKEY)==='1'||(ok0&&Date.now()-ok0<GRACE))){document.body.style.overflow='hidden';el.style.display='block';el.innerHTML='<div class="w"><img src="icon-192.png" width="96" height="96" alt="" style="border-radius:24px"><p>Cargando…</p></div>'}
  check(false);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&inTWA())check(false)});
})();
