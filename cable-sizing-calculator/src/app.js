const T=[{s:1.5,r:12.1,x:.11,a:16,c:28},{s:2.5,r:7.41,x:.10,a:22,c:42},{s:4,r:4.61,x:.10,a:30,c:62},{s:6,r:3.08,x:.09,a:38,c:88},{s:10,r:1.83,x:.09,a:52,c:140},{s:16,r:1.15,x:.08,a:70,c:215},{s:25,r:.727,x:.08,a:92,c:330},{s:35,r:.524,x:.08,a:114,c:450},{s:50,r:.387,x:.08,a:140,c:620},{s:70,r:.268,x:.08,a:175,c:860},{s:95,r:.193,x:.08,a:215,c:1150},{s:120,r:.153,x:.08,a:250,c:1450}];
function cur(kw,v,pf,ph){return ph===1?kw*1000/(v*pf):kw*1000/(Math.sqrt(3)*v*pf)}
function vd(L,I,c,pf,ph){const s=Math.sqrt(Math.max(0,1-pf*pf));return (ph===1?2:Math.sqrt(3))*L*I*(c.r*pf+c.x*s)/1000}
function calc(){
 const kw=+document.getElementById('kw').value,v=+document.getElementById('v').value,
 ph=+document.getElementById('ph').value,pf=+document.getElementById('pf').value,
 L=+document.getElementById('len').value,lim=+document.getElementById('lim').value,
 tf=+document.getElementById('tf').value,gf=+document.getElementById('gf').value,bf=+document.getElementById('bf').value;
 const I=cur(kw,v,pf,ph);
 const rows=T.map(c=>({...c,amp:c.a*tf*gf*bf,drop:vd(L,I,c,pf,ph),pct:vd(L,I,c,pf,ph)/v*100}));
 const ok=rows.filter(r=>I<=r.amp&&r.pct<=lim);
 if(!ok.length){document.getElementById('out').innerHTML='<p class="fail">No listed size passes — increase size, shorten the run, or raise the limit.</p>';return;}
 const best=ok[0], next=ok[1];
 const cost=c=>c.c*L;
 document.getElementById('out').innerHTML=`<p>Load current <b>${I.toFixed(1)} A</b></p>
 <p class="big pass">${best.s} mm&sup2;</p>
 <p>Derated ampacity ${best.amp.toFixed(0)} A &nbsp;|&nbsp; Voltage drop <b>${best.drop.toFixed(2)} V (${best.pct.toFixed(2)}%)</b> — limit ${lim}% <span class="pass">PASS</span><br>
 Cable cost for ${L} m: <b>&#8377;${cost(best).toLocaleString('en-IN')}</b></p>`;
 let cmp='<table><tr><th>Size</th><th>Ampacity</th><th>Vd %</th><th>Cost</th><th>Verdict</th></tr>';
 rows.filter(r=>r.s===best.s||(next&&r.s===next.s)).forEach(r=>{
  cmp+=`<tr><td>${r.s} mm&sup2;</td><td>${r.amp.toFixed(0)} A</td><td>${r.pct.toFixed(2)}%</td><td>&#8377;${cost(r).toLocaleString('en-IN')}</td><td class="${r.pct<=lim&&I<=r.amp?'pass':'fail'}">${r.pct<=lim&&I<=r.amp?'PASS':'FAIL'}</td></tr>`;});
 cmp+='</table>';
 if(next)cmp+=`<p class="mut">Next size up (${next.s} mm&sup2;) costs <b>&#8377;${(cost(next)-cost(best)).toLocaleString('en-IN')}</b> more but drops Vd to ${next.pct.toFixed(2)}% — worth it for future load growth or long runs.</p>`;
 document.getElementById('cmp').innerHTML=cmp;
}
calc();
