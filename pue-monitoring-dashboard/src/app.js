let hist=[], running=true, overCount=0, state={it:500,cool:180,light:15,loss:25};
function tick(){state.it=Math.max(350,Math.min(650,state.it+(Math.random()-.5)*24));
 state.cool=Math.max(120,Math.min(260,state.cool+(Math.random()-.5)*14));
 state.loss=20+state.it*0.012; const total=state.it+state.cool+state.light+state.loss;
 hist.push({pue:total/state.it,total,it:state.it,cool:state.cool,light:state.light,loss:state.loss});
 if(hist.length>60)hist.shift(); render();}
function render(){const h=hist[hist.length-1]; if(!h)return;
 const tgt=+document.getElementById('tgt').value, tar=+document.getElementById('tar').value;
 document.getElementById('live').innerHTML=`<p class="big ${h.pue<=tgt?'pass':'fail'}">${h.pue.toFixed(2)}</p>
 <p>Total facility ${h.total.toFixed(0)} kW &nbsp;|&nbsp; IT load ${h.it.toFixed(0)} kW<br>
 Daily avg PUE <b>${(hist.reduce((a,x)=>a+x.pue,0)/hist.length).toFixed(2)}</b> &nbsp;|&nbsp;
 Monthly energy cost (est.) <b>&#8377;${Math.round(h.total*720*tar).toLocaleString('en-IN')}</b></p>`;
 overCount=h.pue>tgt?overCount+1:0;
 document.getElementById('alert').innerHTML=overCount>=3?`<p class="fail">ALERT: PUE above target ${tgt} for ${overCount} consecutive readings — check cooling.</p>`:'';
 document.getElementById('brk').innerHTML=['cool','light','loss'].map(k=>{const v=h[k],pct=v/h.total*100;
  return `<p>${k==='cool'?'Cooling':k==='light'?'Lighting':'UPS & other losses'}: ${v.toFixed(0)} kW (${pct.toFixed(1)}%)</p><div class="bar"><i style="width:${pct}%"></i></div>`}).join('')+
  `<p class="mut">Overhead: ${(h.total-h.it).toFixed(0)} kW</p>`;
 const red=+document.getElementById('wif').value; document.getElementById('wLab').textContent=`Cooling reduction: ${red}%`;
 const nc=h.cool*(1-red/100), np=(h.it+nc+h.light+h.loss)/h.it;
 document.getElementById('wifOut').innerHTML=`<p>If cooling drops ${red}% (${h.cool.toFixed(0)} &rarr; ${nc.toFixed(0)} kW), PUE becomes <b class="${np<=tgt?'pass':'fail'}">${np.toFixed(2)}</b> (was ${h.pue.toFixed(2)}), saving <b>&#8377;${Math.round((h.cool-nc)*720*tar).toLocaleString('en-IN')}/month</b>.</p>`;
 const cv=document.getElementById('chart'),ctx=cv.getContext('2d');cv.width=cv.clientWidth;cv.height=180;
 ctx.clearRect(0,0,cv.width,180);const lo=1.0,hi=2.0,Y=p=>170-(p-lo)/(hi-lo)*150;
 ctx.strokeStyle='#f87171';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(0,Y(tgt));ctx.lineTo(cv.width,Y(tgt));ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#f87171';ctx.fillText('Target '+tgt,6,Y(tgt)-4);
 ctx.strokeStyle='#22d3ee';ctx.lineWidth=2;ctx.beginPath();
 hist.forEach((x,i)=>{const px=i/(59)*cv.width; i?ctx.lineTo(px,Y(x.pue)):ctx.moveTo(px,Y(x.pue));});ctx.stroke();}
function toggleFeed(){running=!running;document.getElementById('feedBtn').textContent=running?'Pause live feed':'Resume live feed';}
function loadCSV(ev){const f=ev.target.files[0];if(!f)return;const r=new FileReader();
 r.onload=()=>{const rows=r.result.trim().split('\n').slice(1);let sum=0,n=0;
  rows.forEach(row=>{const c=row.split(',');const it=+c[1],tot=it+ +c[2]+ +c[3]+ +c[4];sum+=tot/it;n++;});
  document.getElementById('csvOut').innerHTML=`<p>Loaded ${n} rows from CSV. Average PUE: <b>${(sum/n).toFixed(2)}</b></p>`;};r.readAsText(f);}
setInterval(()=>{if(running)tick()},2000); tick();
