const DEVICES=[
 {n:'Air conditioner',typ:1500,standby:3,idle:false,w:0,kwh:0},
 {n:'Water heater',typ:2000,standby:0,idle:false,w:0,kwh:0},
 {n:'Fridge',typ:150,standby:0,idle:false,w:0,kwh:0},
 {n:'TV + set-top box',typ:120,standby:12,idle:true,w:0,kwh:0},
 {n:'Wi-Fi router',typ:10,standby:10,idle:true,w:0,kwh:0},
 {n:'Washing machine',typ:500,standby:5,idle:true,w:0,kwh:0},
 {n:'Laptop charger',typ:65,standby:4,idle:true,w:0,kwh:0}];
const WEEK=[4.2,5.1,3.8,6.0,4.9,7.2,5.5];
let alerts=[];
function render(){const tar=+document.getElementById('tar').value;
 const live=DEVICES.reduce((a,d)=>a+d.w,0);
 const dayKwh=DEVICES.reduce((a,d)=>a+d.kwh,0)+WEEK[6];
 document.getElementById('totals').innerHTML=`<p class="big">${live.toFixed(0)} W</p>
 <p>Today (simulated): <b>${dayKwh.toFixed(2)} kWh</b> — cost <b>&#8377;${(dayKwh*tar).toFixed(2)}</b><br>
 This week: <b>${WEEK.reduce((a,b)=>a+b,0).toFixed(1)} kWh</b> — <b>&#8377;${(WEEK.reduce((a,b)=>a+b,0)*tar).toFixed(0)}</b><br>
 This month (est.): <b>&#8377;${(WEEK.reduce((a,b)=>a+b,0)/7*30*tar).toFixed(0)}</b></p>`;
 document.getElementById('devs').innerHTML='<table><tr><th>Device</th><th>Live W</th><th>Today kWh</th><th>Status</th></tr>'+
  DEVICES.map(d=>`<tr><td>${d.n}</td><td>${d.w.toFixed(0)}</td><td>${d.kwh.toFixed(2)}</td><td class="${d.w>1.5*d.typ?'fail':d.idle&&d.w>2?'warn':'pass'}">${d.w>1.5*d.typ?'HIGH USAGE':d.idle&&d.w>2?'STANDBY':d.w>0?'Running':'Off'}</td></tr>`).join('')+'</table>';
 document.getElementById('alerts').innerHTML=alerts.length?alerts.slice(-3).map(a=>`<p class="fail">${a}</p>`).join(''):'<p class="pass">No alerts — all devices within normal range.</p>';
 const vamp=DEVICES.filter(d=>d.idle&&d.standby>2).map(d=>({n:d.n,w:d.standby,kwh:d.standby*24*30/1000})).sort((a,b)=>b.kwh-a.kwh);
 const tot=vamp.reduce((a,d)=>a+d.kwh,0);
 document.getElementById('vamp').innerHTML=vamp.map(d=>`<p>${d.n}: ${d.w} W standby &rarr; <b>${d.kwh.toFixed(2)} kWh/month</b> wasted</p>`).join('')+
  `<p class="warn">Total vampire waste: <b>${tot.toFixed(2)} kWh/month (&#8377;${(tot*tar).toFixed(0)})</b> — switch these off at the plug.</p>`;
 const big=DEVICES.reduce((a,d)=>d.kwh>a.kwh?d:a,DEVICES[0]);
 document.getElementById('big').innerHTML=`<p class="big pass">${big.n}</p><p>${big.kwh.toFixed(2)} kWh today — the most expensive device in the house.</p>`;
 const cv=document.getElementById('chart'),ctx=cv.getContext('2d');cv.width=cv.clientWidth;cv.height=180;
 const mx=Math.max(...WEEK,1);ctx.clearRect(0,0,cv.width,180);ctx.fillStyle='#e2e8f0';ctx.font='12px sans-serif';
 WEEK.forEach((v,i)=>{const bw=(cv.width-20)/7-8,h=v/mx*140;ctx.fillStyle=i===6?'#22d3ee':'#155e75';
  ctx.fillRect(10+i*(cv.width-20)/7,170-h,(cv.width-20)/7-8,h);ctx.fillStyle='#e2e8f0';ctx.fillText(v.toFixed(1),12+i*(cv.width-20)/7,160-h);});}
setInterval(()=>{DEVICES.forEach(d=>{const on=!d.idle||Math.random()<.3;
  d.w=on?d.typ*(0.7+Math.random()*0.6):d.standby;
  d.kwh+=d.w*2/3600; // 2-second tick
  if(d.w>1.5*d.typ&&!alerts.includes(d.n))alerts.push(`ALERT: ${d.n} at ${d.w.toFixed(0)} W — over 1.5x its typical ${d.typ} W.`);});
 render();},2000);
render();
