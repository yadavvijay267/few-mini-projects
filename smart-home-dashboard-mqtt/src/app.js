const DEVICES=[
 {id:'living/light',name:'Living room light',room:'Living',type:'light',on:true,dim:80,w:60},
 {id:'living/fan',name:'Living room fan',room:'Living',type:'fan',on:false,dim:0,w:75},
 {id:'bedroom/light',name:'Bedroom light',room:'Bedroom',type:'light',on:false,dim:0,w:40},
 {id:'bedroom/dehumidifier',name:'Dehumidifier',room:'Bedroom',type:'plug',on:false,dim:0,w:300},
 {id:'porch/light',name:'Porch light',room:'Porch',type:'light',on:false,dim:0,w:20}];
let sensors={living_temp:27.5,bedroom_humidity:62,outdoor_lux:800};
let rules=[{name:'Hot room -> fan on',sensor:'living_temp',op:'gt',th:28,dev:'living/fan',act:'ON',enabled:true},
 {name:'Humid -> dehumidifier on',sensor:'bedroom_humidity',op:'gt',th:70,dev:'bedroom/dehumidifier',act:'ON',enabled:true}];
let logLines=[];
function log(t,msg){logLines.unshift(`<p>${new Date().toLocaleTimeString()} <b>${t}</b> ${msg}</p>`);if(logLines.length>30)logLines.pop();document.getElementById('log').innerHTML=logLines.join('');}
function toggle(i){const d=DEVICES[i];d.on=!d.on;if(d.on&&d.dim===0)d.dim=80;if(!d.on)d.dim=0;
 log('home/'+d.id+'/set',d.on?'ON':'OFF');render();}
function setDim(i,v){const d=DEVICES[i];d.dim=+v;d.on=d.dim>0;log('home/'+d.id+'/set','dim '+v);render();}
function addRule(){rules.push({name:'Hot room -> fan on',sensor:'living_temp',op:'gt',th:28,dev:'living/fan',act:'ON',enabled:true});render();}
function render(){
 document.getElementById('sensors').innerHTML=
  `<p>Living room temperature <b>${sensors.living_temp.toFixed(1)} &deg;C</b></p>
   <p>Bedroom humidity <b>${sensors.bedroom_humidity.toFixed(0)}%</b></p>
   <p>Outdoor light <b>${sensors.outdoor_lux.toFixed(0)} lux</b></p>
   <p>Total draw <b>${DEVICES.filter(d=>d.on).reduce((a,d)=>a+d.w*(d.dim||100)/100,0).toFixed(0)} W</b></p>`;
 document.getElementById('devices').innerHTML=DEVICES.map((d,i)=>`
  <p><b>${d.name}</b> — <span class="${d.on?'pass':'mut'}">${d.on?'ON':'OFF'}</span> (${d.w} W)
  <button style="width:auto;padding:4px 12px;margin:4px 0" onclick="toggle(${i})">${d.on?'Turn off':'Turn on'}</button><br>
  <label>Dimmer ${d.dim}%<input type="range" min="0" max="100" value="${d.dim}" oninput="setDim(${i},this.value)"></label></p>`).join('');
 document.getElementById('rules').innerHTML=rules.map((r,i)=>`<p><input type="checkbox" style="width:auto" ${r.enabled?'checked':''} onchange="rules[${i}].enabled=this.checked;render()"> <b>${r.name}</b> — if ${r.sensor} ${r.op} ${r.th} then ${r.dev} = ${r.act}</p>`).join('');
}
function connectBroker(){const u=document.getElementById('broker').value.trim();
 document.getElementById('brokerStatus').textContent=u?`Broker ${u}: this demo keeps the simulated feed (connect a real broker with src/mqtt_client.py or a websocket MQTT client — see docs/MQTT_SETUP.md).`:'Mode: simulated MQTT feed (no hardware needed).';}
setInterval(()=>{sensors.living_temp=Math.max(24,Math.min(33,sensors.living_temp+(Math.random()-.48)*.3));
 sensors.bedroom_humidity=Math.max(40,Math.min(80,sensors.bedroom_humidity+(Math.random()-.5)*1.5));
 sensors.outdoor_lux=Math.max(0,Math.min(1000,sensors.outdoor_lux+(Math.random()-.5)*40));
 rules.forEach(r=>{if(!r.enabled)return;const v=sensors[r.sensor];
  const hit=r.op==='gt'?v>r.th:r.op==='lt'?v<r.th:false;
  if(hit){const d=DEVICES.find(x=>x.id===r.dev);if(d&&!d.on){d.on=true;d.dim=d.dim||80;log('RULE',`${r.name} fired -> ${r.dev} ON`);}}});
 log('home/living/temp/state',sensors.living_temp.toFixed(1)+' C');
 render();},3000);
render();
