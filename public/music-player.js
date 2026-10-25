/* Optional invitation music. Starts only after a visitor presses Play. */
(function(){
  'use strict';
  let ctx=null, timer=null, nodes=[], audio=null, active=null, cursor=0;
  const melodies={
    'rose-piano':{notes:[60,64,67,72,69,67,64,62,60,64,67,69,67,64,62,60],tempo:420,wave:'sine'},
    'royal-waltz':{notes:[55,62,67,71,67,62,57,64,69,72,69,64,55,62,67,74],tempo:510,wave:'triangle'},
    'morning-bells':{notes:[72,76,79,76,74,72,69,72,76,81,79,76,74,72,69,67],tempo:520,wave:'sine'}
  };
  function display(playing) {
    document.querySelectorAll('[data-ws-music]').forEach(btn=>{
      btn.setAttribute('aria-pressed',String(playing));
      btn.textContent=playing?'❚❚ Pause music':'♫ Play music';
    });
  }
  function stop(){
    if(timer){clearInterval(timer);timer=null;}
    for(const node of nodes){try{node.stop();}catch{}}nodes=[];
    if(audio){audio.pause();audio.currentTime=0;audio=null;}
    if(ctx){ctx.close().catch(()=>{});ctx=null;}
    active=null;display(false);
  }
  async function toggle(button){
    const root=button.closest('.wedding-site');
    if(!root)return;
    if(active===root){stop();return;}
    stop();
    const kind=button.dataset.source, source=button.dataset.url,track=button.dataset.track;
    active=root;
    if(kind==='upload'){
      if(!source){stop();return;}
      audio=new Audio(source);audio.loop=true;audio.volume=.55;audio.preload='none';
      try{await audio.play();display(true);}catch{stop();button.textContent='Playback unavailable';}
      return;
    }
    const tune=melodies[track];if(!tune){stop();return;}
    const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextCtor){stop();return;}
    try{ctx=new AudioContextCtor();await ctx.resume();}catch{stop();return;}
    cursor=0;
    function tick(){
      if(!ctx)return;
      const now=ctx.currentTime, freq=440*Math.pow(2,(tune.notes[cursor%tune.notes.length]-69)/12);
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.type=tune.wave;oscillator.frequency.value=freq;
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.065,now+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,now+tune.tempo/1000*.87);
      oscillator.connect(gain);gain.connect(ctx.destination);
      oscillator.start(now);oscillator.stop(now+tune.tempo/1000);
      nodes.push(oscillator);if(nodes.length>40)nodes.splice(0,20);
      cursor++;
    }
    tick();timer=setInterval(tick,tune.tempo);display(true);
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-ws-music]');
    if(button){event.preventDefault();toggle(button);}
  });
  window.EverafterMusic={stop};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
