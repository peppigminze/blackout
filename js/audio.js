/* ================= Audio ================= */
const Audio_=(()=>{let actx=null;
  function ensure(){if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}
    if(actx&&actx.state==="suspended")actx.resume();}
  function tone(f,f2,dur,type,vol){if(save.muted||!actx)return;
    const o=actx.createOscillator(),g=actx.createGain();o.type=type||"sine";
    o.frequency.setValueAtTime(f,actx.currentTime);
    if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),actx.currentTime+dur);
    g.gain.setValueAtTime(0.0001,actx.currentTime);g.gain.exponentialRampToValueAtTime(vol||0.14,actx.currentTime+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
    o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+dur+0.02);}
  function noise(dur,vol){if(save.muted||!actx)return;
    const b=actx.createBuffer(1,actx.sampleRate*dur,actx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
    const s=actx.createBufferSource();s.buffer=b;const g=actx.createGain();g.gain.value=vol||0.12;
    s.connect(g);g.connect(actx.destination);s.start();}
  return{ensure,ping(){tone(680,180,0.28,"sine",0.11);},dash(){tone(520,780,0.11,"triangle",0.1);},shot(){tone(420,260,0.05,"square",0.045);},
    distantSteps(){tone(70,55,0.9,"sine",0.05);setTimeout(()=>tone(64,50,0.9,"sine",0.045),340);},
    glimpse(){tone(180,60,0.5,"sawtooth",0.06);},
    hit(){noise(0.05,0.05);},kill(){tone(160,60,0.16,"sawtooth",0.11);},pickup(){tone(520,880,0.14,"triangle",0.13);},
    hurt(){tone(180,80,0.2,"sawtooth",0.15);},enemyShot(){tone(300,160,0.12,"sawtooth",0.06);},
    win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,f,0.18,"triangle",0.12),i*110));},
    lose(){[400,300,200,120].forEach((f,i)=>setTimeout(()=>tone(f,f*0.7,0.24,"sawtooth",0.13),i*130));},
    boss(){tone(90,55,0.5,"sawtooth",0.14);}};})();

