/* ================= Canvas ================= */
const cv=document.getElementById("cv"),ctx=cv.getContext("2d");
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+"px";cv.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0);}
addEventListener("resize",resize);resize();

/* ================= Game state ================= */
const game={state:"menu",world:null,levelIdx:0,cfg:null,
  player:null,enemies:[],bullets:[],enemyBullets:[],particles:[],pickups:[],pulses:[],noises:[],obstacles:[],
  killsNeeded:0,kills:0,score:0,combo:0,maxCombo:0,comboTimer:0,spawnTimer:0,alive:0,t:0,
  bossSpawned:false,bossKilled:false,cam:{x:0,y:0},arenaW:0,arenaH:0,pingCd:0,shake:0,
  gotCosmetics:[],godMode:false,levelMod:null,blindTimer:0,
  blackoutActive:false,blackoutTimer:0,blackoutDur:0,
  curses:[],curseChoicePending:false,readingLore:false,curseOfferKills:[],curseOfferedThresholds:new Set(),
  curseScoreMult:1,curseAuraMult:1,curseSpawnMult:1,curseDropMult:1,curseBlackoutMult:1,
  minibossSpawned:false,loreNodes:[],decor:[],hunter:null,glimpses:[],ambientStepTimer:0};
const ARENA_MARGIN=60;
const AURA=160;                 // Aura-Sichtradius
const PING_R=300, PING_SPD=640, PING_CD=2.2, PING_NOISE=300;
const DASH_SPD=620, DASH_TIME=0.18, DASH_CD=1.6;
const BLACKOUT_GAP_MIN=7, BLACKOUT_GAP_MAX=11, BLACKOUT_DUR_MIN=3, BLACKOUT_DUR_MAX=5, BLACKOUT_AURA=22;
function currentAuraR(){const inBlackout=(game.world&&(game.world.id===3||game.world.id===4)&&game.blackoutActive);const base=inBlackout?BLACKOUT_AURA:AURA;return base*(game.curseAuraMult||1);}

/* ================= Input ================= */
const keys={};
addEventListener("keydown",e=>{if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase()))e.preventDefault();
  keys[e.key.toLowerCase()]=true;if(e.key===" ")doPing();if(e.key==="Shift")doDash();if(e.key==="Escape"&&game.state==="playing")pauseGame();});
addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
let touchMove={active:false,id:null,bx:0,by:0,dx:0,dy:0};
const stickEl=document.getElementById("stick");
function isTouch(){return "ontouchstart" in window||navigator.maxTouchPoints>0;}
cv.addEventListener("touchstart",ts=>{if(game.state!=="playing")return;
  for(const t of ts.changedTouches){if(t.clientX<W*0.55&&!touchMove.active){
    touchMove.active=true;touchMove.id=t.identifier;touchMove.bx=t.clientX;touchMove.by=t.clientY;touchMove.dx=0;touchMove.dy=0;renderStick();}}},{passive:false});
addEventListener("touchmove",tm=>{if(!touchMove.active)return;
  for(const t of tm.changedTouches){if(t.identifier===touchMove.id){let dx=t.clientX-touchMove.bx,dy=t.clientY-touchMove.by;
    const mag=Math.hypot(dx,dy),max=55;if(mag>max){dx=dx/mag*max;dy=dy/mag*max;}
    touchMove.dx=dx/max;touchMove.dy=dy/max;renderStick();tm.preventDefault();}}},{passive:false});
function endTouch(te){for(const t of te.changedTouches){if(t.identifier===touchMove.id){touchMove.active=false;touchMove.dx=0;touchMove.dy=0;stickEl.innerHTML="";}}}
addEventListener("touchend",endTouch);addEventListener("touchcancel",endTouch);
function renderStick(){if(!touchMove.active){stickEl.innerHTML="";return;}
  stickEl.innerHTML=`<div class="stick-base" style="left:${touchMove.bx}px;top:${touchMove.by}px"></div>
    <div class="stick-knob" style="left:${touchMove.bx+touchMove.dx*55}px;top:${touchMove.by+touchMove.dy*55}px"></div>`;}
document.getElementById("pingBtn").addEventListener("pointerdown",e=>{e.preventDefault();doPing();});
document.getElementById("dashBtn").addEventListener("pointerdown",e=>{e.preventDefault();doDash();});
cv.addEventListener("pointerdown",()=>{if(game.state==="playing"&&!isTouch())doPing();});

/* ================= Helpers ================= */
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function panFor(x){if(!game.player)return 0;return clamp((x-game.player.x)/450,-1,1);}
function addParticle(x,y,color,n,spd){for(let i=0;i<n;i++){const a=rand(0,7),s=rand(spd*0.3,spd);
  game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(0.3,0.7),max:0.7,color,r:rand(1.5,3.5)});}}
function emitNoise(x,y,radius,alert){game.noises.push({x,y,radius,alert});}
function addPulse(x,y,maxR,speed,thick,color,owner){game.pulses.push({x,y,r:0,maxR,speed,thick,color,life:1,owner:owner||"player"});}

const PING_KB_R=90, PING_KB_FORCE=160;
function doPing(){if(game.state!=="playing"||game.pingCd>0||!game.player)return;
  if(game.blindTimer>0){showToast("Kein Ping verfügbar...",900);return;}
  game.pingCd=PING_CD;const p=game.player;
  const pr=((game.world.id===3||game.world.id===4)&&game.blackoutActive)?PING_R*0.5:PING_R;
  addPulse(p.x,p.y,pr,PING_SPD,22,auraColor(save.equipped.aura,game.t));
  emitNoise(p.x,p.y,PING_NOISE,true);Audio_.ensure();Audio_.ping(0);
  for(const e of game.enemies){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);
    if(d<PING_KB_R&&d>0.01){const f=(1-d/PING_KB_R)*PING_KB_FORCE;
      e.x=clamp(e.x+dx/d*f,ARENA_MARGIN,game.arenaW-ARENA_MARGIN);
      e.y=clamp(e.y+dy/d*f,ARENA_MARGIN,game.arenaH-ARENA_MARGIN);}}
  if(game.hunter)game.hunter.agitatedUntil=game.t+HUNTER_AGITATE_DUR;
  if(game.hunter&&(game.world.id===3||game.world.id===4)&&game.blackoutActive){
    // Während einer Blackout-Phase verrät jeder Ping deine Position sofort und hart -
    // der Hunter reagiert mit einem kurzen, sehr aggressiven Sprint statt nur normaler Agitation.
    game.hunter.pingLungeUntil=game.t+HUNTER_BLACKOUT_PING_DUR;
    Audio_.enemyShot(panFor(game.hunter.x));
  }
  if(game.glimpseMode&&Math.random()<0.25){const a=rand(0,7),d=rand(pr*0.75,pr*0.98);
    const gx=p.x+Math.cos(a)*d,gy=p.y+Math.sin(a)*d;
    game.glimpses.push({x:gx,y:gy,life:1.1,max:1.1});Audio_.glimpse(panFor(gx));}}

function doDash(){if(game.state!=="playing"||!game.player)return;const p=game.player;
  if(p.dashCd>0||p.dashing>0)return;
  let mx=0,my=0;
  if(keys["a"]||keys["arrowleft"])mx-=1;if(keys["d"]||keys["arrowright"])mx+=1;
  if(keys["w"]||keys["arrowup"])my-=1;if(keys["s"]||keys["arrowdown"])my+=1;
  if(touchMove.active){mx+=touchMove.dx;my+=touchMove.dy;}
  const mag=Math.hypot(mx,my);
  p.dashDir=mag>0.15?Math.atan2(my,mx):p.dir;
  p.dashing=DASH_TIME;p.dashCd=DASH_CD*(p.dashCdMult||1);p.inv=Math.max(p.inv,DASH_TIME+0.1);
  Audio_.ensure();Audio_.dash();}

/* ================= Level start ================= */
function startLevel(worldId,levelIdx){
  const world=worldById(worldId),cfg=world.levels[levelIdx];
  game.world=world;game.levelIdx=levelIdx;game.cfg=cfg;
  game.levelMod=(world.id===4||(world.id===1&&levelIdx<2))?null:pickLevelMod(cfg);
  const tight=game.levelMod==="tight_arena";
  game.arenaW=Math.round(Math.max(1150,W*1.4)*(tight?0.72:1));
  game.arenaH=Math.round(Math.max(1150,H*1.4)*(tight?0.72:1));
  game.enemies=[];game.bullets=[];game.enemyBullets=[];game.particles=[];game.pickups=[];game.pulses=[];game.noises=[];
  game.kills=0;game.killsNeeded=cfg.kills;game.score=0;game.combo=0;game.maxCombo=0;game.comboTimer=0;
  game.spawnTimer=0.5;game.alive=0;game.t=0;game.pingCd=0;game.shake=0;
  game.bossSpawned=false;game.bossKilled=false;game.gotCosmetics=[];
  game.blindTimer=game.levelMod==="blind_start"?10:0;
  game.blackoutActive=false;game.blackoutDur=0;
  game.blackoutTimer=(world.id===3||world.id===4)?rand(BLACKOUT_GAP_MIN,BLACKOUT_GAP_MAX):0;
  game.curses=[];game.curseChoicePending=false;game.readingLore=false;game.curseOfferedThresholds=new Set();
  game.curseScoreMult=1;game.curseAuraMult=1;game.curseSpawnMult=1;game.curseDropMult=1;game.curseBlackoutMult=1;
  game.minibossSpawned=false;game.loreNodes=[];game.decor=[];game.hunter=null;game.glimpses=[];
  game.glimpseMode=(world.id===2&&levelIdx<2);
  game.ambientStepTimer=world.id===1?rand(14,26):0;
  game.curseOfferKills=[...new Set((cfg.curseOffers||[]).map(f=>Math.round(f*cfg.kills)))].sort((a,b)=>a-b);
  const eq=structuredClone(save.equipped);
  game.player={x:game.arenaW/2,y:game.arenaH/2,r:15,hp:100,maxhp:100,speed:188,dir:-Math.PI/2,fireCd:0,inv:0,eq,
    buffs:{},dashCd:0,dashing:0,dashDir:0,fireRateMult:1,dmgMult:1,dashCdMult:1,speedMult:1};
  game.obstacles=[];const nObs=3+Math.floor(Math.random()*3);
  const moving=world.id===2||world.id===4;
  for(let i=0;i<nObs;i++){let ox,oy,tr=0;
    do{ox=rand(ARENA_MARGIN+80,game.arenaW-ARENA_MARGIN-80);oy=rand(ARENA_MARGIN+80,game.arenaH-ARENA_MARGIN-80);tr++;}
    while(Math.hypot(ox-game.player.x,oy-game.player.y)<260&&tr<30);
    const r=rand(24,42);
    game.obstacles.push({x:ox,y:oy,r,moving,vx:moving?rand(-40,40)||30:0,vy:moving?rand(-40,40)||30:0});}
  const un=unownedOfWorld(worldId);
  if(un.length&&Math.random()<0.35)
    spawnPickup(rand(ARENA_MARGIN+60,game.arenaW-ARENA_MARGIN-60),rand(ARENA_MARGIN+60,game.arenaH-ARENA_MARGIN-60),"cosmetic");
  const dp=DECOR_POOLS[world.id];const nDec=Math.floor(rand(dp.n[0],dp.n[1]+1));
  for(let i=0;i<nDec;i++){
    const dx=rand(ARENA_MARGIN+50,game.arenaW-ARENA_MARGIN-50),dy=rand(ARENA_MARGIN+50,game.arenaH-ARENA_MARGIN-50);
    if(Math.hypot(dx-game.player.x,dy-game.player.y)<180)continue;
    game.decor.push({x:dx,y:dy,type:dp.types[Math.floor(Math.random()*dp.types.length)],rot:rand(0,7),scale:rand(0.8,1.3)});}
  const fragId=`${worldId}-${levelIdx}`;
  if(STORY_FRAGMENTS[fragId]){let lx,ly,tr=0;
    do{lx=rand(ARENA_MARGIN+60,game.arenaW-ARENA_MARGIN-60);ly=rand(ARENA_MARGIN+60,game.arenaH-ARENA_MARGIN-60);tr++;}
    while(Math.hypot(lx-game.player.x,ly-game.player.y)<220&&tr<30);
    const words=STORY_FRAGMENTS[fragId].split(" ");
    const preview=words.slice(0,4).join(" ")+(words.length>4?" …":"");
    game.loreNodes.push({x:lx,y:ly,id:fragId,r:13,vis:0,pulseT:-99,t:0,bob:rand(0,7),found:false,preview});}
  if(world.id===3||(world.id===2&&levelIdx>=2)||(world.id===4&&levelIdx<3)){let hx,hy;
    const corner=Math.floor(Math.random()*4);
    hx=corner%2===0?ARENA_MARGIN+60:game.arenaW-ARENA_MARGIN-60;
    hy=corner<2?ARENA_MARGIN+60:game.arenaH-ARENA_MARGIN-60;
    if(Math.hypot(hx-game.player.x,hy-game.player.y)<400){hx=game.arenaW-hx;hy=game.arenaH-hy;}
    game.hunter={x:hx,y:hy,r:HUNTER_R,vis:0,agitatedUntil:0};}
  game.state="playing";showScreen(null);document.getElementById("hud").classList.add("active");
  updateHud();Audio_.ensure();lastT=performance.now();requestAnimationFrame(loop);
  const modLabel=game.levelMod?` — ${LEVEL_MODS[game.levelMod].label}`:"";
  showToast(`${world.name} · Level ${levelIdx+1}${modLabel}`,2000);
  checkCurseOffer();
}

/* ================= Spawning ================= */
function spawnEnemy(type,hpScale,noMinions){
  const base=ENEMIES[type];if(!base)return;
  let x,y,tr=0;
  do{const side=Math.floor(Math.random()*4);
    if(side===0){x=rand(ARENA_MARGIN,game.arenaW-ARENA_MARGIN);y=ARENA_MARGIN+10;}
    else if(side===1){x=rand(ARENA_MARGIN,game.arenaW-ARENA_MARGIN);y=game.arenaH-ARENA_MARGIN-10;}
    else if(side===2){x=ARENA_MARGIN+10;y=rand(ARENA_MARGIN,game.arenaH-ARENA_MARGIN);}
    else{x=game.arenaW-ARENA_MARGIN-10;y=rand(ARENA_MARGIN,game.arenaH-ARENA_MARGIN);}tr++;}
  while(Math.hypot(x-game.player.x,y-game.player.y)<340&&tr<20);
  // per-world difficulty scaling (nur normale Gegner, Bosse sind schon welt-spezifisch)
  const wm=game.world.id;const hpMult=base.boss?1:(wm===2?1.15:wm===3?1.3:wm===4?1.4:1);const spMult=base.boss?1:(wm===2?1.08:wm===3?1.16:wm===4?1.2:1);
  const hp=Math.max(1,Math.round(base.hp*hpMult*(hpScale||1)));
  const e={type,x,y,hp,maxhp:hp,r:base.r,speed:base.speed*spMult,dmg:base.dmg,pts:base.pts,color:base.color,
    vis:0,pulseT:-99,alert:false,tx:game.player.x,ty:game.player.y,wander:rand(0,7),
    dashCd:rand(0.5,1.5),screechCd:rand(2,4),spitCd:rand(1,2),lunge:0,boss:!!base.boss,
    shootCd:base.shootCd||0,pattern:base.pattern||0,minionCd:rand(4,6),lungeCd:2,noMinions:!!noMinions};
  game.enemies.push(e);game.alive++;
  if(base.boss){Audio_.boss(panFor(x));showToast("⚠ BOSS",1400);game.shake=14;}
  return e;
}
function spawnPickup(x,y,kind,sub){game.pickups.push({x,y,kind,sub,r:11,vis:0,pulseT:-99,t:0,bob:rand(0,7)});}

/* ================= Boss shooting ================= */
function fireBossPattern(e){
  const p=game.player,ang=Math.atan2(p.y-e.y,p.x-e.x),spd=175;
  const shoot=(a,s)=>game.enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*(s||spd),vy:Math.sin(a)*(s||spd),
    life:4.5,dmg:Math.round(e.dmg*0.7),r:8,color:e.color});
  if(e.pattern===1){shoot(ang);shoot(ang+0.2);shoot(ang-0.2);}
  else if(e.pattern===2){for(let i=-2;i<=2;i++)shoot(ang+i*0.24);}
  else if(e.pattern===4){shoot(ang,210);shoot(ang+0.18,210);shoot(ang-0.18,210);
    if(Math.random()<0.4)for(let i=0;i<10;i++)shoot(i/10*Math.PI*2,130);}
  else{for(let i=0;i<12;i++)shoot(i/12*Math.PI*2,150);shoot(ang);shoot(ang+0.15);shoot(ang-0.15);}
  Audio_.enemyShot(panFor(e.x));
}

/* ================= Main loop ================= */
let lastT=0;
function loop(now){if(game.state!=="playing")return;
  let dt=(now-lastT)/1000;lastT=now;dt=Math.min(dt,0.05);update(dt);render();requestAnimationFrame(loop);}

function update(dt){
  if(game.curseChoicePending)return;
  if(game.readingLore)return;
  game.t+=dt;const p=game.player;
  if(game.pingCd>0)game.pingCd-=dt;
  if(game.blindTimer>0)game.blindTimer-=dt;
  if(game.shake>0)game.shake=Math.max(0,game.shake-dt*30);
  if(game.world&&(game.world.id===3||game.world.id===4)){
    if(game.blackoutActive){game.blackoutDur-=dt;
      if(game.blackoutDur<=0){game.blackoutActive=false;game.blackoutTimer=rand(BLACKOUT_GAP_MIN,BLACKOUT_GAP_MAX);}}
    else{game.blackoutTimer-=dt;
      if(game.blackoutTimer<=0){game.blackoutActive=true;game.blackoutDur=rand(BLACKOUT_DUR_MIN,BLACKOUT_DUR_MAX)*(game.curseBlackoutMult||1);
        showToast("⚠ BLACKOUT",1300);Audio_.enemyShot();}}}
  {
    const hunterDist=game.hunter?Math.hypot(game.hunter.x-p.x,game.hunter.y-p.y):9999;
    const hunterNear=hunterDist<260?clamp(1-hunterDist/260,0,1):0;
    const pingLungeActive=game.hunter&&game.t<(game.hunter.pingLungeUntil||0);
    const tension=Math.max(game.blackoutActive?1:0,hunterNear,pingLungeActive?1:0);
    Audio_.setTension(tension);
  }
  const spawnLater=[];

  // movement
  let mx=0,my=0;
  if(keys["a"]||keys["arrowleft"])mx-=1;if(keys["d"]||keys["arrowright"])mx+=1;
  if(keys["w"]||keys["arrowup"])my-=1;if(keys["s"]||keys["arrowdown"])my+=1;
  if(touchMove.active){mx+=touchMove.dx;my+=touchMove.dy;}
  const mag=Math.hypot(mx,my);if(mag>1){mx/=mag;my/=mag;}
  const moving=mag>0.15;
  if(p.dashCd>0)p.dashCd-=dt;
  if(p.dashing>0){p.dashing-=dt;
    p.x=clamp(p.x+Math.cos(p.dashDir)*DASH_SPD*dt,ARENA_MARGIN,game.arenaW-ARENA_MARGIN);
    p.y=clamp(p.y+Math.sin(p.dashDir)*DASH_SPD*dt,ARENA_MARGIN,game.arenaH-ARENA_MARGIN);
    addParticle(p.x,p.y,auraColor(save.equipped.aura,game.t),2,50);
  }else{
    p.x=clamp(p.x+mx*p.speed*(p.speedMult||1)*dt,ARENA_MARGIN,game.arenaW-ARENA_MARGIN);
    p.y=clamp(p.y+my*p.speed*(p.speedMult||1)*dt,ARENA_MARGIN,game.arenaH-ARENA_MARGIN);
  }
  for(const o of game.obstacles){
    if(o.moving){o.x+=o.vx*dt;o.y+=o.vy*dt;
      if(o.x<ARENA_MARGIN+o.r||o.x>game.arenaW-ARENA_MARGIN-o.r)o.vx*=-1;
      if(o.y<ARENA_MARGIN+o.r||o.y>game.arenaH-ARENA_MARGIN-o.r)o.vy*=-1;
      o.x=clamp(o.x,ARENA_MARGIN+o.r,game.arenaW-ARENA_MARGIN-o.r);
      o.y=clamp(o.y,ARENA_MARGIN+o.r,game.arenaH-ARENA_MARGIN-o.r);}}
  for(const o of game.obstacles){const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy),min=o.r+p.r;
    if(d<min&&d>0){p.x=o.x+dx/d*min;p.y=o.y+dy/d*min;}}
  if(moving&&p.dashing<=0){p.dir=Math.atan2(my,mx);emitNoise(p.x,p.y,95,false);}
  if(p.inv>0)p.inv-=dt;
  for(const k of Object.keys(p.buffs)){p.buffs[k]-=dt;if(p.buffs[k]<=0)delete p.buffs[k];}
  {const bk=Object.keys(p.buffs);
    document.getElementById("hudBuff").textContent=bk.length?bk.map(k=>`${POWERS[k].name} ${Math.ceil(p.buffs[k])}s`).join(" · "):"";}

  game.cam.x=clamp(p.x-W/2,0,Math.max(0,game.arenaW-W));
  game.cam.y=clamp(p.y-H/2,0,Math.max(0,game.arenaH-H));

  // pulses
  for(const pl of game.pulses){const pr=pl.r;pl.r+=pl.speed*dt;if(pl.r>pl.maxR)pl.life=0;
    const muted=pl.owner==="enemy"&&(game.world.id===3||game.world.id===4)&&game.blackoutActive;
    const sweep=o=>{if(muted)return;const d=Math.hypot(o.x-pl.x,o.y-pl.y);
      if(d>pr-pl.thick&&d<pl.r+pl.thick)o.pulseT=pl.owner==="enemy"?game.t-0.45:game.t;};
    game.enemies.forEach(sweep);game.pickups.forEach(sweep);game.loreNodes.forEach(sweep);if(game.hunter)sweep(game.hunter);}
  game.pulses=game.pulses.filter(pl=>pl.life>0);

  // spawning (pre-boss)
  const cfg=game.cfg;
  if(!game.bossSpawned){
    game.spawnTimer-=dt;
    const cap=cfg.boss?game.killsNeeded:game.killsNeeded;
    const rush=game.levelMod==="rush";
    if(game.spawnTimer<=0&&game.alive<cfg.maxAlive&&(game.kills+game.alive)<cap){
      spawnEnemy(cfg.pool[Math.floor(Math.random()*cfg.pool.length)],rush?0.55:1);
      game.spawnTimer=cfg.spawn*rand(0.7,1.15)*(rush?0.5:1)*(game.curseSpawnMult||1);}
    if(cfg.boss&&game.kills>=game.killsNeeded-1&&game.alive===0){
      if(game.levelMod==="double_boss"){spawnEnemy(cfg.boss,0.62);spawnEnemy(cfg.boss,0.62);}
      else spawnEnemy(cfg.boss);
      game.bossSpawned=true;}
    if(cfg.miniboss&&!game.minibossSpawned&&game.kills>=Math.round(cfg.miniboss.atFrac*cfg.kills)){
      game.minibossSpawned=true;spawnEnemy(cfg.miniboss.type,cfg.miniboss.hpScale,true);showToast("⚠ Elite-Gegner",1400);}
  }

  // noises -> targets
  for(const n of game.noises)for(const e of game.enemies)
    if(Math.hypot(e.x-n.x,e.y-n.y)<n.radius){e.tx=n.x;e.ty=n.y;if(n.alert)e.alert=true;}
  game.noises=[];

  // enemies
  for(const e of game.enemies){
    const base=ENEMIES[e.type];
    const dToP=Math.hypot(e.x-p.x,e.y-p.y);
    const auraR=base.cloak?70:currentAuraR();
    const aura=clamp(1-dToP/auraR,0,1)*0.6;
    const pv=e.pulseT>-90?clamp(1-(game.t-e.pulseT)/0.9,0,1):0;
    e.vis=Math.max(aura,pv);
    let tx=e.tx,ty=e.ty;
    if(e.alert){e.tx=p.x;e.ty=p.y;tx=p.x;ty=p.y;}
    else{e.wander+=dt*1.5;tx=e.x+Math.cos(e.wander)*40;ty=e.y+Math.sin(e.wander*1.3)*40;if(dToP<200)e.alert=true;}
    let ang=Math.atan2(ty-e.y,tx-e.x),spd=e.speed;
    if(base.darts){e.dashCd-=dt;if(e.dashCd<=0){e.dashCd=rand(0.7,1.4);e.lunge=0.28;}
      if(e.lunge>0){spd*=2.5;e.lunge-=dt;}}
    if(base.screech){e.screechCd-=dt;if(e.screechCd<=0&&dToP<440){e.screechCd=rand(3,5);
      emitNoise(p.x,p.y,520,true);addPulse(e.x,e.y,190,560,16,"#ff4fd8","enemy");}}
    if(base.spits){e.spitCd-=dt;if(e.spitCd<=0&&dToP<520){e.spitCd=rand(2.0,3.0);
      const a=Math.atan2(p.y-e.y,p.x-e.x),bs=180;
      game.enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*bs,vy:Math.sin(a)*bs,life:3.8,dmg:8,r:7,color:"#ffca4d"});
      e.pulseT=game.t;Audio_.enemyShot(panFor(e.x));}}
    if(e.boss){
      const enraged=e.type==="mrx"&&e.hp<e.maxhp*0.4;
      e.shootCd-=dt;if(e.shootCd<=0&&dToP<680){e.shootCd=base.shootCd*(enraged?0.65:1);fireBossPattern(e);}
      e.minionCd-=dt;if(e.minionCd<=0&&!e.noMinions){e.minionCd=rand(5,7);
        const pool=cfg.pool;spawnLater.push(pool[Math.floor(Math.random()*pool.length)]);spawnLater.push(pool[Math.floor(Math.random()*pool.length)]);}
      e.lungeCd-=dt;if(e.lungeCd<=0&&dToP<440){e.lungeCd=rand(enraged?1.4:2.2,enraged?2.2:3.4);e.lunge=0.4;}
      if(e.lunge>0){spd*=enraged?2.6:2.2;e.lunge-=dt;}}
    e.x+=Math.cos(ang)*spd*dt;e.y+=Math.sin(ang)*spd*dt;
    e.x=clamp(e.x,ARENA_MARGIN,game.arenaW-ARENA_MARGIN);e.y=clamp(e.y,ARENA_MARGIN,game.arenaH-ARENA_MARGIN);
    for(const o of game.obstacles){const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy),min=o.r+e.r;
      if(d<min&&d>0){e.x=o.x+dx/d*min;e.y=o.y+dy/d*min;}}
    if(dToP<e.r+p.r&&p.inv<=0){if(!game.godMode)p.hp-=e.dmg;p.inv=0.7;game.shake=Math.max(game.shake,8);
      addParticle(p.x,p.y,"#ff5470",10,180);Audio_.hurt();
      const kb=Math.atan2(p.y-e.y,p.x-e.x);p.x+=Math.cos(kb)*22;p.y+=Math.sin(kb)*22;updateHud();
      if(p.hp<=0){p.hp=0;gameOver();return;}}
  }
  spawnLater.forEach(t=>{if(game.alive<cfg.maxAlive+3)spawnEnemy(t);});

  // auto fire
  p.fireCd-=dt;
  if(p.fireCd<=0){let target=null,bd=1e9;
    for(const e of game.enemies){if(e.vis<0.28)continue;const d=Math.hypot(e.x-p.x,e.y-p.y);
      if(d<560&&d<bd){bd=d;target=e;}}
    if(target){p.fireCd=(p.buffs.rapid?0.13:0.24)*(p.fireRateMult||1);p.dir=Math.atan2(target.y-p.y,target.x-p.x);const sp=580;
      const pierce=!!p.buffs.pierce;const dmg=1*(p.dmgMult||1);
      const mkBullet=ang=>game.bullets.push({x:p.x+Math.cos(ang)*p.r,y:p.y+Math.sin(ang)*p.r,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:1.1,dmg,pierce});
      mkBullet(p.dir);if(p.buffs.double)mkBullet(p.dir+0.12);
      emitNoise(p.x,p.y,200,true);Audio_.shot();}}

  // player bullets
  for(const b of game.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const o of game.obstacles)if(Math.hypot(b.x-o.x,b.y-o.y)<o.r)b.life=0;
    for(const e of game.enemies){if(e.dead)continue;
      if(b.pierce&&b.hit&&b.hit.has(e))continue;
      if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+3){e.hp-=b.dmg;e.pulseT=game.t;e.alert=true;
        addParticle(b.x,b.y,e.color,4,120);Audio_.hit(panFor(b.x));if(e.hp<=0)killEnemy(e);
        if(b.pierce){if(!b.hit)b.hit=new Set();b.hit.add(e);}else{b.life=0;break;}}}}
  game.bullets=game.bullets.filter(b=>b.life>0&&b.x>0&&b.y>0&&b.x<game.arenaW&&b.y<game.arenaH);

  // enemy bullets
  for(const b of game.enemyBullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    for(const o of game.obstacles)if(Math.hypot(b.x-o.x,b.y-o.y)<o.r)b.life=0;
    if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r&&p.inv<=0){if(!game.godMode)p.hp-=b.dmg;p.inv=0.6;b.life=0;game.shake=Math.max(game.shake,7);
      addParticle(p.x,p.y,"#ff5470",8,150);Audio_.hurt();updateHud();if(p.hp<=0){p.hp=0;gameOver();return;}}}
  game.enemyBullets=game.enemyBullets.filter(b=>b.life>0&&b.x>0&&b.y>0&&b.x<game.arenaW&&b.y<game.arenaH);

  // pickups
  for(const pk of game.pickups){pk.t+=dt;const d=Math.hypot(pk.x-p.x,pk.y-p.y);
    const aura=clamp(1-d/currentAuraR(),0,1)*0.7;const pv=pk.pulseT>-90?clamp(1-(game.t-pk.pulseT)/1.4,0,1):0;
    pk.vis=Math.max(aura,pv,0.15);if(d<pk.r+p.r+6){collectPickup(pk);pk.dead=true;}}
  game.pickups=game.pickups.filter(pk=>!pk.dead);

  // lore fragments
  for(const ln of game.loreNodes){ln.t+=dt;const d=Math.hypot(ln.x-p.x,ln.y-p.y);
    const aura=clamp(1-d/currentAuraR(),0,1)*0.7;const pv=ln.pulseT>-90?clamp(1-(game.t-ln.pulseT)/1.4,0,1):0;
    ln.vis=Math.max(aura,pv,0.15);
    if(!ln.found&&d<ln.r+p.r+8){ln.found=true;
      if(!save.loreFound.includes(ln.id)){save.loreFound.push(ln.id);persist();}
      Audio_.pickup(panFor(ln.x));addParticle(ln.x,ln.y,"#8fa4c8",14,120);showLoreReading(ln.id);}}

  // Mr. X
  if(game.hunter){const h=game.hunter;
    const agitated=game.t<h.agitatedUntil;
    const pingLunge=game.t<(h.pingLungeUntil||0);
    const blackoutBoost=((game.world.id===3||game.world.id===4)&&game.blackoutActive)?1.5:1;
    const spd=HUNTER_SPEED*(pingLunge?HUNTER_BLACKOUT_PING_BOOST:(agitated?HUNTER_AGITATE:1))*blackoutBoost;
    const ang=Math.atan2(p.y-h.y,p.x-h.x);
    h.x=clamp(h.x+Math.cos(ang)*spd*dt,ARENA_MARGIN,game.arenaW-ARENA_MARGIN);
    h.y=clamp(h.y+Math.sin(ang)*spd*dt,ARENA_MARGIN,game.arenaH-ARENA_MARGIN);
    const dh=Math.hypot(h.x-p.x,h.y-p.y);
    const auraH=clamp(1-dh/75,0,1)*0.6;const pvH=h.pulseT>-90?clamp(1-(game.t-h.pulseT)/0.9,0,1):0;
    h.vis=Math.max(auraH,pvH);
    if(dh<h.r+p.r&&p.inv<=0){if(!game.godMode)p.hp-=HUNTER_DMG;p.inv=1.0;
      const kb=Math.atan2(p.y-h.y,p.x-h.x);p.x=clamp(p.x+Math.cos(kb)*70,ARENA_MARGIN,game.arenaW-ARENA_MARGIN);
      p.y=clamp(p.y+Math.sin(kb)*70,ARENA_MARGIN,game.arenaH-ARENA_MARGIN);
      game.shake=Math.max(game.shake,16);Audio_.hurt();updateHud();if(p.hp<=0){p.hp=0;gameOver();}}}

  // ambient dread (world 1: distant footsteps only)
  if(game.world.id===1){game.ambientStepTimer-=dt;
    if(game.ambientStepTimer<=0){game.ambientStepTimer=rand(16,30);Audio_.distantSteps(rand(-1,1));}}

  // glimpses (world 2, non-interactive scripted sightings)
  for(const g of game.glimpses)g.life-=dt;
  game.glimpses=game.glimpses.filter(g=>g.life>0);

  // particles
  for(const pt of game.particles){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.vx*=0.92;pt.vy*=0.92;pt.life-=dt;}
  game.particles=game.particles.filter(pt=>pt.life>0);

  if(game.comboTimer>0){game.comboTimer-=dt;if(game.comboTimer<=0){game.combo=0;hideCombo();}}

  // win
  if(cfg.boss){if(game.bossKilled){if(cfg.boss==="mrx")triggerEnding();else levelComplete();}}
  else if(game.kills>=game.killsNeeded&&game.alive===0)levelComplete();
}

function killEnemy(e){
  if(e.dead)return;e.dead=true;game.alive--;
  addParticle(e.x,e.y,e.color,e.boss?30:12,e.boss?260:170);Audio_.kill(panFor(e.x));
  const base=ENEMIES[e.type];
  if(base&&base.explodes){const p=game.player,d=Math.hypot(e.x-p.x,e.y-p.y),R=95;
    addParticle(e.x,e.y,"#ff6a3d",22,240);game.shake=Math.max(game.shake,10);
    if(d<R){if(!game.godMode)p.hp-=10;p.inv=Math.max(p.inv,0.5);
      const kb=Math.atan2(p.y-e.y,p.x-e.x);p.x+=Math.cos(kb)*40;p.y+=Math.sin(kb)*40;
      game.shake=Math.max(game.shake,14);Audio_.hurt();updateHud();if(p.hp<=0){p.hp=0;gameOver();}}}
  game.kills++;game.combo++;game.maxCombo=Math.max(game.maxCombo,game.combo);game.comboTimer=2.2;checkCurseOffer();
  const mult=1+Math.min(game.combo-1,9)*0.15;game.score+=Math.round(e.pts*mult*(game.curseScoreMult||1));
  if(game.combo>=3)showCombo(game.combo);save.totalKills++;
  if(e.boss){game.bossKilled=true;game.shake=18;if(e.type!=="mrx")tryDropCosmetic(e.x,e.y);}   // Boss: garantierter Drop-Versuch
  else if(Math.random()<0.09*(game.curseDropMult||1))tryDropCosmetic(e.x,e.y);                        // erhöhte Drop-Chance
  else if(Math.random()<0.07){const pk=Object.keys(POWERS);spawnPickup(e.x,e.y,"power",pk[Math.floor(Math.random()*pk.length)]);}
  else if(Math.random()<0.12)spawnPickup(e.x,e.y,"health");
  game.enemies=game.enemies.filter(en=>!en.dead);updateHud();
}
function tryDropCosmetic(x,y){if(unownedOfWorld(game.world.id).length===0){game.score+=200;return;}spawnPickup(x,y,"cosmetic");}
function collectPickup(pk){const p=game.player;
  if(pk.kind==="health"){p.hp=Math.min(p.maxhp,p.hp+22);updateHud();Audio_.pickup(panFor(pk.x));addParticle(pk.x,pk.y,"#ff9a6b",8,120);showToast("+HP",900);return;}
  if(pk.kind==="cosmetic"){const un=unownedOfWorld(game.world.id);if(un.length===0){game.score+=200;Audio_.pickup(panFor(pk.x));return;}
    const id=un[Math.floor(Math.random()*un.length)];save.owned.push(id);game.gotCosmetics.push(id);persist();
    Audio_.pickup(panFor(pk.x));addParticle(pk.x,pk.y,"#ffd35c",16,160);showToast(`🎁 Neu: ${cosName(id)}`,1800);return;}
  if(pk.kind==="power"){p.buffs[pk.sub]=POWER_DUR;Audio_.pickup(panFor(pk.x));
    addParticle(pk.x,pk.y,POWERS[pk.sub].color,14,150);showToast(`⚡ ${POWERS[pk.sub].name}!`,1500);}}

/* ================= Render ================= */
function render(){
  const cam=game.cam;let sx=0,sy=0;
  if(game.shake>0){sx=rand(-1,1)*game.shake;sy=rand(-1,1)*game.shake;}
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#04060c";ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(-cam.x+sx,-cam.y+sy);
  const p=game.player,acol=auraColor(save.equipped.aura,game.t);
  const auraR=currentAuraR();
  const gl=ctx.createRadialGradient(p.x,p.y,10,p.x,p.y,auraR+30);
  gl.addColorStop(0,hexA(game.world.color,0.10));gl.addColorStop(0.5,hexA(game.world.color,0.05));gl.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=gl;ctx.beginPath();ctx.arc(p.x,p.y,AURA+30,0,7);ctx.fill();
  ctx.strokeStyle=hexA(game.world.accent,0.10);ctx.lineWidth=1;
  const gs=64,x0=Math.floor(cam.x/gs)*gs,y0=Math.floor(cam.y/gs)*gs;ctx.beginPath();
  for(let gx=x0;gx<cam.x+W;gx+=gs){ctx.moveTo(gx,cam.y);ctx.lineTo(gx,cam.y+H);}
  for(let gy=y0;gy<cam.y+H;gy+=gs){ctx.moveTo(cam.x,gy);ctx.lineTo(cam.x+W,gy);}ctx.stroke();
  ctx.strokeStyle=hexA(game.world.color,0.25);ctx.lineWidth=3;
  ctx.strokeRect(ARENA_MARGIN-6,ARENA_MARGIN-6,game.arenaW-2*ARENA_MARGIN+12,game.arenaH-2*ARENA_MARGIN+12);

  for(const pl of game.pulses){const a=clamp(1-pl.r/pl.maxR,0,1)*0.5;
    ctx.strokeStyle=hexA(pl.color,a);ctx.lineWidth=pl.thick*clamp(1-pl.r/pl.maxR,0.2,1);
    ctx.beginPath();ctx.arc(pl.x,pl.y,pl.r,0,7);ctx.stroke();}

  for(const o of game.obstacles){const d=Math.hypot(o.x-p.x,o.y-p.y);let vis=clamp(1-d/(220*(auraR/AURA)),0,1);
    for(const pl of game.pulses){if(pl.owner==="enemy"&&(game.world.id===3||game.world.id===4)&&game.blackoutActive)continue;
      if(Math.abs(Math.hypot(o.x-pl.x,o.y-pl.y)-pl.r)<pl.thick+o.r)vis=Math.max(vis,pl.owner==="enemy"?0.45:0.9);}
    if(vis<0.04)continue;ctx.globalAlpha=vis;ctx.fillStyle="#111a2e";ctx.strokeStyle=hexA(game.world.color,0.5);ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fill();ctx.stroke();ctx.globalAlpha=1;}

  for(const dc of game.decor){const d=Math.hypot(dc.x-p.x,dc.y-p.y);const dvis=clamp(1-d/(220*(auraR/AURA)),0,1)*0.7;
    if(dvis<0.04)continue;ctx.globalAlpha=dvis;ctx.save();ctx.translate(dc.x,dc.y);ctx.rotate(dc.rot);ctx.scale(dc.scale,dc.scale);
    if(dc.type==="blood_pool"){
      // unregelmässige Blutlache: mehrere überlappende, unterschiedlich grosse Blobs + Rand-Gradient statt einfachem Kreis
      const blobs=dc.blobs||(dc.blobs=Array.from({length:5},(_,i)=>({
        a:i/5*Math.PI*2+rand(-0.3,0.3),dist:rand(3,9),rx:rand(6,11),ry:rand(4,8),rot:rand(0,7)})));
      for(const b of blobs){
        const bx=Math.cos(b.a)*b.dist,by=Math.sin(b.a)*b.dist;
        const g=ctx.createRadialGradient(bx,by,0,bx,by,Math.max(b.rx,b.ry));
        g.addColorStop(0,"#5c1219");g.addColorStop(0.7,"#3a0c11");g.addColorStop(1,"rgba(58,12,17,0)");
        ctx.fillStyle=g;ctx.save();ctx.translate(bx,by);ctx.rotate(b.rot);
        ctx.beginPath();ctx.ellipse(0,0,b.rx,b.ry,0,0,7);ctx.fill();ctx.restore();
      }
      // ein paar kleine Spritzer am Rand
      const spatter=dc.spatter||(dc.spatter=Array.from({length:4},()=>({a:rand(0,7),dist:rand(12,18),r:rand(1,2.2)})));
      ctx.fillStyle="#4a0f14";
      for(const s of spatter){ctx.beginPath();ctx.arc(Math.cos(s.a)*s.dist,Math.sin(s.a)*s.dist,s.r,0,7);ctx.fill();}
    }
    else if(dc.type==="blood_drop"){
      // kleinerer Spritzer mit "Flugrichtung": Tropfenform statt Kreis
      const dir=dc.dropDir||(dc.dropDir=rand(0,7));
      ctx.save();ctx.rotate(dir);
      const g=ctx.createRadialGradient(0,2,0,0,2,8);
      g.addColorStop(0,"#5c1219");g.addColorStop(1,"rgba(58,12,17,0)");
      ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(0,-7);ctx.quadraticCurveTo(6,3,0,9);ctx.quadraticCurveTo(-6,3,0,-7);ctx.fill();
      ctx.restore();
      const spatter=dc.spatter||(dc.spatter=Array.from({length:2},()=>({a:rand(0,7),dist:rand(6,10),r:rand(0.8,1.6)})));
      ctx.fillStyle="#4a0f14";
      for(const s of spatter){ctx.beginPath();ctx.arc(Math.cos(s.a)*s.dist,Math.sin(s.a)*s.dist,s.r,0,7);ctx.fill();}
    }
    else if(dc.type==="gear"){ctx.fillStyle="#2a2418";ctx.strokeStyle="#4a4030";ctx.lineWidth=1.5;
      ctx.fillRect(-9,-6,18,12);ctx.strokeRect(-9,-6,18,12);ctx.beginPath();ctx.moveTo(-9,-2);ctx.lineTo(9,-2);ctx.stroke();
      // Rostflecken: ein paar zufällige dunkle Punkte auf der Fläche
      const rust=dc.rust||(dc.rust=Array.from({length:5},()=>({x:rand(-8,8),y:rand(-5,5),r:rand(0.6,1.4)})));
      ctx.fillStyle="#1a140c";for(const r of rust){ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,7);ctx.fill();}}
    else if(dc.type==="scratch"){
      // leicht gebogene Krallenspuren statt gerader Linien, mit variierender Deckkraft
      const lines=dc.lines||(dc.lines=Array.from({length:3},(_,i)=>({
        x0:-8+i*6,x1:-4+i*6,bow:rand(-3,3),a:rand(0.45,0.85)})));
      ctx.strokeStyle="#8899aa";ctx.lineWidth=1.5;ctx.lineCap="round";
      for(const l of lines){ctx.globalAlpha=dvis*l.a;
        ctx.beginPath();ctx.moveTo(l.x0,-10);ctx.quadraticCurveTo((l.x0+l.x1)/2+l.bow,0,l.x1,10);ctx.stroke();}
      ctx.globalAlpha=dvis;
    }
    ctx.restore();ctx.globalAlpha=1;}

  for(const pk of game.pickups){if(pk.vis<0.06)continue;ctx.globalAlpha=pk.vis;
    const bob=Math.sin(pk.t*3+pk.bob)*3;
    const col=pk.kind==="health"?"#ff9a6b":pk.kind==="power"?(POWERS[pk.sub]?POWERS[pk.sub].color:"#3fe0ff"):"#ffd35c";
    ctx.shadowColor=col;ctx.shadowBlur=18;ctx.fillStyle=col;
    if(pk.kind==="health"){ctx.fillRect(pk.x-3,pk.y-9+bob,6,18);ctx.fillRect(pk.x-9,pk.y-3+bob,18,6);}
    else if(pk.kind==="power"){ctx.beginPath();
      ctx.moveTo(pk.x+2,pk.y-10+bob);ctx.lineTo(pk.x-6,pk.y+2+bob);ctx.lineTo(pk.x-1,pk.y+2+bob);
      ctx.lineTo(pk.x-4,pk.y+10+bob);ctx.lineTo(pk.x+7,pk.y-2+bob);ctx.lineTo(pk.x+1,pk.y-2+bob);
      ctx.closePath();ctx.fill();}
    else{ctx.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;
      ctx.lineTo(pk.x+Math.cos(a)*10,pk.y+bob+Math.sin(a)*10);
      ctx.lineTo(pk.x+Math.cos(a+Math.PI/5)*4.5,pk.y+bob+Math.sin(a+Math.PI/5)*4.5);}ctx.closePath();ctx.fill();}
    ctx.shadowBlur=0;ctx.globalAlpha=1;}

  for(const ln of game.loreNodes){if(ln.vis<0.06)continue;ctx.globalAlpha=ln.vis;
    const bob=Math.sin(ln.t*2+ln.bob)*2,col="#8fe6ff";
    ctx.save();ctx.translate(ln.x,ln.y+bob);
    ctx.font=`13px "Segoe UI", system-ui, sans-serif`;ctx.textAlign="center";
    ctx.shadowColor=col;ctx.shadowBlur=14*ln.vis;ctx.fillStyle=col;
    ctx.fillText(ln.found?"» gelesen «":ln.preview,0,0);
    ctx.shadowBlur=0;ctx.restore();ctx.globalAlpha=1;}

  for(const g of game.glimpses){const a=clamp(g.life/g.max,0,1)*0.55;ctx.globalAlpha=a;
    ctx.fillStyle="#0a0c14";ctx.beginPath();ctx.ellipse(g.x,g.y,13,17,0,0,7);ctx.fill();ctx.globalAlpha=1;}

  if(game.hunter&&game.hunter.vis>0.04){const h=game.hunter;ctx.globalAlpha=h.vis;
    const lunging=game.t<(h.pingLungeUntil||0);
    ctx.fillStyle="#05060a";ctx.shadowColor="#ff1f3a";ctx.shadowBlur=lunging?14:6;
    ctx.beginPath();ctx.ellipse(h.x,h.y,h.r*0.8,h.r,0,0,7);ctx.fill();
    ctx.shadowBlur=lunging?18:10;ctx.fillStyle="#ff1f3a";
    ctx.beginPath();ctx.arc(h.x-4,h.y-4,lunging?2.3:1.6,0,7);ctx.fill();
    ctx.beginPath();ctx.arc(h.x+4,h.y-4,lunging?2.3:1.6,0,7);ctx.fill();
    ctx.shadowBlur=0;ctx.globalAlpha=1;}

  ctx.shadowColor=acol;ctx.shadowBlur=10;
  for(const b of game.bullets){ctx.strokeStyle=acol;ctx.lineWidth=3;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*0.014,b.y-b.vy*0.014);ctx.stroke();}
  ctx.shadowBlur=0;

  for(const e of game.enemies){if(e.vis<0.05)continue;ctx.globalAlpha=clamp(e.vis,0,1);
    const base=ENEMIES[e.type];ctx.shadowColor=e.color;ctx.shadowBlur=e.vis*16;ctx.fillStyle=e.color;
    if(base.darts){ctx.beginPath();ctx.moveTo(e.x,e.y-e.r);ctx.lineTo(e.x+e.r,e.y);ctx.lineTo(e.x,e.y+e.r);ctx.lineTo(e.x-e.r,e.y);ctx.closePath();ctx.fill();}
    else if(base.spits){ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2-Math.PI/2;
      ctx.lineTo(e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r);}ctx.closePath();ctx.fill();}
    else if(base.explodes){ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2;
      const rr=i%2===0?e.r*1.25:e.r*0.75;ctx.lineTo(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr);}ctx.closePath();ctx.fill();}
    else if(base.boss){ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.stroke();
      ctx.globalAlpha=clamp(e.vis,0,1)*0.9;ctx.strokeStyle=hexA("#ff5470",0.9);ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(e.x,e.y,e.r+8,-Math.PI/2,-Math.PI/2+7*(e.hp/e.maxhp));ctx.stroke();}
    else{ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();}
    ctx.shadowBlur=0;ctx.fillStyle="#04060c";
    ctx.beginPath();ctx.arc(e.x-e.r*0.32,e.y-e.r*0.1,e.r*0.18,0,7);ctx.arc(e.x+e.r*0.32,e.y-e.r*0.1,e.r*0.18,0,7);ctx.fill();
    if(!base.boss&&e.maxhp>3&&e.vis>0.3){ctx.globalAlpha=e.vis;ctx.strokeStyle="#ff5470";ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,-Math.PI/2,-Math.PI/2+7*(e.hp/e.maxhp));ctx.stroke();}
    ctx.globalAlpha=1;}

  // enemy bullets (glow, immer sichtbar)
  for(const b of game.enemyBullets){ctx.shadowColor=b.color;ctx.shadowBlur=14;ctx.fillStyle=b.color;
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.55)";ctx.beginPath();ctx.arc(b.x,b.y,b.r*0.4,0,7);ctx.fill();ctx.shadowBlur=0;}

  for(const pt of game.particles){ctx.globalAlpha=clamp(pt.life/pt.max,0,1);ctx.fillStyle=pt.color;
    ctx.beginPath();ctx.arc(pt.x,pt.y,pt.r,0,7);ctx.fill();}
  ctx.globalAlpha=1;

  const flash=(p.inv>0&&Math.floor(p.inv*20)%2===0);
  if(!flash)drawCharacter(ctx,p.x,p.y,p.r,save.equipped,{dir:p.dir},game.t,true);
  ctx.restore();

  const vg=ctx.createRadialGradient(W/2,H/2,H*(game.blackoutActive?0.12:0.3),W/2,H/2,H*0.78);
  vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,`rgba(0,0,0,${game.blackoutActive?0.82:0.62})`);
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  const pb=document.getElementById("pingBtn");if(game.pingCd>0||game.blindTimer>0)pb.classList.add("cooling");else pb.classList.remove("cooling");
  const db=document.getElementById("dashBtn");if(p.dashCd>0)db.classList.add("cooling");else db.classList.remove("cooling");
}

/* ================= Ending Sequence ================= */
const END_P1=2.0, END_P2=4.0, END_P3=9.5, END_P4=13.5, END_P5=20.0, END_DUR=23.0;
let endingGhosts=[],endingSkip=false,endingStingPlayed=false;
function triggerEnding(){
  game.state="ending";endingSkip=false;endingStingPlayed=false;
  document.getElementById("hud").classList.remove("active");showScreen(null);
  if(save.progress[4]<4)save.progress[4]=4;
  save.storyComplete=true;
  if(!save.owned.includes("skin_kennung3"))save.owned.push("skin_kennung3");
  persist();Audio_.reveal();Audio_.setTension(0.55);
  endingGhosts=[];for(let i=0;i<7;i++)endingGhosts.push({fx:rand(0.12,0.88),fy:rand(0.2,0.8),r:rand(14,22)});
  const skipEl=document.createElement("div");skipEl.id="endSkip";skipEl.textContent="Überspringen ›";
  skipEl.style.cssText="position:fixed;bottom:22px;right:22px;z-index:95;color:#5a6070;font-size:13px;padding:10px 14px;cursor:pointer;";
  skipEl.onclick=()=>{endingSkip=true;};document.body.appendChild(skipEl);
  const startT=performance.now();
  function frame(now){const t=endingSkip?END_DUR:(now-startT)/1000;
    drawEndingFrame(t);
    if(t<END_DUR)requestAnimationFrame(frame);
    else{skipEl.remove();showEpilogue();}}
  requestAnimationFrame(frame);
}
function drawEndingFrame(t){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);
  if(t<END_P1){ // dissolve of the world
    const a=1-clamp(t/END_P1,0,1);ctx.globalAlpha=a*0.5;ctx.fillStyle=game.world?game.world.color:"#dfe6f5";
    ctx.beginPath();ctx.arc(W/2,H*0.42,120*(1+t*0.6),0,7);ctx.fill();ctx.globalAlpha=1;
  }else if(t<END_P2){ // pure black pause
    // nothing, silence
  }else if(t<END_P3){ // silhouettes revealed by an expanding ring
    const pr=clamp((t-END_P2)/(END_P3-END_P2),0,1),ringR=pr*Math.max(W,H)*0.8;
    for(const g of endingGhosts){const gx=g.fx*W,gy=g.fy*H,d=Math.hypot(gx-W/2,gy-H/2);
      if(d>ringR)continue;const a=clamp(1-(ringR-d)/220,0.18,0.42);
      ctx.globalAlpha=a;ctx.fillStyle="#0d0f16";ctx.beginPath();ctx.ellipse(gx,gy,g.r*0.75,g.r,0,0,7);ctx.fill();}
    ctx.globalAlpha=clamp(pr*1.4,0,0.35);ctx.strokeStyle="#8fa4c8";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(W/2,H/2,ringR,0,7);ctx.stroke();ctx.globalAlpha=1;
  }else if(t<END_P4){ // "KENNUNG 3 — GEFUNDEN."
    for(const g of endingGhosts){ctx.globalAlpha=0.3;ctx.fillStyle="#0d0f16";
      ctx.beginPath();ctx.ellipse(g.fx*W,g.fy*H,g.r*0.75,g.r,0,0,7);ctx.fill();}ctx.globalAlpha=1;
    const a=clamp((t-END_P3)/0.8,0,1)*clamp((END_P4-t)/0.6,0,1);
    ctx.globalAlpha=a;ctx.fillStyle="#e7eefc";ctx.textAlign="center";
    ctx.font=`700 ${Math.round(Math.min(W,H)*0.045)}px system-ui,sans-serif`;
    ctx.fillText("KENNUNG 3 — GEFUNDEN.",W/2,H/2);ctx.globalAlpha=1;
  }else if(t<END_P5){ // list reveal
    const lines=["Kennung 1 — verstummt.","Kennung 2 — verstummt.",
      `Kennung 3 — ${save.highscore.toLocaleString('de-CH')} Pkt.`,"Kennung 4 — ?"];
    const lh=Math.round(Math.min(W,H)*0.06);ctx.textAlign="center";ctx.font=`600 ${Math.round(lh*0.62)}px system-ui,sans-serif`;
    lines.forEach((ln,i)=>{const lineStart=END_P4+i*1.3;const a=clamp((t-lineStart)/0.7,0,1);
      if(a<=0)return;
      if(i===3&&a>0&&!endingStingPlayed){endingStingPlayed=true;Audio_.sting();}
      ctx.globalAlpha=a;ctx.fillStyle=i===3?"#ff5470":"#c9d6ee";
      ctx.fillText(ln,W/2,H/2-lh+i*lh);});ctx.globalAlpha=1;
  }else{ // fade to logo
    const a=clamp((t-END_P5)/(END_DUR-END_P5),0,1);
    Audio_.setTension(0.55*(1-a));
    ctx.globalAlpha=a;ctx.fillStyle="#e7eefc";ctx.textAlign="center";
    ctx.font=`800 ${Math.round(Math.min(W,H)*0.08)}px system-ui,sans-serif`;ctx.fillText("BLACKOUT",W/2,H/2);ctx.globalAlpha=1;
  }
}
function showEpilogue(){
  document.getElementById("ep-lore").textContent=`${save.loreFound.length}/${LORE_TOTAL}`;
  document.getElementById("ep-cos").textContent=`${save.owned.length}/${Object.keys(COSMETICS).length}`;
  Audio_.setTension(0);
  showScreen("epilogue");
  const statsEl=document.querySelector("#scr-epilogue .stats");
  const btnrowEl=document.querySelector("#scr-epilogue .btnrow");
  if(statsEl&&btnrowEl){
    statsEl.classList.add("ep-delay");btnrowEl.classList.add("ep-delay");
    // erst die Stats, dann (versetzt) die Buttons einblenden statt alles sofort da zu haben
    setTimeout(()=>statsEl.classList.add("show"),150);
    setTimeout(()=>btnrowEl.classList.add("show"),900);
  }
}
document.getElementById("btnEpilogueMenu").onclick=()=>{refreshMenuStats();showScreen("menu");};
document.getElementById("btnEpilogueChar").onclick=()=>{save.equipped.skin="skin_kennung3";persist();buildCharacter();showScreen("char");};


function updateHud(){const p=game.player;if(!p)return;
  document.getElementById("hpFill").style.width=(p.hp/p.maxhp*100)+"%";
  document.getElementById("hudScore").textContent=game.score.toLocaleString("de-CH");
  {const bk=Object.keys(p.buffs);document.getElementById("hudBuff").textContent=bk.length?bk.map(k=>`${POWERS[k].name} ${Math.ceil(p.buffs[k])}s`).join(" · "):"";}
  document.getElementById("hudKills").textContent=game.cfg.boss?`${game.kills}/${game.killsNeeded} + Boss`:`${game.kills} / ${game.killsNeeded} Kills`;
  const curseLabel=game.curses.length?` · 🔮${game.curses.map(id=>CURSES[id].name).join(", ")}`:"";
  document.getElementById("hudLevel").textContent=`${game.world.name} · Lvl ${game.levelIdx+1}`+(game.levelMod?` · ${LEVEL_MODS[game.levelMod].label}`:"")+curseLabel;}
let comboTO;function showCombo(c){const el=document.getElementById("comboLbl");el.textContent=`${c}× COMBO`;
  el.classList.add("show");clearTimeout(comboTO);comboTO=setTimeout(()=>el.classList.remove("show"),700);}
function hideCombo(){document.getElementById("comboLbl").classList.remove("show");}
let toastTO,toastPriorityUntil=0;function showToast(t,d,priority){
  const now=performance.now();if(!priority&&now<toastPriorityUntil)return;
  const el=document.getElementById("toast");el.textContent=t;el.classList.add("show");
  clearTimeout(toastTO);toastTO=setTimeout(()=>el.classList.remove("show"),d||1500);
  toastPriorityUntil=priority?now+(d||1500):0;}

/* ================= Win / Lose ================= */
function levelComplete(){
  if(game.state!=="playing")return;game.state="done";
  document.getElementById("hud").classList.remove("active");Audio_.win();Audio_.setTension(0);
  const bonus=1000+game.levelIdx*400+(game.world.id-1)*600;game.score+=bonus;
  let reward=null;const un=unownedOfWorld(game.world.id).filter(id=>!game.gotCosmetics.includes(id));
  if(un.length){reward=un[Math.floor(Math.random()*un.length)];save.owned.push(reward);persist();}
  const wid=game.world.id;if(save.progress[wid]<game.levelIdx+1)save.progress[wid]=game.levelIdx+1;
  const key=`${wid}-${game.levelIdx}`,newBest=game.score>(save.best[key]||0);if(newBest)save.best[key]=game.score;
  const newHigh=game.score>save.highscore;if(newHigh)save.highscore=game.score;persist();
  showResult(true,{bonus,reward,newBest,newHigh});
}
function gameOver(){
  if(game.state!=="playing")return;game.state="dead";
  document.getElementById("hud").classList.remove("active");Audio_.lose();Audio_.setTension(0);
  const newHigh=game.score>save.highscore;if(newHigh)save.highscore=game.score;persist();
  showResult(false,{newHigh});
}
function showResult(win,info){
  const box=document.getElementById("resultBox");
  const isLast=game.levelIdx===game.world.levels.length-1;
  let rewardHtml="";const gotList=game.gotCosmetics.slice();if(win&&info.reward)gotList.push(info.reward);
  if(win&&info.reward)rewardHtml=`<div class="reward"><canvas id="rewardCv" width="48" height="48"></canvas>
    <div class="rt"><small>Belohnung</small><b>${cosName(info.reward)}</b></div></div>`;
  const collectedNote=gotList.length?`<div class="sub" style="margin-top:8px">🎁 ${gotList.length} Cosmetic${gotList.length>1?"s":""} in diesem Level gefunden</div>`:"";
  const title=win?(isLast?"WELT GESCHAFFT":"LEVEL GESCHAFFT"):"AUSGELÖSCHT";
  box.innerHTML=`
    <h2 style="color:${win?'var(--lime)':'var(--danger)'}">${title}</h2>
    <div class="sub">${game.world.name} · Level ${game.levelIdx+1}</div>
    <div class="rstats">
      <div class="s"><b>${game.score.toLocaleString('de-CH')}</b>Score</div>
      <div class="s"><b>${game.kills}</b>Kills</div>
      <div class="s"><b>${game.maxCombo}×</b>Max Combo</div>
    </div>
    ${info.newHigh?'<div class="newbest">★ NEUER HIGHSCORE ★</div>':(info.newBest?'<div class="newbest">Neuer Level-Bestwert!</div>':'')}
    ${rewardHtml}${collectedNote}
    <div class="btnrow" style="margin-top:20px">
      ${win&&!isLast?'<button class="btn primary" id="rNext">Nächstes Level →</button>':''}
      ${win&&isLast&&game.world.id<3?'<button class="btn primary" id="rNextWorld">Nächste Welt →</button>':''}
      <button class="btn" id="rRetry">${win?'Wiederholen':'Nochmal'}</button>
      <button class="btn ghost" id="rMenu">Menü</button>
    </div>`;
  showScreen("result");
  if(win&&info.reward)drawCosmeticPreview(document.getElementById("rewardCv").getContext("2d"),info.reward,48);
  const nx=document.getElementById("rNext");if(nx)nx.onclick=()=>startLevelFade(game.world.id,game.levelIdx+1);
  const nw=document.getElementById("rNextWorld");if(nw)nw.onclick=()=>goToWorld(game.world.id+1);
  document.getElementById("rRetry").onclick=()=>startLevelFade(game.world.id,game.levelIdx);
  document.getElementById("rMenu").onclick=()=>{refreshMenuStats();showScreen("menu");};
}
function goToWorld(wid){buildLevels(wid);showScreen("levels");}

/* ================= Pause ================= */
function pauseGame(){if(game.state!=="playing")return;game.state="paused";
  document.getElementById("hud").classList.remove("active");showScreen("pause");}
function resumeGame(){if(game.state!=="paused")return;game.state="playing";showScreen(null);
  document.getElementById("hud").classList.add("active");lastT=performance.now();requestAnimationFrame(loop);}
document.getElementById("btnPause").onclick=pauseGame;
document.getElementById("btnResume").onclick=resumeGame;
document.getElementById("btnRestart").onclick=()=>startLevelFade(game.world.id,game.levelIdx);
document.getElementById("btnQuit").onclick=()=>{game.state="menu";document.getElementById("hud").classList.remove("active");Audio_.setTension(0);goToWorld(game.world.id);};

/* ================= Fade ================= */
const fadeEl=document.getElementById("fade");
function startLevelFade(w,l){fadeEl.classList.add("on");setTimeout(()=>{startLevel(w,l);fadeEl.classList.remove("on");},300);}

/* ================= Screens ================= */
const screens={menu:"scr-menu",how:"scr-how",codex:"scr-codex",worlds:"scr-worlds",levels:"scr-levels",char:"scr-char",pause:"scr-pause",result:"scr-result",epilogue:"scr-epilogue"};
function showScreen(name){Object.values(screens).forEach(id=>document.getElementById(id).classList.remove("active"));
  document.getElementById("stick").innerHTML="";if(name)document.getElementById(screens[name]).classList.add("active");}

/* ================= Menu / build ================= */
function refreshMenuStats(){
  document.getElementById("m-hs").textContent=save.highscore.toLocaleString("de-CH");
  document.getElementById("m-kills").textContent=save.totalKills.toLocaleString("de-CH");
  document.getElementById("m-cos").textContent=`${save.owned.length}/${Object.keys(COSMETICS).length}`;
  document.getElementById("m-worlds").textContent=`${[1,2,3].filter(w=>worldCleared(w)).length}/3`;
  document.getElementById("m-lore").textContent=`${save.loreFound.length}/${LORE_TOTAL}`;
  document.getElementById("c-hs").textContent=save.highscore.toLocaleString("de-CH");
  document.getElementById("btnMute").textContent=save.muted?"🔇 Stumm":"🔊 Sound";
}
function buildWorlds(){const grid=document.getElementById("worldGrid");grid.innerHTML="";
  WORLDS.forEach((w,i)=>{const prevDone=i===0||worldCleared(WORLDS[i-1].id);const cleared=worldCleared(w.id);
    const el=document.createElement("div");el.className="world"+(prevDone?"":" locked")+(cleared?" done":"");
    el.style.setProperty("--wc",w.color);if(!prevDone)el.dataset.req=`Schließe ${WORLDS[i-1].name} ab`;
    el.innerHTML=`<div class="wnum">${w.id}</div><div class="wname">${w.name}</div>
      <div class="wdesc">${w.short}</div><div class="wprog"><i style="width:${save.progress[w.id]/w.levels.length*100}%"></i></div>`;
    if(prevDone)el.onclick=()=>{Audio_.ensure();goToWorld(w.id);};grid.appendChild(el);});}
function buildLevels(wid){const w=worldById(wid);
  document.getElementById("lvlWorldName").textContent=w.name;document.getElementById("lvlWorldDesc").textContent=w.short;
  const grid=document.getElementById("levelGrid");grid.innerHTML="";
  w.levels.forEach((lv,i)=>{const unlocked=i<=save.progress[wid];
    const el=document.createElement("div");el.className="lvl"+(unlocked?"":" locked")+(lv.boss?" boss":"");
    const best=save.best[`${wid}-${i}`];
    el.innerHTML=`<div class="ln">Level ${i+1}</div><div class="lm">${lv.boss?'Boss':lv.kills+' Kills'}</div>
      <div class="lb">${best?('Best: '+best.toLocaleString('de-CH')):(unlocked?'':'gesperrt')}</div>`;
    if(unlocked)el.onclick=()=>{Audio_.ensure();startLevelFade(wid,i);};grid.appendChild(el);});}

/* ================= Character ================= */
function drawCosmeticPreview(c,id,size){c.clearRect(0,0,size,size);const cx=size/2,cy=size/2,r=size*0.28;
  const eq=structuredClone(save.equipped);const slot=COSMETICS[id]?COSMETICS[id].slot:null;if(slot)eq[slot]=id;
  drawCharacter(c,cx,cy,r,eq,{dir:-Math.PI/2},performance.now()/1000,true);}
let previewRAF=null,previewLastT=0,charScrollingUntil=0;
function animatePreview(){
  if(!document.getElementById("scr-char").classList.contains("active")){previewRAF=null;return;}
  const now=performance.now();
  if(now>charScrollingUntil&&now-previewLastT>40){previewLastT=now;
    const pc=document.getElementById("previewCanvas").getContext("2d");
    pc.clearRect(0,0,220,220);drawCharacter(pc,110,110,48,save.equipped,{dir:-Math.PI/2},now/1000,true);}
  previewRAF=requestAnimationFrame(animatePreview);
}
document.getElementById("scr-char").addEventListener("scroll",()=>{charScrollingUntil=performance.now()+220;},{passive:true});
document.getElementById("scr-char").addEventListener("touchmove",()=>{charScrollingUntil=performance.now()+220;},{passive:true});
function buildCharacter(){
  document.getElementById("c-cos").textContent=`${save.owned.length}/${Object.keys(COSMETICS).length}`;
  const slotsEl=document.getElementById("slots");slotsEl.innerHTML="";
  const groups=[{slot:"skin",title:"Körper",ids:Object.keys(SKINS)},{slot:"head",title:"Kopf",ids:HEADS},
    {slot:"face",title:"Gesicht",ids:FACES},{slot:"aura",title:"Aura",ids:Object.keys(AURAS)}];
  groups.forEach(g=>{const sec=document.createElement("div");sec.className="slot";sec.innerHTML=`<h3>${g.title}</h3>`;
    const grid=document.createElement("div");grid.className="grid";
    g.ids.forEach(id=>{const owned=save.owned.includes(id);const meta=COSMETICS[id]||{world:0};
      if(meta.secret&&!owned)return;
      const cell=document.createElement("div");cell.className="cos"+(owned?"":" locked")+(save.equipped[g.slot]===id?" equipped":"");
      const cvEl=document.createElement("canvas");cvEl.width=140;cvEl.height=140;cell.appendChild(cvEl);
      if(meta.world>0){const wt=document.createElement("div");wt.className="wtag";wt.textContent="W"+meta.world;cell.appendChild(wt);}
      if(owned){const nm=document.createElement("div");nm.className="cname";nm.textContent=cosName(id);cell.appendChild(nm);
        drawCosmeticPreview(cvEl.getContext("2d"),id,140);
        cell.onclick=()=>{save.equipped[g.slot]=id;persist();buildCharacter();Audio_.pickup();};}
      grid.appendChild(cell);});
    sec.appendChild(grid);slotsEl.appendChild(sec);});
  if(!previewRAF)animatePreview();
}

/* ================= Buttons ================= */
document.getElementById("btnPlay").onclick=()=>{Audio_.ensure();buildWorlds();showScreen("worlds");};
document.getElementById("btnChar").onclick=()=>{buildCharacter();showScreen("char");};
document.getElementById("btnHow").onclick=()=>showScreen("how");
document.getElementById("btnCharTop").onclick=()=>{buildCharacter();showScreen("char");};
document.getElementById("btnCharTop2").onclick=()=>{buildCharacter();showScreen("char");};
document.getElementById("btnMute").onclick=()=>{save.muted=!save.muted;persist();refreshMenuStats();Audio_.muteChanged();};
document.getElementById("btnReset").onclick=()=>{if(confirm("Wirklich den gesamten Fortschritt löschen? (Cosmetics, Welten, Highscore)")){
  save=structuredClone(DEFAULT_SAVE);persist();refreshMenuStats();}};
document.querySelectorAll("[data-back]").forEach(b=>{b.onclick=()=>{const t=b.dataset.back;
  if(t==="menu"){refreshMenuStats();showScreen("menu");}else if(t==="worlds"){buildWorlds();showScreen("worlds");}else showScreen(t);};});

/* ================= Save Export / Import ================= */
document.getElementById("btnExport").onclick=()=>{
  const blob=new Blob([JSON.stringify(save,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download=`blackout-save-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
};
document.getElementById("btnImport").onclick=()=>document.getElementById("importFile").click();
document.getElementById("importFile").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{try{const data=JSON.parse(reader.result);
    save=Object.assign(structuredClone(DEFAULT_SAVE),data,
      {equipped:Object.assign({},DEFAULT_SAVE.equipped,data.equipped||{}),
       progress:Object.assign({},DEFAULT_SAVE.progress,data.progress||{}),
       owned:Array.from(new Set([...DEFAULT_SAVE.owned,...(data.owned||[])])),best:data.best||{}});
    persist();refreshMenuStats();showToast("Speicherstand importiert");
  }catch(err){alert("Ungültige Datei — Import fehlgeschlagen.");}};
  reader.readAsText(file);e.target.value="";
});

/* ================= Admin Panel (dev only) ================= */
const ADMIN_PASS="blackout-dev"; // <- hier änderbar
let adClicks=0,adClickTO=null;
const creditEl=document.querySelector(".credit");
if(creditEl){creditEl.style.cursor="default";
  creditEl.addEventListener("click",()=>{adClicks++;clearTimeout(adClickTO);
    adClickTO=setTimeout(()=>adClicks=0,1200);
    if(adClicks>=3){adClicks=0;const pass=prompt("Admin-Code:");if(pass===ADMIN_PASS)openAdminPanel();}});}
function openAdminPanel(){
  if(document.getElementById("adminPanel"))return;
  const el=document.createElement("div");el.id="adminPanel";
  el.style.cssText="position:fixed;inset:0;z-index:100;background:#05070dee;display:flex;align-items:center;justify-content:center;padding:20px;";
  el.innerHTML=`<div style="background:#0d1424;border:1px solid #1e2b47;border-radius:16px;padding:22px;max-width:420px;width:100%;max-height:86vh;overflow-y:auto;">
    <h2 style="margin:0 0 14px;color:var(--gold)">⚙ Admin Panel</h2>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn" id="ad-worlds">Alle Welten freischalten</button>
      <button class="btn" id="ad-cos">Alle Cosmetics freischalten</button>
      <button class="btn" id="ad-god">God-Mode: <span id="ad-god-state">Aus</span></button>
      <button class="btn" id="ad-winlevel">Aktuelles Level sofort gewinnen</button>
      <button class="btn" id="ad-ending">🎬 Ending-Sequenz ansehen (Test)</button>
      <div style="border-top:1px solid #1e2b47;margin:6px 0;padding-top:10px;">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Level direkt starten</div>
        <div id="ad-leveljump" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
      </div>
      <button class="btn ghost" id="ad-reset">Save zurücksetzen</button>
      <button class="btn ghost" id="ad-close">Schließen</button>
    </div></div>`;
  document.body.appendChild(el);
  document.getElementById("ad-worlds").onclick=()=>{[1,2,3].forEach(w=>save.progress[w]=worldById(w).levels.length);persist();refreshMenuStats();showToast("Alle Welten freigeschaltet");};
  document.getElementById("ad-cos").onclick=()=>{save.owned=Object.keys(COSMETICS);persist();refreshMenuStats();showToast("Alle Cosmetics freigeschaltet");};
  document.getElementById("ad-god").onclick=()=>{game.godMode=!game.godMode;document.getElementById("ad-god-state").textContent=game.godMode?"An":"Aus";};
  document.getElementById("ad-winlevel").onclick=()=>{if(game.state==="playing"){
    game.enemies.forEach(e=>e.dead=true);game.enemies=[];game.alive=0;game.bossKilled=true;
    if(game.cfg.boss==="mrx")triggerEnding();else{game.kills=game.killsNeeded;levelComplete();}}
    else showToast("Kein aktives Level");};
  document.getElementById("ad-ending").onclick=()=>{el.remove();triggerEnding();};
  document.getElementById("ad-reset").onclick=()=>{if(confirm("Wirklich den gesamten Fortschritt löschen?")){
    save=structuredClone(DEFAULT_SAVE);persist();refreshMenuStats();showToast("Save zurückgesetzt");}};
  document.getElementById("ad-close").onclick=()=>el.remove();
  const jumpEl=document.getElementById("ad-leveljump");
  WORLDS.forEach(w=>w.levels.forEach((lv,i)=>{const b=document.createElement("button");
    b.className="btn small";b.textContent=`W${w.id}-L${i+1}`;
    b.onclick=()=>{el.remove();Audio_.ensure();startLevelFade(w.id,i);};jumpEl.appendChild(b);}));
}

/* ================= PWA: Service Worker ================= */
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{ /* z.B. lokal via file:// - einfach ignorieren */ });
  });
}

/* ================= Boot ================= */
refreshMenuStats();showScreen("menu");
(function menuBg(){if(game.state==="playing"||game.state==="paused"){requestAnimationFrame(menuBg);return;}
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle="#04060c";ctx.fillRect(0,0,W,H);
  const t=performance.now()/1000;
  for(let i=0;i<40;i++){const x=(i*97.13+t*12*(i%3+1))%(W+40)-20,y=(i*57.7+Math.sin(t*0.3+i)*30)%(H+40);
    const a=0.06+0.06*Math.sin(t+i);ctx.fillStyle=hexA("#3fe0ff",Math.max(0,a));
    ctx.beginPath();ctx.arc(x,y,1.4,0,7);ctx.fill();}
  requestAnimationFrame(menuBg);})();
