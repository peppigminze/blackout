/* ================= Audio ================= */
const Audio_=(()=>{
  let actx=null;
  let ambient=null; // {o1,o2,filt,g,lfo,lfoGain}
  let ambientTension=0; // 0..1, geglättet

  function ensure(){
    if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}
    if(actx&&actx.state==="suspended")actx.resume();
    if(actx&&!ambient)startAmbient();
  }

  function startAmbient(){
    if(!actx||ambient)return;
    try{
      const o1=actx.createOscillator(),o2=actx.createOscillator();
      const filt=actx.createBiquadFilter(),g=actx.createGain();
      o1.type="sine";o1.frequency.value=55;
      o2.type="triangle";o2.frequency.value=55.7; // leichte Verstimmung -> Schwebung
      filt.type="lowpass";filt.frequency.value=300;
      g.gain.value=save.muted?0:0.035;
      o1.connect(filt);o2.connect(filt);filt.connect(g);g.connect(actx.destination);
      o1.start();o2.start();
      const lfo=actx.createOscillator(),lfoGain=actx.createGain();
      lfo.type="sine";lfo.frequency.value=0.08;lfoGain.gain.value=120;
      lfo.connect(lfoGain);lfoGain.connect(filt.frequency);lfo.start();
      ambient={o1,o2,filt,g,lfo,lfoGain};
    }catch(e){ambient=null;}
  }

  // level: 0 = ruhig, 1 = maximale Anspannung (Blackout-Phase / Hunter nah).
  // Wird pro Frame aufgerufen, daher intern geglättet statt hart zu springen.
  function setTension(level){
    ambientTension+=(clamp01(level)-ambientTension)*0.05;
    if(!ambient||!actx)return;
    const t=actx.currentTime;
    const vol=save.muted?0:(0.035+ambientTension*0.05);
    const cutoff=300-ambientTension*180;
    try{
      ambient.g.gain.linearRampToValueAtTime(vol,t+0.4);
      ambient.filt.frequency.linearRampToValueAtTime(Math.max(60,cutoff),t+0.4);
    }catch(e){}
  }
  function clamp01(v){return v<0?0:v>1?1:v;}

  function panNode(pan){
    if(pan===undefined||pan===null||!actx.createStereoPanner)return null;
    const p=actx.createStereoPanner();
    p.pan.value=Math.max(-1,Math.min(1,pan));
    return p;
  }

  function tone(f,f2,dur,type,vol,pan){
    if(save.muted||!actx)return;
    const o=actx.createOscillator(),g=actx.createGain();o.type=type||"sine";
    o.frequency.setValueAtTime(f,actx.currentTime);
    if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),actx.currentTime+dur);
    g.gain.setValueAtTime(0.0001,actx.currentTime);g.gain.exponentialRampToValueAtTime(vol||0.14,actx.currentTime+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
    const pn=panNode(pan);
    if(pn){o.connect(g);g.connect(pn);pn.connect(actx.destination);}
    else{o.connect(g);g.connect(actx.destination);}
    o.start();o.stop(actx.currentTime+dur+0.02);
  }
  function noise(dur,vol,pan){
    if(save.muted||!actx)return;
    const b=actx.createBuffer(1,actx.sampleRate*dur,actx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
    const s=actx.createBufferSource();s.buffer=b;const g=actx.createGain();g.gain.value=vol||0.12;
    const pn=panNode(pan);
    if(pn){s.connect(g);g.connect(pn);pn.connect(actx.destination);}
    else{s.connect(g);g.connect(actx.destination);}
    s.start();
  }

  function muteChanged(){
    if(!ambient||!actx)return;
    try{ambient.g.gain.linearRampToValueAtTime(save.muted?0:(0.035+ambientTension*0.05),actx.currentTime+0.15);}catch(e){}
  }

  return{
    ensure,setTension,muteChanged,
    ping(pan){tone(680,180,0.28,"sine",0.11,pan);},
    dash(){tone(520,780,0.11,"triangle",0.1);},
    shot(){tone(420,260,0.05,"square",0.045);},
    distantSteps(pan){tone(70,55,0.9,"sine",0.05,pan);setTimeout(()=>tone(64,50,0.9,"sine",0.045,pan),340);},
    glimpse(pan){tone(180,60,0.5,"sawtooth",0.06,pan);},
    hit(pan){noise(0.05,0.05,pan);},
    kill(pan){tone(160,60,0.16,"sawtooth",0.11,pan);},
    pickup(pan){tone(520,880,0.14,"triangle",0.13,pan);},
    hurt(){tone(180,80,0.2,"sawtooth",0.15);},
    enemyShot(pan){tone(300,160,0.12,"sawtooth",0.06,pan);},
    win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,f,0.18,"triangle",0.12),i*110));},
    lose(){[400,300,200,120].forEach((f,i)=>setTimeout(()=>tone(f,f*0.7,0.24,"sawtooth",0.13),i*130));},
    boss(pan){tone(90,55,0.5,"sawtooth",0.14,pan);},
    // Für den Abspann: langsame, absteigende Moll-Tonfolge statt triumphaler Fanfare -
    // der Twist ("was, wenn du auch aufhörst zu pingen?") ist kein Sieg, sondern offen/unbequem.
    reveal(){[440,392,349,330].forEach((f,i)=>setTimeout(()=>tone(f,f*0.9,1.0,"sine",0.08),i*950));},
    // Kurzer, dissonanter Sting für den Moment, in dem "Kennung 4 — ?" erscheint
    sting(){tone(220,210,0.6,"sawtooth",0.05);tone(233,150,0.9,"sine",0.045);}
  };
})();
