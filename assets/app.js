/* 성격 동물 도감 — 검사 화면 로직. 데이터는 data.js(window.SITE)에 있어요. */
(function(){
const {T,ORDER,ITEMS,SPR,CRACKS,PAL,SLUG}=window.SITE;
const $=id=>document.getElementById(id);
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- pixel rendering ---------- */
function sprite(key,size,extra){
  const s=SPR[key]; let r="";
  const cracks=new Set((extra||[]).map(([y,x])=>y+","+x));
  s.rows.forEach((row,y)=>{[...row].forEach((ch,x)=>{
    if(cracks.has(y+","+x)){r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL["#"]}"/>`;return;}
    if(ch===".")return;
    if(ch==="e"){r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[s.base]}"/><rect class="eye" x="${x}" y="${y}" width="1" height="1" fill="${PAL["#"]}"/>`;return;}
    r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${PAL[ch]}"/>`;
  });});
  return `<svg class="spr" viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${r}</svg>`;
}
const ICON={
 play:["#......","##.....","###....","####...","###....","##.....","#......"],
 back:["...#...","..##...",".######","#######",".######","..##...","...#..."],
 copy:["####...","#..#...","#.####.","###..#.","..#..#.","..####.","......."],
 retry:[".####..","#....#.","#...###","#....#.","#......","#....#.",".####.."],
 book:["###.###","#.#.#.#","#.#.#.#","#.#.#.#","#.#.#.#","###.###","......."],
 look:[".###...","#...#..","#...#..","#...#..",".###...","....##.",".....##"]
};
function icon(name,px=2){
  let r="";ICON[name].forEach((row,y)=>[...row].forEach((c,x)=>{if(c==="#")r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;}));
  return `<svg class="spr" viewBox="0 0 7 7" width="${7*px}" height="${7*px}" fill="currentColor" aria-hidden="true">${r}</svg>`;
}

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
      <button class="pbtn red" id="toManual" type="button">${icon("book",2)}설명서</button>
      <button class="pbtn" id="copy" type="button">${icon("copy",2)}복사</button>
      <button class="pbtn" id="retry" type="button">${icon("retry",2)}다시</button></div>`;
    $("toManual").onclick=()=>$("manual").scrollIntoView({behavior:reduced?"auto":"smooth",block:"start"});
    $("copy").onclick=copyResult;
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
  show("result");
  $("screen").scrollIntoView({block:"nearest"});
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
