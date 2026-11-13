const RACKS=['A1','A2','A3'],LIM=8,WLIM=1000;
let plan=JSON.parse(localStorage.getItem('rcp-plan')||'null')||[[{n:'Core switch',t:'Switch',u:1,pw:.3,wt:8,start:41},{n:'Server-01',t:'Server',u:2,pw:.5,wt:25,start:38}],[],[]];
function save(){localStorage.setItem('rcp-plan',JSON.stringify(plan))}
function totals(dev){const u=dev.reduce((a,d)=>a+d.u,0),p=dev.reduce((a,d)=>a+d.pw,0),w=dev.reduce((a,d)=>a+d.wt,0);
 const rem=LIM-p; const stranded=rem<.5?(42-u):Math.max(0,(42-u)-Math.floor(rem/.5)*2);
 return {u,p,w,stranded,overP:p>LIM,overW:w>WLIM};}
function addDev(){const r=+document.getElementById('rk').value;
 const dev={n:document.getElementById('nm').value||'Device',t:document.getElementById('tp').value,
 u:+document.getElementById('us').value,pw:+document.getElementById('pw').value,wt:+document.getElementById('wt').value};
 const used=plan[r].reduce((a,d)=>a+d.u,0);
 if(used+dev.u>42){alert('Not enough free U in this rack.');return;}
 dev.start=42-used-dev.u; plan[r].push(dev); save(); render();}
function removeDev(r,i){plan[r].splice(i,1);save();render();}
function exportCSV(){let s='Rack,Device,Type,U,Power kW,Weight kg\n';plan.forEach((devs,r)=>devs.forEach(x=>s+=`${RACKS[r]},${x.n},${x.t},${x.u},${x.pw},${x.wt}
`));const b=new Blob([s],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='rack-plan.csv';a.click();}
function render(){
 const rack=document.getElementById('rack');rack.innerHTML='';
 const cells=Array(42).fill(null);
 plan[0].forEach((d,i)=>{for(let k=0;k<d.u;k++)cells[d.start+k]={d,i};});
 for(let u=41;u>=0;u--){const c=cells[u];const el=document.createElement('div');el.className='u'+(c?' occ':'');
  el.textContent=c?`U${u+1} — ${c.d.n} (${c.d.u}U, ${c.d.pw} kW)`:`U${u+1} — free`;
  if(c)el.onclick=()=>removeDev(0,c.i); rack.appendChild(el);}
 let sum='',tp=0,ts=0;
 plan.forEach((devs,r)=>{const t=totals(devs);tp+=t.p;ts+=t.stranded;
  sum+=`<p><b>Rack ${RACKS[r]}</b>: ${t.u}/42U (${(t.u/42*100).toFixed(0)}%), ${t.p.toFixed(1)}/${LIM} kW (${(t.p/LIM*100).toFixed(0)}%), ${t.w} kg
  ${t.overP?'<span class="fail"> OVER POWER</span>':''}${t.overW?'<span class="fail"> OVER WEIGHT</span>':''}
  ${t.stranded?`<span class="warn"> ${t.stranded}U stranded (power-bound)</span>`:''}</p>`;});
 document.getElementById('sum').innerHTML=sum;
 document.getElementById('room').innerHTML=`<p><b>Room summary</b><br>Racks used: ${plan.filter(p=>p.length).length}/3<br>
 Total power: ${tp.toFixed(1)} kW &nbsp;|&nbsp; Headroom (100 kW room): ${(100-tp).toFixed(1)} kW<br>
 <span class="warn">Total stranded space: ${ts}U</span></p>`;
}
render();
