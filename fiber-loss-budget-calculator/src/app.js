const ATT={SM:{1310:0.35,1550:0.22},MM:{850:3.0,1300:1.0}};
const TIP={fiber:'Fiber attenuation over the whole link — usually the biggest term on long links.',
splices:'Each fusion splice adds a small loss; reduce splice count or improve splice quality to save budget.',
connectors:'Connector pairs add up fast; clean connectors and fewer patch points save budget.',
margin:'Safety margin covers ageing, temperature and future repairs — never set it to zero.'};
function calc(){
 const L=+document.getElementById('len').value, f=document.getElementById('fiber').value,
 w=+document.getElementById('wl').value, sp=+document.getElementById('sp').value,
 cn=+document.getElementById('cn').value, sl=+document.getElementById('sl').value,
 cl=+document.getElementById('cl').value, mg=+document.getElementById('mg').value,
 tx=+document.getElementById('tx').value, rx=+document.getElementById('rx').value;
 const att=ATT[f][w]; if(att===undefined){document.getElementById('out').innerHTML='<p class="fail">That wavelength does not apply to this fiber type.</p>';return;}
 const parts={fiber:L*att,splices:sp*sl,connectors:cn*cl,margin:mg};
 const total=Object.values(parts).reduce((a,b)=>a+b,0);
 const budget=tx-rx, margin=budget-total, pass=total<=budget;
 const dom=Object.entries(parts).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=Object.entries(parts).map(([k,v])=>`<tr><td>${k[0].toUpperCase()+k.slice(1)} loss</td><td>${v.toFixed(2)} dB</td></tr>`).join('');
 document.getElementById('out').innerHTML=
 `<p class="big ${pass?'pass':'fail'}">${pass?'PASS':'FAIL'}</p>
  <p>Total loss <b>${total.toFixed(2)} dB</b> &nbsp;|&nbsp; Power budget <b>${budget.toFixed(2)} dB</b><br>
  Margin: <b class="${pass?'pass':'fail'}">${margin.toFixed(2)} dB</b> ${pass?'(link passes)':'(link fails — reduce loss or raise budget)'}</p>
  <table>${rows}<tr><td><b>Total loss</b></td><td><b>${total.toFixed(2)} dB</b></td></tr></table>
  <p class="warn">Dominant contributor: <b>${dom}</b> (${parts[dom].toFixed(2)} dB). ${TIP[dom]}</p>`;
}
calc();
