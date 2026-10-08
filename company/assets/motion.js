/* Physics sampled into CSS linear() curves. Spatial springs may overshoot;
   effects are critically damped. No motion timing is defined in components. */
(() => {
  const schemes = {
    fastSpatial:{stiffness:700,damping:38,mass:1},
    defaultSpatial:{stiffness:380,damping:28,mass:1},
    slowSpatial:{stiffness:220,damping:24,mass:1},
    effects:{stiffness:850,damping:60,mass:1}
  };
  function sample(spec){let x=0,v=0;const step=1/120,frames=[];let time=0;for(let i=0;i<360;i++){const a=(spec.stiffness*(1-x)-spec.damping*v)/spec.mass;v+=a*step;x+=v*step;time+=step;if(i%3===0)frames.push(x);if(time>.1&&Math.abs(1-x)<.001&&Math.abs(v)<.01)break;}frames.push(1);return {time,curve:`linear(${frames.map((value,index)=>`${value.toFixed(4)} ${(index/(frames.length-1)*100).toFixed(2)}%`).join(',')})`};}
  const samples=Object.fromEntries(Object.entries(schemes).map(([k,v])=>[k,sample(v)]));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function install(){const root=document.documentElement.style;for(const [role,key] of [['fast','fastSpatial'],['default','defaultSpatial'],['slow','slowSpatial'],['effects','effects']])root.setProperty(`--motion-${role}-time`,reduced.matches?'0s':`${samples[key].time}s`);root.setProperty('--motion-spatial-curve',samples.defaultSpatial.curve);root.setProperty('--motion-effects-curve',samples.effects.curve);}
  install();reduced.addEventListener('change',install);
  window.studioMotion={reduced,schemes,samples,enter(element){if(reduced.matches)return;return element.animate([{translate:'0 24px',scale:'.96'},{translate:'0 0',scale:'1'}],{duration:samples.defaultSpatial.time*1000,easing:samples.defaultSpatial.curve});}};
})();
