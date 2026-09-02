(() => {
  "use strict";

  const KEY = "eric-secret-garden-r2";
  const MAX_STAGE = 4;
  const CROPS = {
    carrot: ["胡萝卜", "🥕"], tomato: ["番茄", "🍅"], corn: ["玉米", "🌽"],
    pumpkin: ["南瓜", "🎃"], lettuce: ["生菜", "🥬"], strawberry: ["草莓", "🍓"]
  };
  const LEVELS = [
    { title:"先把今天的种子播下去", hint:"按下面的“播种 / 长大”，菜地会自动播下这一关需要的种子。", weather:"☀️ 晴朗", targets:{carrot:3,tomato:4,corn:1,pumpkin:2}, q:["这一关里，哪一种菜最多？","tomato",["carrot","tomato","pumpkin"]]},
    { title:"照顾好第二篮蔬菜", hint:"叶子小的时候先浇水；看到小虫提示，再用喷药保护它。", weather:"🌤️ 晴间多云", targets:{carrot:2,tomato:3,corn:3,pumpkin:2}, q:["玉米和胡萝卜，哪一种更多？","corn",["corn","carrot"]]},
    { title:"新朋友：生菜来了", hint:"生菜长得快，但每一轮也要记得浇水。", weather:"🌥️ 多云", targets:{carrot:2,tomato:2,corn:2,pumpkin:2,lettuce:4}, q:["哪一种菜正好有 4 棵？","lettuce",["lettuce","tomato","corn"]]},
    { title:"风吹过菜地，继续照料", hint:"这一关种类更多。先看目标，再决定你要先照顾哪一块。", weather:"🍃 微风", targets:{carrot:2,tomato:3,corn:2,pumpkin:1,lettuce:4}, q:["番茄比南瓜多几棵？","2",["1","2","3"],true]},
    { title:"秘密菜园的草莓日", hint:"最后一关会解锁草莓。把整篮菜照顾到成熟吧！", weather:"🌦️ 太阳雨", targets:{carrot:1,tomato:2,corn:2,pumpkin:1,lettuce:3,strawberry:3}, q:["草莓和生菜一共有几棵？","6",["5","6","7"],true]}
  ];

  const $ = id => document.getElementById(id);
  const el = {
    canvas:$("gardenCanvas"), target:$("targetList"), badge:$("levelBadge"), weather:$("weatherBadge"),
    progress:$("levelProgress"), fill:$("progressFill"), title:$("missionTitle"), hint:$("missionHint"),
    water:$("waterStatus"), spray:$("sprayStatus"), growth:$("growthStatus"), stars:$("starCount"), log:$("eventLog"),
    unlockIcon:$("unlockIcon"), unlockTitle:$("unlockTitle"), unlockText:$("unlockText"), grow:$("growBtn"), growIcon:$("growIcon"),
    growLabel:$("growLabel"), growSub:$("growSubLabel"), toast:$("toast"), stats:$("statsDialog"), body:$("statsBody"),
    foot:$("statsFoot"), summary:$("statsSummary"), qBtn:$("questionBtn"), qBox:$("questionBox"), levelDialog:$("levelDialog"),
    completeTitle:$("completeTitle"), completeText:$("completeText"), reward:$("levelReward"), levelQ:$("levelQuestion"), next:$("nextLevelBtn")
  };
  const ctx = el.canvas.getContext("2d");
  let box={w:1,h:1,dpr:1}, hits=[], drag=null, pinch=null, toastTimer;

  const blank = () => ({ level:0, stars:0, tool:"harvest", planted:false, round:0, plots:[], harvested:{}, totalHarvest:{}, log:[{i:"👋",t:"欢迎回来",x:"今天也来照顾秘密菜园吧。"}], camera:{angle:-.08,zoom:1}, completed:false });
  let state = load();
  function load(){ try { return {...blank(), ...JSON.parse(localStorage.getItem(KEY)||"{}")}; } catch { return blank(); } }
  function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }
  function level(){ return LEVELS[Math.max(0,Math.min(LEVELS.length-1,state.level))]; }
  function totalTarget(){ return Object.values(level().targets).reduce((a,b)=>a+b,0); }
  function gotTotal(){ return Object.values(state.harvested).reduce((a,b)=>a+(+b||0),0); }
  function got(id){ return +state.harvested[id]||0; }
  function note(i,t,x){ state.log.unshift({i,t,x}); state.log=state.log.slice(0,6); }
  function toast(text,ms=1700){ el.toast.textContent=text; el.toast.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.toast.classList.remove("show"),ms); }

  function plant(){
    const list=[]; Object.entries(level().targets).forEach(([id,n])=>{for(let i=0;i<n;i++) list.push(id);});
    state.plots=Array.from({length:12},(_,index)=>({index,crop:list[index]||null,stage:list[index]?1:0,watered:false,pest:false,harvested:false}));
    state.planted=true; state.round=1; note("🌱","种子播好了",`这一关一共 ${list.length} 棵。`); save(); toast("种子都播好了！选 💧 浇水，再点菜地。"); update();
  }
  function setTool(tool){ state.tool=tool; save(); document.querySelectorAll(".tool-btn").forEach(b=>b.classList.toggle("active",b.dataset.tool===tool)); toast(tool==="water"?"💧 点菜地浇水":tool==="spray"?"🧴 点有小虫的菜地":"🧺 成熟后点蔬菜收菜",1100); }
  function act(plot){
    if(!plot?.crop||plot.harvested) return toast(plot?.harvested?"这一块已经收好啦。":"这块现在是空的。",1000);
    if(state.tool==="water"){
      if(plot.stage>=MAX_STAGE) return toast("已经成熟，不用再浇水啦。",1000);
      if(plot.watered) return toast("这块已经浇过水啦。",1000);
      plot.watered=true; note("💧",`给${CROPS[plot.crop][0]}浇水`,"泥土湿润了，小苗可以继续长。"); save(); update(); return;
    }
    if(state.tool==="spray"){
      if(!plot.pest) return toast("这里没有小虫。",1000);
      plot.pest=false; note("🛡️",`保护${CROPS[plot.crop][0]}`,"小虫走啦，这一块安全了。"); save(); update(); return;
    }
    if(plot.stage<MAX_STAGE) return toast("还没成熟，再照顾一下吧。",1000);
    plot.harvested=true; const id=plot.crop; state.harvested[id]=got(id)+1; state.totalHarvest[id]=(+state.totalHarvest[id]||0)+1;
    note("🧺",`摘到${CROPS[id][0]}`,`篮子里现在有 ${gotTotal()} 棵菜。`); save(); update(); toast(`${CROPS[id][1]} 收进篮子！ ${gotTotal()} / ${totalTarget()}`,900);
    if(gotTotal()>=totalTarget()) finish();
  }
  function grow(){
    if(state.completed) return toast("秘密菜园 R2 已经全部通关啦！");
    if(!state.planted) return plant();
    const living=state.plots.filter(p=>p.crop&&!p.harvested&&p.stage<MAX_STAGE);
    if(!living.length) return toast("都长大了，去收菜吧！");
    const dry=living.filter(p=>!p.watered); if(dry.length){ setTool("water"); return toast(`还有 ${dry.length} 块没浇水。`); }
    const pests=living.filter(p=>p.pest); if(pests.length){ setTool("spray"); return toast(`有 ${pests.length} 块有小虫。`); }
    living.forEach(p=>{p.stage=Math.min(MAX_STAGE,p.stage+1);p.watered=false;}); state.round=Math.min(MAX_STAGE,state.round+1);
    if(state.round===3){ const ps=living.filter((_,i)=>(i+state.level)%4===1).slice(0,Math.min(2,Math.max(1,state.level))); ps.forEach(p=>p.pest=true); note("🐛","发现几只小虫",`有 ${ps.length} 块菜地需要保护。`); }
    else if(state.round>=MAX_STAGE){ note("✨","蔬菜成熟啦","换成“收菜”，点成熟的蔬菜装进篮子。"); state.tool="harvest"; }
    else note("🌿","小苗长高了",`现在是第 ${state.round} / ${MAX_STAGE} 个生长阶段。`);
    save(); update();
  }
  function finish(){
    state.stars+=3; note("⭐",`第 ${state.level+1} 关完成`,"目标全部收进篮子，得到 3 颗星。"); save();
    const last=state.level===LEVELS.length-1; el.completeTitle.textContent=last?"秘密菜园大丰收！":"这一篮收好啦！"; el.completeText.textContent=last?"你把 R2 的五关都照顾完了。":`第 ${state.level+1} 关完成，得到 3 颗星。`;
    el.reward.innerHTML=`<span class="reward-pill">⭐ +3</span><span class="reward-pill">🧺 ${gotTotal()} 棵</span>`; renderQuestion(el.levelQ,level().q); el.next.textContent=last?"看看我的菜园 →":"下一关 →"; el.levelDialog.showModal();
  }
  function next(){ if(state.level>=LEVELS.length-1){state.completed=true;save();el.levelDialog.close();update();return toast("🌟 全部通关！",2200);} state.level++;state.planted=false;state.round=0;state.plots=[];state.harvested={};state.tool="harvest";note("🚪",`来到第 ${state.level+1} 关`,level().hint);save();el.levelDialog.close();update(); }

  function renderQuestion(container,q){
    const [text,answer,choices,numeric]=q; container.innerHTML=`<div class="question-title">💡 ${text}</div><div class="answer-row">${choices.map(c=>`<button class="answer-btn" data-a="${c}" type="button">${numeric?c:`${CROPS[c][1]} ${CROPS[c][0]}`}</button>`).join("")}</div><div class="answer-result"></div>`;
    container.querySelectorAll(".answer-btn").forEach(b=>b.onclick=()=>{const ok=b.dataset.a===answer;b.classList.add(ok?"correct":"wrong");container.querySelector(".answer-result").textContent=ok?"答对啦！🌟":"再看看，试一次。";});
  }
  function showStats(){
    const ids=Object.keys(CROPS).filter(id=>level().targets[id]||state.totalHarvest[id]); let sum=0,tgt=0,left=0;
    el.body.innerHTML=ids.map(id=>{const g=got(id),t=level().targets[id]||0,l=Math.max(0,t-g);sum+=g;tgt+=t;left+=l;return `<tr><td>${CROPS[id][1]} ${CROPS[id][0]}</td><td>${g}</td><td>${t||"—"}</td><td>${t?l:"—"}</td></tr>`;}).join("");
    el.foot.innerHTML=`<tr><td>合计</td><td>${sum}</td><td>${tgt}</td><td>${left}</td></tr>`; const all=Object.values(state.totalHarvest).reduce((a,b)=>a+(+b||0),0);
    el.summary.innerHTML=`<div class="summary-cell"><b>${sum}</b><span>本关已摘</span></div><div class="summary-cell"><b>${all}</b><span>总共摘过</span></div><div class="summary-cell"><b>${state.stars}</b><span>星星</span></div>`; el.qBox.hidden=true; el.stats.showModal();
  }

  function update(){
    const L=level(), g=gotTotal(), t=totalTarget(); el.badge.textContent=`第 ${state.level+1} 关`; el.weather.textContent=L.weather; el.progress.textContent=`${g} / ${t}`; el.fill.style.width=`${Math.min(100,g/t*100)}%`; el.title.textContent=L.title; el.hint.textContent=L.hint; el.stars.textContent=`⭐ ${state.stars}`;
    el.target.innerHTML=Object.entries(L.targets).map(([id,n])=>`<div class="target-chip"><span class="emoji">${CROPS[id][1]}</span><b>${CROPS[id][0]}</b><small>${got(id)} / ${n}</small></div>`).join("");
    const living=state.plots.filter(p=>p.crop&&!p.harvested&&p.stage<MAX_STAGE), watered=living.filter(p=>p.watered).length, pests=state.plots.filter(p=>p.pest&&!p.harvested).length;
    el.water.textContent=`💧 浇水 ${watered}/${living.length}`; el.spray.textContent=`🛡️ 虫害 ${pests}`; el.growth.textContent=`🌿 生长 ${state.round}/${MAX_STAGE}`;
    if(!state.planted){el.growIcon.textContent="🌱";el.growLabel.textContent="播种";el.growSub.textContent="按一下开始今天的菜园";}
    else if(state.round<MAX_STAGE){el.growIcon.textContent="🌿";el.growLabel.textContent="长大一步";el.growSub.textContent="先浇水，必要时赶走小虫";}
    else {el.growIcon.textContent="🧺";el.growLabel.textContent="成熟啦";el.growSub.textContent="换成收菜，点成熟蔬菜";}
    el.log.innerHTML=state.log.map(n=>`<div class="log-item"><span class="log-icon">${n.i}</span><div><b>${n.t}</b><p>${n.x}</p></div></div>`).join("");
    if(state.level<2){el.unlockIcon.textContent="🔒";el.unlockTitle.textContent="菜地成长计划";el.unlockText.textContent=`再过 ${2-state.level} 关解锁生菜`;}
    else if(state.level<4){el.unlockIcon.textContent="🥬";el.unlockTitle.textContent="生菜已经解锁";el.unlockText.textContent=`再过 ${4-state.level} 关会见到草莓`;}
    else {el.unlockIcon.textContent="🍓";el.unlockTitle.textContent="草莓已经解锁";el.unlockText.textContent=state.completed?"秘密菜园 R2 已全部通关":"最后一关，把它们照顾成熟吧";}
    document.querySelectorAll(".tool-btn").forEach(b=>b.classList.toggle("active",b.dataset.tool===state.tool)); draw();
  }

  function resize(){ const r=el.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);box={w:r.width||1,h:r.height||1,dpr:d};el.canvas.width=Math.round(box.w*d);el.canvas.height=Math.round(box.h*d);ctx.setTransform(d,0,0,d,0,0);draw(); }
  function pos(i){return {x:(i%4-1.5)*1.65,z:(Math.floor(i/4)-1)*1.75};}
  function project(x,z,y=0){const a=state.camera.angle||0,c=Math.cos(a),s=Math.sin(a),rx=x*c-z*s,rz=x*s+z*c,k=Math.min(box.w/12,box.h/8.4)*(state.camera.zoom||1);return {x:box.w*.5+(rx-rz)*k,y:box.h*.57+(rx+rz)*k*.42-y*k};}
  function poly(ps,fill,stroke){ctx.beginPath();ps.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
  function draw(){
    if(!box.w)return; hits=[]; const grd=ctx.createLinearGradient(0,0,0,box.h);grd.addColorStop(0,"#d9e9e2");grd.addColorStop(.5,"#f1e8bd");grd.addColorStop(.51,"#a7bd73");grd.addColorStop(1,"#8fa967");ctx.fillStyle=grd;ctx.fillRect(0,0,box.w,box.h);
    ctx.font=`${Math.max(34,Math.min(56,box.w*.065))}px system-ui`;ctx.globalAlpha=.7;ctx.fillText(level().weather.split(" ")[0],box.w*.07,box.h*.14);ctx.globalAlpha=1;
    const plots=state.plots.length?state.plots:Array.from({length:12},(_,index)=>({index,crop:null,stage:0})); plots.slice().sort((a,b)=>project(pos(a.index).x,pos(a.index).z).y-project(pos(b.index).x,pos(b.index).z).y).forEach(p=>{
      const q=pos(p.index),hw=.62,hz=.62,corners=[project(q.x-hw,q.z-hz),project(q.x+hw,q.z-hz),project(q.x+hw,q.z+hz),project(q.x-hw,q.z+hz)],center=project(q.x,q.z,.02);poly(corners,p.watered?"#654832":"#8a6042","rgba(255,245,220,.3)");hits.push({p,x:center.x,y:center.y,r:Math.max(25,38*(state.camera.zoom||1))});
      if(p.crop&&!p.harvested){const stage=Math.max(1,p.stage),size=(18+stage*6)*(state.camera.zoom||1);ctx.font=`${size}px system-ui`;ctx.textAlign="center";ctx.fillText(stage<3?"🌱":CROPS[p.crop][1],center.x,center.y-12-stage*5);ctx.textAlign="start";if(p.pest){ctx.font=`${18*(state.camera.zoom||1)}px system-ui`;ctx.fillText("🐛",center.x+18,center.y-38);}if(stage>=MAX_STAGE){ctx.fillText("✨",center.x-30,center.y-35);}}
    });
  }
  function point(e){const r=el.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function hit(p){return hits.map(h=>({...h,d:Math.hypot(p.x-h.x,p.y-h.y)})).filter(h=>h.d<h.r).sort((a,b)=>a.d-b.d)[0]?.p;}
  const pointers=new Map(); el.canvas.onpointerdown=e=>{el.canvas.setPointerCapture(e.pointerId);const p=point(e);pointers.set(e.pointerId,p);if(pointers.size===1)drag={p,a:state.camera.angle,m:false,t:performance.now()};if(pointers.size===2){const a=[...pointers.values()];pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:state.camera.zoom};drag=null;}};
  el.canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);if(pointers.size===2&&pinch){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);state.camera.zoom=Math.max(.76,Math.min(1.35,pinch.z*d/pinch.d));draw();}else if(drag){const dx=p.x-drag.p.x;if(Math.abs(dx)>7)drag.m=true;state.camera.angle=drag.a+dx*.006;draw();}};
  function up(e){const p=point(e),click=pointers.size===1&&drag&&!drag.m&&performance.now()-drag.t<550;pointers.delete(e.pointerId);if(click)act(hit(p));if(pointers.size<2)pinch=null;if(!pointers.size){drag=null;save();}} el.canvas.onpointerup=up;el.canvas.onpointercancel=up;el.canvas.addEventListener("wheel",e=>{e.preventDefault();state.camera.zoom=Math.max(.76,Math.min(1.35,state.camera.zoom*(e.deltaY>0?.93:1.07)));save();draw();},{passive:false});

  document.querySelectorAll(".tool-btn").forEach(b=>b.onclick=()=>setTool(b.dataset.tool)); el.grow.onclick=grow; $("statsBtn").onclick=showStats; $("speakBtn").onclick=()=>{if(!speechSynthesis)return toast("这个浏览器暂时不能朗读。");speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`第${state.level+1}关。${level().title}。${level().hint}`);u.lang="zh-CN";u.rate=.88;speechSynthesis.speak(u);};
  $("resetBtn").onclick=()=>{if(confirm("要把 Eric 的秘密菜园重新从第 1 关开始吗？")){localStorage.removeItem(KEY);state=blank();save();update();toast("已经重新开始。");}}; el.qBtn.onclick=()=>{el.qBox.hidden=false;renderQuestion(el.qBox,level().q);};el.next.onclick=next;addEventListener("resize",resize);if("ResizeObserver" in window)new ResizeObserver(resize).observe(el.canvas);update();requestAnimationFrame(resize);
})();
