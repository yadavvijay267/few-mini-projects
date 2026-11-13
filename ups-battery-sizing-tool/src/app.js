const B={ 'VRLA':{cv:2,dod:.8,ah:100,cost:18000,life:5,fp:.08},'Li-ion':{cv:3.2,dod:.9,ah:100,cost:42000,life:12,fp:.03}};
const EFF=.92,AGE=1.25;
function size(kw,aut,dc,bat,tf){const s=B[bat];const ewh=kw*1000*(aut/60)/EFF;const ah=ewh/dc*AGE*tf/s.dod;
 return {ah,ekwh:ewh/1000,cells:Math.ceil(dc/s.cv),strings:Math.max(1,Math.ceil(ah/s.ah))};}
function calc(){
 const kva=+document.getElementById('kva').value,pf=+document.getElementById('pf').value,
 aut=+document.getElementById('aut').value,dc=+document.getElementById('dc').value,
 bat=document.getElementById('bat').value,tf=+document.getElementById('tmp').value;
 const kw=kva*pf, ups=Math.ceil(kva*1.25), r=size(kw,aut,dc,bat,tf);
 document.getElementById('out').innerHTML=`<p>Load <b>${kw.toFixed(1)} kW</b> (${kva} kVA at pf ${pf})</p>
 <p class="big pass">${ups} kVA UPS</p>
 <p>Battery: <b>${r.ah.toFixed(1)} Ah</b> at ${dc} V (${r.ekwh.toFixed(2)} kWh usable energy)<br>
 ${r.cells} cells in series &times; ${r.strings} parallel string(s) (${B[bat].ah} Ah cells)<br>
 <span class="mut">Includes ageing factor x1.25 and temperature factor x${tf} — batteries do not stay new forever.</span></p>`;
 const cmp=Object.keys(B).map(n=>{const x=size(kw,aut,dc,n,tf);return `<tr><td>${n}</td><td>${x.ah.toFixed(0)} Ah</td><td>&#8377;${Math.round(x.ekwh*B[n].cost).toLocaleString('en-IN')}</td><td>${(x.ekwh*B[n].fp).toFixed(2)} m&sup2;</td><td>${B[n].life} yrs</td></tr>`}).join('');
 document.getElementById('cmp').innerHTML=`<table><tr><th>Type</th><th>Ah</th><th>Cost</th><th>Footprint</th><th>Life</th></tr>${cmp}</table>
 <p class="mut">Li-ion costs more up front but lasts ~2.4x longer and takes ~60% less floor space.</p>`;
 const cv=document.getElementById('chart'),ctx=cv.getContext('2d');cv.width=cv.clientWidth;cv.height=180;
 const inst=r.ah;ctx.clearRect(0,0,cv.width,180);ctx.strokeStyle='#22d3ee';ctx.lineWidth=2;ctx.beginPath();
 for(let i=0;i<=20;i++){const frac=.25+i*(1.5/20);const rt=inst*dc*B[bat].dod/AGE*EFF/(kw*frac*1000)*60;
  const x=10+i*(cv.width-20)/20, y=170-Math.min(rt,120)/120*150; i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
 ctx.stroke();ctx.fillStyle='#94a3b8';ctx.font='12px sans-serif';
 ctx.fillText('Runtime falls as load rises — at 100% load: '+Math.round(inst*dc*B[bat].dod/AGE*EFF/(kw*1000)*60)+' min',10,14);
}
calc();
