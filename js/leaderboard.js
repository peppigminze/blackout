/* ================= Online-Leaderboard (Firebase Firestore) ================= */
//
// SETUP: Trage hier die Firebase-Projekt-Config ein (Firebase Console -> Projekteinstellungen
// -> "Meine Apps" -> Web-App -> Config). Der apiKey ist bei Firebase bewusst öffentlich -
// die eigentliche Sicherheit läuft über die Firestore Security Rules (siehe Anleitung).
// Solange FIREBASE_CONFIG.projectId leer ist, bleibt das Leaderboard deaktiviert und die
// UI zeigt einen Hinweis statt zu crashen.
const FIREBASE_CONFIG={
  apiKey:"AIzaSyC_9ED0orn_PvpaP6XGrbY1w-YEqbysZo0",
  authDomain:"blackout-53513.firebaseapp.com",
  projectId:"blackout-53513",
  storageBucket:"blackout-53513.firebasestorage.app",
  messagingSenderId:"58299307411",
  appId:"1:58299307411:web:867a83449a525f93d8c466"
};
const LB_COLLECTION="leaderboard";
const LB_LIMIT=20;

const LB=(()=>{
  let db=null,ready=false;
  try{
    if(FIREBASE_CONFIG.projectId&&typeof firebase!=="undefined"){
      firebase.initializeApp(FIREBASE_CONFIG);
      db=firebase.firestore();
      ready=true;
    }
  }catch(e){db=null;ready=false;}

  function ensurePlayerId(){
    if(!save.playerId){save.playerId="p"+Math.random().toString(36).slice(2,10)+Date.now().toString(36);persist();}
    return save.playerId;
  }
  function hasName(){return !!save.playerName;}

  function perWorldBest(wid){
    let m=0;
    for(const k in save.best)if(k.startsWith(wid+"-")&&save.best[k]>m)m=save.best[k];
    return m;
  }

  function trySubmit(){
    if(!ready||!save.playerName)return Promise.resolve(false);
    ensurePlayerId();
    const overall=save.highscore;
    const w1=perWorldBest(1),w2=perWorldBest(2),w3=perWorldBest(3),w4=perWorldBest(4);
    const ref=db.collection(LB_COLLECTION).doc(save.playerId);
    return ref.get().then(snap=>{
      const cur=snap.exists?snap.data():{};
      const merged={
        name:save.playerName,
        overall:Math.max(overall,cur.overall||0),
        w1:Math.max(w1,cur.w1||0),w2:Math.max(w2,cur.w2||0),w3:Math.max(w3,cur.w3||0),w4:Math.max(w4,cur.w4||0),
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      return ref.set(merged,{merge:true}).then(()=>true);
    }).catch(()=>false);
  }

  function setName(rawName){
    const name=String(rawName||"").trim().slice(0,18);
    if(!name)return false;
    save.playerName=name;ensurePlayerId();persist();
    trySubmit();
    return true;
  }

  function fetchTop(scope){
    if(!ready)return Promise.resolve([]);
    const field=scope==="overall"?"overall":"w"+scope;
    return db.collection(LB_COLLECTION).orderBy(field,"desc").limit(LB_LIMIT).get()
      .then(qs=>qs.docs.map(d=>({id:d.id,...d.data()})))
      .catch(()=>[]);
  }

  function myScoreFor(scope){
    return scope==="overall"?save.highscore:perWorldBest(scope);
  }

  return{ready:()=>ready,hasName,ensurePlayerId,setName,trySubmit,fetchTop,myScoreFor,perWorldBest};
})();

/* ---- UI ---- */
function lbFieldLabel(scope){return scope==="overall"?"Gesamt":worldById(scope).name;}

function buildLeaderboardTabs(active){
  const el=document.getElementById("lbTabs");el.innerHTML="";
  const scopes=["overall",1,2,3,4];
  scopes.forEach(sc=>{
    const b=document.createElement("button");
    b.className="btn small"+(sc===active?" primary":" ghost");
    b.textContent=lbFieldLabel(sc);
    b.onclick=()=>renderLeaderboard(sc);
    el.appendChild(b);
  });
}

function renderLeaderboard(scope){
  buildLeaderboardTabs(scope);
  const listEl=document.getElementById("lbList"),mineEl=document.getElementById("lbMineRow");
  listEl.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:10px 0;">Lädt…</div>`;
  mineEl.innerHTML="";
  if(!LB.ready()){
    listEl.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:10px 0;">Bestenliste ist noch nicht verbunden.</div>`;
    return;
  }
  LB.fetchTop(scope).then(rows=>{
    listEl.innerHTML="";
    if(!rows.length){
      listEl.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:10px 0;">Noch keine Einträge — sei der/die Erste!</div>`;
    }
    let mineInTop=false;
    rows.forEach((r,i)=>{
      const mine=r.id===save.playerId;if(mine)mineInTop=true;
      const row=document.createElement("div");
      row.style.cssText=`display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:10px;
        background:${mine?"linear-gradient(90deg,#1a3350,#0d1a2c)":"#0d1424"};border:1px solid ${mine?"var(--cyan)":"var(--line)"};`;
      const score=scope==="overall"?r.overall:r["w"+scope];
      row.innerHTML=`<span style="color:var(--muted);width:28px;">#${i+1}</span>
        <span style="flex:1;color:${mine?"var(--cyan)":"var(--text)"};font-weight:${mine?700:400};">${escapeHtml(r.name||"???")}</span>
        <span style="font-variant-numeric:tabular-nums;">${(score||0).toLocaleString("de-CH")}</span>`;
      listEl.appendChild(row);
    });
    if(save.playerName&&!mineInTop){
      const myScore=LB.myScoreFor(scope);
      mineEl.innerHTML=`<div style="color:var(--muted);font-size:12px;margin-bottom:6px;">Dein bestes Ergebnis (ausserhalb der Top ${LB_LIMIT}):</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:10px;background:#0d1424;border:1px solid var(--cyan);">
          <span style="flex:1;color:var(--cyan);font-weight:700;">${escapeHtml(save.playerName)}</span>
          <span style="font-variant-numeric:tabular-nums;">${myScore.toLocaleString("de-CH")}</span>
        </div>`;
    }
  });
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function openLeaderboard(){
  const gate=document.getElementById("lbNameGate"),content=document.getElementById("lbContent");
  if(!LB.hasName()){
    gate.style.display="block";content.style.display="none";
  }else{
    gate.style.display="none";content.style.display="block";
    renderLeaderboard("overall");
  }
  showScreen("leaderboard");
}

document.getElementById("btnLeaderboard").onclick=()=>openLeaderboard();
document.getElementById("lbNameConfirm").onclick=()=>{
  const input=document.getElementById("lbNameInput");
  if(LB.setName(input.value)){
    document.getElementById("lbNameGate").style.display="none";
    document.getElementById("lbContent").style.display="block";
    renderLeaderboard("overall");
  }
};
