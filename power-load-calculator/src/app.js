const SIZES=[25,50,100,160,200,250,315,400,500,630,800,1000,1250,1600,2000];
let loads=JSON.parse(localStorage.getItem('plc-loads')||'[]');
if(!loads.length)loads=[{n:'LED lighting',c:'Lighting',kw:20,df:.9,q:1},{n:'AHU-1',c:'HVAC',kw:15,df:.8,q:2},{n:'Chiller pump',c:'Motors',kw:11,df:.75,q:1},{n:'Server rack',c:'IT',kw:8,df:.9,q:3}];
function save(){localStorage.setItem('plc-loads',JSON.stringify(loads))}
function addLoad(){const n=document.getElementById('nm').value||'Load';loads.push({n,c:document.getElementById('cat').value,kw:+document.getElementById('kw').value,df:+document.getElementById('df').value,q:+document.getElementById('qty').value});save();render();}
function del(i){loads.splice(i,1);save();render();}
function clearAll(){loads=[];save();render();}
function demand(extra){const pf=+document.getElementById('pf').value,div=+document.getElementById('div').value;
 const conn=loads.reduce((a,l)=>a+l.kw*l.q,0)+extra*15;
 const dem=loads.reduce((a,l)=>a+l.kw*l.df*l.q,0)*div+extra*15*0.8*div;
 const kva=dem/pf; const need=kva*1.25; const tx=SIZES.find(s=>s>=need)||null;
 return {conn,dem,kva,tx};}
function render(){
 const wif=+document.getElementById('wif').value;
 document.getElementById('wifLab').textContent=`+${wif} units of 15 kW`;
 const base=demand(0), alt=demand(wif);
 document.getElementById('out').innerHTML=`<p>Connected load <b>${base.conn.toFixed(1)} kW</b><br>
 Total demand <b>${base.dem.toFixed(1)} kW</b> (${base.kva.toFixed(1)} kVA at pf ${document.getElementById('pf').value})<br>
 Recommended transformer: <span class="big pass">${base.tx?base.tx+' kVA':'over 2000 kVA — split the load'}</span><br><span class="mut">Includes 25% future-growth margin.</span></p>`;
 document.getElementById('wifOut').innerHTML=wif?`<p class="warn">With +${wif} HVAC unit(s): demand ${alt.dem.toFixed(1)} kW, transformer becomes <b>${alt.tx?alt.tx+' kVA':'over 2000 kVA'}</b>${alt.tx!==base.tx?' — size changes!':''}</p>`:'<p class="mut">Move the slider to see the transformer size change.</p>';
 document.getElementById('tbl').innerHTML='<table><tr><th>Load</th><th>Category</th><th>kW</th><th>Qty</th><th>Demand kW</th><th></th></tr>'+
  loads.map((l,i)=>`<tr><td>${l.n}</td><td>${l.c}</td><td>${l.kw}</td><td>${l.q}</td><td>${(l.kw*l.df*l.q).toFixed(1)}</td><td><button class="sec" style="margin:0;padding:4px 8px;width:auto" onclick="del(${i})">Remove</button></td></tr>`).join('')+'</table>';
 const cv=document.getElementById('chart'),ctx=cv.getContext('2d');cv.width=cv.clientWidth;cv.height=180;
 const cats={};loads.forEach(l=>cats[l.c]=(cats[l.c]||0)+l.kw*l.df*l.q);
 const keys=Object.keys(cats),mx=Math.max(...Object.values(cats),1);
 ctx.clearRect(0,0,cv.width,180);ctx.fillStyle='#e2e8f0';ctx.font='12px sans-serif';
 keys.forEach((k,i)=>{const w=(cats[k]/mx)*(cv.width-140);ctx.fillText(k,6,30+i*34);ctx.fillStyle='#22d3ee';ctx.fillRect(110,16+i*34,w,18);ctx.fillStyle='#e2e8f0';ctx.fillText(cats[k].toFixed(1)+' kW',118+w,30+i*34);});
}
function exportCSV(){let s='Load,Category,Connected kW,Qty,Demand factor,Demand kW\n';loads.forEach(l=>s+=`${l.n},${l.c},${l.kw},${l.q},${l.df},${(l.kw*l.df*l.q).toFixed(1)}
`);const b=new Blob([s],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='load-schedule.csv';a.click();}
render();
