(function(){
'use strict';

/* ---------- Constantes et utilitaires ---------- */
var DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
var DAYS_SHORT=['Lun','Mar','Mer','Jeu','Ven','Sam'];
var MONTHS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
var PPM=1.1;            // pixels par minute
var SNAP=15;            // pas d'aimantation en minutes
var KEY='edt-semestre-v2';
var KIND={group:'groups',teacher:'teachers',room:'rooms',lang:'languages'};
var COLORS={
  bleu:['#dbeafe','#1d4ed8','Bleu'],
  vert:['#dcfce7','#15803d','Vert'],
  orange:['#ffedd5','#c2410c','Orange'],
  violet:['#ede9fe','#6d28d9','Violet'],
  rose:['#fce7f3','#be185d','Rose'],
  jaune:['#fef9c3','#a16207','Jaune'],
  turquoise:['#ccfbf1','#0f766e','Turquoise'],
  gris:['#e5e7eb','#374151','Gris']
};

function $(s){return document.querySelector(s);}
function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function snap(v){return Math.round(v/SNAP)*SNAP;}
function pad(n){return (n<10?'0':'')+n;}
function fmt(min){return pad(Math.floor(min/60))+':'+pad(min%60);}
function parseTime(s){var m=/^(\d{1,2}):(\d{2})/.exec(s||'');return m?(+m[1])*60+(+m[2]):NaN;}

/* Dates (chaînes AAAA-MM-JJ, calendrier local) */
function pd(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function ds(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function validDate(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'')&&ds(pd(s))===s;}
function addDays(s,n){var d=pd(s);d.setDate(d.getDate()+n);return ds(d);}
function wd(s){return (pd(s).getDay()+6)%7;}          // 0 = lundi ... 6 = dimanche
function mondayOf(s){return addDays(s,-wd(s));}
function shortDate(s){var p=s.split('-');return p[2]+'/'+p[1];}
function longDate(s){return DAYS[wd(s)]||'Dim.';}
function fullDate(s){var d=pd(s);return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear();}
function todayStr(){return ds(new Date());}
function isoWeek(s){
  var d=pd(s);
  d.setDate(d.getDate()+3-((d.getDay()+6)%7));
  var w1=new Date(d.getFullYear(),0,4);
  return 1+Math.round(((d.getTime()-w1.getTime())/86400000-3+((w1.getDay()+6)%7))/7);
}

function h(tag,props){
  var e=document.createElement(tag);
  props=props||{};
  Object.keys(props).forEach(function(k){
    var v=props[k];
    if(k==='class'){e.className=v;}
    else if(k==='style'){e.style.cssText=v;}
    else if(k.slice(0,2)==='on'){e.addEventListener(k.slice(2),v);}
    else if(v===true){e.setAttribute(k,'');}
    else if(v!==false&&v!=null){e.setAttribute(k,v);}
  });
  var kids=Array.prototype.slice.call(arguments,2);
  (function add(list){
    list.forEach(function(kid){
      if(kid==null||kid===false)return;
      if(Array.isArray(kid)){add(kid);return;}
      e.appendChild(kid.nodeType?kid:document.createTextNode(String(kid)));
    });
  })(kids);
  return e;
}

var toastTimer=null;
function toast(msg){
  var t=$('#toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},3200);
}

function copyText(txt){
  var done=function(){toast('Copié dans le presse-papiers');};
  var fallback=function(){
    var ta=h('textarea',{style:'position:fixed;left:-9999px;top:0'});ta.value=txt;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');done();}catch(e){toast('Copie impossible : sélectionne le texte et copie à la main');}
    ta.remove();
  };
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done,fallback);}
    else{fallback();}
  }catch(e){fallback();}
}

/* ---------- Données ---------- */
function defaultLanguages(){
  return [
    {id:uid(),name:'Anglais',color:'bleu'},
    {id:uid(),name:'Allemand',color:'orange'},
    {id:uid(),name:'Espagnol',color:'rose'},
    {id:uid(),name:'FLE',color:'vert'},
    {id:uid(),name:'Autre',color:'gris'}
  ];
}

function defaultSemesters(){
  var out=[];
  ['S5','S6','S7','S8','S9','S10'].forEach(function(n,i){
    var autumn=(i%2===0);
    out.push({id:uid(),name:n,start:autumn?'2026-09-07':'2027-02-01',end:autumn?'2027-01-15':'2027-06-11'});
  });
  return out;
}
function defaultView(){return {mode:'all',id:null,days:5,startH:8,endH:19,week:null};}

function sample(){
  var SS=defaultSemesters(),sem=SS[0];
  var L=defaultLanguages();
  var lid={en:L[0].id,de:L[1].id,es:L[2].id,fle:L[3].id};
  var g={a:uid(),b:uid(),c:uid(),d:uid(),f:uid()};
  var t={m:uid(),de:uid(),es:uid(),fle:uid()};
  var r={f:uid(),s:uid(),a:uid()};
  var c={
    ena:uid(),enb:uid(),toeic:uid(),de:uid(),es:uid(),fle:uid()
  };
  var o={
    semesters:SS,current:sem.id,
    languages:L,
    groups:[{id:g.a,name:'PEIP2-A',size:28},{id:g.b,name:'PEIP2-B',size:27},{id:g.c,name:'TC4-1',size:30},{id:g.d,name:'TC4-2',size:30},{id:g.f,name:'FLE-1',size:15}],
    teachers:[{id:t.m,name:'Marc Vasseur'},{id:t.de,name:'Enseignant allemand'},{id:t.es,name:'Enseignant espagnol'},{id:t.fle,name:'Enseignant FLE'}],
    rooms:[{id:r.f,name:'F027',cap:35},{id:r.s,name:'Salle 101',cap:35},{id:r.a,name:'Amphi A',cap:200}],
    courses:[
      {id:c.ena,name:'Anglais PEIP2-A',lang:lid.en,groups:[g.a],teachers:[t.m],room:r.f,sessions:12,dur:120,sem:sem.id},
      {id:c.enb,name:'Anglais PEIP2-B',lang:lid.en,groups:[g.b],teachers:[t.m],room:r.f,sessions:12,dur:120,sem:sem.id},
      {id:c.toeic,name:'TOEIC intensif TC4-1',lang:lid.en,groups:[g.c],teachers:[t.m],room:r.s,sessions:10,dur:120,sem:sem.id},
      {id:c.de,name:'Allemand LV2 TC4-2',lang:lid.de,groups:[g.d],teachers:[t.de],room:r.s,sessions:12,dur:120,sem:sem.id},
      {id:c.es,name:'Espagnol LV2 PEIP2-A',lang:lid.es,groups:[g.a],teachers:[t.es],room:r.s,sessions:12,dur:120,sem:sem.id},
      {id:c.fle,name:'FLE niveau B1',lang:lid.fle,groups:[g.f],teachers:[t.fle],room:r.f,sessions:10,dur:120,sem:sem.id}
    ],
    slots:[],
    view:defaultView()
  };
  var m0=mondayOf(sem.start);
  function put(cid,weeks,day,start){
    var cc=o.courses.filter(function(x){return x.id===cid;})[0],k;
    for(k=0;k<weeks;k++){
      o.slots.push({id:uid(),sem:sem.id,course:cid,title:'',date:addDays(m0,7*k+day),start:start,dur:cc.dur,
        groups:cc.groups.slice(),teachers:cc.teachers.slice(),room:cc.room,note:''});
    }
  }
  put(c.ena,10,0,480);
  put(c.enb,9,0,615);
  put(c.toeic,5,1,840);
  put(c.de,4,3,540);
  o.view.week=m0;
  return o;
}

function emptyData(){
  return normalize({semesters:defaultSemesters(),languages:defaultLanguages(),groups:[],teachers:[],rooms:[],courses:[],slots:[],view:defaultView()});
}

function arr(a){return Array.isArray(a)?a.filter(function(x){return typeof x==='string';}):[];}

function normalize(o){
  if(!o||typeof o!=='object'||!Array.isArray(o.slots))return null;
  // migration de l'ancienne version (un seul semestre)
  if(!Array.isArray(o.semesters)||!o.semesters.length){
    var base=defaultSemesters();
    if(o.semester&&typeof o.semester==='object'){
      var os={id:uid(),name:String(o.semester.name||'Semestre'),start:o.semester.start,end:o.semester.end};
      o.semesters=[os].concat(base.filter(function(b){return b.name!==os.name;}));
      o.slots=o.slots.map(function(x){x.sem=os.id;return x;});
      o.courses=(Array.isArray(o.courses)?o.courses:[]).map(function(x){x.sem=os.id;return x;});
      o.current=os.id;
    }else{o.semesters=base;}
  }
  var d0=defaultSemesters()[0];
  o.semesters=o.semesters.filter(function(x){return x&&typeof x==='object';}).map(function(x){
    var st=validDate(x.start)?x.start:d0.start,en=validDate(x.end)?x.end:d0.end;
    if(en<st)en=st;
    return {id:x.id||uid(),name:String(x.name||'Semestre'),start:st,end:en};
  });
  if(!o.semesters.length)o.semesters=defaultSemesters();
  if(!o.semesters.some(function(x){return x.id===o.current;}))o.current=o.semesters[0].id;
  var firstSem=o.semesters[0].id;
  function validSem(id){return o.semesters.some(function(x){return x.id===id;})?id:firstSem;}
  function res(list,f){
    return (Array.isArray(list)?list:[]).filter(function(x){return x&&typeof x==='object';}).map(function(x){
      var r={id:x.id||uid(),name:String(x.name||'Sans nom')};
      if(f)r[f]=Math.max(0,parseInt(x[f],10)||0);
      return r;
    });
  }
  o.groups=res(o.groups,'size');
  o.teachers=res(o.teachers,'');
  o.rooms=res(o.rooms,'cap');
  var langs=Array.isArray(o.languages)?o.languages:[];
  o.languages=langs.filter(function(x){return x&&typeof x==='object';}).map(function(x){
    return {id:x.id||uid(),name:String(x.name||'Langue'),color:COLORS[x.color]?x.color:'gris'};
  });
  if(!o.languages.length)o.languages=defaultLanguages();
  o.courses=(Array.isArray(o.courses)?o.courses:[]).filter(function(x){return x&&typeof x==='object';}).map(function(x){
    return {id:x.id||uid(),name:String(x.name||'Cours'),lang:x.lang||'',groups:arr(x.groups),teachers:arr(x.teachers),
      room:x.room||'',sessions:Math.max(1,parseInt(x.sessions,10)||1),dur:Math.max(15,parseInt(x.dur,10)||120),sem:validSem(x.sem)};
  });
  o.slots=o.slots.filter(function(s){return s&&typeof s==='object'&&validDate(s.date);}).map(function(s){
    return {id:s.id||uid(),sem:validSem(s.sem),course:s.course||'',title:String(s.title||''),date:s.date,
      start:clamp(parseInt(s.start,10)||0,0,23*60+45),dur:Math.max(15,parseInt(s.dur,10)||60),
      groups:arr(s.groups),teachers:arr(s.teachers),room:s.room||'',note:String(s.note||'')};
  });
  var v=Object.assign(defaultView(),o.view||{});
  v.days=(+v.days===6)?6:5;
  v.startH=clamp(parseInt(v.startH,10)||8,0,22);
  v.endH=clamp(parseInt(v.endH,10)||19,v.startH+1,24);
  if(v.mode!=='all'&&!KIND[v.mode])v.mode='all';
  o.view=v;
  fixWeek(o);
  return o;
}

function fixWeek(o){
  var cs=semOf(o.current,o)||o.semesters[0];
  var first=mondayOf(cs.start),last=mondayOf(cs.end),v=o.view;
  if(!validDate(v.week))v.week=first;
  v.week=mondayOf(v.week);
  if(v.week<first)v.week=first;
  if(v.week>last)v.week=last;
}

/* ---------- Mode, session et enregistrement serveur ---------- */
var MODE=(/\/admin\/?$/.test(location.pathname)||/[?&]admin(=|&|$)/.test(location.search))?'admin':'view';
var CAN_EDIT=(MODE==='admin');
document.body.classList.add(MODE);
var API='/api/edt';
var TOKEN_KEY='edtToken';
function getToken(){try{return sessionStorage.getItem(TOKEN_KEY)||window.__edtToken||'';}catch(e){return window.__edtToken||'';}}
function setToken(t){window.__edtToken=t||'';try{if(t)sessionStorage.setItem(TOKEN_KEY,t);else sessionStorage.removeItem(TOKEN_KEY);}catch(e){}}

var S=emptyData();
var rev=null;            // ETag du dernier état serveur connu
var lastFp='';           // empreinte des données déjà enregistrées
var saveTimer=null,saving=false,started=false;

// Empreinte des seules données (pas de la semaine ou de la vue affichée)
function dataFp(o){
  o=o||S;
  return JSON.stringify([o.semesters,o.current,o.languages,o.groups,o.teachers,o.rooms,o.courses,o.slots,o.view.days,o.view.startH,o.view.endH]);
}
function serialize(){
  var o=JSON.parse(JSON.stringify(S));
  o.view={days:S.view.days,startH:S.view.startH,endH:S.view.endH};
  return o;
}
function setStatus(kind,text){
  var el=$('#savestate');if(!el)return;
  el.className='savestate admin-only '+kind;el.textContent=text;
}
function hhmm(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes());}

function save(){
  if(!CAN_EDIT||!started)return;
  if(dataFp()===lastFp)return;
  setStatus('wait','Modifications non enregistrées');
  clearTimeout(saveTimer);saveTimer=setTimeout(function(){flushSave(false);},700);
}

function flushSave(force){
  if(saving)return;
  var fp=dataFp();
  if(fp===lastFp&&!force){setStatus('ok','Enregistré');return;}
  saving=true;setStatus('wait','Enregistrement...');
  var body={rev:force?null:rev,force:!!force,data:serialize()};
  fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify(body)})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(j){return {status:r.status,j:j};});})
    .then(function(res){
      saving=false;
      if(res.status===200){
        rev=res.j.rev;lastFp=fp;setStatus('ok','Enregistré à '+hhmm());
        if(dataFp()!==lastFp)save();
      }else if(res.status===401){
        setStatus('err','Session expirée');showLogin('Session expirée : reconnecte-toi pour enregistrer.');
      }else if(res.status===409){
        setStatus('err','Conflit');showConflict();
      }else{
        setStatus('err','Erreur d\'enregistrement, nouvel essai...');
        clearTimeout(saveTimer);saveTimer=setTimeout(function(){flushSave(false);},5000);
      }
    },function(){
      saving=false;setStatus('err','Hors ligne, nouvel essai...');
      clearTimeout(saveTimer);saveTimer=setTimeout(function(){flushSave(false);},5000);
    });
}

function showConflict(){
  openModal(h('div',{class:'modal'},
    h('h2',{},'Conflit d\'enregistrement'),
    h('p',{},'L\'emploi du temps a été modifié depuis un autre onglet ou un autre appareil. Que veux-tu faire ?'),
    h('div',{class:'actions'},
      h('button',{onclick:function(){closeModal();loadRemote(true);}},'Recharger la version enregistrée (mes modifications seront perdues)'),
      h('button',{class:'danger',onclick:function(){closeModal();flushSave(true);}},'Écraser avec ma version'))));
}

function fetchRemote(){
  return fetch(API,{cache:'no-store'}).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  });
}
function defaultWeek(o){
  var t=todayStr(),cs=semOf(o.current,o)||o.semesters[0];
  return (t>=cs.start&&t<=cs.end)?mondayOf(t):mondayOf(cs.start);
}
function applyRemote(j,keepView){
  var o=(j&&j.data)?normalize(JSON.parse(JSON.stringify(j.data))):null;
  if(!o)o=emptyData();
  if(keepView){
    if(semOf(S.current,o))o.current=S.current;
    o.view.mode=S.view.mode;o.view.id=S.view.id;o.view.week=S.view.week;
  }else{
    o.view.week=defaultWeek(o);
  }
  S=o;rev=(j&&j.rev)||null;lastFp=dataFp(S);
  fixWeek(S);
}
function loadRemote(keepView){
  return fetchRemote().then(function(j){applyRemote(j,keepView);renderAll();setStatus('ok','Enregistré');},
    function(){toast('Impossible de recharger les données.');});
}

function showFatal(msg){
  $('#tt').replaceChildren(h('div',{class:'fatal'},msg));
}

function showLogin(msg){
  var old=$('.login-ov');if(old)old.remove();
  var pw=h('input',{type:'password',placeholder:'Mot de passe administrateur',autocomplete:'current-password','aria-label':'Mot de passe'});
  var err=h('div',{class:'login-err'},msg||'');
  var btn=h('button',{class:'primary',type:'submit'},'Se connecter');
  var form=h('form',{class:'login-card'},
    h('h2',{},'Administration'),
    h('p',{class:'hint'},'Emplois du temps des langues'),
    pw,err,btn,
    h('a',{href:'/',class:'hint'},'Voir l\'emploi du temps (lecture seule)'));
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!pw.value)return;
    btn.disabled=true;err.textContent='';
    fetch(API+'?action=login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(j){return {status:r.status,j:j};});})
      .then(function(res){
        btn.disabled=false;
        if(res.status===200&&res.j.token){
          setToken(res.j.token);
          var ov=$('.login-ov');if(ov)ov.remove();
          if(started){flushSave(false);}else{startApp();}
        }else if(res.status===429){err.textContent='Trop de tentatives. Réessaie dans quelques minutes.';pw.value='';}
        else if(res.status===401){err.textContent='Mot de passe incorrect.';pw.value='';pw.focus();}
        else{err.textContent=(res.j&&res.j.error)||'Erreur du serveur.';}
      },function(){btn.disabled=false;err.textContent='Serveur injoignable.';});
  });
  document.body.appendChild(h('div',{class:'login-ov'},form));
  pw.focus();
}

function semOf(id,o){o=o||S;return o.semesters.filter(function(x){return x.id===id;})[0]||null;}
function SEM(){return semOf(S.current)||S.semesters[0];}
function curCourses(){var id=SEM().id;return S.courses.filter(function(c){return c.sem===id;});}
var armed=null,armWeeksTxt='';
var pf={lang:'',hideDone:false};

function nm(kind,id){var x=S[kind].filter(function(i){return i.id===id;})[0];return x?x.name:'?';}
function course(id){return id?S.courses.filter(function(c){return c.id===id;})[0]||null:null;}
function lang(id){return id?S.languages.filter(function(l){return l.id===id;})[0]||null:null;}
function placed(cid){return S.slots.filter(function(s){return s.course===cid;}).length;}
function remaining(c){return c.sessions-placed(c.id);}
function titleOf(s){var c=course(s.course);return c?c.name:(s.title||'Sans titre');}
function slotColor(s){var c=course(s.course),l=c?lang(c.lang):null;return COLORS[l?l.color:'gris']||COLORS.gris;}
function inSemester(date,semId){var m=semId?semOf(semId):SEM();return !!m&&date>=m.start&&date<=m.end;}
function semName(id){var m=semOf(id);return m?m.name:'?';}

/* Semaines du semestre (numéros ISO) */
function semWeeks(semId){
  var m=semOf(semId)||SEM(),out=[],cur=mondayOf(m.start),last=mondayOf(m.end);
  while(cur<=last){out.push({num:isoWeek(cur),monday:cur});cur=addDays(cur,7);}
  return out;
}

// Lit une saisie du type "48 49 50 53" ou "48-50, 53" (numéros de semaine ISO)
function parseWeeks(txt,semId){
  var weeks=semWeeks(semId),errors=[],picked={};
  String(txt||'').split(/[\s,;]+/).filter(Boolean).forEach(function(tok){
    var m=/^(\d{1,2})-(\d{1,2})$/.exec(tok),n=/^\d{1,2}$/.test(tok);
    if(n){
      var num=+tok,found=weeks.filter(function(w){return w.num===num;})[0];
      if(found)picked[found.monday]=true;
      else errors.push('La semaine '+num+' n\'est pas dans ce semestre');
    }else if(m){
      var a=+m[1],b=+m[2],hit=0;
      weeks.forEach(function(w){
        var ok=a<=b?(w.num>=a&&w.num<=b):(w.num>=a||w.num<=b);
        if(ok){picked[w.monday]=true;hit++;}
      });
      if(!hit)errors.push('Aucune semaine de '+tok+' dans ce semestre');
    }else{
      errors.push('« '+tok+' » n\'est pas un numéro de semaine');
    }
  });
  return {mondays:Object.keys(picked).sort(),errors:errors};
}

function fmtWeeks(mondays,semId){
  var weeks=semWeeks(semId);
  var idx=mondays.map(function(mo){return weeks.findIndex(function(w){return w.monday===mo;});}).filter(function(i){return i>=0;}).sort(function(a,b){return a-b;});
  var out=[],i=0;
  while(i<idx.length){
    var j=i;
    while(j+1<idx.length&&idx[j+1]===idx[j]+1)j++;
    var a=weeks[idx[i]].num,b=weeks[idx[j]].num;
    if(j===i)out.push(String(a));
    else if(j===i+1)out.push(a+' '+b);
    else out.push(a+'-'+b);
    i=j+1;
  }
  return out.join(' ');
}

// Dates réelles pour une liste de semaines, sur le même jour de la semaine que baseDate
function weekDates(txt,semId,baseDate){
  var p=parseWeeks(txt,semId),k=wd(baseDate),dates=[],dropped=0;
  p.mondays.forEach(function(mo){
    var dt=addDays(mo,k);
    if(inSemester(dt,semId))dates.push(dt);else dropped++;
  });
  return {dates:dates,errors:p.errors,dropped:dropped};
}

/* ---------- Conflits et contrôles ---------- */
function overlap(a,b){return a.date===b.date&&a.start<b.start+b.dur&&b.start<a.start+a.dur;}

function shared(a,b){
  var out=[];
  a.groups.forEach(function(g){if(b.groups.indexOf(g)>=0)out.push('groupe '+nm('groups',g));});
  a.teachers.forEach(function(t){if(b.teachers.indexOf(t)>=0)out.push('enseignant '+nm('teachers',t));});
  if(a.room&&a.room===b.room)out.push('salle '+nm('rooms',a.room));
  return out;
}

function capacityIssue(a){
  if(!a.room)return null;
  var r=S.rooms.filter(function(x){return x.id===a.room;})[0];
  if(!r||!r.cap)return null;
  var total=a.groups.reduce(function(sum,gid){
    var g=S.groups.filter(function(x){return x.id===gid;})[0];
    return sum+(g&&g.size?+g.size:0);
  },0);
  return total>r.cap?{total:total,cap:r.cap,room:r.name}:null;
}

function allIssues(){
  var out=[],sl=S.slots,i,j;
  for(i=0;i<sl.length;i++){
    for(j=i+1;j<sl.length;j++){
      if(sl[i].date!==sl[j].date||!overlap(sl[i],sl[j]))continue;
      var sh=shared(sl[i],sl[j]);
      if(sh.length){
        out.push({kind:'conflit',a:sl[i],b:sl[j],
          text:'['+semName(sl[i].sem)+(sl[i].sem!==sl[j].sem?'/'+semName(sl[j].sem):'')+'] '+longDate(sl[i].date)+' '+shortDate(sl[i].date)+' '+fmt(Math.max(sl[i].start,sl[j].start))+' : '+sh.join(', ')+' en double ("'+titleOf(sl[i])+'" et "'+titleOf(sl[j])+'")'});
      }
    }
  }
  sl.forEach(function(a){
    var c=capacityIssue(a);
    if(c){out.push({kind:'capacite',a:a,b:null,
      text:'['+semName(a.sem)+'] '+longDate(a.date)+' '+shortDate(a.date)+' '+fmt(a.start)+' : '+c.total+' étudiants prévus pour '+c.cap+' places en '+c.room+' ("'+titleOf(a)+'")'});}
    if(!inSemester(a.date,a.sem)){out.push({kind:'hors',a:a,b:null,
      text:'['+semName(a.sem)+'] '+longDate(a.date)+' '+shortDate(a.date)+' : "'+titleOf(a)+'" est en dehors du semestre'});}
  });
  S.courses.forEach(function(c){
    var n=placed(c.id);
    if(n>c.sessions){out.push({kind:'trop',a:null,b:null,
      text:'['+semName(c.sem)+'] « '+c.name+' » : '+n+' séances placées pour '+c.sessions+' prévues'});}
  });
  return out;
}

function draftIssues(d){
  var msgs=[];
  S.slots.forEach(function(o){
    if(o.id===d.id||!overlap(d,o))return;
    var sh=shared(d,o);
    if(sh.length)msgs.push(sh.join(', ')+' déjà pris par "'+titleOf(o)+'" ('+fmt(o.start)+'-'+fmt(o.start+o.dur)+')');
  });
  var c=capacityIssue(d);
  if(c)msgs.push(c.total+' étudiants pour '+c.cap+' places en '+c.room);
  if(validDate(d.date)&&!inSemester(d.date,d.sem)){var ms=semOf(d.sem)||SEM();msgs.push('Date en dehors du semestre '+ms.name+' ('+fullDate(ms.start)+' au '+fullDate(ms.end)+')');}
  return msgs;
}

/* ---------- Vue ---------- */
function passFilter(s){
  var v=S.view;
  if(v.mode==='all')return true;
  if(!v.id)return false;
  if(v.mode==='group')return s.groups.indexOf(v.id)>=0;
  if(v.mode==='teacher')return s.teachers.indexOf(v.id)>=0;
  if(v.mode==='room')return s.room===v.id;
  var c=course(s.course);return !!c&&c.lang===v.id;
}
function visibleSlots(){
  var v=S.view,w0=v.week,w1=addDays(v.week,5);
  return S.slots.filter(function(s){
    return s.sem===S.current&&s.date>=w0&&s.date<=w1&&passFilter(s);
  });
}

/* ---------- Semaine type ---------- */
var typeView=/[?&]vue=type(&|$)/.test(location.search);
var PT=0.85;
function typeBlocks(){
  var map={},agg=[];
  S.slots.filter(function(s){return s.sem===S.current&&passFilter(s);}).forEach(function(s){
    var d=wd(s.date);
    var key=[s.course||('t:'+s.title),s.groups.slice().sort().join(','),s.teachers.slice().sort().join(','),s.room||'',d,s.start,s.dur].join('|');
    var a=map[key];
    if(!a){a=map[key]={id:'a'+agg.length,day:d,start:s.start,dur:s.dur,room:s.room||'',slot:s,mondays:[]};agg.push(a);}
    var mo=mondayOf(s.date);
    if(a.mondays.indexOf(mo)<0)a.mondays.push(mo);
  });
  return agg;
}
function renderTypeWeek(){
  var root=$('#tt');root.replaceChildren();
  var sm=SEM(),agg=typeBlocks();
  if(!agg.length){
    root.appendChild(h('div',{class:'empty'},'Aucun cours placé pour ce semestre avec cette sélection.'));
    return;
  }
  var d,nd=agg.some(function(a){return a.day>=5;})?6:5;
  for(d=0;d<nd;d++){
    var items=agg.filter(function(a){return a.day===d;});
    var box=h('section',{class:'tw-day'},h('h2',{},DAYS[d]+' · semaine type '+sm.name));
    if(!items.length){box.appendChild(h('div',{class:'tw-none'},'Aucun cours'));root.appendChild(box);continue;}
    var roomIds=S.rooms.map(function(r){return r.id;}).filter(function(id){return items.some(function(a){return a.room===id;});});
    if(items.some(function(a){return !a.room||roomIds.indexOf(a.room)<0;}))roomIds.push('');
    var t0=Math.floor(Math.min.apply(null,items.map(function(a){return a.start;}))/60)*60;
    var t1=Math.ceil(Math.max.apply(null,items.map(function(a){return a.start+a.dur;}))/60)*60;
    var H=Math.round((t1-t0)*PT),tpl='52px repeat('+roomIds.length+',minmax(130px,1fr))';
    var heads=h('div',{class:'heads tw-heads',style:'grid-template-columns:'+tpl},h('div',{class:'gut'}));
    roomIds.forEach(function(rid){heads.appendChild(h('div',{class:'dh'},rid?nm('rooms',rid):'Sans salle'));});
    var body=h('div',{class:'body',style:'grid-template-columns:'+tpl+';height:'+H+'px;--hh:'+(60*PT)+'px'});
    var gut=h('div',{class:'gut',style:'height:'+H+'px'});
    var hr;
    for(hr=t0/60;hr<=t1/60;hr++)gut.appendChild(h('div',{class:'hl',style:'top:'+Math.round((hr*60-t0)*PT)+'px'},pad(hr)+':00'));
    body.appendChild(gut);
    roomIds.forEach(function(rid){
      var col=h('div',{class:'col',style:'height:'+H+'px'});
      var list=items.filter(function(a){return rid?a.room===rid:(!a.room||roomIds.indexOf(a.room)<0);});
      var lay=layout(list);
      list.forEach(function(a){
        var s=a.slot,L=lay[a.id],c=slotColor(s);
        var gl=s.groups.map(function(g){return nm('groups',g);}).join(', ');
        var tl=s.teachers.map(function(t){return nm('teachers',t);}).join(', ');
        var wk=fmtWeeks(a.mondays,S.current);
        var cc=course(s.course),lg=cc?lang(cc.lang):null;
        var h0=Math.max(18,Math.round(a.dur*PT)-2);
        var tip=titleOf(s)+(lg?' ('+lg.name+')':'')+'\n'+fmt(a.start)+'-'+fmt(a.start+a.dur)+(gl?'\nGroupes : '+gl:'')+(tl?'\nEnseignants : '+tl:'')+'\nSemaines : '+wk;
        col.appendChild(h('div',{
          class:'ev tw-ev',
          style:'top:'+Math.round((a.start-t0)*PT)+'px;height:'+h0+'px;left:calc('+(L.lane*100/L.lanes)+'% + 1px);width:calc('+(100/L.lanes)+'% - 3px);background:'+c[0]+';border-left-color:'+c[1]+';color:'+c[1],
          title:tip
        },
          h('b',{},(gl?gl+' ':'')+titleOf(s)),
          h('span',{},fmt(a.start)+'-'+fmt(a.start+a.dur)+(tl?' · '+tl:'')),
          h('span',{class:'tw-wk'},'sem. '+wk)));
      });
      body.appendChild(col);
    });
    box.appendChild(heads);box.appendChild(body);root.appendChild(box);
  }
  var used={};
  agg.forEach(function(a){var cc=course(a.slot.course);if(cc&&cc.lang)used[cc.lang]=true;});
  var leg=h('div',{class:'tw-legend'});
  S.languages.forEach(function(l){if(used[l.id])leg.appendChild(h('span',{style:'background:'+COLORS[l.color][0]+';border-left:4px solid '+COLORS[l.color][1]+';color:'+COLORS[l.color][1]},l.name));});
  root.appendChild(leg);
}

function ensureRange(list){
  var v=S.view;
  list.forEach(function(s){
    v.startH=Math.min(v.startH,Math.floor(s.start/60));
    v.endH=Math.max(v.endH,Math.ceil((s.start+s.dur)/60));
    if(wd(s.date)>=5)v.days=6;
  });
  v.endH=Math.min(24,v.endH);
}

function layout(list){
  var s=list.slice().sort(function(a,b){return a.start-b.start||b.dur-a.dur;});
  var res={},cluster=[],clusterEnd=-1;
  function flush(){
    var lanesEnd=[];
    cluster.forEach(function(sl){
      var l=-1,x;
      for(x=0;x<lanesEnd.length;x++){if(lanesEnd[x]<=sl.start){l=x;break;}}
      if(l<0){l=lanesEnd.length;lanesEnd.push(0);}
      lanesEnd[l]=sl.start+sl.dur;
      res[sl.id]={lane:l,lanes:0};
    });
    cluster.forEach(function(sl){res[sl.id].lanes=lanesEnd.length;});
    cluster=[];clusterEnd=-1;
  }
  s.forEach(function(sl){
    if(cluster.length&&sl.start>=clusterEnd)flush();
    cluster.push(sl);clusterEnd=Math.max(clusterEnd,sl.start+sl.dur);
  });
  if(cluster.length)flush();
  return res;
}

var colEls=[];
var justDragged=false;

function timeFromY(col,clientY,dur){
  var v=S.view,t0=v.startH*60,t1=v.endH*60;
  var rect=col.getBoundingClientRect();
  var m=t0+Math.floor((clientY-rect.top)/PPM/SNAP)*SNAP;
  return clamp(m,t0,Math.max(t0,t1-dur));
}

function renderGrid(){
  if(typeView){renderTypeWeek();if(CAN_EDIT)renderIssues(allIssues());syncToolbar();return;}
  var vis=visibleSlots();
  ensureRange(vis);
  var v=S.view,n=v.days,t0=v.startH*60,t1=v.endH*60,H=Math.round((t1-t0)*PPM);
  var issues=CAN_EDIT?allIssues():[],bad={};
  issues.forEach(function(i){
    if(i.kind==='trop')return;
    if(i.a)bad[i.a.id]=true;
    if(i.b)bad[i.b.id]=true;
  });

  var root=$('#tt');root.replaceChildren();
  var tpl='52px repeat('+n+',minmax(90px,1fr))';

  var heads=h('div',{class:'heads',style:'grid-template-columns:'+tpl},h('div',{class:'gut'}));
  var i;
  for(i=0;i<n;i++){
    var dt=addDays(v.week,i);
    heads.appendChild(h('div',{class:'dh'+(inSemester(dt)?'':' off')},DAYS[i],h('small',{},shortDate(dt))));
  }

  var body=h('div',{class:'body',style:'grid-template-columns:'+tpl+';height:'+H+'px;--hh:'+(60*PPM)+'px'});
  var gut=h('div',{class:'gut',style:'height:'+H+'px'});
  var hr;
  for(hr=v.startH;hr<=v.endH;hr++){
    gut.appendChild(h('div',{class:'hl',style:'top:'+Math.round((hr*60-t0)*PPM)+'px'},pad(hr)+':00'));
  }
  body.appendChild(gut);

  colEls=[];
  var byDay=[];
  for(i=0;i<n;i++)byDay.push([]);
  vis.forEach(function(s){var k=wd(s.date);if(k<n)byDay[k].push(s);});

  byDay.forEach(function(list,day){
    var date=addDays(v.week,day);
    var col=h('div',{class:'col'+(inSemester(date)?'':' off'),style:'height:'+H+'px'});
    col.addEventListener('click',function(e){
      if(!CAN_EDIT||e.target!==col||justDragged)return;
      if(!inSemester(date)){toast('Cette date est en dehors du semestre');return;}
      if(armed){
        var c=course(armed);
        if(c)placeCourse(c.id,date,timeFromY(col,e.clientY,c.dur),armWeeksTxt);
        return;
      }
      openEditor(newDraft(date,timeFromY(col,e.clientY,120)));
    });
    col.addEventListener('dragover',function(e){e.preventDefault();});
    col.addEventListener('drop',function(e){
      e.preventDefault();
      if(!CAN_EDIT)return;
      var cid=e.dataTransfer&&e.dataTransfer.getData('text/plain');
      var c=course(cid);
      if(!c)return;
      if(!inSemester(date)){toast('Cette date est en dehors du semestre');return;}
      placeCourse(c.id,date,timeFromY(col,e.clientY,c.dur),armed===c.id?armWeeksTxt:'');
    });
    var lay=layout(list);
    list.forEach(function(s){
      var L=lay[s.id],c=slotColor(s);
      var gl=s.groups.map(function(g){return nm('groups',g);}).join(', ');
      var tl=s.teachers.map(function(t){return nm('teachers',t);}).join(', ');
      var rm=s.room?nm('rooms',s.room):'';
      var h0=Math.max(14,Math.round(s.dur*PPM)-2);
      var tip=titleOf(s)+'\n'+DAYS[day]+' '+shortDate(s.date)+' '+fmt(s.start)+'-'+fmt(s.start+s.dur)+
        (gl?'\nGroupes : '+gl:'')+(tl?'\nEnseignants : '+tl:'')+(rm?'\nSalle : '+rm:'')+(s.note?'\n'+s.note:'');
      if(bad[s.id])tip+='\n\nATTENTION : conflit, capacité dépassée ou hors semestre';
      var ev=h('div',{
        class:'ev'+(bad[s.id]?' bad':''),
        style:'top:'+Math.round((s.start-t0)*PPM)+'px;height:'+h0+'px;left:calc('+(L.lane*100/L.lanes)+'% + 1px);width:calc('+(100/L.lanes)+'% - 3px);background:'+c[0]+';border-left-color:'+c[1]+';color:'+c[1],
        title:tip
      },
        h('b',{},(bad[s.id]?'⚠ ':'')+titleOf(s)),
        h('span',{},fmt(s.start)+'-'+fmt(s.start+s.dur)+(rm?' · '+rm:'')),
        gl?h('span',{},gl):null,
        tl?h('span',{},tl):null,
        h('div',{class:'rs'})
      );
      ev.addEventListener('pointerdown',function(e){
        if(!CAN_EDIT)return;
        if(e.button!==undefined&&e.button!==0)return;
        startDrag(e,s,e.target.classList.contains('rs')?'resize':'move');
      });
      col.appendChild(ev);
    });
    colEls.push(col);
    body.appendChild(col);
  });

  root.appendChild(heads);root.appendChild(body);
  if(!vis.length){
    root.appendChild(h('div',{class:'empty'},v.mode==='all'?'Aucune séance cette semaine. Choisis un cours à droite puis clique dans la grille.':'Aucune séance cette semaine pour cette sélection.'));
  }
  if(CAN_EDIT)renderIssues(issues);
  syncToolbar();
}

function startDrag(e,slot,mode){
  e.preventDefault();
  var v=S.view,t0=v.startH*60,t1=v.endH*60;
  var orig={date:slot.date,start:slot.start,dur:slot.dur};
  var x0=e.clientX,y0=e.clientY,moved=false;
  function mv(ev){
    var dx=ev.clientX-x0,dy=ev.clientY-y0;
    if(!moved&&Math.abs(dx)+Math.abs(dy)<=4)return;
    moved=true;
    var dm=snap(dy/PPM);
    if(mode==='move'){
      slot.start=clamp(orig.start+dm,t0,Math.max(t0,t1-slot.dur));
      if(colEls.length){
        var r=colEls[0].getBoundingClientRect();
        var idx=clamp(Math.floor((ev.clientX-r.left)/r.width),0,colEls.length-1);
        var nd=addDays(v.week,idx);
        slot.date=inSemester(nd)?nd:orig.date;
      }
    }else{
      slot.dur=clamp(orig.dur+dm,SNAP,Math.max(SNAP,t1-slot.start));
    }
    renderGrid();
  }
  function up(){
    document.removeEventListener('pointermove',mv);
    document.removeEventListener('pointerup',up);
    document.removeEventListener('pointercancel',up);
    if(moved){
      justDragged=true;setTimeout(function(){justDragged=false;},80);
      save();
    }else{
      openEditor(slot);
    }
  }
  document.addEventListener('pointermove',mv);
  document.addEventListener('pointerup',up);
  document.addEventListener('pointercancel',up);
}

/* ---------- Placement des cours ---------- */
function makeSlot(c,date,start){
  return {id:uid(),sem:c.sem,course:c.id,title:'',date:date,start:start,dur:c.dur,
    groups:c.groups.slice(),teachers:c.teachers.slice(),room:c.room||'',note:''};
}

function placeCourse(cid,date,start,weeksTxt){
  var c=course(cid);if(!c)return;
  var left=remaining(c);
  if(left<=0){
    toast('Les '+c.sessions+' séances de « '+c.name+' » sont déjà toutes placées (Configuration > Cours pour en ajouter).');
    return;
  }
  var useWeeks=!!(weeksTxt&&weeksTxt.trim());
  var dates=[date],wk=null;
  if(useWeeks){
    wk=weekDates(weeksTxt,c.sem,date);
    if(wk.errors.length){toast(wk.errors[0]);return;}
    dates=wk.dates;
    if(!dates.length){toast('Aucune des semaines indiquées ne donne une date dans le semestre');return;}
  }
  if(dates.length>left){
    toast(dates.length+' semaines indiquées, mais il ne reste que '+left+' séance'+(left>1?'s':'')+' à placer pour « '+c.name+' ».');
    return;
  }
  dates.forEach(function(dt){S.slots.push(makeSlot(c,dt,start));});
  save();renderAll();
  var rest=remaining(c);
  var msg=dates.length+' séance'+(dates.length>1?'s':'')+' placée'+(dates.length>1?'s':'')+' : '+c.name+'. ';
  msg+=rest>0?('Reste '+rest+' à placer.'):'Toutes les séances sont placées.';
  if(wk&&wk.dropped)msg+=' ('+wk.dropped+' semaine(s) ignorée(s) car le jour tombe hors du semestre.)';
  toast(msg);
}

function disarm(){armed=null;renderArm();renderCourses();}

function renderArm(){
  var bar=$('#armbar');bar.replaceChildren();
  var c=armed?course(armed):null;
  if(!c){armed=null;bar.hidden=true;$('#tt').classList.remove('armed');return;}
  bar.hidden=false;$('#tt').classList.add('armed');
  var inp=h('input',{type:'text',value:armWeeksTxt,placeholder:'ex. 48-50 53','aria-label':'Numéros de semaine'});
  inp.style.width='150px';
  inp.addEventListener('input',function(){armWeeksTxt=inp.value;});
  bar.appendChild(h('b',{},'Placement : '+c.name));
  bar.appendChild(h('span',{},'reste '+Math.max(0,remaining(c))+' séance(s)'));
  bar.appendChild(h('label',{},'Semaines (n° ISO) ',inp));
  bar.appendChild(h('span',{class:'hint'},'Vide = la semaine où tu cliques. Le jour et l\'heure sont ceux de ton clic.'));
  bar.appendChild(h('button',{onclick:disarm},'Terminer (Échap)'));
}

/* ---------- Panneaux latéraux ---------- */
function renderIssues(issues){
  var c=$('#conf');c.replaceChildren();
  var nb=issues.length;
  c.appendChild(h('h2',{},'Contrôle',h('span',{class:'badge'+(nb?'':' ok')},nb?String(nb):'OK')));
  if(!nb){c.appendChild(h('div',{class:'hint'},'Aucun conflit de groupe, d\'enseignant ou de salle, aucune salle trop petite, aucune séance hors semestre.'));return;}
  var ul=h('ul',{class:'issues'});
  issues.forEach(function(i){
    ul.appendChild(h('li',{class:(i.kind==='conflit'||i.kind==='trop')?'':'w',onclick:function(){
      if(i.a){if(i.a.sem!==S.current){S.current=i.a.sem;renderAll();}S.view.week=mondayOf(i.a.date);fixWeek(S);save();renderGrid();openEditor(i.a);}
      else{openConfig('courses');}
    }},i.text));
  });
  c.appendChild(ul);
}

function renderCourses(){
  var root=$('#courses');root.replaceChildren();
  var totalLeft=0;
  curCourses().forEach(function(c){totalLeft+=Math.max(0,remaining(c));});
  root.appendChild(h('h2',{},'Séances à placer ('+SEM().name+')',h('span',{class:'badge'+(totalLeft?' info':' ok')},String(totalLeft))));

  var sel=h('select',{'aria-label':'Filtrer par langue'},h('option',{value:''},'Toutes les langues'));
  S.languages.forEach(function(l){sel.appendChild(h('option',{value:l.id},l.name));});
  sel.value=pf.lang;
  sel.addEventListener('change',function(){pf.lang=sel.value;renderCourses();});
  var cb=h('input',{type:'checkbox'});cb.checked=pf.hideDone;
  cb.addEventListener('change',function(){pf.hideDone=cb.checked;renderCourses();});
  root.appendChild(h('div',{class:'pfilter'},sel,h('label',{},cb,' Masquer les terminés')));

  var list=h('div',{class:'clist'});
  var shown=0;
  curCourses().forEach(function(c){
    if(pf.lang&&c.lang!==pf.lang)return;
    var n=placed(c.id),left=c.sessions-n;
    if(pf.hideDone&&left<=0)return;
    shown++;
    var l=lang(c.lang),col=COLORS[l?l.color:'gris']||COLORS.gris;
    var pct=Math.min(100,Math.round(100*n/c.sessions));
    var meta=(l?l.name:'Sans langue')+' · '+c.groups.map(function(g){return nm('groups',g);}).join(', ')+' · '+c.dur+' min';
    var item=h('div',{class:'citem'+(armed===c.id?' armed':''),style:'border-left-color:'+col[1],draggable:'true',title:'Clique puis clique dans la grille, ou glisse vers la grille'},
      h('div',{class:'t'},h('span',{},c.name),h('span',{class:'cnt'+(left===0?' done':'')+(left<0?' over':'')},n+'/'+c.sessions)),
      h('div',{class:'m'},meta),
      h('div',{class:'bar'},h('i',{style:'width:'+pct+'%;background:'+col[1]})));
    item.addEventListener('click',function(){armed=(armed===c.id)?null:c.id;renderArm();renderCourses();});
    item.addEventListener('dragstart',function(e){
      e.dataTransfer.setData('text/plain',c.id);e.dataTransfer.effectAllowed='copy';
    });
    list.appendChild(item);
  });
  if(!shown){
    list.appendChild(h('div',{class:'hint'},curCourses().length?'Aucun cours à afficher avec ce filtre.':'Aucun cours. Ajoute-en dans Configuration > Cours.'));
  }
  root.appendChild(list);
  root.appendChild(h('div',{style:'margin-top:8px'},h('button',{onclick:function(){openConfig('courses');}},'Gérer les cours')));
}

/* ---------- Barre d'outils ---------- */
function fillSemSelect(){
  var sel=$('#sem');sel.replaceChildren();
  S.semesters.forEach(function(m){sel.appendChild(h('option',{value:m.id},m.name));});
  sel.value=SEM().id;
}

function switchSemester(id){
  if(!semOf(id))return;
  S.current=id;armed=null;
  var t=todayStr(),m=SEM();
  S.view.week=inSemester(t)?mondayOf(t):mondayOf(m.start);
  fixWeek(S);save();renderAll();
}

function fillItemSelect(){
  var v=S.view,sel=$('#item'),k=KIND[v.mode];
  sel.replaceChildren();
  if(!k){sel.disabled=true;sel.appendChild(h('option',{},'-'));return;}
  sel.disabled=false;
  if(!S[k].some(function(x){return x.id===v.id;}))v.id=S[k][0]?S[k][0].id:null;
  S[k].forEach(function(it){sel.appendChild(h('option',{value:it.id},it.name));});
  if(v.id)sel.value=v.id;
}

function weekIdx(monday){
  return Math.round((pd(monday)-pd(mondayOf(SEM().start)))/604800000)+1;
}

function syncToolbar(){
  var v=S.view;
  document.body.classList.toggle('typeweek',typeView);
  $('#wtype').textContent=typeView?'Retour au calendrier':'Semaine type';
  $('#mode').value=v.mode;
  var sm=SEM();
  $('#semname').textContent='Semestre '+sm.name+' : du '+fullDate(sm.start)+' au '+fullDate(sm.end);
  $('#sem').value=sm.id;
  var first=mondayOf(sm.start),last=mondayOf(sm.end);
  $('#wlabel').textContent='Semaine '+isoWeek(v.week)+' · '+shortDate(v.week)+' au '+shortDate(addDays(v.week,v.days-1))+' (n° '+weekIdx(v.week)+'/'+weekIdx(last)+' du semestre)';
  $('#prev').disabled=v.week<=first;
  $('#next').disabled=v.week>=last;
  $('#jump').value=v.week;
}

function gotoWeek(s){
  S.view.week=s;fixWeek(S);save();renderGrid();
}

function initToolbar(){
  $('#mode').addEventListener('change',function(e){S.view.mode=e.target.value;S.view.id=null;fillItemSelect();save();renderGrid();});
  $('#item').addEventListener('change',function(e){S.view.id=e.target.value;save();renderGrid();});
  $('#sem').addEventListener('change',function(e){switchSemester(e.target.value);});
  $('#wtype').addEventListener('click',function(){
    typeView=!typeView;armed=null;
    try{history.replaceState(null,'',location.pathname+(typeView?'?vue=type':'')+location.hash);}catch(e){}
    renderAll();
  });
  $('#prev').addEventListener('click',function(){gotoWeek(addDays(S.view.week,-7));});
  $('#next').addEventListener('click',function(){gotoWeek(addDays(S.view.week,7));});
  $('#today').addEventListener('click',function(){
    var t=todayStr();
    if(!inSemester(t))toast('Aujourd\'hui est en dehors du semestre : affichage de la semaine la plus proche.');
    gotoWeek(mondayOf(t));
  });
  $('#jump').addEventListener('change',function(e){
    if(validDate(e.target.value))gotoWeek(mondayOf(e.target.value));
  });
  $('#add').addEventListener('click',function(){
    var d=S.view.week;
    if(!inSemester(d))d=SEM().start;
    openEditor(newDraft(d,S.view.startH*60+60));
  });
  $('#cfg').addEventListener('click',function(){openConfig('semester');});
  $('#exp').addEventListener('click',openExport);
  $('#prt').addEventListener('click',function(){
    try{window.print();}catch(e){}
    toast('Imprime la semaine affichée. Si l\'impression est bloquée dans cet aperçu, ouvre la page dans un onglet ou utilise Ctrl+P / Cmd+P.');
  });
  $('#rst').addEventListener('click',function(){
    openModal(h('div',{class:'modal'},
      h('h2',{},'Réinitialiser'),
      h('p',{},'Que veux-tu faire ? Dans les deux cas, la configuration et les séances actuelles seront remplacées pour tout le monde (pense à exporter avant).'),
      h('div',{class:'actions'},
        h('button',{onclick:closeModal},'Annuler'),
        h('button',{class:'danger',onclick:function(){closeModal();S=normalize(sample());armed=null;save();renderAll();toast('Exemple rechargé');}},'Recharger l\'exemple'),
        h('button',{class:'danger',onclick:function(){closeModal();S=emptyData();armed=null;save();renderAll();toast('Appli vidée : commence par Configuration');}},'Repartir de zéro'))));
  });
  $('#tour').addEventListener('click',startTour);
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&armed&&!$('#modal-root').firstChild)disarm();
  });
}

/* ---------- Modales ---------- */
function closeModal(){$('#modal-root').replaceChildren();document.removeEventListener('keydown',escClose);}
function escClose(e){if(e.key==='Escape')closeModal();}
function openModal(content){
  closeModal();
  var down=null;
  var ov=h('div',{class:'ov',role:'dialog','aria-modal':'true'},content);
  ov.addEventListener('mousedown',function(e){down=e.target;});
  ov.addEventListener('click',function(e){if(e.target===ov&&down===ov)closeModal();});
  $('#modal-root').appendChild(ov);
  document.addEventListener('keydown',escClose);
}
function confirmBox(msg,onYes,label,onNo){
  openModal(h('div',{class:'modal'},
    h('h2',{},'Confirmation'),
    h('p',{},msg),
    h('div',{class:'actions'},
      h('button',{onclick:function(){closeModal();if(onNo)onNo();}},'Annuler'),
      h('button',{class:'danger',onclick:function(){closeModal();onYes();}},label||'Confirmer'))));
}

function chipsBox(kind,list,onChange){
  var box=h('div',{class:'chips'});
  if(!S[kind].length)box.appendChild(h('span',{class:'hint'},'Aucun élément : ajoute-en dans Configuration.'));
  S[kind].forEach(function(it){
    var cb=h('input',{type:'checkbox'});
    cb.checked=list.indexOf(it.id)>=0;
    var lab=h('label',{class:'chip'+(cb.checked?' on':'')},cb,it.name);
    cb.addEventListener('change',function(){
      var i=list.indexOf(it.id);
      if(cb.checked&&i<0)list.push(it.id);
      if(!cb.checked&&i>=0)list.splice(i,1);
      lab.classList.toggle('on',cb.checked);
      if(onChange)onChange();
    });
    box.appendChild(lab);
  });
  return box;
}

function roomSelect(value,onChange){
  var room=h('select',{},h('option',{value:''},'Aucune'));
  S.rooms.forEach(function(r){room.appendChild(h('option',{value:r.id},r.name+(r.cap?' ('+r.cap+' places)':'')));});
  room.value=value||'';
  room.addEventListener('change',function(){onChange(room.value);});
  return room;
}

/* ---------- Éditeur de séance ---------- */
function newDraft(date,start){
  var v=S.view,d={id:null,sem:SEM().id,course:'',title:'',date:date,start:start,dur:120,groups:[],teachers:[],room:'',note:''};
  if(v.id){
    if(v.mode==='group')d.groups=[v.id];
    if(v.mode==='teacher')d.teachers=[v.id];
    if(v.mode==='room')d.room=v.id;
  }
  return d;
}

function openEditor(slot,pre){
  var isNew=!slot.id;
  var d=pre||JSON.parse(JSON.stringify(slot));
  if(d.end==null)d.end=Math.min(1440,d.start+d.dur);
  if(d.weeksTxt==null)d.weeksTxt='';
  var warn=h('div',{class:'warnbox okbox'});
  var info=h('div',{class:'hint'});

  function refresh(){
    var c=course(d.course);
    if(c){
      info.textContent='Cours : '+placed(c.id)+' / '+c.sessions+' séances placées, reste '+Math.max(0,remaining(c))+(isNew?'.':' (ce créneau est compris).');
    }else{
      info.textContent='Événement libre : pas de décompte de séances.';
    }
    var msgs=[];
    if(!validDate(d.date))msgs.push('Date invalide');
    else if(wd(d.date)>5)msgs.push('Le dimanche n\'est pas géré');
    else if(d.end<=d.start)msgs.push('L\'heure de fin doit être après l\'heure de début');
    else{
      var useWeeks=isNew&&d.weeksTxt.trim()!=='';
      var wk=useWeeks?weekDates(d.weeksTxt,d.sem,d.date):null;
      var dates=useWeeks?wk.dates:[d.date];
      if(useWeeks){
        wk.errors.forEach(function(e){msgs.push(e);});
        if(wk.dropped)msgs.push(wk.dropped+' semaine(s) ignorée(s) : le jour choisi tombe hors du semestre');
        info.textContent+=' '+dates.length+' séance(s) seront créées, le '+DAYS[wd(d.date)].toLowerCase()+'.';
        if(c&&dates.length>remaining(c))msgs.push(dates.length+' semaines choisies pour '+Math.max(0,remaining(c))+' séance(s) restante(s) : retire des semaines');
      }
      var shown=0,more=0;
      dates.forEach(function(dt){
        var is=draftIssues({id:d.id,sem:d.sem,date:dt,start:d.start,dur:d.end-d.start,groups:d.groups,teachers:d.teachers,room:d.room});
        if(!is.length)return;
        if(shown<4){msgs.push((useWeeks?'Semaine '+isoWeek(dt)+' ('+shortDate(dt)+') : ':'')+is[0]+(is.length>1?' (+'+(is.length-1)+')':''));shown++;}
        else more++;
      });
      if(more)msgs.push('... et '+more+' autre(s) semaine(s) avec conflit');
    }
    warn.replaceChildren();
    if(msgs.length){
      warn.className='warnbox';
      msgs.forEach(function(m){warn.appendChild(h('div',{},'⚠ '+m));});
    }else{
      warn.className='warnbox okbox';
      warn.appendChild(h('div',{},'Aucun conflit pour ce créneau.'));
    }
  }

  var courseSel=h('select',{},h('option',{value:''},'Événement libre (sans décompte)'));
  S.courses.filter(function(c){return c.sem===d.sem;}).forEach(function(c){
    courseSel.appendChild(h('option',{value:c.id},c.name+' ('+placed(c.id)+'/'+c.sessions+')'));
  });
  courseSel.value=d.course||'';
  courseSel.addEventListener('change',function(){
    d.course=courseSel.value;
    var c=course(d.course);
    if(c&&isNew){
      d.groups=c.groups.slice();d.teachers=c.teachers.slice();d.room=c.room||'';
      d.end=Math.min(1440,d.start+c.dur);
    }
    openEditor(slot,d);
  });

  var title=h('input',{type:'text',value:d.title,placeholder:'Ex. Session TOEIC officielle, Réunion'});
  title.addEventListener('input',function(){d.title=title.value;});
  var titleRow=h('div',{class:'f'},h('label',{},'Titre'),title);
  if(d.course)titleRow.style.display='none';

  var date=h('input',{type:'date',value:d.date});
  date.addEventListener('change',function(){if(validDate(date.value))d.date=date.value;refresh();});

  var en;
  var st=h('input',{type:'time',step:'300',value:fmt(d.start)});
  st.addEventListener('change',function(){
    var m=parseTime(st.value);if(isNaN(m))return;
    var dur=d.end-d.start;d.start=m;
    if(dur>0){d.end=Math.min(1440,m+dur);en.value=fmt(Math.min(d.end,1439));}
    refresh();
  });
  en=h('input',{type:'time',step:'300',value:fmt(Math.min(d.end,1439))});
  en.addEventListener('change',function(){var m=parseTime(en.value);if(isNaN(m))return;d.end=m;refresh();});

  var weeksInput=h('input',{type:'text',value:d.weeksTxt,placeholder:'ex. 48-50 53 (vide = seulement la date ci-dessus)'});
  var chipBox=h('div',{class:'chips'});
  function drawChips(){
    chipBox.replaceChildren();
    var sel=parseWeeks(d.weeksTxt,d.sem).mondays;
    semWeeks(d.sem).forEach(function(w){
      var on=sel.indexOf(w.monday)>=0;
      var b=h('button',{type:'button',class:'wk'+(on?' on':''),title:'Semaine '+w.num+' : lundi '+shortDate(w.monday)},String(w.num));
      b.addEventListener('click',function(){
        var cur=parseWeeks(d.weeksTxt,d.sem).mondays,i=cur.indexOf(w.monday);
        if(i>=0)cur.splice(i,1);else cur.push(w.monday);
        d.weeksTxt=fmtWeeks(cur,d.sem);weeksInput.value=d.weeksTxt;
        drawChips();refresh();
      });
      chipBox.appendChild(b);
    });
  }
  weeksInput.addEventListener('input',function(){d.weeksTxt=weeksInput.value;drawChips();refresh();});
  drawChips();
  var weeksRow=isNew?h('div',{class:'f'},
    h('label',{},'Semaines (numéros ISO, ex. 48 49 50 53 ou 48-50 53)'),
    weeksInput,chipBox,
    h('div',{class:'hint'},'Le jour de la semaine et l\'heure sont ceux de la date et des horaires ci-dessus. Une séance est créée pour chaque semaine cochée.')):null;

  var note=h('input',{type:'text',value:d.note,placeholder:'Facultatif'});
  note.addEventListener('input',function(){d.note=note.value;});

  function doSave(){
    if(!validDate(d.date)){toast('Date invalide');return;}
    if(wd(d.date)>5){toast('Le dimanche n\'est pas géré');return;}
    if(d.end<=d.start){toast('L\'heure de fin doit être après l\'heure de début');return;}
    var c=course(d.course);
    if(!c&&!d.title.trim()){toast('Donne un titre à cet événement libre');return;}
    var base={sem:d.sem||SEM().id,title:c?'':d.title.trim(),course:d.course||'',date:d.date,start:d.start,dur:d.end-d.start,
      groups:d.groups.slice(),teachers:d.teachers.slice(),room:d.room,note:d.note.trim()};
    var made=0;
    if(isNew){
      if(c&&remaining(c)<=0){
        toast('Les '+c.sessions+' séances de « '+c.name+' » sont déjà toutes placées. Augmente leur nombre dans Configuration > Cours.');
        return;
      }
      var useWeeks=d.weeksTxt.trim()!=='';
      var dates=[d.date];
      if(useWeeks){
        var wk=weekDates(d.weeksTxt,d.sem,d.date);
        if(wk.errors.length){toast(wk.errors[0]);return;}
        dates=wk.dates;
        if(!dates.length){toast('Aucune des semaines indiquées ne donne une date dans le semestre');return;}
      }
      if(c&&dates.length>remaining(c)){
        toast(dates.length+' semaines choisies, mais il ne reste que '+remaining(c)+' séance(s) pour « '+c.name+' ».');
        return;
      }
      dates.forEach(function(dt){
        S.slots.push(Object.assign({id:uid()},base,{date:dt}));made++;
      });
    }else{
      var old=S.slots.filter(function(x){return x.id===slot.id;})[0];
      if(!old){closeModal();return;}
      if(c&&old.course!==d.course&&remaining(c)<=0){
        toast('Les séances de « '+c.name+' » sont déjà toutes placées.');
        return;
      }
      Object.assign(old,base);
    }
    save();closeModal();renderAll();
    if(made>1)toast(made+' séances créées');
  }
  function doDup(){
    var c=course(slot.course);
    if(c&&remaining(c)<=0){toast('Les séances de « '+c.name+' » sont déjà toutes placées.');return;}
    var copy=JSON.parse(JSON.stringify(slot));
    copy.id=uid();copy.date=addDays(copy.date,7);
    S.slots.push(copy);save();closeModal();renderAll();
    toast('Dupliqué à la semaine suivante');
  }
  function doDel(){
    confirmBox('Supprimer la séance « '+titleOf(slot)+' » du '+shortDate(slot.date)+' ? Elle sera de nouveau comptée comme à placer.',function(){
      S.slots=S.slots.filter(function(x){return x.id!==slot.id;});
      save();renderAll();toast('Séance supprimée');
    },'Supprimer');
  }

  var actions=h('div',{class:'actions'});
  if(!isNew){
    actions.appendChild(h('button',{class:'danger',onclick:doDel},'Supprimer'));
    actions.appendChild(h('button',{onclick:doDup},'Dupliquer (+1 semaine)'));
  }
  actions.appendChild(h('span',{class:'sp'}));
  actions.appendChild(h('button',{onclick:closeModal},'Annuler'));
  actions.appendChild(h('button',{class:'primary',onclick:doSave},'Enregistrer'));

  var modal=h('div',{class:'modal'},
    h('h2',{},isNew?'Nouvelle séance':'Modifier la séance'),
    h('div',{class:'f'},h('label',{},'Cours'),courseSel,info),
    titleRow,
    h('div',{class:'row2'},
      h('div',{class:'f'},h('label',{},'Date'),date),
      h('div',{class:'f'},h('label',{},'Début'),st),
      h('div',{class:'f'},h('label',{},'Fin'),en)),
    weeksRow,
    h('div',{class:'f'},h('div',{class:'lb'},'Groupes'),chipsBox('groups',d.groups,refresh)),
    h('div',{class:'f'},h('div',{class:'lb'},'Enseignants / surveillants'),chipsBox('teachers',d.teachers,refresh)),
    h('div',{class:'f'},h('label',{},'Salle / amphi'),roomSelect(d.room,function(v){d.room=v;refresh();})),
    h('div',{class:'f'},h('label',{},'Note'),note),
    warn,actions);
  openModal(modal);
  refresh();
  if(!d.course)title.focus();
}

/* ---------- Configuration ---------- */
function removeRes(kind,id,tab){
  S[kind]=S[kind].filter(function(x){return x.id!==id;});
  S.courses.forEach(function(c){
    if(kind==='groups')c.groups=c.groups.filter(function(x){return x!==id;});
    if(kind==='teachers')c.teachers=c.teachers.filter(function(x){return x!==id;});
    if(kind==='rooms'&&c.room===id)c.room='';
    if(kind==='languages'&&c.lang===id)c.lang='';
  });
  S.slots.forEach(function(s){
    if(kind==='groups')s.groups=s.groups.filter(function(x){return x!==id;});
    if(kind==='teachers')s.teachers=s.teachers.filter(function(x){return x!==id;});
    if(kind==='rooms'&&s.room===id)s.room='';
  });
  save();renderAll();openConfig(tab);
  toast('Supprimé (retiré aussi des cours et des séances)');
}

function hoursSelect(value,from,to,onChange){
  var sel=h('select',{}),i;
  for(i=from;i<=to;i++)sel.appendChild(h('option',{value:String(i)},pad(i)+'h'));
  sel.value=String(value);
  sel.addEventListener('change',function(){onChange(+sel.value);});
  return sel;
}

function semesterTab(){
  var v=S.view;
  var box=h('div',{},h('p',{class:'hint'},'Un emploi du temps par semestre. Renomme les semestres et règle leurs dates de début et de fin. Les groupes, enseignants, salles et langues sont communs à tous les semestres ; les cours et les séances sont propres à chaque semestre.'));
  S.semesters.forEach(function(m){
    var name=h('input',{type:'text',value:m.name,'aria-label':'Nom'});
    name.style.maxWidth='90px';
    var st=h('input',{type:'date',value:m.start,'aria-label':'Début'});
    var en=h('input',{type:'date',value:m.end,'aria-label':'Fin'});
    name.addEventListener('change',function(){m.name=name.value.trim()||m.name;name.value=m.name;save();renderAll();});
    function apply(){
      if(!validDate(st.value)||!validDate(en.value)){toast('Dates invalides');openConfig('semester');return;}
      if(en.value<st.value){toast('La date de fin doit être après la date de début');openConfig('semester');return;}
      m.start=st.value;m.end=en.value;
      fixWeek(S);save();renderAll();
      var out=S.slots.filter(function(x){return x.sem===m.id&&!inSemester(x.date,m.id);}).length;
      if(out)toast(out+' séance(s) de '+m.name+' sont maintenant hors des dates du semestre (voir Contrôle).');
    }
    st.addEventListener('change',apply);en.addEventListener('change',apply);
    var cur=h('button',{class:m.id===S.current?'primary':'',onclick:function(){switchSemester(m.id);openConfig('semester');}},m.id===S.current?'Affiché':'Afficher');
    var del=h('button',{class:'x',title:'Supprimer ce semestre',onclick:function(){
      if(S.semesters.length<=1){toast('Il faut garder au moins un semestre');return;}
      var nc=S.courses.filter(function(c){return c.sem===m.id;}).length,ns=S.slots.filter(function(x){return x.sem===m.id;}).length;
      confirmBox('Supprimer le semestre '+m.name+' avec ses '+nc+' cours et ses '+ns+' séances ?',function(){
        S.semesters=S.semesters.filter(function(x){return x.id!==m.id;});
        S.courses=S.courses.filter(function(c){return c.sem!==m.id;});
        S.slots=S.slots.filter(function(x){return x.sem!==m.id;});
        if(S.current===m.id){S.current=S.semesters[0].id;armed=null;}
        fixWeek(S);save();renderAll();openConfig('semester');
      },'Supprimer',function(){openConfig('semester');});
    }},'✕');
    box.appendChild(h('div',{class:'rrow'},name,st,en,cur,del));
  });
  var nin=h('input',{type:'text',placeholder:'Nouveau semestre (ex. S11)'});
  var add=function(){
    var val=nin.value.trim();if(!val)return;
    var cs=SEM();
    S.semesters.push({id:uid(),name:val,start:cs.start,end:cs.end});
    save();renderAll();openConfig('semester');
  };
  nin.addEventListener('keydown',function(e){if(e.key==='Enter')add();});
  box.appendChild(h('div',{class:'rrow add'},nin,h('button',{onclick:add},'+ Ajouter')));

  var days=h('select',{},h('option',{value:'5'},'Lundi au vendredi'),h('option',{value:'6'},'Lundi au samedi'));
  days.value=String(v.days);
  days.addEventListener('change',function(){v.days=+days.value;save();renderAll();});
  var sh=hoursSelect(v.startH,0,22,function(x){v.startH=x;if(v.endH<=x)v.endH=Math.min(24,x+1);save();renderAll();openConfig('semester');});
  var eh=hoursSelect(v.endH,1,24,function(x){v.endH=x;if(v.startH>=x)v.startH=Math.max(0,x-1);save();renderAll();openConfig('semester');});
  box.appendChild(h('div',{class:'row3',style:'margin-top:16px'},
    h('div',{class:'f'},h('label',{},'Jours affichés'),days),
    h('div',{class:'f'},h('label',{},'Plage horaire de la grille'),h('div',{class:'rrow'},sh,'à',eh))));
  return box;
}

function resTab(kind,label,field,ph){
  var box=h('div',{},h('p',{class:'hint'},label));
  S[kind].forEach(function(it){
    var row=h('div',{class:'rrow'});
    var name=h('input',{type:'text',value:it.name,'aria-label':'Nom'});
    name.addEventListener('change',function(){it.name=name.value.trim()||it.name;name.value=it.name;save();renderAll();});
    row.appendChild(name);
    if(field){
      var num=h('input',{type:'number',min:'0',value:it[field]?String(it[field]):'',placeholder:ph,class:'num','aria-label':ph});
      num.addEventListener('change',function(){it[field]=Math.max(0,parseInt(num.value,10)||0);save();renderAll();});
      row.appendChild(num);
    }
    row.appendChild(h('button',{class:'x',title:'Supprimer',onclick:function(){removeRes(kind,it.id,kind);}},'✕'));
    box.appendChild(row);
  });
  var nin=h('input',{type:'text',placeholder:'Ajouter...'});
  var add=function(){
    var val=nin.value.trim();if(!val)return;
    var o={id:uid(),name:val};if(field)o[field]=0;
    S[kind].push(o);save();renderAll();openConfig(kind);
  };
  nin.addEventListener('keydown',function(e){if(e.key==='Enter')add();});
  box.appendChild(h('div',{class:'rrow add'},nin,h('button',{onclick:add},'+ Ajouter')));
  return box;
}

function languagesTab(){
  var box=h('div',{},h('p',{class:'hint'},'Chaque langue a sa couleur, utilisée pour les cours dans la grille. Tu peux renommer, recolorer, ajouter ou supprimer des langues.'));
  S.languages.forEach(function(l){
    var row=h('div',{class:'rrow'});
    var name=h('input',{type:'text',value:l.name,'aria-label':'Nom'});
    name.addEventListener('change',function(){l.name=name.value.trim()||l.name;name.value=l.name;save();renderAll();});
    var col=h('select',{'aria-label':'Couleur'});
    Object.keys(COLORS).forEach(function(k){col.appendChild(h('option',{value:k},COLORS[k][2]));});
    col.value=l.color;
    col.style.background=COLORS[l.color][0];
    col.addEventListener('change',function(){l.color=col.value;col.style.background=COLORS[l.color][0];save();renderAll();});
    row.appendChild(name);row.appendChild(col);
    row.appendChild(h('button',{class:'x',title:'Supprimer',onclick:function(){removeRes('languages',l.id,'languages');}},'✕'));
    box.appendChild(row);
  });
  var nin=h('input',{type:'text',placeholder:'Nouvelle langue (ex. Italien)'});
  var add=function(){
    var val=nin.value.trim();if(!val)return;
    var used=S.languages.map(function(x){return x.color;});
    var free=Object.keys(COLORS).filter(function(k){return used.indexOf(k)<0;})[0]||'gris';
    S.languages.push({id:uid(),name:val,color:free});
    save();renderAll();openConfig('languages');
  };
  nin.addEventListener('keydown',function(e){if(e.key==='Enter')add();});
  box.appendChild(h('div',{class:'rrow add'},nin,h('button',{onclick:add},'+ Ajouter')));
  return box;
}

function coursesTab(){
  var box=h('div',{},h('p',{class:'hint'},'Semestre '+SEM().name+'. Un cours = une matière pour un ou plusieurs groupes, avec un nombre de séances à placer. Le compteur descend à chaque séance placée dans la grille.'));
  if(!curCourses().length)box.appendChild(h('p',{},'Aucun cours pour ce semestre.'));
  curCourses().forEach(function(c){
    var l=lang(c.lang),col=COLORS[l?l.color:'gris']||COLORS.gris;
    var meta=(l?l.name:'Sans langue')+' · '+(c.groups.map(function(g){return nm('groups',g);}).join(', ')||'aucun groupe')+' · '+c.dur+' min · '+placed(c.id)+' placée(s)';
    var nses=h('input',{type:'number',min:'1',max:'200',value:String(c.sessions),'aria-label':'Nombre de séances',title:'Nombre de séances à placer'});
    nses.style.width='68px';
    nses.addEventListener('change',function(){
      var v2=parseInt(nses.value,10);
      if(!(v2>=1)){nses.value=String(c.sessions);toast('Il faut au moins 1 séance');return;}
      c.sessions=v2;save();renderAll();openConfig('courses');
      if(placed(c.id)>v2)toast('Attention : '+placed(c.id)+' séances déjà placées pour '+v2+' prévues.');
    });
    box.appendChild(h('div',{class:'crow',style:'border-left-color:'+col[1]},
      h('div',{class:'grow'},h('b',{},c.name),h('div',{class:'m'},meta)),
      h('label',{class:'m'},nses,' séances'),
      h('button',{onclick:function(){openCourseEditor(c);}},'Modifier'),
      h('button',{class:'danger',onclick:function(){
        var n=placed(c.id);
        confirmBox('Supprimer le cours « '+c.name+' »'+(n?' et ses '+n+' séance(s) déjà placée(s)':'')+' ?',function(){
          S.slots=S.slots.filter(function(s){return s.course!==c.id;});
          S.courses=S.courses.filter(function(x){return x.id!==c.id;});
          save();renderAll();openConfig('courses');
        },'Supprimer',function(){openConfig('courses');});
      }},'Supprimer')));
  });
  box.appendChild(h('div',{style:'margin-top:10px'},h('button',{class:'primary',onclick:function(){openCourseEditor(null);}},'+ Nouveau cours')));
  return box;
}

function openConfig(tab){
  tab=tab||'semester';
  var tabs=[['semester','Semestres'],['languages','Langues'],['groups','Groupes'],['teachers','Enseignants'],['rooms','Salles'],['courses','Cours']];
  var nav=h('div',{class:'tabs'});
  tabs.forEach(function(t){
    nav.appendChild(h('button',{class:t[0]===tab?'on':'',onclick:function(){openConfig(t[0]);}},t[1]));
  });
  var content;
  if(tab==='semester')content=semesterTab();
  else if(tab==='languages')content=languagesTab();
  else if(tab==='groups')content=resTab('groups','Groupes d\'étudiants. L\'effectif sert à vérifier la capacité des salles.','size','Effectif');
  else if(tab==='teachers')content=resTab('teachers','Enseignants et surveillants.','', '');
  else if(tab==='rooms')content=resTab('rooms','Salles et amphis. La capacité déclenche une alerte si les groupes placés sont trop nombreux.','cap','Capacité');
  else content=coursesTab();
  openModal(h('div',{class:'modal wide'},
    h('h2',{},'Configuration'),nav,content,
    h('div',{class:'actions'},h('span',{class:'sp'}),h('button',{class:'primary',onclick:closeModal},'Terminer'))));
}

function openCourseEditor(c){
  var isNew=!c;
  var d=c?JSON.parse(JSON.stringify(c)):{id:null,name:'',lang:S.languages[0]?S.languages[0].id:'',groups:[],teachers:[],room:'',sessions:0,dur:120,sem:SEM().id};

  var name=h('input',{type:'text',value:d.name,placeholder:'Ex. Allemand LV2 TC4-2'});
  name.addEventListener('input',function(){d.name=name.value;});
  var lg=h('select',{},h('option',{value:''},'Aucune'));
  S.languages.forEach(function(l){lg.appendChild(h('option',{value:l.id},l.name));});
  lg.value=d.lang||'';
  lg.addEventListener('change',function(){d.lang=lg.value;});
  var ses=h('input',{type:'number',min:'1',max:'200',value:d.sessions?String(d.sessions):'',placeholder:'ex. 10'});
  ses.addEventListener('input',function(){d.sessions=parseInt(ses.value,10)||0;});
  var dur=h('input',{type:'number',min:'15',step:'15',value:String(d.dur)});
  dur.addEventListener('input',function(){d.dur=parseInt(dur.value,10)||0;});

  function doSave(){
    if(!d.name.trim()){toast('Donne un nom au cours');return;}
    if(!(d.sessions>=1)){toast('Indique le nombre de séances de ce cours (au moins 1)');return;}
    if(!(d.dur>=15)){toast('Indique la durée d\'une séance (au moins 15 minutes)');return;}
    var rec={id:d.id||uid(),sem:d.sem||SEM().id,name:d.name.trim(),lang:d.lang,groups:d.groups.slice(),teachers:d.teachers.slice(),
      room:d.room,sessions:d.sessions,dur:d.dur};
    if(isNew){S.courses.push(rec);}
    else{
      var i=S.courses.findIndex(function(x){return x.id===rec.id;});
      if(i>=0)S.courses[i]=rec;
      var n=placed(rec.id);
      if(n>rec.sessions)toast('Attention : '+n+' séances sont déjà placées pour '+rec.sessions+' prévues.');
    }
    save();renderAll();openConfig('courses');
  }

  openModal(h('div',{class:'modal'},
    h('h2',{},isNew?'Nouveau cours':'Modifier le cours'),
    h('div',{class:'f'},h('label',{},'Nom du cours'),name),
    h('div',{class:'f'},h('label',{},'Langue'),lg),
    h('div',{class:'row3'},
      h('div',{class:'f'},h('label',{},'Nombre de séances à placer (propre à ce cours)'),ses),
      h('div',{class:'f'},h('label',{},'Durée d\'une séance (minutes)'),dur)),
    h('div',{class:'f'},h('div',{class:'lb'},'Groupes'),chipsBox('groups',d.groups)),
    h('div',{class:'f'},h('div',{class:'lb'},'Enseignants'),chipsBox('teachers',d.teachers)),
    h('div',{class:'f'},h('label',{},'Salle par défaut'),roomSelect(d.room,function(v){d.room=v;})),
    h('div',{class:'actions'},
      h('button',{onclick:function(){openConfig('courses');}},'Annuler'),
      h('button',{class:'primary',onclick:doSave},'Enregistrer'))));
  name.focus();
}

/* ---------- Export / Import ---------- */
function csvLine(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(';');}

function toCSVSlots(){
  var rows=[['Semestre','Date','Jour','Début','Fin','Cours','Langue','Groupes','Enseignants','Salle','Note']];
  S.slots.slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:a.start-b.start;}).forEach(function(s){
    var c=course(s.course),l=c?lang(c.lang):null;
    rows.push([semName(s.sem),s.date,DAYS[wd(s.date)]||'Dimanche',fmt(s.start),fmt(s.start+s.dur),titleOf(s),l?l.name:'',
      s.groups.map(function(g){return nm('groups',g);}).join(' + '),
      s.teachers.map(function(t){return nm('teachers',t);}).join(' + '),
      s.room?nm('rooms',s.room):'',s.note]);
  });
  return rows.map(csvLine).join('\n');
}

function toCSVRecap(){
  var rows=[['Semestre','Cours','Langue','Groupes','Enseignants','Séances prévues','Séances placées','Séances restantes']];
  S.courses.forEach(function(c){
    var l=lang(c.lang),n=placed(c.id);
    rows.push([semName(c.sem),c.name,l?l.name:'',c.groups.map(function(g){return nm('groups',g);}).join(' + '),
      c.teachers.map(function(t){return nm('teachers',t);}).join(' + '),c.sessions,n,c.sessions-n]);
  });
  return rows.map(csvLine).join('\n');
}

function openExport(){
  var ta=h('textarea',{spellcheck:'false'});
  ta.value=JSON.stringify(S,null,2);
  function doImport(){
    var obj;
    try{obj=normalize(JSON.parse(ta.value));}catch(e){obj=null;}
    if(!obj){toast('Contenu invalide : colle un export JSON de cette application');return;}
    confirmBox('Remplacer toute la configuration et tous les créneaux actuels par le contenu du champ ?',function(){
      S=obj;armed=null;save();renderAll();toast('Import réussi');
    },'Remplacer');
  }
  function doDownload(){
    try{
      var blob=new Blob([ta.value],{type:'application/json'});
      var a=h('a',{href:URL.createObjectURL(blob),download:'emplois-du-temps.json'});
      document.body.appendChild(a);a.click();a.remove();
      toast('Si rien ne se télécharge dans cet aperçu, utilise « Copier le JSON ».');
    }catch(e){toast('Téléchargement impossible : utilise « Copier le JSON ».');}
  }
  openModal(h('div',{class:'modal wide'},
    h('h2',{},'Export / Import'),
    h('p',{class:'hint'},'Copie ce JSON pour sauvegarder ou transférer tout ton semestre (configuration, cours et séances). Pour importer, colle un JSON dans le champ puis clique sur « Importer ».'),
    ta,
    h('div',{class:'actions'},
      h('button',{onclick:function(){copyText(ta.value);}},'Copier le JSON'),
      h('button',{onclick:function(){copyText(toCSVSlots());}},'CSV des séances'),
      h('button',{onclick:function(){copyText(toCSVRecap());}},'CSV récap des cours'),
      h('button',{onclick:doDownload},'Télécharger .json')),
    h('div',{class:'actions'},
      h('span',{class:'sp'}),
      h('button',{onclick:closeModal},'Fermer'),
      h('button',{class:'primary',onclick:doImport},'Importer'))));
}

/* ---------- Tutoriel guidé ---------- */
var TOUR_KEY='edt-tour-v1';
var TOUR=[
  {sel:null,t:'Bienvenue Chef Bichette',p:'Cette appli sert à construire les emplois du temps d\'un semestre : tu définis tes cours avec leur nombre de séances, puis tu les places semaine par semaine. Tu pars d\'un emploi du temps vierge. Un tour rapide ?'},
  {sel:'#sem',t:'1. Choisis le semestre',p:'De S5 à S10. Chaque semestre a ses propres cours et séances, et ses dates de début et de fin.'},
  {sel:'.top .wk',t:'2. Navigue par semaine',p:'Les flèches changent de semaine. Le numéro affiché est le numéro de semaine ISO (48, 49, 53...), comme dans ton calendrier. Tu peux aussi sauter à une date précise.'},
  {sel:'#cfg',t:'3. Commence par la configuration',p:'Tu y règles les semestres (dates), les langues (Anglais, Allemand, Espagnol, FLE, Autre, avec leurs couleurs), les groupes (effectifs), les enseignants, les salles (capacités) et les cours. Pour chaque cours, tu indiques son nombre de séances : il est propre à chaque cours.'},
  {sel:'#courses',t:'4. Les séances à placer',p:'Chaque cours affiche un compteur, par exemple 5/12 : séances placées sur séances prévues. Clique sur un cours pour passer en mode placement, ou fais-le glisser vers la grille.'},
  {sel:'#tt',t:'5. Place les séances',p:'En mode placement, clique dans la grille : le jour et l\'heure sont ceux de ton clic (2 h par défaut). Dans la barre jaune, tape les semaines, par exemple 48-50 53, pour créer d\'un coup toutes les séances d\'un cours le lundi à 8 h. Le compteur descend à chaque séance et l\'appli refuse d\'en placer plus que prévu.'},
  {sel:'#tt',t:'6. Ajuste une séance',p:'Clique sur une séance pour la modifier, la dupliquer ou la supprimer. Glisse-la pour changer le jour ou l\'heure, tire sa base pour changer la durée. Une séance supprimée repart dans les séances à placer.'},
  {sel:'#conf',t:'7. Le contrôle',p:'L\'appli vérifie en continu : groupe, enseignant ou salle en double, salle trop petite, séance hors semestre, trop de séances pour un cours. Les séances concernées sont cerclées de rouge ; clique sur une ligne pour la corriger.'},
  {sel:'#mode',t:'8. Filtre la vue',p:'Affiche tout, ou seulement un groupe, un enseignant, une salle ou une langue : pratique pour vérifier ou imprimer un emploi du temps individuel.'},
  {sel:'#exp',t:'9. Sauvegarde',p:'Tout s\'enregistre automatiquement sur le serveur : le voyant « Enregistré » en haut le confirme, sans aucun redéploiement. La vue utilisateur (adresse sans /admin) est en lecture seule et se met à jour toute seule pour la projection. Export / Import permet de garder une copie JSON et de récupérer des CSV pour Excel.'},
  {sel:null,t:'C\'est parti',p:'Tu peux relancer ce tutoriel à tout moment avec le bouton « Tutoriel ». Commence par Configuration pour saisir tes cours et leur nombre de séances.'}
];
var tourIdx=-1;

function tourSeen(){try{return localStorage.getItem(TOUR_KEY)==='1';}catch(e){return false;}}
function tourMark(){try{localStorage.setItem(TOUR_KEY,'1');}catch(e){}}

function endTour(){
  tourIdx=-1;
  var ov=$('.tour-ov');if(ov)ov.remove();
  window.removeEventListener('resize',tourLayout);
  document.removeEventListener('keydown',tourKey);
  tourMark();
}
function tourKey(e){
  if(e.key==='Escape')endTour();
  else if(e.key==='ArrowRight')tourGo(1);
  else if(e.key==='ArrowLeft')tourGo(-1);
}
function tourGo(dir){
  var n=tourIdx+dir;
  if(n<0)return;
  if(n>=TOUR.length){endTour();return;}
  tourIdx=n;showStep();
}
function startTour(){
  closeModal();
  if(armed){armed=null;renderArm();renderCourses();}
  if($('.tour-ov'))endTour();
  tourIdx=0;
  var ov=h('div',{class:'tour-ov center'},h('div',{class:'tour-hl'}),h('div',{class:'tour-card',role:'dialog','aria-live':'polite'}));
  document.body.appendChild(ov);
  window.addEventListener('resize',tourLayout);
  document.addEventListener('keydown',tourKey);
  showStep();
}
function showStep(){
  var st=TOUR[tourIdx],card=$('.tour-card'),last=tourIdx===TOUR.length-1;
  card.replaceChildren(
    h('h3',{},st.t),
    h('p',{},st.p),
    h('div',{class:'nav'},
      h('span',{class:'dots'},(tourIdx+1)+' / '+TOUR.length),
      h('span',{class:'sp'}),
      last?null:h('button',{onclick:endTour},'Passer'),
      tourIdx>0?h('button',{onclick:function(){tourGo(-1);}},'Précédent'):null,
      h('button',{class:'primary',onclick:function(){tourGo(1);}},last?'Terminer':(tourIdx===0?'Commencer':'Suivant'))));
  var el=st.sel?document.querySelector(st.sel):null;
  if(el&&el.scrollIntoView){
    try{
      el.scrollIntoView({block:'center',inline:'nearest'});
      var topbar=$('.top'),hb=topbar?topbar.getBoundingClientRect().bottom:0,rt=el.getBoundingClientRect().top;
      if(el!==topbar&&!topbar.contains(el)&&rt<hb+10)window.scrollBy(0,rt-hb-10);
    }catch(e){}
  }
  tourLayout();
  setTimeout(tourLayout,120);
}
function tourLayout(){
  if(tourIdx<0)return;
  var ov=$('.tour-ov'),hl=$('.tour-hl'),card=$('.tour-card');
  if(!ov||!hl||!card)return;
  var st=TOUR[tourIdx],el=st.sel?document.querySelector(st.sel):null,r=el?el.getBoundingClientRect():null;
  var vw=window.innerWidth,vh=window.innerHeight,cw=card.offsetWidth,ch=card.offsetHeight;
  if(!r||r.width<=0||r.height<=0){
    ov.classList.add('center');hl.style.display='none';
    card.style.left=Math.max(8,(vw-cw)/2)+'px';
    card.style.top=Math.max(8,(vh-ch)/2)+'px';
    return;
  }
  ov.classList.remove('center');hl.style.display='block';
  var pad=6;
  hl.style.left=(r.left-pad)+'px';hl.style.top=(r.top-pad)+'px';
  hl.style.width=(r.width+2*pad)+'px';hl.style.height=(r.height+2*pad)+'px';
  var left=clamp(r.left,8,Math.max(8,vw-cw-8)),top;
  if(r.bottom+pad+10+ch<=vh-8){top=r.bottom+pad+10;}
  else if(r.top-pad-10-ch>=8){top=r.top-pad-10-ch;}
  else if(r.right+pad+10+cw<=vw-8){left=r.right+pad+10;top=clamp(r.top,8,Math.max(8,vh-ch-8));}
  else if(r.left-pad-10-cw>=8){left=r.left-pad-10-cw;top=clamp(r.top,8,Math.max(8,vh-ch-8));}
  else{top=Math.max(8,vh-ch-12);left=Math.max(8,(vw-cw)/2);}
  card.style.left=left+'px';card.style.top=top+'px';
}

/* ---------- Démarrage ---------- */
function renderAll(){
  fillSemSelect();
  fillItemSelect();
  if(CAN_EDIT){renderArm();renderCourses();}
  renderGrid();
}

function startApp(){
  fetchRemote().then(function(j){
    applyRemote(j,false);
    started=true;
    renderAll();
    if(CAN_EDIT){
      setStatus('ok','Enregistré');
      if(!tourSeen())setTimeout(startTour,500);
    }else{
      setInterval(function(){
        fetchRemote().then(function(r){if(r.rev!==rev){applyRemote(r,true);renderAll();}}).catch(function(){});
      },120000);
    }
  },function(){showFatal('Impossible de charger l\'emploi du temps. Vérifie ta connexion et recharge la page.');});
}

function boot(){
  initToolbar();
  $('#fs').addEventListener('click',function(){
    try{
      if(document.fullscreenElement)document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }catch(e){}
  });
  $('#logout').addEventListener('click',function(){setToken('');location.reload();});
  if(!CAN_EDIT){startApp();return;}
  if(!getToken()){showLogin();return;}
  fetch(API+'?action=ping',{headers:{Authorization:'Bearer '+getToken()}}).then(function(r){
    if(r.status===200)startApp();else{setToken('');showLogin();}
  },function(){showLogin('Serveur injoignable.');});
}

window.addEventListener('beforeunload',function(e){
  if(CAN_EDIT&&started&&dataFp()!==lastFp){e.preventDefault();e.returnValue='';}
});

boot();
})();
