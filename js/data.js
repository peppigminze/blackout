"use strict";
/* ================= BLACKOUT v1.6 ================= */

/* ---- Storage (localStorage + Fallback) ---- */
const Store=(()=>{let mem={},ok=false;
  try{localStorage.setItem("__t","1");localStorage.removeItem("__t");ok=true;}catch(e){ok=false;}
  return{get(k){try{return ok?localStorage.getItem(k):(k in mem?mem[k]:null);}catch(e){return k in mem?mem[k]:null;}},
    set(k,v){try{if(ok)localStorage.setItem(k,v);else mem[k]=v;}catch(e){mem[k]=v;}}};})();

const SAVE_KEY="blackout_save_v1";
const DEFAULT_SAVE={highscore:0,totalKills:0,progress:{1:0,2:0,3:0,4:0},
  owned:["skin_default","face_default","head_none","aura_cyan"],
  equipped:{skin:"skin_default",face:"face_default",head:"head_none",aura:"aura_cyan"},best:{},muted:false,loreFound:[],storyComplete:false};
let save=loadSave();
function loadSave(){try{const raw=Store.get(SAVE_KEY);if(!raw)return structuredClone(DEFAULT_SAVE);
  const s=JSON.parse(raw);return Object.assign(structuredClone(DEFAULT_SAVE),s,
    {equipped:Object.assign({},DEFAULT_SAVE.equipped,s.equipped||{}),
     progress:Object.assign({},DEFAULT_SAVE.progress,s.progress||{}),
     owned:Array.from(new Set([...DEFAULT_SAVE.owned,...(s.owned||[])])),best:s.best||{}});
  }catch(e){return structuredClone(DEFAULT_SAVE);}}
function persist(){Store.set(SAVE_KEY,JSON.stringify(save));}

/* ================= COSMETICS ================= */
const SKINS={
  skin_default:{name:"Standard",body:"#5ad1ff",edge:"#2b8fc4"},
  skin_ash:{name:"Asche",body:"#8fa0b8",edge:"#5a6a83"},
  skin_rust:{name:"Rost",body:"#d0763a",edge:"#8a441c"},
  skin_chrome:{name:"Chrom",body:"#c8d2e0",edge:"#7d8ba3"},
  skin_ice:{name:"Eis",body:"#bfeaff",edge:"#6fb8d8"},
  skin_aqua:{name:"Aqua",body:"#4dffd0",edge:"#1f9e86"},
  skin_violet:{name:"Violett",body:"#b77bff",edge:"#6b3fb0"},
  skin_toxic:{name:"Toxisch",body:"#a6ff5c",edge:"#5f9e2c"},
  skin_bubblegum:{name:"Kaugummi",body:"#ff7fd6",edge:"#c23fa0"},
  skin_slime:{name:"Schleim",body:"#7bff4d",edge:"#3f9e1e"},
  skin_crimson:{name:"Karmin",body:"#ff4d5e",edge:"#a01e2c"},
  skin_gold:{name:"Gold",body:"#ffd35c",edge:"#b58a1e"},
  skin_obsidian:{name:"Obsidian",body:"#2a2f45",edge:"#0e1120"},
  skin_ember:{name:"Glut",body:"#ff7a2d",edge:"#b0431a"},
  skin_void:{name:"Leere",body:"#6a4dff",edge:"#3a2a9e"},
  skin_kennung3:{name:"Kennung 3",body:"#0d0e12",edge:"#1c1f28"}
};
const AURAS={
  aura_cyan:{name:"Cyan",color:"#3fe0ff"},aura_amber:{name:"Bernstein",color:"#ffb454"},
  aura_ice:{name:"Eisblau",color:"#8fe6ff"},aura_magenta:{name:"Magenta",color:"#ff4fd8"},
  aura_lime:{name:"Limette",color:"#a6ff5c"},aura_green:{name:"Grün",color:"#4dff7a"},
  aura_red:{name:"Rot",color:"#ff4d5e"},aura_purple:{name:"Lila",color:"#a24dff"},
  aura_white:{name:"Weiß",color:"#eef4ff"},aura_prism:{name:"Prisma",color:"prism"}
};
const FACES=["face_default","face_visor","face_robot","face_shades","face_angry","face_cool","face_ninja","face_cyclops","face_star","face_dead","face_sleepy"];
const FACE_NAME={face_default:"Punkte",face_visor:"Visier",face_robot:"Roboter",face_shades:"Sonnenbrille",
  face_angry:"Wütend",face_cool:"Chillig",face_ninja:"Ninja",face_cyclops:"Zyklop",face_star:"Sterne",
  face_dead:"Tot",face_sleepy:"Müde"};
const HEADS=["head_none","head_cap","head_hardhat","head_beanie","head_bandana","head_bolt","head_mohawk",
  "head_antenna","head_ears","head_party","head_spike","head_crown","head_halo","head_horns","head_wizard","head_tophat"];
const HEAD_NAME={head_none:"Ohne",head_cap:"Cap",head_hardhat:"Helm",head_beanie:"Beanie",head_bandana:"Bandana",
  head_bolt:"Blitz",head_mohawk:"Mohawk",head_antenna:"Antenne",head_ears:"Ohren",head_party:"Partyhut",
  head_spike:"Stacheln",head_crown:"Krone",head_halo:"Heiligenschein",head_horns:"Hörner",head_wizard:"Zauberhut",head_tophat:"Zylinder"};

// id -> {slot, world}
const COSMETICS={
  skin_default:{slot:"skin",world:0},face_default:{slot:"face",world:0},head_none:{slot:"head",world:0},aura_cyan:{slot:"aura",world:0},
  // World 1
  skin_ash:{slot:"skin",world:1},skin_rust:{slot:"skin",world:1},skin_chrome:{slot:"skin",world:1},skin_ice:{slot:"skin",world:1},skin_aqua:{slot:"skin",world:1},
  aura_amber:{slot:"aura",world:1},aura_ice:{slot:"aura",world:1},
  face_visor:{slot:"face",world:1},face_robot:{slot:"face",world:1},
  head_cap:{slot:"head",world:1},head_hardhat:{slot:"head",world:1},head_beanie:{slot:"head",world:1},head_bandana:{slot:"head",world:1},head_bolt:{slot:"head",world:1},
  // World 2
  skin_violet:{slot:"skin",world:2},skin_toxic:{slot:"skin",world:2},skin_bubblegum:{slot:"skin",world:2},skin_slime:{slot:"skin",world:2},skin_crimson:{slot:"skin",world:2},
  aura_magenta:{slot:"aura",world:2},aura_lime:{slot:"aura",world:2},aura_green:{slot:"aura",world:2},
  face_shades:{slot:"face",world:2},face_angry:{slot:"face",world:2},face_cool:{slot:"face",world:2},face_ninja:{slot:"face",world:2},
  head_mohawk:{slot:"head",world:2},head_antenna:{slot:"head",world:2},head_ears:{slot:"head",world:2},head_party:{slot:"head",world:2},head_spike:{slot:"head",world:2},
  // World 3
  skin_gold:{slot:"skin",world:3},skin_obsidian:{slot:"skin",world:3},skin_ember:{slot:"skin",world:3},skin_void:{slot:"skin",world:3},
  aura_red:{slot:"aura",world:3},aura_purple:{slot:"aura",world:3},aura_white:{slot:"aura",world:3},aura_prism:{slot:"aura",world:3},
  face_cyclops:{slot:"face",world:3},face_star:{slot:"face",world:3},face_dead:{slot:"face",world:3},face_sleepy:{slot:"face",world:3},
  head_crown:{slot:"head",world:3},head_halo:{slot:"head",world:3},head_horns:{slot:"head",world:3},head_wizard:{slot:"head",world:3},head_tophat:{slot:"head",world:3},
  // Secret (Story-Ende)
  skin_kennung3:{slot:"skin",world:99,secret:true}
};
function cosName(id){return SKINS[id]?SKINS[id].name:AURAS[id]?AURAS[id].name:FACE_NAME[id]||HEAD_NAME[id]||id;}
function auraColor(id,t){const a=AURAS[id]||AURAS.aura_cyan;
  if(a.color==="prism"){return `hsl(${(t*60)%360},100%,65%)`;}return a.color;}
function cosmeticsOfWorld(w){return Object.keys(COSMETICS).filter(id=>COSMETICS[id].world===w);}
function unownedOfWorld(w){return cosmeticsOfWorld(w).filter(id=>!save.owned.includes(id));}

/* ---- Character drawing ---- */
function drawStar(ctx,cx,cy,rad,color){ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;
    ctx.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);
    ctx.lineTo(cx+Math.cos(a+Math.PI/5)*rad*0.45,cy+Math.sin(a+Math.PI/5)*rad*0.45);}
  ctx.closePath();ctx.fill();}
function drawCharacter(ctx,x,y,r,eq,face,t,glow){
  const skin=SKINS[eq.skin]||SKINS.skin_default;const acol=auraColor(eq.aura,t||0);
  ctx.save();ctx.translate(x,y);
  if(glow!==false){const g=ctx.createRadialGradient(0,0,r*0.4,0,0,r*2.4);
    g.addColorStop(0,hexA(acol,0));g.addColorStop(0.5,hexA(acol,0.22));g.addColorStop(1,hexA(acol,0));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*2.4,0,7);ctx.fill();}
  ctx.shadowColor=acol;ctx.shadowBlur=glow!==false?18:0;ctx.fillStyle=skin.body;
  ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.shadowBlur=0;
  ctx.lineWidth=Math.max(2,r*0.12);ctx.strokeStyle=skin.edge;ctx.stroke();
  const sh=ctx.createRadialGradient(-r*0.3,-r*0.35,r*0.1,0,0,r);
  sh.addColorStop(0,"#ffffff30");sh.addColorStop(1,"#00000000");
  ctx.fillStyle=sh;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  const dir=(face&&face.dir!=null)?face.dir:-Math.PI/2;ctx.rotate(dir+Math.PI/2);
  drawFace(ctx,eq.face,r);drawHead(ctx,eq.head,r);ctx.restore();
}
function drawFace(ctx,id,r){
  const ey=-r*0.12,ex=r*0.34,es=r*0.16;
  if(id==="face_cyclops"){ctx.fillStyle="#0a0f18";ctx.beginPath();ctx.arc(0,ey,es*1.3,0,7);ctx.fill();
    ctx.fillStyle="#ff5470";ctx.beginPath();ctx.arc(0,ey,es*0.55,0,7);ctx.fill();return;}
  if(id==="face_visor"){ctx.fillStyle="#0c1420";roundRect(ctx,-r*0.55,ey-es*0.9,r*1.1,es*1.9,es*0.7);ctx.fill();
    ctx.fillStyle="#8fe6ff";roundRect(ctx,-r*0.42,ey-es*0.35,r*0.84,es*0.7,es*0.3);ctx.fill();return;}
  if(id==="face_robot"){ctx.fillStyle="#5af0ff";ctx.shadowColor="#5af0ff";ctx.shadowBlur=8;
    roundRect(ctx,-ex-es*0.7,ey-es*0.5,es*1.4,es,es*0.2);ctx.fill();
    roundRect(ctx,ex-es*0.7,ey-es*0.5,es*1.4,es,es*0.2);ctx.fill();ctx.shadowBlur=0;return;}
  if(id==="face_shades"){ctx.fillStyle="#0a0f18";
    roundRect(ctx,-ex-es,ey-es*0.7,es*1.7,es*1.5,es*0.4);ctx.fill();
    roundRect(ctx,ex-es*0.7,ey-es*0.7,es*1.7,es*1.5,es*0.4);ctx.fill();
    ctx.fillRect(-r*0.06,ey-es*0.1,r*0.12,es*0.3);return;}
  if(id==="face_ninja"){ctx.fillStyle="#1a2233";roundRect(ctx,-r*0.62,ey-es*0.9,r*1.24,es*1.7,es*0.4);ctx.fill();
    ctx.fillStyle="#e7eefc";roundRect(ctx,-ex-es*0.5,ey-es*0.25,es,es*0.5,es*0.2);ctx.fill();
    roundRect(ctx,ex-es*0.5,ey-es*0.25,es,es*0.5,es*0.2);ctx.fill();return;}
  if(id==="face_star"){drawStar(ctx,-ex,ey,es*1.1,"#ffd35c");drawStar(ctx,ex,ey,es*1.1,"#ffd35c");return;}
  if(id==="face_dead"){ctx.strokeStyle="#0a0f18";ctx.lineWidth=r*0.1;ctx.lineCap="round";
    [-ex,ex].forEach(x=>{ctx.beginPath();ctx.moveTo(x-es*0.6,ey-es*0.6);ctx.lineTo(x+es*0.6,ey+es*0.6);
      ctx.moveTo(x+es*0.6,ey-es*0.6);ctx.lineTo(x-es*0.6,ey+es*0.6);ctx.stroke();});return;}
  if(id==="face_cool"){ctx.strokeStyle="#0a0f18";ctx.lineWidth=r*0.11;ctx.lineCap="round";
    ctx.beginPath();ctx.arc(-ex,ey+es*0.35,es*0.7,Math.PI*1.12,Math.PI*1.88);ctx.stroke();
    ctx.beginPath();ctx.arc(ex,ey+es*0.35,es*0.7,Math.PI*1.12,Math.PI*1.88);ctx.stroke();return;}
  if(id==="face_sleepy"){ctx.strokeStyle="#0a0f18";ctx.lineWidth=r*0.1;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-ex-es*0.6,ey);ctx.lineTo(-ex+es*0.6,ey);
    ctx.moveTo(ex-es*0.6,ey);ctx.lineTo(ex+es*0.6,ey);ctx.stroke();return;}
  // default + angry
  ctx.fillStyle="#0a0f18";ctx.beginPath();ctx.arc(-ex,ey,es,0,7);ctx.arc(ex,ey,es,0,7);ctx.fill();
  ctx.fillStyle="#e7eefc";ctx.beginPath();ctx.arc(-ex+es*0.3,ey-es*0.3,es*0.32,0,7);ctx.arc(ex+es*0.3,ey-es*0.3,es*0.32,0,7);ctx.fill();
  if(id==="face_angry"){ctx.strokeStyle="#0a0f18";ctx.lineWidth=r*0.09;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-ex-es*0.8,ey-es*1.4);ctx.lineTo(-ex+es*0.6,ey-es*0.7);ctx.stroke();
    ctx.beginPath();ctx.moveTo(ex+es*0.8,ey-es*1.4);ctx.lineTo(ex-es*0.6,ey-es*0.7);ctx.stroke();}
}
function drawHead(ctx,id,r){
  if(id==="head_none")return;ctx.save();
  if(id==="head_cap"){ctx.fillStyle="#e0455a";roundRect(ctx,-r*0.8,-r*1.15,r*1.6,r*0.5,r*0.24);ctx.fill();
    ctx.fillStyle="#c03348";roundRect(ctx,-r*1.15,-r*0.78,r*0.8,r*0.24,r*0.1);ctx.fill();}
  else if(id==="head_hardhat"){ctx.fillStyle="#ffd23f";ctx.beginPath();ctx.arc(0,-r*0.75,r*0.85,Math.PI,0);ctx.fill();
    ctx.fillRect(-r,-r*0.82,r*2,r*0.16);ctx.fillStyle="#d9a400";ctx.fillRect(-r*0.1,-r*1.55,r*0.2,r*0.55);}
  else if(id==="head_beanie"){ctx.fillStyle="#4a6ad0";ctx.beginPath();ctx.arc(0,-r*0.7,r*0.9,Math.PI,0);ctx.fill();
    ctx.fillStyle="#38539f";ctx.fillRect(-r*0.9,-r*0.82,r*1.8,r*0.22);
    ctx.fillStyle="#e7eefc";ctx.beginPath();ctx.arc(0,-r*1.6,r*0.16,0,7);ctx.fill();}
  else if(id==="head_bandana"){ctx.fillStyle="#e0455a";roundRect(ctx,-r*0.85,-r*0.98,r*1.7,r*0.36,r*0.1);ctx.fill();
    ctx.fillStyle="#c03348";ctx.beginPath();ctx.moveTo(r*0.7,-r*0.8);ctx.lineTo(r*1.25,-r*0.5);ctx.lineTo(r*0.75,-r*0.4);ctx.fill();}
  else if(id==="head_bolt"){ctx.fillStyle="#ffe14d";ctx.shadowColor="#ffe14d";ctx.shadowBlur=12;
    ctx.beginPath();ctx.moveTo(r*0.15,-r*0.85);ctx.lineTo(-r*0.35,-r*1.5);ctx.lineTo(-r*0.02,-r*1.42);
    ctx.lineTo(-r*0.25,-r*1.95);ctx.lineTo(r*0.35,-r*1.2);ctx.lineTo(0,-r*1.28);ctx.closePath();ctx.fill();ctx.shadowBlur=0;}
  else if(id==="head_mohawk"){ctx.fillStyle="#a6ff5c";
    for(let i=-2;i<=2;i++){const h=r*(0.62-Math.abs(i)*0.09);ctx.beginPath();
      ctx.moveTo(i*r*0.22-r*0.1,-r*0.9);ctx.lineTo(i*r*0.22,-r*0.9-h);ctx.lineTo(i*r*0.22+r*0.1,-r*0.9);ctx.fill();}}
  else if(id==="head_antenna"){ctx.strokeStyle="#8fa0b8";ctx.lineWidth=r*0.1;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(0,-r*0.9);ctx.lineTo(0,-r*1.5);ctx.stroke();
    ctx.fillStyle="#ff5470";ctx.beginPath();ctx.arc(0,-r*1.55,r*0.16,0,7);ctx.fill();}
  else if(id==="head_ears"){ctx.fillStyle="#c8d2e0";
    ctx.beginPath();ctx.moveTo(-r*0.6,-r*0.75);ctx.lineTo(-r*0.85,-r*1.5);ctx.lineTo(-r*0.2,-r*1.0);ctx.fill();
    ctx.beginPath();ctx.moveTo(r*0.6,-r*0.75);ctx.lineTo(r*0.85,-r*1.5);ctx.lineTo(r*0.2,-r*1.0);ctx.fill();
    ctx.fillStyle="#ff9ecb";
    ctx.beginPath();ctx.moveTo(-r*0.55,-r*0.85);ctx.lineTo(-r*0.7,-r*1.32);ctx.lineTo(-r*0.32,-r*1.02);ctx.fill();
    ctx.beginPath();ctx.moveTo(r*0.55,-r*0.85);ctx.lineTo(r*0.7,-r*1.32);ctx.lineTo(r*0.32,-r*1.02);ctx.fill();}
  else if(id==="head_party"){ctx.fillStyle="#ff5fa8";
    ctx.beginPath();ctx.moveTo(-r*0.5,-r*0.82);ctx.lineTo(r*0.5,-r*0.82);ctx.lineTo(0,-r*1.85);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#ffe14d";ctx.lineWidth=r*0.08;
    ctx.beginPath();ctx.moveTo(-r*0.28,-r*1.1);ctx.lineTo(r*0.28,-r*1.1);ctx.stroke();
    ctx.fillStyle="#ffe14d";ctx.beginPath();ctx.arc(0,-r*1.9,r*0.14,0,7);ctx.fill();}
  else if(id==="head_spike"){ctx.fillStyle="#b8c2d4";
    for(let i=-2;i<=2;i++){const h=r*0.7;ctx.beginPath();
      ctx.moveTo(i*r*0.26-r*0.07,-r*0.88);ctx.lineTo(i*r*0.26,-r*0.88-h);ctx.lineTo(i*r*0.26+r*0.07,-r*0.88);ctx.fill();}}
  else if(id==="head_crown"){ctx.fillStyle="#ffd35c";ctx.beginPath();ctx.moveTo(-r*0.8,-r*0.85);
    ctx.lineTo(-r*0.8,-r*1.35);ctx.lineTo(-r*0.4,-r*1.0);ctx.lineTo(0,-r*1.5);
    ctx.lineTo(r*0.4,-r*1.0);ctx.lineTo(r*0.8,-r*1.35);ctx.lineTo(r*0.8,-r*0.85);ctx.closePath();ctx.fill();
    ctx.fillStyle="#ff5470";ctx.beginPath();ctx.arc(0,-r*1.02,r*0.1,0,7);ctx.fill();}
  else if(id==="head_halo"){ctx.strokeStyle="#fff3b0";ctx.lineWidth=r*0.12;ctx.shadowColor="#ffe680";ctx.shadowBlur=14;
    ctx.beginPath();ctx.ellipse(0,-r*1.15,r*0.7,r*0.24,0,0,7);ctx.stroke();ctx.shadowBlur=0;}
  else if(id==="head_horns"){ctx.fillStyle="#e7eefc";
    ctx.beginPath();ctx.moveTo(-r*0.55,-r*0.7);ctx.quadraticCurveTo(-r*1.1,-r*1.1,-r*0.85,-r*1.5);
    ctx.quadraticCurveTo(-r*0.6,-r*1.05,-r*0.3,-r*0.85);ctx.fill();
    ctx.beginPath();ctx.moveTo(r*0.55,-r*0.7);ctx.quadraticCurveTo(r*1.1,-r*1.1,r*0.85,-r*1.5);
    ctx.quadraticCurveTo(r*0.6,-r*1.05,r*0.3,-r*0.85);ctx.fill();}
  else if(id==="head_wizard"){ctx.fillStyle="#5a3fb0";
    ctx.beginPath();ctx.moveTo(-r*0.7,-r*0.82);ctx.lineTo(r*0.7,-r*0.82);ctx.lineTo(r*0.12,-r*1.95);ctx.closePath();ctx.fill();
    ctx.fillStyle="#7a5fd0";ctx.fillRect(-r*0.88,-r*0.9,r*1.76,r*0.2);drawStar(ctx,-r*0.05,-r*1.3,r*0.14,"#ffd35c");}
  else if(id==="head_tophat"){ctx.fillStyle="#151a26";ctx.fillRect(-r*0.95,-r*0.92,r*1.9,r*0.18);
    ctx.fillRect(-r*0.55,-r*1.7,r*1.1,r*0.82);ctx.fillStyle="#e0455a";ctx.fillRect(-r*0.55,-r*1.02,r*1.1,r*0.14);}
  ctx.restore();
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function hexA(hex,a){if(hex.startsWith("hsl"))return hex.replace("hsl","hsla").replace(")",`,${a})`);
  const h=hex.replace("#","");const n=parseInt(h.length===3?h.split("").map(c=>c+c).join(""):h,16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}

/* ================= WORLDS / LEVELS ================= */
const WORLDS=[
  {id:1,name:"Untergassen",short:"Verrostete Tunnel unter der Stadt.",color:"#3fb0ff",floor:"#0a1420",accent:"#2a6da8",
    levels:[
      {kills:14,spawn:1.35,maxAlive:6, pool:["crawler","crawler","darter"]},
      {kills:18,spawn:1.2, maxAlive:7, pool:["crawler","darter","darter"]},
      {kills:20,spawn:1.1, maxAlive:8, pool:["crawler","darter","spitter"]},
      {kills:24,spawn:1.05,maxAlive:9, pool:["darter","spitter","brute"]},
      {kills:10,spawn:1.2, maxAlive:7, pool:["crawler","darter"], boss:"boss1", curseOffers:[0]}
    ]},
  {id:2,name:"Neon-Ödland",short:"Verglühte Reklamen, hungrige Schatten.",color:"#ff4fd8",floor:"#15091e",accent:"#a03aa0",
    levels:[
      {kills:20,spawn:1.05,maxAlive:9, pool:["darter","spitter","crawler"], curseOffers:[0]},
      {kills:24,spawn:0.95,maxAlive:10,pool:["darter","brute","spitter","phantom"], curseOffers:[0,0.5]},
      {kills:26,spawn:0.9, maxAlive:11,pool:["brute","screecher","darter","phantom"], curseOffers:[0,0.5],
        miniboss:{type:"boss2",hpScale:0.35,atFrac:0.5}},
      {kills:28,spawn:0.85,maxAlive:11,pool:["screecher","brute","spitter","darter","phantom"], curseOffers:[0,0.33,0.66]},
      {kills:14,spawn:1.0, maxAlive:9, pool:["darter","spitter","phantom"], boss:"boss2", curseOffers:[0,0.79]}
    ]},
  {id:3,name:"Die Leere",short:"Wo das Licht endgültig aufgibt.",color:"#ffd35c",floor:"#0b0b12",accent:"#7a6a2a",
    levels:[
      {kills:26,spawn:0.95,maxAlive:11,pool:["brute","darter","screecher"], curseOffers:[0,0.5]},
      {kills:30,spawn:0.88,maxAlive:12,pool:["brute","screecher","spitter","husk"], curseOffers:[0,0.33,0.66]},
      {kills:32,spawn:0.82,maxAlive:12,pool:["brute","screecher","darter","spitter","husk"], curseOffers:[0,0.33,0.66],
        miniboss:{type:"boss3",hpScale:0.4,atFrac:0.5}},
      {kills:34,spawn:0.78,maxAlive:13,pool:["brute","screecher","spitter","darter","husk"], curseOffers:[0,0.25,0.5,0.75]},
      {kills:16,spawn:0.95,maxAlive:10,pool:["brute","spitter","husk"], boss:"boss3", curseOffers:[0,0.5625,0.875]}
    ]},
  {id:4,name:"Das Archiv",short:"Seine Zone. Kaum noch etwas anderes lebt hier.",color:"#dfe6f5",floor:"#050508",accent:"#5a5f70",
    levels:[
      {kills:7, spawn:2.2,maxAlive:3,pool:["phantom"], curseOffers:[0],
        miniboss:{type:"boss1",hpScale:0.5,atFrac:0.4}},
      {kills:8, spawn:2.0,maxAlive:3,pool:["phantom","husk"], curseOffers:[0],
        miniboss:{type:"boss2",hpScale:0.55,atFrac:0.4}},
      {kills:8, spawn:1.8,maxAlive:4,pool:["phantom","husk","screecher"], curseOffers:[0],
        miniboss:{type:"boss3",hpScale:0.6,atFrac:0.4}},
      {kills:1, spawn:5.0,maxAlive:0,pool:["phantom","husk"], boss:"mrx", curseOffers:[0]}
    ]}
];
function worldById(id){return WORLDS.find(w=>w.id===id);}
function worldCleared(id){return save.progress[id]>=worldById(id).levels.length;}

const ENEMIES={
  crawler:  {hp:3, speed:88, dmg:8,  r:13, pts:100, color:"#7fd6ff"},
  darter:   {hp:3, speed:158,dmg:7,  r:10, pts:150, color:"#a6ff5c", darts:true},
  brute:    {hp:14,speed:60, dmg:20, r:19, pts:340, color:"#ff8f5c"},
  screecher:{hp:5, speed:96, dmg:8,  r:13, pts:240, color:"#ff4fd8", screech:true},
  spitter:  {hp:4, speed:70, dmg:6,  r:12, pts:260, color:"#ffca4d", spits:true},
  phantom:  {hp:4, speed:130,dmg:11, r:12, pts:220, color:"#b98cff", cloak:true},
  husk:     {hp:8, speed:52, dmg:14, r:16, pts:280, color:"#ff6a3d", explodes:true},
  boss1:    {hp:58, speed:56, dmg:20, r:34, pts:1800, color:"#4fd0ff", boss:true, shootCd:2.0, pattern:1},
  boss2:    {hp:110,speed:60, dmg:24, r:38, pts:2600, color:"#ff4fd8", boss:true, shootCd:1.8, pattern:2},
  boss3:    {hp:160,speed:64, dmg:28, r:42, pts:3400, color:"#ffd35c", boss:true, shootCd:1.6, pattern:3},
  mrx:      {hp:150,speed:74, dmg:26, r:32, pts:6000, color:"#dfe6f5", boss:true, shootCd:2.3, pattern:4}
};

const LEVEL_MODS={
  blind_start: {label:"Blinder Start"},
  tight_arena: {label:"Enger Raum"},
  rush:        {label:"Wellen-Rush"},
  double_boss: {label:"Doppel-Boss"}
};
function pickLevelMod(cfg){
  if(cfg.boss==="mrx")return null;
  if(cfg.boss)return Math.random()<0.5?"double_boss":null;
  const pool=["blind_start","tight_arena","rush",null,null];
  return pool[Math.floor(Math.random()*pool.length)];
}

const POWERS={
  rapid: {name:"Schnellfeuer",color:"#ffd35c"},
  double:{name:"Doppelschuss",color:"#ff4fd8"},
  pierce:{name:"Durchschuss",color:"#3fe0ff"}
};
const POWER_DUR=10;

const CURSES={
  eagle_eye:  {name:"Verstärkter Blick",  desc:"Aura −30%, dafür +25% Score pro Kill.", world:0},
  fragile:    {name:"Zerbrechlich",        desc:"Max-HP −25%, dafür sofort ein zusätzliches Powerup.", world:0},
  breathless: {name:"Kurzatmig",           desc:"Dash-Cooldown +50%, dafür Lauftempo +20%.", world:0},
  silent_rage:{name:"Stille Wut",          desc:"Feuerrate −20%, dafür Schaden pro Treffer +40%.", world:0},
  the_pull:   {name:"Der Sog",             desc:"Mehr Gegner gleichzeitig, dafür +35% Score pro Kill.", world:0},
  ghost_hunter:{name:"Geisterjäger",       desc:"Blackout-Phasen dauern länger, dafür doppelte Cosmetic-Drop-Chance.", world:3}
};
function pickCurse(){const pool=Object.keys(CURSES).filter(id=>{if(game.curses.includes(id))return false;
  const w=CURSES[id].world;if(w===0)return true;if(id==="ghost_hunter")return game.world.id===3||game.world.id===4;
  return w===game.world.id;});
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;}
function recalcCurseMods(){const c=game.curses,p=game.player;
  game.curseScoreMult=1+(c.includes("eagle_eye")?0.25:0)+(c.includes("the_pull")?0.35:0);
  game.curseAuraMult=c.includes("eagle_eye")?0.7:1;
  game.curseSpawnMult=c.includes("the_pull")?0.85:1;
  game.curseDropMult=c.includes("ghost_hunter")?2:1;
  game.curseBlackoutMult=c.includes("ghost_hunter")?1.5:1;
  p.fireRateMult=c.includes("silent_rage")?1.25:1;
  p.dmgMult=c.includes("silent_rage")?1.4:1;
  p.dashCdMult=c.includes("breathless")?1.5:1;
  p.speedMult=c.includes("breathless")?1.2:1;}
function applyCurse(id){game.curses.push(id);
  if(id==="fragile"){const p=game.player,ratio=p.hp/p.maxhp;p.maxhp=Math.round(p.maxhp*0.75);p.hp=Math.max(1,Math.round(p.maxhp*ratio));
    const keys=Object.keys(POWERS);spawnPickup(p.x+rand(-40,40),p.y+rand(-40,40),"power",keys[Math.floor(Math.random()*keys.length)]);}
  recalcCurseMods();}
function offerCurse(id){const c=CURSES[id];game.curseChoicePending=true;
  const stale=document.getElementById("curseOffer");if(stale)stale.remove();
  const el=document.createElement("div");el.id="curseOffer";
  el.style.cssText="position:fixed;inset:0;z-index:90;background:#05070dee;display:flex;align-items:center;justify-content:center;padding:24px;";
  el.innerHTML=`<div style="background:#150d1f;border:1px solid #3a1e4a;border-radius:18px;padding:26px;max-width:380px;width:100%;text-align:center;">
    <div style="font-size:12px;letter-spacing:.12em;color:var(--danger);margin-bottom:8px;">⚠ FLUCH ANGEBOTEN</div>
    <h2 style="margin:0 0 10px;color:#ff8fd0;">${c.name}</h2>
    <p style="color:var(--muted);font-size:14px;line-height:1.5;margin-bottom:22px;">${c.desc}</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button class="btn" id="curseAccept">Fluch annehmen</button>
      <button class="btn ghost" id="curseDecline">Ablehnen</button>
    </div></div>`;
  document.body.appendChild(el);
  document.getElementById("curseAccept").onclick=()=>{applyCurse(id);el.remove();game.curseChoicePending=false;lastT=performance.now();showToast(`Fluch aktiv: ${c.name}`,1900);updateHud();checkCurseOffer();};
  document.getElementById("curseDecline").onclick=()=>{el.remove();game.curseChoicePending=false;lastT=performance.now();checkCurseOffer();};}
function checkCurseOffer(){if(game.curseChoicePending)return;
  for(const k of game.curseOfferKills){if(game.curseOfferedThresholds.has(k))continue;
    if(game.kills>=k){game.curseOfferedThresholds.add(k);const id=pickCurse();if(id)offerCurse(id);return;}}}

/* ---- Story-Fragmente: Lese-Overlay mit Typewriter-Effekt ---- */
function showLoreReading(id){
  const text=STORY_FRAGMENTS[id];if(!text)return;
  game.readingLore=true;
  const stale=document.getElementById("loreReading");if(stale)stale.remove();
  const el=document.createElement("div");el.id="loreReading";
  el.style.cssText="position:fixed;inset:0;z-index:92;background:#05070df0;display:flex;align-items:center;justify-content:center;padding:24px;";
  el.innerHTML=`<div style="max-width:480px;width:100%;text-align:center;">
    <div style="font-size:11px;letter-spacing:.24em;color:#5a7a99;margin-bottom:14px;">SIGNAL EMPFANGEN</div>
    <p id="loreReadingText" style="color:#c9e8ff;font-size:17px;line-height:1.7;min-height:4.5em;font-style:italic;"></p>
    <button class="btn ghost small" id="loreReadingSkip" style="margin-top:18px;opacity:.7;">Weiter</button>
  </div>`;
  document.body.appendChild(el);
  const txtEl=document.getElementById("loreReadingText");
  let i=0,done=false,typeTO=null,closeTO=null;
  function typeStep(){
    if(i>=text.length){done=true;closeTO=setTimeout(closeReading,1800);return;}
    txtEl.textContent+=text[i];i++;
    typeTO=setTimeout(typeStep,22);
  }
  function closeReading(){
    clearTimeout(typeTO);clearTimeout(closeTO);
    el.remove();game.readingLore=false;lastT=performance.now();
  }
  typeStep();
  document.getElementById("loreReadingSkip").onclick=()=>{
    if(!done){clearTimeout(typeTO);txtEl.textContent=text;done=true;closeTO=setTimeout(closeReading,900);}
    else closeReading();
  };
}

/* ---- Archiv/Codex: Nachlese aller gefundenen Fragmente ---- */
function buildCodex(){
  const el=document.getElementById("codexList");el.innerHTML="";
  const byWorld={};
  Object.keys(STORY_FRAGMENTS).forEach(id=>{
    const wid=parseInt(id.split("-")[0],10);
    (byWorld[wid]=byWorld[wid]||[]).push(id);
  });
  Object.keys(byWorld).sort((a,b)=>a-b).forEach(wid=>{
    const world=worldById(parseInt(wid,10));
    const sec=document.createElement("div");
    sec.innerHTML=`<h3 style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 10px;">${world?world.name:"Welt "+wid}</h3>`;
    byWorld[wid].forEach(id=>{
      const found=save.loreFound.includes(id);
      const row=document.createElement("div");
      row.style.cssText="border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:8px;background:linear-gradient(180deg,#101b30,#0a1120);";
      row.innerHTML=found
        ? `<div style="color:#c9e8ff;font-size:14px;font-style:italic;line-height:1.5;">"${STORY_FRAGMENTS[id]}"</div>`
        : `<div style="color:#3a4a6a;font-size:14px;letter-spacing:.06em;">████████ ███ ██████████ ████.</div>`;
      sec.appendChild(row);
    });
    el.appendChild(sec);
  });
}
document.getElementById("btnCodex").onclick=()=>{buildCodex();showScreen("codex");};

const STORY_FRAGMENTS={
  "1-0":"Tag eins ohne Netz. Wenn das wer liest: bleib im Licht. Da unten ist was, das auf dich wartet, nicht auf dich zukommt.",
  "1-2":"In die Wand geritzt, immer wieder: WARUM PINGEN SIE NICHT MEHR. Keine Antwort, nur die Frage, dutzendfach.",
  "1-4":"Kein Umriss, kein Gegner. Er stand einfach da und hat gewartet, bis ich wieder gepingt hab.",
  "2-0":"Er braucht keinen Puls mehr. Er sieht uns längst, ohne zu suchen.",
  "2-2":"Vermisstenmeldung, halb verkohlt: Pulsgänger, Kennung 3. Der Rest der Akte fehlt.",
  "2-4":"Kennung 3. Der Name stand mal für mich. Bevor was genau — daran erinnere ich mich nicht mehr.",
  "3-0":"Ich schreib die Zahl immer wieder auf, damit ich sie nicht verliere: Kennung 3. Kennung 3.",
  "3-2":"Keine Rettungsmission. Nie gewesen. Wir wurden geschickt, um ihn zu finden — nicht, um ihn zu retten.",
  "3-4":"Tag eins ohne Netz. Wenn das wer lie—",
  "4-0":"Zugriff gewährt. Aufzeichnungen aller Pulsgänger-Kennungen — lückenhaft, aber lesbar.",
  "4-1":"Kennung 1: verstummt am vierten Tag. Kennung 2: verstummt am zweiten. Ein Muster, kein Zufall.",
  "4-2":"Er war nicht immer so. Er hat aufgehört zu pingen, um uns zu schützen. Wir haben das erst zu spät verstanden."
};
const LORE_TOTAL=Object.keys(STORY_FRAGMENTS).length;
const DECOR_POOLS={
  1:{n:[0,1],types:["gear"]},
  2:{n:[2,4],types:["blood_drop","gear","scratch"]},
  3:{n:[4,7],types:["blood_pool","blood_drop","gear","scratch","scratch"]},
  4:{n:[6,9],types:["blood_pool","blood_pool","blood_drop","gear","scratch"]}
};
const HUNTER_SPEED=42, HUNTER_R=17, HUNTER_DMG=25, HUNTER_AGITATE=1.7, HUNTER_AGITATE_DUR=2.6;
const HUNTER_BLACKOUT_PING_BOOST=2.6, HUNTER_BLACKOUT_PING_DUR=1.3;

