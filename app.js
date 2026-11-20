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
/* ---------- Jours feries (calcules) et vacances scolaires zone B (Lille) ---------- */
var VAC=[],vacInfo={ok:false,at:0},FERC={};
function easterOf(y){
  var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  var hh=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-hh-k)%7,m=Math.floor((a+11*hh+22*l)/451);
  var mo=Math.floor((hh+l-7*m+114)/31),da=((hh+l-7*m+114)%31)+1;
  return y+'-'+pad(mo)+'-'+pad(da);
}
function feriesOfYear(y){
  if(FERC[y])return FERC[y];
  var e=easterOf(y),o={};
  o[y+'-01-01']='Jour de l\'An';o[addDays(e,1)]='Lundi de Pâques';o[y+'-05-01']='Fête du Travail';o[y+'-05-08']='Victoire 1945';
  o[addDays(e,39)]='Ascension';o[addDays(e,50)]='Lundi de Pentecôte';o[y+'-07-14']='Fête nationale';o[y+'-08-15']='Assomption';
  o[y+'-11-01']='Toussaint';o[y+'-11-11']='Armistice 1918';o[y+'-12-25']='Noël';
  FERC[y]=o;return o;
}
// Renvoie le nom du jour ferie (seulement du lundi au vendredi), sinon ''
function ferie(date){return wd(date)<5?(feriesOfYear(+date.slice(0,4))[date]||''):'';}
// Le depart en vacances a lieu apres la classe du jour de debut ; la reprise est le matin du jour de fin
function vacation(date){
  if(wd(date)>=5)return '';
  for(var i=0;i<VAC.length;i++)if(date>VAC[i].start&&date<VAC[i].end)return VAC[i].name;
  return '';
}
function dayFlag(date){var f=ferie(date);if(f)return {kind:'ferie',name:f};var v=vacation(date);return v?{kind:'vac',name:v}:null;}
function weekFlag(monday){
  var nv=0,vn='',fl=[],i,d;
  for(i=0;i<5;i++){d=addDays(monday,i);var v=vacation(d),f=ferie(d);if(v){nv++;vn=v;}if(f)fl.push(f+' ('+shortDate(d)+')');}
  if(nv===5)return {cls:' vac',tip:vn+' (zone B)'};
  if(nv||fl.length)return {cls:' hol',tip:[nv?nv+' jour(s) de '+vn:'',fl.length?'Férié : '+fl.join(', '):''].filter(Boolean).join(' · ')};
  return {cls:'',tip:''};
}
function loadVacances(cb){
  var c=null;
  try{c=JSON.parse(localStorage.getItem('edtVac')||'null');}catch(e){}
  if(c&&Array.isArray(c.list)){VAC=c.list;vacInfo={ok:true,at:c.at||0};}
  if(c&&c.at&&Date.now()-c.at<12*3600*1000){if(cb)cb();return;}
  fetch(API+'?action=vacances').then(function(r){return r.ok?r.json():Promise.reject(new Error('http'));}).then(function(j){
    if(j&&Array.isArray(j.list)&&j.list.length){
      VAC=j.list;vacInfo={ok:true,at:Date.now()};
      try{localStorage.setItem('edtVac',JSON.stringify({at:vacInfo.at,list:VAC}));}catch(e){}
      if(cb)cb();
    }
  }).catch(function(){});
}
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

function defaultGroupNames(){
  var out=[];
  ['TC3','TC4','TC2A3','TC2A4'].forEach(function(y){[1,2,3,4].forEach(function(i){out.push(y+' Gr'+i);});});
  out.push('M1 GC','M1 GM');
  return out;
}
// Ajoute les groupes habituels qui n'existent pas encore (par nom) ; renvoie le nombre ajouté
function addDefaultGroups(){
  var have={},n=0;
  S.groups.forEach(function(g){have[g.name.toLowerCase()]=true;});
  defaultGroupNames().forEach(function(nm0){
    if(have[nm0.toLowerCase()])return;
    S.groups.push({id:uid(),name:nm0,size:0});n++;
  });
  return n;
}
function defaultTeacherNames(){
  return ['M Vasseur','C Thepenier','M Duchateau','JY Beaury','M Chayani','R Eaton','F Debosscher','S Goncalves','P Rojo','E Labrador','J Marfil','M Ortega','C Jaramillo','Y Zaknoune','N Andouri','M Ramirez','M Fonseca','A Pazo','M Vazquez','G San Juan','C Gusinde','B Loeber','S Furste','M Boussadia','B Deerberg','S Mogge'];
}
function defaultRoomNames(){
  return ['Labo E403','Labo E405','Labo E410','Labo E402','Salle B303','Salle B305','Salle B307','Salle B008','Salle B010','Salle B306'];
}
// Ajoute les noms qui n'existent pas encore (par nom) ; renvoie le nombre ajouté
function addDefaultNames(kind,names,field){
  var have={},n=0;
  S[kind].forEach(function(x){have[x.name.toLowerCase()]=true;});
  names.forEach(function(nm0){
    if(have[nm0.toLowerCase()])return;
    var o={id:uid(),name:nm0};if(field)o[field]=0;
    S[kind].push(o);n++;
  });
  return n;
}
function addDefaultTeachers(){return addDefaultNames('teachers',defaultTeacherNames(),'');}
function addDefaultRooms(){return addDefaultNames('rooms',defaultRoomNames(),'cap');}
function emptyData(){
  return normalize({semesters:defaultSemesters(),languages:defaultLanguages(),groups:defaultGroupNames().map(function(n){return {id:uid(),name:n,size:0};}),teachers:defaultTeacherNames().map(function(n){return {id:uid(),name:n};}),rooms:defaultRoomNames().map(function(n){return {id:uid(),name:n,cap:0};}),courses:[],slots:[],view:defaultView(),seeded:true,seededRes:true});
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
  // rattachement : chaque groupe peut etre rattache a un autre groupe existant
  var rawAtt={};
  (Array.isArray(o.groups)?o.groups:[]).forEach(function(x){if(x&&typeof x==='object'&&x.id&&x.attach)rawAtt[x.id]=x.attach;});
  o.groups=res(o.groups,'size');
  o.groups.forEach(function(g){
    var a=rawAtt[g.id];
    if(a&&a!==g.id&&o.groups.some(function(x){return x.id===a;}))g.attach=a;
  });
  o.groups.forEach(function(g){if(g.attach){var t=o.groups.filter(function(x){return x.id===g.attach;})[0];if(t&&t.attach===g.id)delete g.attach;}});
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
      groups:arr(s.groups),teachers:arr(s.teachers),room:s.room||'',note:String(s.note||''),
      tpl:typeof s.tpl==='string'?s.tpl:'',tw:validDate(s.tw)?s.tw:'',edited:!!s.edited,lang:typeof s.lang==='string'?s.lang:''};
  });
  o.template=(Array.isArray(o.template)?o.template:[]).filter(function(t){return t&&typeof t==='object';}).map(function(t){
    return {id:t.id||uid(),sem:validSem(t.sem),course:t.course||'',lang:typeof t.lang==='string'?t.lang:'',year:typeof t.year==='string'?t.year:'',level:typeof t.level==='string'?t.level:'',groups:arr(t.groups),teachers:arr(t.teachers),room:t.room||'',
      day:clamp(parseInt(t.day,10)||0,0,5),start:clamp(parseInt(t.start,10)||0,0,23*60+45),dur:Math.max(15,parseInt(t.dur,10)||120),
      weeks:arr(t.weeks).filter(validDate)};
  });
  o.seeded=!!o.seeded;
  o.seededRes=!!o.seededRes;
  o.skips=(Array.isArray(o.skips)?o.skips:[]).filter(function(x){return x&&typeof x.tpl==='string'&&validDate(x.monday);}).map(function(x){return {tpl:x.tpl,monday:x.monday};});
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
  var ce=eff(cs,o),first=mondayOf(ce.start),last=mondayOf(ce.end),v=o.view;
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
  return JSON.stringify([o.semesters,o.current,o.languages,o.groups,o.teachers,o.rooms,o.courses,o.slots,o.template,o.skips,o.seeded,o.seededRes,o.view.days,o.view.startH,o.view.endH]);
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
function placedPlan(cid,exceptTpl){
  var n=S.slots.filter(function(x){return x.course===cid&&!x.tpl;}).length;
  S.template.forEach(function(t){if(t.course===cid&&t.id!==exceptTpl)n+=tplDesired(t).length;});
  return n;
}
function remaining(c){return c.sessions-placed(c.id);}
function titleOf(s){var c=course(s.course),l=(!c&&s.lang)?lang(s.lang):null;return c?c.name:(l?l.name:(s.title||'Sans titre'));}
function slotLang(s){var c=course(s.course);return c?lang(c.lang):(s.lang?lang(s.lang):null);}
function slotColor(s){var l=slotLang(s);return COLORS[l?l.color:'gris']||COLORS.gris;}
// Annee universitaire : de septembre a juillet. Les semaines se choisissent sur toute l'annee, quel que soit le semestre.
function yearBounds(o){
  var lo=null;
  (o||S).semesters.forEach(function(x){if(validDate(x.start)&&(!lo||x.start<lo))lo=x.start;});
  if(!lo)lo=todayStr();
  var y=+lo.slice(0,4),mo=+lo.slice(5,7);
  if(mo<8)y--;
  return {start:y+'-09-01',end:(y+1)+'-07-31'};
}
function eff(m,o){
  var yb=yearBounds(o);
  return {start:m.start<yb.start?m.start:yb.start,end:m.end>yb.end?m.end:yb.end};
}
function inSemester(date,semId){var m=semId?semOf(semId):SEM();if(!m)return false;var e=eff(m);return date>=e.start&&date<=e.end;}
function semName(id){var m=semOf(id);return m?m.name:'?';}

/* Semaines du semestre (numéros ISO) */
function semWeeks(semId){
  var m=eff(semOf(semId)||SEM()),out=[],cur=mondayOf(m.start),last=mondayOf(m.end);
  while(cur<=last){out.push({num:isoWeek(cur),monday:cur});cur=addDays(cur,7);}
  return out;
}

// Lit une saisie du type "48 49 50 53" ou "48-50, 53" (numéros de semaine ISO)
function parseWeeks(txt,semId){
  var weeks=semWeeks(semId),errors=[],picked={};
  String(txt||'').replace(/\s*(?:à|a|au|to)\s*/gi,'-').replace(/\s*-\s*/g,'-').replace(/\bs(?=\d)/gi,'').split(/[\s,;]+/).filter(Boolean).forEach(function(tok){
    var m=/^(\d{1,2})-(\d{1,2})$/.exec(tok),n=/^\d{1,2}$/.test(tok);
    if(n){
      var num=+tok,found=weeks.filter(function(w){return w.num===num;})[0];
      if(found)picked[found.monday]=true;
      else errors.push('La semaine '+num+' n\'est pas dans l\'année universitaire');
    }else if(m){
      var a=+m[1],b=+m[2],hit=0;
      weeks.forEach(function(w){
        var ok=a<=b?(w.num>=a&&w.num<=b):(w.num>=a||w.num<=b);
        if(ok){picked[w.monday]=true;hit++;}
      });
      if(!hit)errors.push('Aucune semaine de '+tok+' dans l\'année universitaire');
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

function groupOf(id){return S.groups.filter(function(x){return x.id===id;})[0];}
// Deux groupes sont lies s'ils sont identiques ou si l'un est rattache a l'autre
function linkedGroups(a,b){
  if(a===b)return true;
  var ga=groupOf(a),gb=groupOf(b);
  return !!((ga&&ga.attach===b)||(gb&&gb.attach===a));
}
function shared(a,b){
  var out=[];
  a.groups.forEach(function(g){
    var hit=b.groups.filter(function(x){return linkedGroups(g,x);})[0];
    if(!hit)return;
    out.push(hit===g?'groupe '+nm('groups',g):'groupes rattachés '+nm('groups',g)+' et '+nm('groups',hit));
  });
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
    var fg=dayFlag(a.date);
    if(fg){out.push({kind:fg.kind==='ferie'?'ferie':'vacances',a:a,b:null,
      text:'['+semName(a.sem)+'] '+longDate(a.date)+' '+shortDate(a.date)+' : "'+titleOf(a)+'" tombe '+(fg.kind==='ferie'?'un jour férié ('+fg.name+')':'pendant les vacances scolaires ('+fg.name+')')});}
    if(!inSemester(a.date,a.sem)){out.push({kind:'hors',a:a,b:null,
      text:'['+semName(a.sem)+'] '+longDate(a.date)+' '+shortDate(a.date)+' : "'+titleOf(a)+'" est en dehors de l\'année universitaire'});}
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
  if(validDate(d.date)){var fg=dayFlag(d.date);if(fg)msgs.push(fg.kind==='ferie'?'Jour férié : '+fg.name:'Vacances scolaires (zone B) : '+fg.name);}
  if(validDate(d.date)&&!inSemester(d.date,d.sem)){var ms=semOf(d.sem)||SEM();msgs.push('Date en dehors de l\'année universitaire ('+fullDate(eff(ms).start)+' au '+fullDate(eff(ms).end)+')');}
  return msgs;
}

/* ---------- Vue ---------- */
function passFilter(s){
  var v=S.view;
  if(v.mode==='all')return true;
  if(!v.id)return false;
  if(v.mode==='group')return s.groups.some(function(g){return linkedGroups(g,v.id);});
  if(v.mode==='teacher')return s.teachers.indexOf(v.id)>=0;
  if(v.mode==='room')return s.room===v.id;
  var l=slotLang(s);return !!l&&l.id===v.id;
}
function visibleSlots(){
  var v=S.view,w0=v.week,w1=addDays(v.week,5);
  return S.slots.filter(function(s){
    return s.sem===S.current&&s.date>=w0&&s.date<=w1&&passFilter(s);
  });
}

/* ---------- Semaine type ---------- */
var typeView=/[?&]vue=type(&|$)/.test(location.search);
var twDay=0;
var PT=0.85;
function tplOf(id){return S.template.filter(function(t){return t.id===id;})[0]||null;}
function tplFields(t){
  return {sem:t.sem,course:t.course,lang:t.course?'':(t.lang||''),title:'',start:t.start,dur:t.dur,groups:t.groups.slice(),teachers:t.teachers.slice(),room:t.room||'',note:''};
}
function tplDesired(t){
  return t.weeks.filter(function(m,i,a){return a.indexOf(m)===i&&inSemester(addDays(m,t.day),t.sem);}).sort();
}
function hasSkip(tid,m){return S.skips.some(function(x){return x.tpl===tid&&x.monday===m;});}
// Répercute une séance type dans le calendrier : crée, met à jour ou retire les séances non modifiées à la main.
// dry=true : ne modifie rien, renvoie seulement les compteurs.
function syncTemplate(t,dry){
  var want=tplDesired(t),ex=S.slots.filter(function(x){return x.tpl===t.id;});
  var st={created:0,updated:0,removed:0,first:''};
  want.forEach(function(m){
    var cur=ex.filter(function(x){return x.tw===m;})[0],date=addDays(m,t.day),f=tplFields(t);
    if(!cur){
      if(hasSkip(t.id,m))return;
      st.created++;if(!st.first||m<st.first)st.first=m;
      if(!dry)S.slots.push(Object.assign({id:uid(),tpl:t.id,tw:m,edited:false,date:date},f));
    }else if(!cur.edited){
      var diff=cur.date!==date||cur.course!==f.course||(cur.lang||'')!==f.lang||cur.start!==f.start||cur.dur!==f.dur||cur.room!==f.room||
        JSON.stringify(cur.groups)!==JSON.stringify(f.groups)||JSON.stringify(cur.teachers)!==JSON.stringify(f.teachers);
      if(diff){st.updated++;if(!st.first||m<st.first)st.first=m;if(!dry)Object.assign(cur,f,{date:date});}
    }
  });
  ex.forEach(function(x){
    if(want.indexOf(x.tw)<0&&!x.edited){st.removed++;if(!dry)S.slots=S.slots.filter(function(y){return y!==x;});}
  });
  if(!dry)S.skips=S.skips.filter(function(x){return x.tpl!==t.id||want.indexOf(x.monday)>=0;});
  return st;
}
function syncStats(dry){
  var tot={created:0,updated:0,removed:0,first:''};
  S.template.filter(function(t){return t.sem===S.current;}).forEach(function(t){
    var r=syncTemplate(t,dry);
    tot.created+=r.created;tot.updated+=r.updated;tot.removed+=r.removed;
    if(r.first&&(!tot.first||r.first<tot.first))tot.first=r.first;
  });
  return tot;
}
function generateWeekly(){
  var r=syncStats(false);
  var n=r.created+r.updated+r.removed;
  save();
  if(!n){renderAll();toast('Le semainier est déjà à jour.');return;}
  var parts=[];
  if(r.created)parts.push(r.created+' séance'+(r.created>1?'s':'')+' créée'+(r.created>1?'s':''));
  if(r.updated)parts.push(r.updated+' mise'+(r.updated>1?'s':'')+' à jour');
  if(r.removed)parts.push(r.removed+' retirée'+(r.removed>1?'s':''));
  typeView=false;
  try{history.replaceState(null,'',location.pathname+location.hash);}catch(e){}
  if(r.first)S.view.week=mondayOf(r.first);
  fixWeek(S);
  renderAll();
  toast('Semainier généré : '+parts.join(', ')+'.');
}
function dropTemplate(t){
  S.slots=S.slots.filter(function(x){return !(x.tpl===t.id&&!x.edited);});
  S.slots.forEach(function(x){if(x.tpl===t.id){x.tpl='';x.tw='';x.edited=false;}});
  S.skips=S.skips.filter(function(x){return x.tpl!==t.id;});
  S.template=S.template.filter(function(x){return x!==t;});
}
function tplPass(t){
  var v=S.view;
  if(v.mode==='all')return true;
  if(!v.id)return false;
  if(v.mode==='group')return t.groups.some(function(g){return linkedGroups(g,v.id);});
  if(v.mode==='teacher')return t.teachers.indexOf(v.id)>=0;
  if(v.mode==='room')return t.room===v.id;
  var l=slotLang(t);return !!l&&l.id===v.id;
}
/* ---------- Semaine type : conflits, glisser-deposer, barre des enseignants ---------- */
var curDrag=null;
function tplIssues(){
  var out=[],T=S.template.filter(function(t){return t.sem===S.current;}),i,j;
  for(i=0;i<T.length;i++){
    var a=T[i],c=capacityIssue(a);
    if(c)out.push({kind:'capacite',t:a,ids:[a.id],a:null,b:null,
      text:'['+semName(a.sem)+'] '+DAYS[a.day]+' '+fmt(a.start)+' : '+c.total+' étudiants prévus pour '+c.cap+' places en '+c.room+' ("'+titleOf(a)+'")'});
    for(j=i+1;j<T.length;j++){
      var b=T[j];
      if(a.day!==b.day||!(a.start<b.start+b.dur&&b.start<a.start+a.dur))continue;
      var common=a.weeks.filter(function(w){return b.weeks.indexOf(w)>=0;});
      if(!common.length)continue;
      var sh=shared({groups:a.groups,teachers:a.teachers,room:a.room},{groups:b.groups,teachers:b.teachers,room:b.room});
      if(sh.length)out.push({kind:'conflit',t:a,ids:[a.id,b.id],a:null,b:null,
        text:'['+semName(a.sem)+'] '+DAYS[a.day]+' '+fmt(Math.max(a.start,b.start))+' : '+sh.join(', ')+' en double ("'+titleOf(a)+'" et "'+titleOf(b)+'"), semaines '+fmtWeeks(common,S.current)});
    }
  }
  return out;
}
function newBlank(day,room,start,extra){
  var t={id:uid(),sem:SEM().id,course:'',lang:'',groups:[],teachers:[],room:room||'',day:day,start:start,dur:120,
    weeks:semWeeks(SEM().id).map(function(w){return w.monday;}).filter(function(m){var dt=addDays(m,day);return !ferie(dt)&&!vacation(dt);})};
  var yl={};extra=extra||{};
  if(extra.year!==undefined){yl.year=extra.year;delete extra.year;}
  if(extra.level!==undefined){yl.level=extra.level;delete extra.level;}
  Object.assign(t,extra);
  if(yl.year!==undefined||yl.level!==undefined)setYL(t,yl);
  S.template.push(t);
  afterTplChange(t,'Bloc créé (2 h, toutes les semaines hors vacances et jours fériés). Clique dessus pour régler les semaines.');
}
function tplPreFromCourse(c,day,room,start){
  var dur=c?c.dur:120;
  var wk=[];
  if(c){
    var left=Math.max(0,c.sessions-placedPlan(c.id,null)),t0=todayStr();
    wk=semWeeks(SEM().id).map(function(w){return w.monday;}).filter(function(m){var dt=addDays(m,day);return dt>=t0&&!ferie(dt)&&!vacation(dt);}).slice(0,left);
  }
  return {id:null,sem:SEM().id,course:c?c.id:'',groups:c?c.groups.slice():[],teachers:c?c.teachers.slice():[],
    room:room||(c?c.room||'':''),day:day,start:start,end:Math.min(1440,start+dur),dur:dur,weeks:wk};
}
function afterTplChange(t,msg){
  save();renderAll();
  var bad=tplIssues().filter(function(i){return i.ids&&i.ids.indexOf(t.id)>=0;});
  toast(bad.length?'Attention : '+bad[0].text:msg+' Pense à « Générer le semainier ».');
}
function moveTpl(t,day,room,start){
  if(room===null)room=t.room||'';
  start=clamp(start,0,Math.max(0,1440-t.dur));
  if(t.day===day&&t.start===start&&(t.room||'')===room)return;
  t.day=day;t.start=start;t.room=room;
  afterTplChange(t,'Séance type déplacée.');
}
// Creneaux du PDF : lignes d'une heure (les cours de 2 h occupent deux lignes consecutives)
var MORNING_ROWS=[480,540,615,675];
function afternoonRows(day){
  if(day===0)return [825,885,945,1020,1095];
  if(day===4)return [810,870,960,1020];
  if(day===1||day===5)return [825,885,960,1020];
  return [825,885,960,1020,1095];
}
function rowLabel(m){var hh=Math.floor(m/60),mm=m%60;return hh+'h'+(mm?pad(mm):'');}
function yearList(){
  var out=[];
  S.groups.forEach(function(g){var m=/^(.+?)\s+Gr\s*\d+$/i.exec(g.name),y=m?m[1]:g.name;if(out.indexOf(y)<0)out.push(y);});
  return out;
}
function levelList(){
  var out=['Gr1','Gr2','Gr3','Gr4'];
  S.groups.forEach(function(g){var m=/\s(Gr\s*\d+)$/i.exec(g.name);if(m){var l=m[1].replace(/\s+/g,'');l=l.charAt(0).toUpperCase()+l.slice(1).toLowerCase();if(out.indexOf(l)<0)out.push(l);}});
  return out;
}
function tplYL(t){
  if(t.year||t.level)return {year:t.year||'',level:t.level||''};
  var g=t.groups.length===1?S.groups.filter(function(x){return x.id===t.groups[0];})[0]:null,m=g&&/^(.+?)\s+(Gr\s*\d+)$/i.exec(g.name);
  return m?{year:m[1],level:m[2].replace(/\s+/g,'')}:{year:'',level:''};
}
function groupByName(name){
  var k=name.toLowerCase(),g=S.groups.filter(function(x){return x.name.toLowerCase()===k;})[0];
  if(!g){g={id:uid(),name:name,size:0};S.groups.push(g);}
  return g.id;
}
// Annee (TC3, TC4...) et niveau (Gr1...) d'un bloc : les groupes du bloc en sont deduits
function setYL(t,yl){
  var cur=tplYL(t);
  t.year=yl.year!==undefined?yl.year:cur.year;
  t.level=yl.level!==undefined?yl.level:cur.level;
  if(!t.year)return;
  if(t.level)t.groups=[groupByName(t.year+' '+t.level)];
  else{
    var pre=t.year.toLowerCase()+' ',all=S.groups.filter(function(g){return g.name.toLowerCase().indexOf(pre)===0;}).map(function(g){return g.id;});
    t.groups=all.length?all:[groupByName(t.year)];
  }
}
function dropOnCell(e,day,room,start){
  e.preventDefault();
  if(!CAN_EDIT)return;
  var txt=(e.dataTransfer&&e.dataTransfer.getData('text/plain'))||'';
  if(txt.indexOf('tpl:')===0){
    var t=S.template.filter(function(x){return x.id===txt.slice(4);})[0];
    if(t)moveTpl(t,day,room,start);
    return;
  }
  if(txt.indexOf('lang:')===0){newBlank(day,room,start,{lang:txt.slice(5)});return;}
  if(txt.indexOf('year:')===0){newBlank(day,room,start,{year:txt.slice(5)});return;}
  if(txt.indexOf('level:')===0){newBlank(day,room,start,{level:txt.slice(6)});return;}
  if(txt.indexOf('teacher:')===0){newBlank(day,room,start,{teachers:[txt.slice(8)]});return;}
  if(txt.indexOf('room:')===0){newBlank(day,txt.slice(5),start);return;}
  if(txt.indexOf('group:')===0){newBlank(day,room,start,{groups:[txt.slice(6)]});return;}
  var c=course(txt);
  if(c&&c.sem===SEM().id)openTplEditor(null,tplPreFromCourse(c,day,room,start));
}
function teacherUsage(){
  var u={};
  S.slots.forEach(function(x){if(x.sem===S.current)x.teachers.forEach(function(t){u[t]=true;});});
  S.template.forEach(function(x){if(x.sem===S.current)x.teachers.forEach(function(t){u[t]=true;});});
  return u;
}
function renderTeacherBar(){
  var bar=$('#tbar');if(!bar)return;
  bar.replaceChildren();
  var v=S.view,use=teacherUsage(),sel=v.mode==='teacher'?S.teachers.filter(function(t){return t.id===v.id;})[0]:null;
  bar.className='tbar'+(sel?'':' nocap');
  bar.appendChild(h('span',{class:'lb'},'Un bouton par enseignant :'));
  if(!S.teachers.length){bar.appendChild(h('span',{class:'hint'},'aucun enseignant pour l\'instant (Configuration > Enseignants).'));return;}
  bar.appendChild(h('button',{class:'tb'+(sel?'':' on'),title:'Voir tout le monde',onclick:function(){v.mode='all';v.id=null;save();renderAll();}},'Tous'));
  var key=function(t){return t.name.replace(/^\S+\s+/,'').toLowerCase();};
  S.teachers.slice().sort(function(a,b){return key(a)<key(b)?-1:key(a)>key(b)?1:0;}).forEach(function(t){
    var on=sel&&sel.id===t.id,dr=CAN_EDIT&&typeView;
    var b=h('button',{class:'tb'+(on?' on':'')+(use[t.id]?'':' none'),draggable:dr?'true':'false',
      title:(dr?'Clique pour voir sa semaine, ou glisse-le sur un bloc pour l\'ajouter à la séance. ':'Voir sa semaine : où il est et avec qui. ')+(use[t.id]?'':'(aucune séance ce semestre)')},t.name);
    b.addEventListener('click',function(){v.mode='teacher';v.id=t.id;save();renderAll();});
    if(dr){
      b.addEventListener('dragstart',function(e){curDrag={kind:'teacher'};e.dataTransfer.setData('text/plain','teacher:'+t.id);e.dataTransfer.effectAllowed='copy';});
      b.addEventListener('dragend',function(){curDrag=null;clearDrop();});
    }
    bar.appendChild(b);
  });
  if(sel){
    var n=typeView?S.template.filter(function(x){return x.sem===S.current&&x.teachers.indexOf(sel.id)>=0;}).length:visibleSlots().length;
    bar.appendChild(h('span',{class:'cap'},(typeView?'Semaine type de ':'Semaine de ')+sel.name+' : '+n+' séance'+(n>1?'s':'')+(n?'. Salle et groupes sur chaque bloc.':'.')));
  }
}
// Passage a l'annee universitaire suivante : la semaine type est reprise, decalee d'un an, au meme numero de semaine ISO
function nextYear(){
  var yb=yearBounds(),y0=+yb.start.slice(0,4),lab=y0+'-'+(y0+1),lab2=(y0+1)+'-'+(y0+2);
  var nTpl=S.template.length,nSlots=S.slots.length;
  confirmBox('Passer à l\'année universitaire '+lab2+' ? La semaine type ('+nTpl+' bloc'+(nTpl>1?'s':'')+') est reprise telle quelle : mêmes spécialités, enseignants, salles et groupes, avec les mêmes numéros de semaine, en changeant seulement l\'année. Les dates de tous les semestres avancent d\'un an. Le semainier de '+lab+' ('+nSlots+' séance'+(nSlots>1?'s':'')+') est retiré du calendrier : une copie de sauvegarde est téléchargée d\'abord. Ensuite tu ajustes les blocs en les glissant, puis « Générer le semainier ».',function(){
    try{
      var blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
      var l=h('a',{href:URL.createObjectURL(blob),download:'emplois-du-temps-'+lab+'.json'});
      document.body.appendChild(l);l.click();l.remove();
    }catch(e){}
    var shift=function(d){return addDays(d,364);};
    S.semesters.forEach(function(m){m.start=shift(m.start);m.end=shift(m.end);});
    var ny=yearBounds(),byNum={};
    var cur=mondayOf(ny.start),last=mondayOf(ny.end);
    while(cur<=last){byNum[isoWeek(cur)]=cur;cur=addDays(cur,7);}
    var lost=0;
    S.template.forEach(function(t){
      var out=[];
      t.weeks.forEach(function(m){var n=byNum[isoWeek(m)];if(n)out.push(n);else lost++;});
      t.weeks=out.filter(function(m,i,ar){return ar.indexOf(m)===i;}).sort();
    });
    S.slots=[];S.skips=[];
    S.view.week=mondayOf(ny.start);fixWeek(S);
    save();renderAll();
    toast('Année '+lab2+' prête : semaine type reprise'+(lost?' ('+lost+' semaine(s) sans équivalent ignorée(s))':'')+'. Ajuste les blocs puis génère le semainier.');
  },'Passer à '+lab2);
}
function openBulkWeeks(){
  var sm=SEM(),f={lang:'',group:'',txt:''};
  var info=h('div',{class:'hint'}),warn=h('div',{class:'hint'});
  function match(){
    return S.template.filter(function(t){
      if(t.sem!==S.current)return false;
      if(f.lang){var l=slotLang(t);if(!l||l.id!==f.lang)return false;}
      if(f.group&&!t.groups.some(function(g){return linkedGroups(g,f.group);}))return false;
      return true;
    });
  }
  function refresh(){
    var m=match(),pw=parseWeeks(f.txt,sm.id);
    info.textContent=m.length+' bloc'+(m.length>1?'s':'')+' concerné'+(m.length>1?'s':'')+' : '+(m.slice(0,6).map(function(t){return DAYS[t.day]+' '+fmt(t.start)+' '+titleOf(t);}).join(', ')||'aucun')+(m.length>6?'...':'');
    warn.textContent=pw.errors.length?pw.errors[0]:(f.txt?pw.mondays.length+' semaine(s) retenue(s) : '+fmtWeeks(pw.mondays,sm.id):'');
  }
  var ls=h('select',{},h('option',{value:''},'Toutes les spécialités'));
  S.languages.forEach(function(l){ls.appendChild(h('option',{value:l.id},l.name));});
  var gs=h('select',{},h('option',{value:''},'Tous les groupes'));
  S.groups.forEach(function(g){gs.appendChild(h('option',{value:g.id},g.name));});
  ls.addEventListener('change',function(){f.lang=ls.value;refresh();});
  gs.addEventListener('change',function(){f.group=gs.value;refresh();});
  var inp=h('input',{type:'text',placeholder:'ex. 33-35 ou S37 à S42'});
  inp.addEventListener('input',function(){f.txt=inp.value;refresh();});
  var rest=h('button',{type:'button',onclick:function(){
    var t0=todayStr(),pick=semWeeks(sm.id).filter(function(w){return addDays(w.monday,6)>=t0;});
    f.txt=fmtWeeks(pick.map(function(w){return w.monday;}),sm.id);inp.value=f.txt;refresh();
  }},'Semaines restantes (à partir d\'aujourd\'hui)');
  function apply(){
    var m=match(),pw=parseWeeks(f.txt,sm.id);
    if(!m.length){toast('Aucun bloc ne correspond.');return;}
    if(pw.errors.length){toast(pw.errors[0]);return;}
    if(!pw.mondays.length){toast('Indique au moins une semaine.');return;}
    m.forEach(function(t){t.weeks=pw.mondays.filter(function(w){return inSemester(addDays(w,t.day),t.sem);});});
    save();closeModal();renderAll();
    toast('Semaines appliquées à '+m.length+' bloc'+(m.length>1?'s':'')+'. Pense à « Générer le semainier ».');
  }
  openModal(h('div',{class:'modal'},
    h('h2',{},'Semaines de plusieurs blocs à la fois'),
    h('p',{class:'hint'},'Choisis la spécialité et le groupe (par exemple Anglais et TC4) : les semaines saisies remplacent celles de tous les blocs correspondants, quel que soit leur jour ou leur heure. Toutes les semaines de l\'année universitaire (de septembre à juillet, du '+fullDate(eff(sm).start)+' au '+fullDate(eff(sm).end)+') peuvent être choisies.'),
    h('div',{class:'row2'},h('div',{class:'f'},h('label',{},'Spécialité'),ls),h('div',{class:'f'},h('label',{},'Groupe'),gs)),
    h('div',{class:'f'},h('label',{},'Semaines'),inp,h('div',{style:'margin-top:6px'},rest),warn),
    info,
    h('div',{class:'actions'},h('span',{class:'sp'}),h('button',{onclick:closeModal},'Annuler'),h('button',{class:'primary',onclick:apply},'Appliquer'))));
  refresh();
}
function renderRoomBar(){
  var bar=$('#rbar');if(bar){bar.hidden=true;bar.replaceChildren();}
  var card=$('#pal');if(!card)return;
  card.replaceChildren();
  var on=CAN_EDIT&&typeView;
  card.hidden=!on;
  if(!on)return;
  card.appendChild(h('h2',{},'Blocs à glisser'));
  card.appendChild(h('p',{class:'hint'},'Choisis le jour en haut (une page par jour, avec matin et après-midi). Glisse une spécialité dans la case de la salle et de l\'heure voulues, puis l\'année (TC3, TC4...), le niveau (Gr1...), l\'enseignant et au besoin une autre salle sur le bloc, dans l\'ordre que tu veux. Un bloc dure 2 h. Le nombre de séances de chaque cours se règle dans Configuration, avant de placer.'));
  card.appendChild(h('button',{onclick:openBulkWeeks,title:'Régler les semaines de tous les blocs d\'une spécialité et d\'un groupe'},'Semaines de plusieurs blocs'));
  function sec(title,kind,items,cls,label){
    var box=h('div',{class:'palsec'},h('div',{class:'lb'},title));
    var row=h('div',{class:'palrow'});
    if(!items.length)row.appendChild(h('span',{class:'hint'},'Aucun (Configuration).'));
    items.forEach(function(it){
      var b=h('span',{class:'pchip '+kind,draggable:'true',title:label,style:it.style||''},it.name);
      b.addEventListener('dragstart',function(e){curDrag={kind:kind};e.dataTransfer.setData('text/plain',kind+':'+it.id);e.dataTransfer.effectAllowed='copy';});
      b.addEventListener('dragend',function(){curDrag=null;clearDrop();});
      row.appendChild(b);
    });
    box.appendChild(row);card.appendChild(box);
  }
  sec('Spécialités','lang',S.languages.map(function(l){var c=COLORS[l.color]||COLORS.gris;return {id:l.id,name:l.name,style:'background:'+c[0]+';border-left:4px solid '+c[1]+';color:'+c[1]};}),'','Glisse cette spécialité dans la grille ou sur un bloc');
  sec('Années','year',yearList().map(function(y){return {id:y,name:y};}),'','Glisse cette année (promotion) sur un bloc');
  sec('Niveaux de groupe (Gr1 = le plus fort)','level',levelList().map(function(l){return {id:l,name:l};}),'','Glisse ce niveau sur un bloc');
  var key=function(t){return t.name.replace(/^\S+\s+/,'').toLowerCase();};
  sec('Enseignants','teacher',S.teachers.slice().sort(function(a,b){return key(a)<key(b)?-1:key(a)>key(b)?1:0;}).map(function(t){return {id:t.id,name:t.name};}),'','Glisse cet enseignant sur un bloc');
  sec('Salles','room',S.rooms.map(function(r){return {id:r.id,name:r.name};}),'','Glisse cette salle sur un bloc');
}
function clearDrop(){var l=document.querySelectorAll('.dropok');for(var i=0;i<l.length;i++)l[i].classList.remove('dropok');}
function typeBlocks(){
  return S.template.filter(function(t){return t.sem===S.current&&tplPass(t);}).map(function(t){
    return {id:t.id,day:t.day,start:t.start,dur:t.dur,room:t.room||'',slot:t,t:t,mondays:t.weeks.slice()};
  });
}
// Séances déjà placées à la main (sans lien avec une séance type), regroupées par jour, heure, salle, cours et groupes
function importableBlocks(){
  var map={},agg=[];
  S.slots.filter(function(x){return x.sem===S.current&&x.course&&!x.tpl;}).forEach(function(x){
    var key=[x.course,x.groups.slice().sort().join(','),x.teachers.slice().sort().join(','),x.room||'',wd(x.date),x.start,x.dur].join('|');
    var a=map[key];
    if(!a){a=map[key]={day:wd(x.date),slot:x,slots:[]};agg.push(a);}
    a.slots.push(x);
  });
  return agg;
}
function importTemplate(){
  var n=0;
  importableBlocks().forEach(function(a){
    var x=a.slot;
    if(a.day>5)return;
    var t={id:uid(),sem:x.sem,course:x.course,groups:x.groups.slice(),teachers:x.teachers.slice(),room:x.room||'',day:a.day,start:x.start,dur:x.dur,weeks:[]};
    a.slots.forEach(function(sl){
      var m=mondayOf(sl.date);
      if(t.weeks.indexOf(m)<0)t.weeks.push(m);
      sl.tpl=t.id;sl.tw=m;sl.edited=false;
    });
    t.weeks.sort();S.template.push(t);n++;
  });
  save();renderAll();
  toast(n?n+' séance(s) type créée(s) à partir du calendrier.':'Aucune séance à importer.');
}

function openTplEditor(t,pre){
  var isNew=!t;
  var d=pre||(t?JSON.parse(JSON.stringify(t)):{id:null,sem:SEM().id,course:'',lang:'',groups:[],teachers:[],room:'',day:0,start:480,dur:120,weeks:[]});
  if(d.end==null)d.end=Math.min(1440,d.start+d.dur);
  if(d.weeksTxt==null)d.weeksTxt=fmtWeeks(d.weeks,d.sem);
  var warn=h('div',{class:'warnbox okbox'}),info=h('div',{class:'hint'});
  function weeksNow(){return parseWeeks(d.weeksTxt,d.sem).mondays.sort();}
  function nowDesired(){
    return weeksNow().filter(function(m){return inSemester(addDays(m,d.day),d.sem);});
  }
  function linked(){return t?S.slots.filter(function(x){return x.tpl===t.id;}):[];}
  function refresh(){
    var c=course(d.course),msgs=[],pw=parseWeeks(d.weeksTxt,d.sem),want=nowDesired();
    pw.errors.forEach(function(e){msgs.push(e);});
    if(pw.mondays.length>want.length)msgs.push((pw.mondays.length-want.length)+' semaine(s) ignorée(s) : le jour choisi tombe hors de l\'année universitaire');
    if(c){
      var others=placedPlan(c.id,t?t.id:null);
      var after=others+want.length;
      info.textContent='Cours : '+after+' / '+c.sessions+' séances placées après enregistrement ('+want.length+' issues de cette séance type).';
      if(after>c.sessions)msgs.push('Trop de séances : '+after+' pour '+c.sessions+' prévues. Retire des semaines ou augmente le nombre dans Configuration > Cours.');
    }else info.textContent='Pas de cours choisi : le bloc porte seulement la spécialité (aucun décompte de séances).';
    if(d.end<=d.start)msgs.push('L\'heure de fin doit être après l\'heure de début');
    var ex=linked(),shown=0,more=0;
    if(d.end>d.start)want.forEach(function(m){
      var cur=ex.filter(function(x){return x.tw===m;})[0];
      var is=draftIssues({id:cur?cur.id:'new',sem:d.sem,date:addDays(m,d.day),start:d.start,dur:d.end-d.start,groups:d.groups,teachers:d.teachers,room:d.room});
      if(!is.length)return;
      if(shown<4){msgs.push('Semaine '+isoWeek(m)+' : '+is[0]+(is.length>1?' (+'+(is.length-1)+')':''));shown++;}else more++;
    });
    if(more)msgs.push('... et '+more+' autre(s) semaine(s) avec conflit');
    warn.replaceChildren();
    if(msgs.length){warn.className='warnbox';msgs.forEach(function(m){warn.appendChild(h('div',{},'⚠ '+m));});}
    else{warn.className='warnbox okbox';warn.appendChild(h('div',{},'Aucun conflit.'));}
  }
  var semField;
  if(isNew){
    var semSel=h('select',{});
    S.semesters.forEach(function(m){semSel.appendChild(h('option',{value:m.id},m.name));});
    semSel.value=d.sem;
    semSel.addEventListener('change',function(){
      d.sem=semSel.value;d.course='';d.groups=[];d.teachers=[];d.room='';d.weeks=[];d.weeksTxt='';
      openTplEditor(null,d);
    });
    semField=h('div',{class:'f'},h('label',{},'Semestre (S5, S6, S7...)'),semSel);
  }else{
    semField=h('div',{class:'f'},h('label',{},'Semestre'),h('div',{},semName(d.sem)));
  }
  var langSel=h('select',{},h('option',{value:''},'Aucune'));
  S.languages.forEach(function(l){langSel.appendChild(h('option',{value:l.id},l.name));});
  langSel.value=d.lang||'';
  langSel.addEventListener('change',function(){d.lang=langSel.value;if(d.lang)d.course='';openTplEditor(t,d);});
  var courseSel=h('select',{},h('option',{value:''},'Aucun cours (spécialité seule)'));
  S.courses.filter(function(c){return c.sem===d.sem;}).forEach(function(c){
    courseSel.appendChild(h('option',{value:c.id},c.name+' ('+placedPlan(c.id,t?t.id:null)+'/'+c.sessions+')'));
  });
  courseSel.value=d.course||'';
  courseSel.addEventListener('change',function(){
    d.course=courseSel.value;
    var c=course(d.course);
    if(c)d.lang='';
    if(c&&isNew){d.groups=c.groups.slice();if(!d.teachers.length)d.teachers=c.teachers.slice();if(!d.room)d.room=c.room||'';d.end=Math.min(1440,d.start+c.dur);}
    openTplEditor(t,d);
  });
  var daySel=h('select',{});
  DAYS.forEach(function(n,i){daySel.appendChild(h('option',{value:i},n));});
  daySel.value=d.day;
  daySel.addEventListener('change',function(){d.day=+daySel.value;refresh();});
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
  var weeksInput=h('input',{type:'text',value:d.weeksTxt,placeholder:'ex. 48-50 53'});
  var chipBox=h('div',{class:'chips'});
  function drawChips(){
    chipBox.replaceChildren();
    var sel=weeksNow();
    semWeeks(d.sem).forEach(function(w){
      var on=sel.indexOf(w.monday)>=0;
      var wf=weekFlag(w.monday);
      var b=h('button',{type:'button',class:'wk'+(on?' on':'')+wf.cls,title:'Semaine '+w.num+' : lundi '+shortDate(w.monday)+(wf.tip?' · '+wf.tip:'')},String(w.num));
      b.addEventListener('click',function(){
        var cur=weeksNow(),i=cur.indexOf(w.monday);
        if(i>=0)cur.splice(i,1);else cur.push(w.monday);
        d.weeksTxt=fmtWeeks(cur,d.sem);weeksInput.value=d.weeksTxt;drawChips();refresh();
      });
      chipBox.appendChild(b);
    });
  }
  weeksInput.addEventListener('input',function(){d.weeksTxt=weeksInput.value;drawChips();refresh();});
  drawChips();
  var r1=h('input',{type:'date','aria-label':'Du'}),r2=h('input',{type:'date','aria-label':'Au'});
  function applyRange(){
    if(!validDate(r1.value)||!validDate(r2.value)||r2.value<r1.value)return;
    var m1=mondayOf(r1.value),m2=mondayOf(r2.value);
    var pick=semWeeks(d.sem).map(function(w){return w.monday;}).filter(function(m){return m>=m1&&m<=m2;});
    d.weeksTxt=fmtWeeks(pick,d.sem);weeksInput.value=d.weeksTxt;drawChips();refresh();
  }
  r1.addEventListener('change',applyRange);r2.addEventListener('change',applyRange);
  var rangeRow=h('div',{class:'row2'},h('div',{class:'f'},h('label',{},'Du'),r1),h('div',{class:'f'},h('label',{},'Au'),r2));
  function doSave(){
    var c=course(d.course),want=nowDesired(),pw=parseWeeks(d.weeksTxt,d.sem);
    if(d.end<=d.start){toast('L\'heure de fin doit être après l\'heure de début');return;}
    if(pw.errors.length){toast(pw.errors[0]);return;}
    if(!want.length){toast('Indique au moins une semaine de l\'année universitaire');return;}
    var others=c?placedPlan(c.id,t?t.id:null):0;
    if(c&&others+want.length>c.sessions){toast('Trop de séances : '+(others+want.length)+' pour '+c.sessions+' prévues pour « '+c.name+' ».');return;}
    var rec=t||{id:uid()};
    var gOld=JSON.stringify(rec.groups||[]),gNew=JSON.stringify(d.groups);
    if(gOld!==gNew){rec.year='';rec.level='';}
    Object.assign(rec,{sem:d.sem,course:d.course,lang:d.course?'':(d.lang||''),groups:d.groups.slice(),teachers:d.teachers.slice(),room:d.room||'',day:d.day,start:d.start,dur:d.end-d.start,weeks:pw.mondays.slice().sort()});
    if(isNew)S.template.push(rec);
    if(rec.sem!==S.current){S.current=rec.sem;S.view.week=mondayOf(eff(SEM()).start);armed=null;fixWeek(S);}
    save();closeModal();renderAll();
    toast('Séance type enregistrée. Clique sur « Générer le semainier » pour la répercuter dans le calendrier.');
  }
  function doDel(){
    confirmBox('Supprimer cette séance type ? Tout de suite, les séances du calendrier qui en viennent et n\'ont pas été modifiées à la main seront aussi supprimées (elles redeviennent à placer).',function(){
      dropTemplate(t);save();closeModal();renderAll();toast('Séance type supprimée');
    },'Supprimer');
  }
  var actions=h('div',{class:'actions'});
  if(!isNew)actions.appendChild(h('button',{class:'danger',onclick:doDel},'Supprimer'));
  actions.appendChild(h('span',{class:'sp'}));
  actions.appendChild(h('button',{onclick:closeModal},'Annuler'));
  actions.appendChild(h('button',{class:'primary',onclick:doSave},'Enregistrer'));
  openModal(h('div',{class:'modal'},
    h('h2',{},isNew?'Nouvelle séance type':'Modifier la séance type'),
    h('p',{class:'hint'},'Ce que tu règles ici est répercuté dans le calendrier quand tu cliques sur « Générer le semainier ». Les séances déplacées ou modifiées à la main dans le calendrier ne sont jamais touchées.'),
    semField,
    h('div',{class:'f'},h('label',{},'Spécialité (langue)'),langSel),
    h('div',{class:'f'},h('label',{},'Cours (facultatif)'),courseSel,info),
    h('div',{class:'row2'},
      h('div',{class:'f'},h('label',{},'Jour'),daySel),
      h('div',{class:'f'},h('label',{},'Début'),st),
      h('div',{class:'f'},h('label',{},'Fin'),en)),
    h('div',{class:'f'},h('label',{},'Semaines (numéros ISO : 48 49 50 53, 48-50 53, S37 à S42)'),weeksInput,chipBox),
    h('div',{class:'f'},h('label',{},'Ou de telle date à telle date (toutes les semaines comprises)'),rangeRow),
    h('div',{class:'f'},h('div',{class:'lb'},'Groupes'),chipsBox('groups',d.groups,refresh)),
    h('div',{class:'f'},h('div',{class:'lb'},'Enseignants'),chipsBox('teachers',d.teachers,refresh)),
    h('div',{class:'f'},h('label',{},'Salle / amphi'),roomSelect(d.room,function(v){d.room=v;refresh();})),
    warn,actions));
  refresh();
}
function buildTplBlock(a,badIds){
  var s0=a.slot,c=slotColor(s0),yl=tplYL(a.t);
  var gl=s0.groups.map(function(g){return nm('groups',g);}).join(', ');
  var tl=s0.teachers.map(function(t){return nm('teachers',t);}).join(', ');
  var wk=fmtWeeks(a.mondays,S.current),lg=slotLang(s0);
  var base=(!s0.course&&!s0.lang&&CAN_EDIT)?'Spé à choisir':titleOf(s0);
  var spe=base+((!s0.course&&yl.level&&(s0.lang||s0.course))?'-'+yl.level.replace(/^Gr/i,'G'):'');
  var tip=titleOf(s0)+(lg&&lg.name!==titleOf(s0)?' ('+lg.name+')':'')+'\n'+fmt(a.start)+'-'+fmt(a.start+a.dur)+(gl?'\nGroupes : '+gl:'')+(tl?'\nEnseignants : '+tl:'')+'\nSemaines : '+wk;
  if(badIds[a.id])tip+='\n\nATTENTION : conflit ou capacité dépassée';
  var yearTxt=yl.year||(gl&&!yl.year?gl:'');
  var ev=h('div',{
    class:'ev tw-ev pdfblk'+(CAN_EDIT?' tw-edit':'')+(badIds[a.id]?' bad':''),
    style:'background:'+c[0]+';border-left-color:'+c[1]+';color:'+c[1],title:tip,draggable:CAN_EDIT?'true':'false'
  },
    h('b',{},(badIds[a.id]?'⚠ ':'')+(yearTxt||(CAN_EDIT?'Année à choisir':''))),
    h('span',{class:'ln sp1'},spe),
    (tl||CAN_EDIT)?h('span',{class:'ln'+(tl?'':' ph')},tl||'Prof à choisir'):null,
    h('span',{class:'ln sm'},(a.room?'Salle : '+nm('rooms',a.room)+' · ':'')+fmt(a.start)+'-'+fmt(a.start+a.dur)+' · sem. '+wk));
  ev.addEventListener('click',function(e){e.stopPropagation();if(CAN_EDIT)openTplEditor(a.t);});
  if(!CAN_EDIT)return ev;
  ev.addEventListener('dragstart',function(e){
    curDrag={kind:'tpl',offY:0};
    e.dataTransfer.setData('text/plain','tpl:'+a.t.id);e.dataTransfer.effectAllowed='move';
  });
  ev.addEventListener('dragend',function(){curDrag=null;clearDrop();});
  ev.addEventListener('drop',function(e){
    var txt=(e.dataTransfer&&e.dataTransfer.getData('text/plain'))||'';
    if(txt.indexOf('tpl:')===0)return;
    e.preventDefault();e.stopPropagation();clearDrop();
    if(txt.indexOf('teacher:')===0){
      var tid=txt.slice(8);
      if(a.t.teachers.indexOf(tid)>=0){toast(nm('teachers',tid)+' est déjà sur cette séance.');return;}
      a.t.teachers.push(tid);
      afterTplChange(a.t,nm('teachers',tid)+' ajouté à la séance.');
    }else if(txt.indexOf('room:')===0){
      a.t.room=txt.slice(5);
      afterTplChange(a.t,'Salle '+nm('rooms',a.t.room)+' choisie.');
    }else if(txt.indexOf('lang:')===0){
      a.t.lang=txt.slice(5);a.t.course='';
      afterTplChange(a.t,'Spécialité : '+(lang(a.t.lang)?lang(a.t.lang).name:'')+'.');
    }else if(txt.indexOf('year:')===0){
      setYL(a.t,{year:txt.slice(5)});
      afterTplChange(a.t,'Année '+a.t.year+(a.t.level?' '+a.t.level:'')+'.');
    }else if(txt.indexOf('level:')===0){
      var cy=tplYL(a.t);
      if(!cy.year){a.t.level=txt.slice(6);afterTplChange(a.t,'Niveau '+a.t.level+' : choisis maintenant l\'année.');return;}
      setYL(a.t,{level:txt.slice(6)});
      afterTplChange(a.t,'Groupe '+a.t.year+' '+a.t.level+'.');
    }else if(txt.indexOf('group:')===0){
      var gid=txt.slice(6);
      if(a.t.groups.indexOf(gid)>=0){toast(nm('groups',gid)+' est déjà sur cette séance.');return;}
      a.t.groups.push(gid);
      afterTplChange(a.t,nm('groups',gid)+' ajouté à la séance.');
    }else{
      var dc=course(txt);
      if(!dc||dc.sem!==a.t.sem)return;
      a.t.course=dc.id;a.t.lang='';a.t.year='';a.t.level='';a.t.groups=dc.groups.slice();
      if(!a.t.teachers.length)a.t.teachers=dc.teachers.slice();
      if(!a.t.room)a.t.room=dc.room||'';
      afterTplChange(a.t,'Spécialité remplacée par '+dc.name+'.');
    }
  });
  return ev;
}
function renderTypeWeek(){
  var root=$('#tt');root.replaceChildren();
  var sm=SEM(),agg=typeBlocks();
  var semSelT=h('select',{'aria-label':'Semestre de la semaine type'});
  S.semesters.forEach(function(m){semSelT.appendChild(h('option',{value:m.id},m.name));});
  semSelT.value=sm.id;
  semSelT.addEventListener('change',function(){switchSemester(semSelT.value);});
  root.appendChild(h('div',{class:'tw-sem'},h('label',{},'Semaine type du semestre ',semSelT),
    h('span',{class:'hint'},'année universitaire du '+fullDate(eff(sm).start)+' au '+fullDate(eff(sm).end))));
  if(CAN_EDIT){
    var pd0=syncStats(true),pn=pd0.created+pd0.updated+pd0.removed;
    var bar=h('div',{class:'tw-gen'+(pn?' todo':'')},
      h('span',{},S.template.some(function(t){return t.sem===S.current;})
        ?(pn?pn+' changement'+(pn>1?'s':'')+' à répercuter dans le semainier ('+pd0.created+' à créer, '+pd0.updated+' à mettre à jour, '+pd0.removed+' à retirer).':'Le semainier est à jour avec la semaine type.')
        :'Commence par construire la semaine type (glisse un cours de la liste dans la grille), puis génère le semainier.'),
      h('span',{class:'sp'}),
      h('button',{onclick:nextYear,title:'Reprendre la semaine type pour l\'année universitaire suivante'},'Année universitaire suivante'),
      h('button',{class:'primary',onclick:generateWeekly,disabled:!pn},'Générer le semainier'));
    root.appendChild(bar);
    root.appendChild(h('p',{class:'hint tw-help'},'Choisis un jour avec les onglets (comme les pages de ton PDF), puis glisse une spécialité de la palette de droite dans la case d\'une salle et d\'une heure. Ajoute ensuite l\'année, le niveau Gr1 à Gr4 et l\'enseignant sur le bloc. Glisse un bloc pour le déplacer, clique dessus pour régler ses semaines.'));
  }
  var hasAny=S.template.some(function(t){return t.sem===S.current;});
  if(!agg.length){
    var em=h('div',{class:'empty'},hasAny?'Aucune séance type pour cette sélection.':'La semaine type de ce semestre est vide.');
    if(CAN_EDIT){
      em.appendChild(h('div',{},h('button',{class:'primary',onclick:function(){openTplEditor(null);}},'+ Séance type')));
      if(!hasAny&&importableBlocks().length)em.appendChild(h('div',{style:'margin-top:8px'},h('button',{onclick:importTemplate},'Créer la semaine type à partir des séances déjà placées dans le calendrier')));
    }
    root.appendChild(em);
    if(!CAN_EDIT)return;
  }
  var badIds={};
  if(CAN_EDIT)tplIssues().forEach(function(i){(i.ids||[]).forEach(function(id){badIds[id]=true;});});
  var gT0=S.view.startH*60,gT1=S.view.endH*60;
  if(agg.length){
    gT0=Math.min(gT0,Math.floor(Math.min.apply(null,agg.map(function(a){return a.start;}))/60)*60);
    gT1=Math.max(gT1,Math.ceil(Math.max.apply(null,agg.map(function(a){return a.start+a.dur;}))/60)*60);
  }
  var nd=agg.some(function(a){return a.day>=5;})?6:5,d;
  if(twDay>=nd)twDay=0;
  var tabs=h('div',{class:'tw-tabs'});
  for(d=0;d<nd;d++)(function(dd){
    var n=agg.filter(function(a){return a.day===dd;}).length;
    var tb=h('button',{class:'tw-tab'+(twDay===dd?' on':''),onclick:function(){twDay=dd;renderTypeWeek();}},DAYS[dd],h('span',{class:'n'},String(n)));
    if(CAN_EDIT){
      tb.addEventListener('dragover',function(e){e.preventDefault();tb.classList.add('dropok');});
      tb.addEventListener('dragleave',function(){tb.classList.remove('dropok');});
      tb.addEventListener('drop',function(e){
        e.preventDefault();clearDrop();
        var txt=(e.dataTransfer&&e.dataTransfer.getData('text/plain'))||'';
        if(txt.indexOf('tpl:')!==0)return;
        var t=S.template.filter(function(x){return x.id===txt.slice(4);})[0];
        if(!t||t.day===dd)return;
        t.day=dd;twDay=dd;afterTplChange(t,'Bloc déplacé au '+DAYS[dd].toLowerCase()+'.');
      });
    }
    tabs.appendChild(tb);
  })(d);
  root.appendChild(tabs);
  var M0=Math.min(gT0,8*60),M1=13*60,A0=13*60,A1=Math.max(gT1,18*60);
  for(d=0;d<nd;d++){
    var items=agg.filter(function(a){return a.day===d;});
    var box=h('section',{class:'tw-day'+(d===twDay?' cur':'')},h('h2',{},DAYS[d]+' · semaine type '+sm.name));
    var parts=[{name:'Matin',rows:MORNING_ROWS,list:items.filter(function(a){return a.start<780;})},
               {name:'Après-midi',rows:afternoonRows(d),list:items.filter(function(a){return a.start>=780;})}];
    parts.forEach(function(pt){
      if(!CAN_EDIT&&!pt.list.length)return;
      var day=d,rows=pt.rows,rooms=S.rooms.map(function(r){return r.id;});
      if(pt.list.some(function(a){return !a.room||rooms.indexOf(a.room)<0;})||!rooms.length)rooms.push('');
      var grid=h('div',{class:'pdfgrid',style:'grid-template-columns:56px repeat('+rooms.length+',minmax(128px,1fr));grid-template-rows:30px repeat('+rows.length+',70px);min-width:'+(56+rooms.length*128)+'px'});
      grid.appendChild(h('div',{class:'pg-h pg-corner',style:'grid-row:1;grid-column:1'}));
      rooms.forEach(function(rid,ci){grid.appendChild(h('div',{class:'pg-h',style:'grid-row:1;grid-column:'+(ci+2)},rid?nm('rooms',rid):'Sans salle'));});
      rows.forEach(function(rs,ri){
        grid.appendChild(h('div',{class:'pg-t',style:'grid-row:'+(ri+2)+';grid-column:1'},rowLabel(rs)));
        rooms.forEach(function(rid,ci){
          var cell=h('div',{class:'pg-c',style:'grid-row:'+(ri+2)+';grid-column:'+(ci+2)});
          if(CAN_EDIT){
            cell.addEventListener('click',function(){
              var ac=armed?course(armed):null;
              openTplEditor(null,tplPreFromCourse(ac&&ac.sem===SEM().id?ac:null,day,rid,rs));
            });
            cell.addEventListener('dragover',function(e){e.preventDefault();cell.classList.add('dropok');});
            cell.addEventListener('dragleave',function(){cell.classList.remove('dropok');});
            cell.addEventListener('drop',function(e){clearDrop();dropOnCell(e,day,rid,rs);});
          }
          grid.appendChild(cell);
        });
      });
      pt.list.forEach(function(a){
        var ci=rooms.indexOf(a.room||'');if(ci<0)ci=rooms.length-1;
        var r0=0,k;
        for(k=0;k<rows.length;k++)if(rows[k]<=a.start)r0=k;
        var r1=r0;
        for(k=r0;k<rows.length;k++)if(rows[k]<a.start+a.dur)r1=k;
        var ev=buildTplBlock(a,badIds);
        ev.style.gridRow=(r0+2)+' / span '+(r1-r0+1);
        ev.style.gridColumn=String(ci+2);
        grid.appendChild(ev);
      });
      box.appendChild(h('h3',{class:'tw-part'},pt.name));
      box.appendChild(h('div',{class:'tw-scroll'},grid));
    });
    if(!items.length&&!CAN_EDIT)box.appendChild(h('div',{class:'tw-none'},'Aucun cours'));
    root.appendChild(box);
  }
  var used={};
  agg.forEach(function(a){var ll=slotLang(a.slot);if(ll)used[ll.id]=true;});
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
  if(typeView){renderTypeWeek();if(CAN_EDIT)renderIssues(tplIssues());syncToolbar();return;}
  var vis=visibleSlots();
  ensureRange(vis);
  var v=S.view,n=v.days,t0=v.startH*60,t1=v.endH*60,H=Math.round((t1-t0)*PPM);
  var issues=CAN_EDIT?allIssues():[],bad={};
  issues.forEach(function(i){
    if(i.kind==='trop'||i.kind==='ferie'||i.kind==='vacances')return;
    if(i.a)bad[i.a.id]=true;
    if(i.b)bad[i.b.id]=true;
  });

  var root=$('#tt');root.replaceChildren();
  var tpl='52px repeat('+n+',minmax(90px,1fr))';

  var heads=h('div',{class:'heads',style:'grid-template-columns:'+tpl},h('div',{class:'gut'}));
  var i;
  for(i=0;i<n;i++){
    var dt=addDays(v.week,i);
    var fl=dayFlag(dt);
    heads.appendChild(h('div',{class:'dh'+(inSemester(dt)?'':' off')+(fl?' '+fl.kind:''),title:fl?(fl.kind==='ferie'?'Jour férié : ':'Vacances scolaires (zone B) : ')+fl.name:''},DAYS[i],h('small',{},shortDate(dt)),fl?h('em',{class:'fl'},fl.kind==='ferie'?'Férié : '+fl.name:fl.name):null));
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
    var cf=dayFlag(date);
    var col=h('div',{class:'col'+(inSemester(date)?'':' off')+(cf?' '+cf.kind:''),style:'height:'+H+'px'});
    col.addEventListener('click',function(e){
      if(!CAN_EDIT||e.target!==col||justDragged)return;
      if(!inSemester(date)){toast('Cette date est en dehors de l\'année universitaire');return;}
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
      if(!inSemester(date)){toast('Cette date est en dehors de l\'année universitaire');return;}
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
      if(s.tpl&&s.edited)tip+='\n\nModifiée par rapport à la semaine type';
      if(bad[s.id])tip+='\n\nATTENTION : conflit, capacité dépassée ou hors année universitaire';
      var ev=h('div',{
        class:'ev'+(bad[s.id]?' bad':''),
        style:'top:'+Math.round((s.start-t0)*PPM)+'px;height:'+h0+'px;left:calc('+(L.lane*100/L.lanes)+'% + 1px);width:calc('+(100/L.lanes)+'% - 3px);background:'+c[0]+';border-left-color:'+c[1]+';color:'+c[1],
        title:tip
      },
        h('b',{},(bad[s.id]?'⚠ ':'')+titleOf(s)),
        tl?h('span',{},tl):null,
        rm?h('span',{},rm):null,
        h('span',{},fmt(s.start)+'-'+fmt(s.start+s.dur)+(gl?' · '+gl:'')),
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
      if(slot.tpl)slot.edited=true;
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
    if(!dates.length){toast('Aucune des semaines indiquées ne donne une date dans l\'année universitaire');return;}
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
  if(!nb){c.appendChild(h('div',{class:'hint'},'Aucun conflit de groupe, d\'enseignant ou de salle, aucune salle trop petite, aucune séance hors semestre, aucune séance un jour férié ou pendant les vacances.'));return;}
  var ul=h('ul',{class:'issues'});
  issues.forEach(function(i){
    ul.appendChild(h('li',{class:(i.kind==='conflit'||i.kind==='trop')?'':'w',onclick:function(){
      if(i.t&&!i.a){openTplEditor(i.t);return;}
      if(i.a){if(i.a.sem!==S.current){S.current=i.a.sem;renderAll();}S.view.week=mondayOf(i.a.date);fixWeek(S);save();renderGrid();openEditor(i.a);}
      else{openConfig('courses');}
    }},i.text));
  });
  c.appendChild(ul);
}

function renderCourses(){
  var root=$('#courses');root.replaceChildren();
  var totalLeft=0;
  var cntOf=function(c){return typeView?placedPlan(c.id,null):placed(c.id);};
  curCourses().forEach(function(c){totalLeft+=Math.max(0,c.sessions-cntOf(c));});
  root.appendChild(h('h2',{},(typeView?'Cours à glisser, séances restantes (':'Séances à placer (')+SEM().name+')',h('span',{class:'badge'+(totalLeft?' info':' ok')},String(totalLeft))));

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
    var n=cntOf(c),left=c.sessions-n;
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
      curDrag={kind:'course'};e.dataTransfer.setData('text/plain',c.id);e.dataTransfer.effectAllowed='copy';
    });
    item.addEventListener('dragend',function(){curDrag=null;clearDrop();});
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
  S.view.week=inSemester(t)?mondayOf(t):mondayOf(eff(m).start);
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
  return Math.round((pd(monday)-pd(mondayOf(eff(SEM()).start)))/604800000)+1;
}

function syncToolbar(){
  var v=S.view;
  document.body.classList.toggle('typeweek',typeView);
  $('#wtype').textContent=typeView?'Retour au calendrier':'Semaine type';
  $('#mode').value=v.mode;
  var sm=SEM();
  var ye=eff(sm);$('#semname').textContent='Semestre '+sm.name+' · année universitaire du '+fullDate(ye.start)+' au '+fullDate(ye.end);
  $('#sem').value=sm.id;
  renderTeacherBar();renderRoomBar();
  var ef=eff(sm),first=mondayOf(ef.start),last=mondayOf(ef.end);
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
    if(typeView){openTplEditor(null);return;}
    var d=S.view.week;
    if(!inSemester(d))d=eff(SEM()).start;
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
        if(wk.dropped)msgs.push(wk.dropped+' semaine(s) ignorée(s) : le jour choisi tombe hors de l\'année universitaire');
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
      var wf=weekFlag(w.monday);
      var b=h('button',{type:'button',class:'wk'+(on?' on':'')+wf.cls,title:'Semaine '+w.num+' : lundi '+shortDate(w.monday)+(wf.tip?' · '+wf.tip:'')},String(w.num));
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
        if(!dates.length){toast('Aucune des semaines indiquées ne donne une date dans l\'année universitaire');return;}
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
      var before=JSON.stringify([old.course,old.date,old.start,old.dur,old.groups,old.teachers,old.room]);
      Object.assign(old,base);
      if(old.tpl&&before!==JSON.stringify([old.course,old.date,old.start,old.dur,old.groups,old.teachers,old.room]))old.edited=true;
    }
    save();closeModal();renderAll();
    if(made>1)toast(made+' séances créées');
  }
  function doDup(){
    var c=course(slot.course);
    if(c&&remaining(c)<=0){toast('Les séances de « '+c.name+' » sont déjà toutes placées.');return;}
    var copy=JSON.parse(JSON.stringify(slot));
    copy.id=uid();copy.date=addDays(copy.date,7);copy.tpl='';copy.tw='';copy.edited=false;
    S.slots.push(copy);save();closeModal();renderAll();
    toast('Dupliqué à la semaine suivante');
  }
  function doDel(){
    confirmBox('Supprimer la séance « '+titleOf(slot)+' » du '+shortDate(slot.date)+' ? Elle sera de nouveau comptée comme à placer.',function(){
      S.slots=S.slots.filter(function(x){return x.id!==slot.id;});
      if(slot.tpl&&slot.tw&&tplOf(slot.tpl)&&!hasSkip(slot.tpl,slot.tw))S.skips.push({tpl:slot.tpl,monday:slot.tw});
      save();renderAll();toast(slot.tpl?'Séance annulée dans le calendrier (la semaine type est inchangée). Elle est de nouveau à placer.':'Séance supprimée');
    },'Supprimer');
  }

  var actions=h('div',{class:'actions'});
  if(!isNew){
    actions.appendChild(h('button',{class:'danger',onclick:doDel},'Supprimer'));
    actions.appendChild(h('button',{onclick:doDup},'Dupliquer (+1 semaine)'));
    if(slot.tpl&&slot.edited&&tplOf(slot.tpl))actions.appendChild(h('button',{onclick:function(){
      var cur=S.slots.filter(function(x){return x.id===slot.id;})[0],tt=tplOf(slot.tpl);
      if(!cur||!tt)return;
      cur.edited=false;syncTemplate(tt);save();closeModal();renderAll();toast('Séance rétablie selon la semaine type');
    }},'Rétablir selon la semaine type'));
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
  if(kind==='groups')S.groups.forEach(function(g){if(g.attach===id)delete g.attach;});
  S.courses.forEach(function(c){
    if(kind==='groups')c.groups=c.groups.filter(function(x){return x!==id;});
    if(kind==='teachers')c.teachers=c.teachers.filter(function(x){return x!==id;});
    if(kind==='rooms'&&c.room===id)c.room='';
    if(kind==='languages'&&c.lang===id)c.lang='';
  });
  S.slots.concat(S.template).forEach(function(s){
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
        S.template=S.template.filter(function(t){return t.sem!==m.id;});
        S.skips=S.skips.filter(function(k){return S.template.some(function(t){return t.id===k.tpl;});});
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
  box.appendChild(holidayBox());
  return box;
}

function holidayBox(){
  var m=SEM(),box=h('div',{class:'holbox'});
  box.appendChild(h('h3',{},'Jours fériés et vacances (zone B, Lille) · '+m.name));
  var rows=[],d=m.start,guard=0;
  while(d<=m.end&&guard++<800){var f=ferie(d);if(f)rows.push({k:d,t:longDate(d)+' '+fullDate(d)+' : '+f+' (férié)'});d=addDays(d,1);}
  VAC.forEach(function(v){
    if(v.end<=m.start||v.start>=m.end)return;
    rows.push({k:v.start,t:v.name+' : du '+fullDate(v.start)+' au '+fullDate(addDays(v.end,-1))+' (reprise le '+fullDate(v.end)+')'});
  });
  rows.sort(function(x,y){return x.k<y.k?-1:x.k>y.k?1:0;});
  box.appendChild(h('p',{class:'hint'},vacInfo.ok
    ?'Les jours fériés sont calculés pour chaque année. Les vacances viennent du calendrier officiel de l\'Éducation nationale et se mettent à jour toutes seules (dernière actualisation : '+new Date(vacInfo.at).toLocaleDateString('fr-FR')+'). Ils sont signalés dans la grille et dans Contrôle.'
    :'Les jours fériés sont calculés pour chaque année. Les vacances scolaires n\'ont pas pu être chargées pour l\'instant : elles se rechargent automatiquement.'));
  var ul=h('ul',{class:'issues'});
  rows.forEach(function(r){ul.appendChild(h('li',{class:'w'},r.t));});
  if(!rows.length)ul.appendChild(h('li',{},'Rien à signaler sur la période du semestre.'));
  box.appendChild(ul);
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
    if(kind==='groups'){
      var att=h('select',{'aria-label':'Groupe rattaché',title:'Groupe rattaché : les deux groupes partagent les mêmes étudiants (conflits et affichage)'});
      att.appendChild(h('option',{value:''},'Rattaché à : aucun'));
      S.groups.forEach(function(o){
        if(o.id===it.id||o.attach===it.id)return;
        att.appendChild(h('option',{value:o.id},'Rattaché à : '+o.name));
      });
      att.value=it.attach||'';
      att.addEventListener('change',function(){
        if(att.value)it.attach=att.value;else delete it.attach;
        save();renderAll();openConfig('groups');
      });
      row.appendChild(att);
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
          S.template=S.template.filter(function(t){return t.course!==c.id;});
          S.skips=S.skips.filter(function(k){return S.template.some(function(t){return t.id===k.tpl;});});
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
  else if(tab==='groups'){
    content=resTab('groups','Groupes d\'étudiants. L\'effectif sert à vérifier la capacité des salles. Pour TC3, TC4, TC2A3 et TC2A4, Gr1 est le groupe de niveau le plus fort, jusqu\'à Gr4. Chaque groupe peut être rattaché à un autre groupe : ils sont alors considérés comme partageant les mêmes étudiants (conflit signalé s\'ils sont placés en même temps, et la séance de l\'un apparaît aussi dans la vue de l\'autre).','size','Effectif');
    content.appendChild(h('div',{class:'rrow'},h('button',{onclick:function(){
      var n=addDefaultGroups();S.seeded=true;save();renderAll();openConfig('groups');
      toast(n?n+' groupe(s) ajouté(s).':'Tous les groupes habituels sont déjà présents.');
    }},'Ajouter les groupes habituels (TC3, TC4, TC2A3, TC2A4 Gr1 à Gr4, M1 GC, M1 GM)')));
  }
  else if(tab==='teachers'){
    content=resTab('teachers','Enseignants et surveillants.','', '');
    content.appendChild(h('div',{class:'rrow'},h('button',{onclick:function(){
      var n=addDefaultTeachers();S.seededRes=true;save();renderAll();openConfig('teachers');
      toast(n?n+' enseignant(s) ajouté(s).':'Tous les enseignants habituels sont déjà présents.');
    }},'Ajouter les enseignants habituels (liste du PDF)')));
  }
  else if(tab==='rooms'){
    content=resTab('rooms','Salles et amphis. La capacité déclenche une alerte si les groupes placés sont trop nombreux.','cap','Capacité');
    content.appendChild(h('div',{class:'rrow'},h('button',{onclick:function(){
      var n=addDefaultRooms();S.seededRes=true;save();renderAll();openConfig('rooms');
      toast(n?n+' salle(s) ajoutée(s).':'Toutes les salles habituelles sont déjà présentes.');
    }},'Ajouter les salles habituelles (Labos E402 à E410, salles B303 à B010)')));
  }
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
    var l=slotLang(s);
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
  {sel:null,t:'Bienvenue Chef Bichette',p:'Cette appli construit les emplois du temps d\'un semestre en deux temps. D\'abord la semaine type, pour toutes les langues : tu glisses des blocs (langue, enseignant, salle) dans une grille jour par jour. Ensuite tu cliques sur « Générer le semainier » : le calendrier de chaque semaine se remplit, et un bouton par enseignant permet de voir où il est et avec qui. Un tour rapide ?'},
  {sel:'#sem',t:'1. Choisis le semestre',p:'De S5 à S10. Chaque semestre a sa propre semaine type, son semainier et ses dates de début et de fin.'},
  {sel:'#cfg',t:'2. Prépare la configuration',p:'Les langues (avec leurs couleurs), les groupes (TC3, TC4, TC2A3, TC2A4 de Gr1 à Gr4, M1 GC, M1 GM, chacun pouvant être rattaché à un autre groupe), les 26 enseignants et les salles sont déjà prêts. Les cours (matière, groupes, enseignant, nombre de séances) sont facultatifs : tu peux construire la semaine type directement avec les blocs spécialité, enseignant et salle.',view:'type'},
  {sel:'#wtype',t:'3. Ouvre la semaine type',p:'Ce bouton bascule entre la semaine type et le calendrier. Dans la semaine type, il y a une page par jour (onglets Lundi à Vendredi), avec le matin et l\'après-midi, une colonne par salle, comme ton PDF. Chaque bloc porte la couleur de sa langue, la spécialité, l\'enseignant, la salle et les semaines concernées.',view:'type'},
    {sel:'#pal',t:'4. Glisse une spécialité dans la grille',p:'À droite, les blocs Spécialités, Enseignants, Salles et Groupes. Ouvre l\'onglet Lundi, prends par exemple « Anglais » et dépose-le à 8h le matin, dans la case d\'une salle : un bloc de 2 h est créé, avec toutes les semaines hors vacances et jours fériés par défaut.',view:'type'},
  {sel:'#pal',t:'5. Ajoute l\'enseignant, puis la salle',p:'Glisse ensuite sur le bloc l\'année (TC3, TC2A3, TC4...), le niveau de groupe (Gr1 à Gr4) et le nom de l\'enseignant. L\'ordre n\'a pas d\'importance : le bloc affiche toujours l\'année, la spécialité avec son niveau (Anglais-G1), puis l\'enseignant, comme dans ton PDF.',view:'type'},
  {sel:'#tt',t:'6. Déplace et règle les blocs',p:'Pour changer l\'heure ou la salle d\'un bloc, glisse-le vers sa nouvelle place dans la page du jour ; pour le changer de jour, dépose-le sur l\'onglet du jour. Clique sur un bloc pour régler ses semaines. Les conflits (même groupe, enseignant ou salle en même temps, salle trop petite) sont entourés de rouge et listés dans Contrôle.',view:'type'},
  {sel:'.tw-gen',t:'7. Génère le semainier',p:'Quand la semaine type est prête, clique sur « Générer le semainier ». Chaque bloc devient une séance du calendrier, pour chacune de ses semaines. Le compteur indique combien de changements restent à répercuter : tu peux modifier la semaine type puis régénérer à tout moment.',view:'type'},
  {sel:'#tbar',t:'8. Un bouton par enseignant',p:'Dans le calendrier, clique sur le nom d\'un enseignant : tu vois sa semaine, avec pour chaque séance la salle et les groupes. Les flèches changent de semaine et « Imprimer » donne sa feuille de la semaine. « Tous » revient à la vue complète. La vue par groupe, par salle ou par langue reste disponible dans le menu « Vue ».',view:'cal'},
  {sel:'.top .wk',t:'9. Parcours le semainier',p:'Le numéro de semaine est celui de la semaine ISO (48, 49, 53...). Les jours fériés sont signalés en orange et les vacances de la zone B en bleu. Tu peux aussi sauter à une date précise.',view:'cal'},
  {sel:'#tt',t:'10. Ajuste une semaine sans toucher à la semaine type',p:'Clique sur une séance pour la modifier, la dupliquer ou l\'annuler ; glisse-la pour changer le jour ou l\'heure. Ces changements ne touchent jamais la semaine type, et une régénération ne les écrase pas. « Rétablir selon la semaine type » annule une modification manuelle.',view:'cal'},
  {sel:'#courses',t:'11. Reprogramme une séance annulée',p:'Une séance annulée repart dans les séances à placer : le compteur du cours (par exemple 11/12) montre ce qui manque. Fais-la glisser de la liste vers un autre créneau du calendrier.',view:'cal'},
  {sel:'#conf',t:'12. Le contrôle',p:'L\'appli vérifie en continu : groupe, enseignant ou salle en double, salle trop petite, séance hors semestre, séance un jour férié ou pendant les vacances, trop de séances pour un cours. Clique sur une ligne pour corriger.',view:'cal'},
  {sel:'#exp',t:'13. Sauvegarde et projection',p:'Tout s\'enregistre automatiquement sur le serveur : le voyant « Enregistré » en haut le confirme, sans redéploiement. La vue utilisateur (adresse sans /admin) est en lecture seule, avec les mêmes boutons par enseignant, et se met à jour toute seule pour la projection. Export / Import garde une copie JSON et des CSV pour Excel.',view:'cal'},
  {sel:null,t:'C\'est parti',p:'Tu peux relancer ce tutoriel avec le bouton « Tutoriel ». Ordre conseillé : glisse les spécialités, les enseignants et les salles dans la semaine type, génère le semainier, puis clique sur le nom de chaque enseignant pour vérifier sa semaine.',view:'type'}
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
  if(st.view){var wantType=(st.view==='type');if(wantType!==typeView){typeView=wantType;renderAll();}}
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

var APP_VERSION='2026-11-19';
function seenVersion(){try{return localStorage.getItem('edtSeenVersion')===APP_VERSION;}catch(e){return false;}}
function markVersionSeen(){try{localStorage.setItem('edtSeenVersion',APP_VERSION);}catch(e){}}
// Message affiche une fois par navigateur apres une mise a jour de l'appli
function showWhatsNew(next){
  function done(){markVersionSeen();closeModal();if(next)setTimeout(next,200);}
  openModal(h('div',{class:'modal'},
    h('h2',{},'La version a été améliorée'),
    h('p',{},'Tout ce que tu as déjà saisi est conservé : semestres et leurs dates, langues et couleurs, groupes, cours, séances. Rien n\'a été modifié ni remplacé.'),
    h('ul',{class:'news'},
      h('li',{},h('b',{},'Semaine type en glisser-déposer.'),' Glisse un cours de la liste dans un jour, une salle et une heure ; glisse un bloc pour le déplacer ; glisse un nom d\'enseignant sur un bloc.'),
      h('li',{},h('b',{},'Un bouton par enseignant.'),' Un clic affiche sa semaine : où il est et avec qui.'),
      h('li',{},h('b',{},'Jours fériés et vacances de la zone B.'),' Ils sont signalés dans la grille et dans Contrôle, et se mettent à jour tout seuls.'),
      h('li',{},h('b',{},'Groupes, enseignants et salles préremplis'),' d\'après le PDF des langues, et chaque groupe peut être rattaché à un autre groupe.'),
      h('li',{},h('b',{},'Tutoriel refait.'),' Le bouton « Tutoriel » explique la construction de la semaine type, puis la génération du semainier.')),
    h('div',{class:'actions'},h('span',{class:'sp'}),h('button',{class:'primary',onclick:done},'Compris'))));
}
function startApp(){
  fetchRemote().then(function(j){
    applyRemote(j,false);
    started=true;
    renderAll();
    loadVacances(function(){renderAll();});
    if(CAN_EDIT){
      setStatus('ok','Enregistré');
      if(!S.groups.length&&!S.seeded){
        var nn=addDefaultGroups();S.seeded=true;save();renderAll();
        toast(nn+' groupes habituels ajoutés (TC3, TC4, TC2A3, TC2A4 Gr1 à Gr4, M1 GC, M1 GM). Modifie-les dans Configuration > Groupes.');
      }
      if(!S.seededRes&&!S.teachers.length&&!S.rooms.length){
        var nt=addDefaultTeachers(),nr=addDefaultRooms();S.seededRes=true;save();renderAll();
        toast(nt+' enseignants et '+nr+' salles ajoutés d\'après ton PDF. Modifie-les dans Configuration.');
      }else if(!S.seededRes){S.seededRes=true;save();}
      var runTour=function(){if(!tourSeen())setTimeout(startTour,500);};
      if(!seenVersion())setTimeout(function(){showWhatsNew(runTour);},400);else runTour();
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
