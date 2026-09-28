/* 성격 동물 도감 — 검사 화면 로직. 데이터는 data.js(window.SITE)에 있어요. */
(function(){
const {T,ORDER,ITEMS,SPR,CRACKS,PAL,SLUG,DOMAIN,KAKAO_KEY}=window.SITE;
/* 카카오 SDK: 키가 있을 때만 불러와요 */
if(KAKAO_KEY){const s=document.createElement("script");s.src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";s.crossOrigin="anonymous";
  s.onload=()=>{try{if(!Kakao.isInitialized())Kakao.init(KAKAO_KEY);}catch(e){}};document.head.appendChild(s);}
const $=id=>document.getElementById(id);
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- pixel rendering ---------- */
let _pid=0;
function sprite(key,size,extra){
  const s=SPR[key]; const pid="j"+(++_pid);
  const F=ch=>ch==="+"?`url(#${pid})`:PAL[ch];
  let r=`<defs><pattern id="${pid}" width=".5" height=".5" patternUnits="userSpaceOnUse"><rect width=".5" height=".5" fill="${PAL.o}"/><rect width=".25" height=".25" fill="${PAL["#"]}"/><rect x=".25" y=".25" width=".25" height=".25" fill="${PAL["#"]}"/></pattern></defs>`;
  const cracks=new Set((extra||[]).map(([y,x])=>y+","+x));
  s.rows.forEach((row,y)=>{[...row].forEach((ch,x)=>{
    if(cracks.has(y+","+x)){r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL["#"]}"/>`;return;}
    if(ch===".")return;
    if(ch==="e"){r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${F(s.base)}"/><rect class="eye" x="${x}" y="${y}" width="1" height="1" fill="${PAL["#"]}"/>`;return;}
    r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${F(ch)}"/>`;
  });});
  return `<svg class="spr" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${r}</svg>`;
}
const ICON={
 play:["#......","##.....","###....","####...","###....","##.....","#......"],
 back:["...#...","..##...",".######","#######",".######","..##...","...#..."],
 copy:["####...","#..#...","#.####.","###..#.","..#..#.","..####.","......."],
 retry:[".####..","#....#.","#...###","#....#.","#......","#....#.",".####.."],
 book:["###.###","#.#.#.#","#.#.#.#","#.#.#.#","#.#.#.#","###.###","......."],
 talk:[".#####.","#######","#######","#######",".#####.","..#....",".#....."],
 save:["...#...","...#...",".#.#.#.","..###..","...#...","#.....#","#######"],
 look:[".###...","#...#..","#...#..","#...#..",".###...","....##.",".....##"]
};
function icon(name,px=2){
  let r="";ICON[name].forEach((row,y)=>[...row].forEach((c,x)=>{if(c==="#")r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;}));
  return `<svg class="spr" viewBox="0 0 7 7" width="${7*px}" height="${7*px}" fill="currentColor" aria-hidden="true">${r}</svg>`;
}

let current=null, cardBlob=null;
let answers=new Array(ITEMS.length).fill(null), idx=0, mode="intro", lastShare="", timers=[];
const later=(fn,ms)=>{timers.push(setTimeout(fn,ms));};
const clearTimers=()=>{timers.forEach(clearTimeout);timers=[];};
const introManualHTML=$("manual").innerHTML;

/* ---------- chrome ---------- */
function tick(){const d=new Date();$("clock").textContent=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}
tick();setInterval(tick,20000);
$("back").innerHTML=icon("back",2)+"<span>이전</span>";

/* ---------- intro ---------- */
$("miniRow").innerHTML=ORDER.map(k=>`<div class="mini" data-k="${k}">${sprite(k,32)}<span>${T[k].animal}</span></div>`).join("");
let introI=0;
function introShow(){
  const k=ORDER[introI%5];
  $("introSprite").innerHTML=sprite(k,128);
  $("introName").textContent=`No.${T[k].no} ${T[k].animal} · ${T[k].trait}`;
  document.querySelectorAll(".mini").forEach(m=>m.classList.toggle("on",m.dataset.k===k));
}
introShow();
setInterval(()=>{if(mode==="intro"){introI++;introShow();}},1800);

/* ---------- screens ---------- */
function show(id){["intro","quiz","hatch","result"].forEach(s=>$("s-"+s).hidden=(s!==id));mode=id;renderControls();}

function renderControls(){
  const c=$("controls");
  if(mode==="intro"){
    c.innerHTML=`<div class="btnrow">
      <button class="pbtn red wide" id="start" type="button">${icon("play",2)}검사 시작</button>
      <button class="pbtn wide" id="sample" type="button">${icon("look",2)}예시 결과</button></div>`;
    $("start").onclick=startQuiz;
    $("sample").onclick=()=>{answers=[3,4,5,2,5, 3,2,1,4,1, 3,4,4,2,2, 3,2,2,3,1];hatch();};
  } else if(mode==="quiz"){
    const S=[["전혀","전혀 아니다"],["아니다","아니다"],["보통","보통이다"],["그렇다","그렇다"],["매우","매우 그렇다"]];
    c.innerHTML=`<div class="likert">${S.map(([s,full],i)=>`<div class="key"><button class="pbtn" type="button" id="opt${i+1}" data-v="${i+1}" aria-label="${i+1}. ${full}" aria-pressed="${answers[idx]===i+1}">${i+1}</button><span class="cap">${s}</span></div>`).join("")}</div>`;
    c.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>answer(+b.dataset.v));
  } else if(mode==="hatch"){
    c.innerHTML=`<div class="btnrow"><button class="pbtn wide" id="skip" type="button">${icon("play",2)}건너뛰기</button></div>`;
    $("skip").onclick=()=>{clearTimers();$("screen").classList.remove("flash");finish();};
  } else {
    c.innerHTML=`<div class="btnrow">
      <button class="pbtn red" id="kakao" type="button">${icon("talk",2)}카톡 공유</button>
      <button class="pbtn" id="save" type="button">${icon("save",2)}이미지 저장</button></div>
      <div class="btnrow">
      <button class="pbtn" id="toManual" type="button">${icon("book",2)}설명서</button>
      <button class="pbtn" id="copy" type="button">${icon("copy",2)}복사</button>
      <button class="pbtn" id="retry" type="button">${icon("retry",2)}다시</button></div>`;
    $("toManual").onclick=()=>$("manual").scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"});
    $("copy").onclick=copyResult;
    $("kakao").onclick=shareKakao;
    $("save").onclick=saveImage;
    $("retry").onclick=startQuiz;
  }
}

/* ---------- quiz ---------- */
function startQuiz(){clearTimers();answers.fill(null);idx=0;$("manual").innerHTML=introManualHTML;show("quiz");renderQ();}
function renderQ(){
  $("count").textContent=`Q ${String(idx+1).padStart(2,"0")}/${ITEMS.length}`;
  $("dots").innerHTML=ITEMS.map((_,i)=>`<i class="${i<idx?"done":i===idx?"now":""}"></i>`).join("");
  $("qtext").textContent=ITEMS[idx][2];
  $("egg").innerHTML=sprite("EGG",112,CRACKS[Math.floor(idx/5)]);
  document.querySelectorAll("[data-v]").forEach(b=>b.setAttribute("aria-pressed",answers[idx]===+b.dataset.v));
}
let lock=false;
function answer(v){
  if(lock)return;lock=true;
  answers[idx]=v;
  document.querySelectorAll("[data-v]").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.v===v));
  setTimeout(()=>{lock=false;if(idx<ITEMS.length-1){idx++;renderQ();}else hatch();},160);
}
$("back").onclick=()=>{if(idx===0){show("intro");return;}idx--;renderQ();};
document.addEventListener("keydown",e=>{if(mode!=="quiz")return;const n=+e.key;if(n>=1&&n<=5){const b=$("opt"+n);b.classList.add("pressed");setTimeout(()=>b.classList.remove("pressed"),120);answer(n);}});

/* ---------- hatch ---------- */
function hatch(){
  clearTimers();show("hatch");
  $("hatchEgg").innerHTML=sprite("EGG",176,CRACKS[4]);
  $("hatchMsg").textContent="알이 움직여요";
  if(reduced){finish();return;}
  later(()=>{$("hatchMsg").textContent="!!";},900);
  later(()=>{$("screen").classList.add("flash");},1500);
  later(()=>{$("screen").classList.remove("flash");finish();},1700);
}

/* ---------- scoring ---------- */
function score(){
  const sum={O:0,C:0,E:0,A:0,N:0};
  ITEMS.forEach(([k,r],i)=>{const v=answers[i];sum[k]+=r?6-v:v;});
  const pct={};ORDER.forEach(k=>pct[k]=Math.round((sum[k]-4)/16*100));
  return pct;
}
function level(p){return p>=65?"높은 편":p<=35?"낮은 편":"중간";}
const hasBatchim=w=>((w.charCodeAt(w.length-1)-0xAC00)%28)!==0;
const siteURL=()=>/^https?:/.test(location.protocol)?location.origin+"/":"";

function finish(){
  const p=score();
  const ranked=[...ORDER].sort((a,b)=>p[b]-p[a]);
  const main=ranked[0], sub=ranked[1], m=T[main];
  const name=`${T[sub].adj} ${m.animal}`;
  $("rNo").textContent=`No.${m.no} · ${m.trait}`;
  $("rLatin").textContent=m.latin;
  $("rSprite").innerHTML=sprite(main,128);
  $("rName").textContent=name;
  $("meters").innerHTML=ORDER.map(k=>{const f=Math.round(p[k]/10);
    return `<div class="meter${k===main?" top":""}" role="img" aria-label="${T[k].trait} ${p[k]}점, ${level(p[k])}">
      <span class="lb">${T[k].short}</span>
      <span class="blocks">${Array.from({length:10},(_,i)=>`<i class="${i<f?"f":""}"></i>`).join("")}</span>
      <span class="v">${p[k]}</span></div>`;}).join("");
  $("toast").textContent="";$("toast").classList.remove("on");
  lastShare=`성격 동물 도감에서 나는 '${name}'${hasBatchim(m.animal)?"이":"가"} 나왔어요!\n`+ORDER.map(k=>`${T[k].trait} ${p[k]}`).join(" · ")+(siteURL()?`\n${siteURL()}`:"");
  resultManual(main,sub,p,name);
  current={main,sub,p,name};cardBlob=null;
  makeCard().then(b=>{cardBlob=b;}).catch(()=>{});
  show("result");
  $("screen").scrollIntoView({block:"nearest"});
}


/* ---------- share card (JPG) ---------- */
const shareURL=()=>/^https?:/.test(location.protocol)?location.href.split("#")[0].split("?")[0].replace(/index\.html$/,""):DOMAIN+"/";
function checker(g,x,y,w,h,s,color){g.fillStyle=color;for(let yy=0;yy<h;yy+=s)for(let xx=((yy/s)%2)*s;xx<w;xx+=2*s)g.fillRect(x+xx,y+yy,Math.min(s,w-xx),Math.min(s,h-yy));}
function drawSprite(g,key,x,y,cell){
  const s=SPR[key];
  s.rows.forEach((row,ry)=>[...row].forEach((ch,rx)=>{
    if(ch===".")return;
    const px=x+rx*cell, py=y+ry*cell;
    const c=ch==="e"?"#":ch;
    if(c==="+"){g.fillStyle=PAL.o;g.fillRect(px,py,cell,cell);checker(g,px,py,cell,cell,cell/4,PAL["#"]);}
    else{g.fillStyle=PAL[c];g.fillRect(px,py,cell,cell);}
  }));
}
async function makeCard(){
  const {main,sub,p,name}=current, m=T[main];
  try{await Promise.all([document.fonts.load('700 72px Galmuri11'),document.fonts.load('400 24px Galmuri11')]);}catch(e){}
  const W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
  const INK="#1C2A62",SHELL="#ECEEE8",LCD="#C8D4E1",LT="#EDF1F3",LINE="#A9B8CC",RED="#D2473A",DESK="#A2A5A6";
  const F=(sz,b)=>`${b?"700":"400"} ${sz}px Galmuri11, "Galmuri11 Full", monospace`;
  g.fillStyle=DESK;g.fillRect(0,0,W,H);
  checker(g,0,0,W,H,6,"rgba(0,0,0,.05)");
  // device + dither shadow
  checker(g,72,72,960,1230,4,INK);
  g.fillStyle=SHELL;g.fillRect(48,48,960,1230);
  g.lineWidth=12;g.strokeStyle=INK;g.strokeRect(54,54,948,1218);
  g.fillStyle=RED;g.fillRect(96,98,16,16);
  g.fillStyle=INK;g.font=F(24,true);g.textAlign="left";g.fillText("성격도감",124,116);
  g.font=F(24);g.fillText("PET-SYS",242,116);
  g.fillStyle=INK;g.textAlign="right";g.fillText("BIG FIVE · IPIP",984,116);
  // screen
  g.fillStyle=LCD;g.fillRect(96,144,888,768);
  g.fillStyle=LINE;g.fillRect(96,144,888,10);g.fillRect(96,144,10,768);
  g.lineWidth=8;g.strokeStyle=INK;g.strokeRect(100,148,880,760);
  g.fillStyle=INK;g.font=F(24);g.textAlign="left";g.fillText(`No.${m.no} · ${m.trait}`,136,204);
  g.textAlign="right";g.fillText(m.latin,944,204);
  drawSprite(g,main,348,236,24);
  checker(g,420,640,240,8,4,INK);
  g.textAlign="center";g.fillStyle=INK;g.font=F(24);g.fillText("부화 완료! 당신은",540,704);
  g.font=F(72,true);g.fillText(name,540,796);
  g.font=F(24);g.fillText(m.tag,540,860);
  // meters
  g.fillStyle=LT;g.fillRect(96,944,888,236);g.lineWidth=6;g.strokeStyle=INK;g.strokeRect(99,947,882,230);
  ORDER.forEach((k,i)=>{
    const y=976+i*42, f=Math.round(p[k]/10);
    g.font=F(24,k===main);g.textAlign="left";g.fillStyle=INK;g.fillText(T[k].short,128,y+22);
    for(let j=0;j<10;j++){const bx=228+j*62;
      if(j<f){g.fillStyle=k===main?RED:INK;g.fillRect(bx,y,54,26);}else checker(g,bx,y,54,26,2,LINE);}
    g.textAlign="right";g.fillStyle=INK;g.fillText(String(p[k]),952,y+22);
  });
  g.font=F(24);g.textAlign="center";g.fillStyle=INK;
  g.fillText("나와 닮은 동물은?  "+shareURL().replace(/^https?:\/\//,"").replace(/\/$/,""),540,1236);
  // grain
  const img=g.getImageData(0,0,W,H),d=img.data;
  for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*34;d[i]+=n;d[i+1]+=n;d[i+2]+=n;}
  g.putImageData(img,0,0);
  return await new Promise(r=>cv.toBlob(r,"image/jpeg",.92));
}
const cardName=()=>`성격동물도감-${SLUG[current.main]}.jpg`;
function showImage(url){
  const m=document.createElement("div");m.className="modal";m.setAttribute("role","dialog");m.setAttribute("aria-label","결과 이미지");
  m.innerHTML=`<div class="modal-card"><img src="${url}" alt="${current.name} 결과 카드"><p>저장이 안 되면 이미지를 길게 눌러 저장해 주세요.</p><button class="pbtn red wide" type="button">닫기</button></div>`;
  m.addEventListener("click",e=>{if(e.target===m||e.target.tagName==="BUTTON")m.remove();});
  document.body.appendChild(m);m.querySelector("button").focus();
}
async function saveImage(){
  const blob=cardBlob||await makeCard();cardBlob=blob;
  const url=URL.createObjectURL(blob);
  try{const a=document.createElement("a");a.href=url;a.download=cardName();document.body.appendChild(a);a.click();a.remove();}catch(e){}
  showImage(url);
}
async function shareKakao(){
  const {main,name}=current, m=T[main], url=shareURL();
  if(window.Kakao&&Kakao.isInitialized&&Kakao.isInitialized()){
    Kakao.Share.sendDefault({objectType:"feed",
      content:{title:`나는 '${name}'`,description:`${m.tag}. 나와 닮은 동물은?`,
        imageUrl:`${DOMAIN}/assets/share/${SLUG[main]}.png`,link:{mobileWebUrl:url,webUrl:url}},
      buttons:[{title:"나도 검사하기",link:{mobileWebUrl:url,webUrl:url}}]});
    return;
  }
  if(navigator.share){
    try{
      const data={title:"성격 동물 도감",text:`나는 '${name}'! 나와 닮은 동물은?`,url};
      if(cardBlob){const file=new File([cardBlob],cardName(),{type:"image/jpeg"});if(navigator.canShare&&navigator.canShare({files:[file]}))data.files=[file];}
      await navigator.share(data);return;
    }catch(e){if(e&&e.name==="AbortError")return;}
  }
  const t=$("toast");
  try{await navigator.clipboard.writeText(`${lastShare}`);t.textContent="링크를 복사했어요. 카톡에 붙여넣어 주세요";}
  catch(e){t.textContent="공유창을 열 수 없어요. 복사 버튼을 눌러 주세요";}
  t.classList.add("on");
}

async function copyResult(){
  const t=$("toast");
  try{await navigator.clipboard.writeText(lastShare);t.textContent="COPIED! 친구에게 붙여넣어 보세요";t.classList.add("on");}
  catch(e){
    t.textContent="자동 복사가 막혀 있어요. 설명서 아래 문구를 복사해 주세요";t.classList.add("on");
    const ta=$("shareFallback");if(ta){ta.hidden=false;ta.value=lastShare;ta.select();}
  }
}

function resultManual(main,sub,p,name){
  const m=T[main], s=T[sub];
  $("manual").innerHTML=`
  <div><p class="kicker">No.${m.no} · ${m.latin}</p><h2>${name}</h2></div>
  <section><h3>이 동물은요</h3>
    <p>${m.about} 여기에 두 번째로 높은 ${s.trait} 덕분에 '${s.adj}' 면이 더해졌어요. ${s.flavor}.</p></section>
  <div class="two">
    <div><h3>강점</h3><p>${m.plus}</p></div>
    <div><h3>주의할 점</h3><p>${m.minus}</p></div>
    <div><h3>서식지</h3><p>${m.home}</p></div>
    <div><h3>닮은 동물</h3><p>${s.animal}의 ${s.adj} 기질도 조금 있어요</p></div>
  </div>
  <section><h3>연구에서는</h3><p>${m.research}</p>
    <p><a class="more" href="animals/${SLUG[main]}.html">${m.animal} 해설 자세히 보기 →</a></p></section>
  <section><h3>점수 읽는 법</h3>
    <p>${ORDER.map(k=>`${T[k].trait}${k==="N"?"(신경성)":""} ${p[k]}점, ${level(p[k])}`).join(" · ")}</p>
    <p>0~100은 원점수를 환산한 값이에요. 다른 사람과 비교한 백분위가 아니에요. 칸 하나가 10점이에요.</p></section>
  <div class="ad" data-slot="result"></div>
  <section style="width:100%"><h3>공유 문구</h3><textarea id="shareFallback" rows="4" readonly hidden></textarea>
    <p class="note">게임기의 복사 버튼을 누르면 결과 문구가 복사돼요.</p></section>
  <p class="note">응답은 이 브라우저 안에서만 계산되고, 어디에도 저장되거나 전송되지 않아요.</p>`;
}

show("intro");
})();
