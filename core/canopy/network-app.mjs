import {health,simulated,filterNodes,eventNode,escapeHTML as esc,percent,SCENE_LIMIT} from './network-model.mjs';
import {NetworkScene} from './network-scene.mjs';
const $=id=>document.getElementById(id);
const state={nodes:[],registryOK:false,streamOK:false,events:[],summary:null,snapshots:[],jobs:[],replay:null,selected:null,feed:'all',view:'3d',last:null,refreshing:false,followup:false};
let scene=null,toastTimer,refreshTimer,eventTimer,closed=false;
const pending=new Map();
const options=()=>({query:$('search').value,island:$('island').value,showSimulated:$('showSimulated').checked});
const stamp=x=>Number.isFinite(Date.parse(x))?new Date(x).toLocaleString([], {dateStyle:'medium',timeStyle:'medium'}):'Not reported';
const age=x=>{const n=(Date.now()-Date.parse(x))/1000;return !Number.isFinite(n)?'Not reported':n<5?'just now':n<60?Math.floor(n)+'s ago':n<3600?Math.floor(n/60)+'m ago':Math.floor(n/3600)+'h ago';};
function badge(s){return `<span class="badge ${['online','succeeded'].includes(s)?'good':['degraded','queued','running'].includes(s)?'warn':['offline','failed'].includes(s)?'bad':''}">${esc(s)}</span>`;}
async function api(path,options={}){const r=await fetch(path,{cache:'no-store',...options,signal:AbortSignal.timeout(9000)});let v;try{v=await r.json();}catch{throw new Error('Unreadable service response');}if(!r.ok){const e=new Error(v.error||'Request failed');e.status=r.status;throw e;}return v;}
function requestID(){if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(v=>v.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function data(){return state.replay?{nodes:state.replay.nodes,at:Date.parse(state.replay.observed_at),connected:true}:{nodes:state.nodes,at:Date.now(),connected:state.registryOK};}
function visible(){return filterNodes(data().nodes,options());}
function render(){
 const d=data(),nodes=visible(),known=d.connected;
 $('nodeCount').textContent=known?nodes.length:'--';$('onlineCount').textContent=known?nodes.filter(n=>health(n,d.at,true)==='online').length+' / '+nodes.length:'--';
 $('runtimeCount').textContent=known?nodes.filter(n=>!simulated(n)).length+' / '+nodes.filter(simulated).length:'--';
 $('nodeScope').textContent=nodes.length+' of '+d.nodes.length+' registered nodes'+(state.replay?' / replay':' / current filter');
 $('repairCount').textContent=state.replay?'--':state.summary?.active_cases??'--';$('repairScope').textContent=state.replay?'Repair totals are live-only':'Application-wide, not node-filtered';
 $('sceneMode').textContent=state.replay?'RECORDED SNAPSHOT':!state.registryOK?'STALE / DISCONNECTED':state.streamOK?'LIVE OBSERVATION':'LIVE POLLING / RECONNECTING';
 $('sceneCount').textContent=nodes.length>SCENE_LIMIT?`Showing ${SCENE_LIMIT} / ${nodes.length}; all nodes available in list`:`${nodes.length} ${nodes.length===1?'tower':'towers'}`;
 const status=state.replay?'Replay':state.registryOK&&state.streamOK?'Live stream':state.registryOK?'Polling / reconnecting':'Disconnected';$('connection').textContent=status;$('connection').className='badge '+(status==='Live stream'?'good':'warn');
 scene?.setNodes(nodes,d.at,known);scene?.select(state.selected);renderList(nodes,d);renderInspector();
 const messages=[];if(state.replay)messages.push('Viewing a recorded topology snapshot. Activity feed remains live. Health-check controls are disabled until you return to Live.');
 if(!state.registryOK)messages.push('Registry unavailable. Previously received nodes are stale, not healthy.');
 else if(!state.replay){const bad=nodes.filter(n=>health(n)!=='online').length;if(bad)messages.push(`${bad} visible node(s) need attention.`);}
 if(!state.replay&&!state.summary)messages.push('Repair service summary unavailable. No zero values are substituted.');
 if(state.summary?.pending_events>0&&!state.replay)messages.push(`${state.summary.pending_events} application event(s) awaiting delivery.`);
 $('alert').textContent=messages.join(' ');$('alert').hidden=!messages.length;
 document.querySelectorAll('[data-probe]').forEach(b=>b.disabled=!!state.replay||!state.registryOK||pending.get(b.dataset.probe)?.busy===true);
 $('updatedAt').textContent=state.last?'Registry response '+stamp(state.last):'No registry response';
}
function renderList(nodes,d){
 const focused=document.activeElement?.dataset.listNode;
 $('nodeList').innerHTML=nodes.length?nodes.map(n=>`<button class="node-row" data-list-node="${esc(n.id)}"><span>${esc(n.name)}<small>${esc(n.island||'Unassigned')} / ${esc(n.city||'Unassigned')} / ${simulated(n)?'SIMULATOR':'LIVE NODE'}</small></span>${badge(health(n,d.at,d.connected))}</button>`).join(''):'<p class="empty">No nodes match. Clear the filters or start a registry client.</p>';
 $('nodeList').querySelectorAll('[data-list-node]').forEach(b=>b.onclick=()=>select(b.dataset.listNode));
 if(focused)$('nodeList').querySelector(`[data-list-node="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
}
function select(id){state.selected=id;scene?.select(id);renderInspector();}
function renderInspector(){
 const d=data(),n=d.nodes.find(n=>n.id===state.selected),box=$('inspector');
 if(!n){$('inspectCaption').textContent='Select a tower or list entry';box.innerHTML='<div class="empty-icon">&#9671;</div><h3>The detail behind the view</h3><p>Select a node to inspect its heartbeat and capabilities. The list is keyboard accessible.</p>';return;}
 const focus=document.activeElement?.id;
 $('inspectCaption').textContent=(state.replay?'Recorded snapshot / ':'')+(simulated(n)?'Simulated workload':'Self-registered runtime');
 box.innerHTML=`<h3>${esc(n.name)}</h3><div class="actions" style="margin-top:10px">${badge(health(n,d.at,d.connected))}<span class="badge">${simulated(n)?'SIMULATOR':'LIVE NODE'}</span></div><dl><div><dt>CPU / self-reported${simulated(n)?' (simulated)':''}</dt><dd>${percent(n.cpu_percent)}</dd></div><div><dt>Memory / self-reported${simulated(n)?' (simulated)':''}</dt><dd>${percent(n.memory_percent)}</dd></div><div><dt>Runtime</dt><dd>${esc(n.metadata?.runtime||'Not reported')}</dd></div><div><dt>Version</dt><dd>${esc(n.version)}</dd></div><div class="wide"><dt>Last heartbeat / registration</dt><dd>${stamp(n.last_seen_at)}</dd></div><div class="wide"><dt>Node identity</dt><dd>${esc(n.id)}</dd></div></dl><h3>Declared application capabilities</h3><div class="capabilities">${(n.capabilities||[]).map(x=>`<span class="capability">${esc(x)}</span>`).join('')||'None declared'}</div><div class="actions"><button id="focusNode">Focus tower</button>${n.metadata?.application==='repair-network'?'<a class="button primary" href="/repair">Open application</a>':''}</div><p>Gold floors: security, data, communication and compute. These are schematic foundations, not enabled-feature or security attestations.</p>`;
 $('focusNode').onclick=()=>{view('3d');scene?.focus(n.id);};if(focus==='focusNode')$('focusNode')?.focus({preventScroll:true});
}
function view(v){state.view=v;$('view3d').setAttribute('aria-pressed',v==='3d');$('viewList').setAttribute('aria-pressed',v==='list');$('scene').hidden=v!=='3d';$('nodeList').hidden=v!=='list';if(scene){scene.visible=v==='3d';if(v==='3d')scene.resize();}for(const id of ['fit','topView','layers','explode','links','pause'])$(id).disabled=v!=='3d'||!scene;}
function initScene(){try{scene=new NetworkScene($('canvas'),$('sceneLabels'),select,message=>{$('sceneFallback').hidden=false;$('view3d').disabled=true;toast(message);view('list');},(fps,renderer)=>$('frameStats').textContent=renderer+' / '+fps+' fps');$('pause').setAttribute('aria-pressed',scene.paused);$('pause').textContent=scene.paused?'Resume motion':'Pause motion';}catch{$('sceneFallback').hidden=false;view('list');$('view3d').disabled=true;toast('3D graphics unavailable. The live, accessible list remains fully functional.');}}
function updateIslands(){const old=$('island').value,names=[...new Set(data().nodes.map(n=>n.island||'Unassigned island'))].sort();$('island').replaceChildren(new Option('All islands',''),...names.map(n=>new Option(n,n)));if(names.includes(old))$('island').value=old;}
function addEvents(rows){const m=new Map(state.events.map(e=>[e.id,e]));rows.forEach(e=>m.set(e.id,e));state.events=[...m.values()].sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)).slice(0,150);renderEvents();}
function renderEvents(){const rows=state.events.filter(e=>state.feed==='all'||(state.feed==='app'?e.source==='repair-network':e.source!=='repair-network')).slice(0,35);$('eventCount').textContent=rows.length;
 const names={'repair_case.created':'Repair case created','repair_case.status_changed':'Repair status changed','node.registered':'Node registered','node.health_changed':'Node health changed','diagnostic.completed':'Health check completed'};
 $('events').innerHTML=rows.length?rows.map(e=>`<div class="event"><span class="event-glyph">${e.source==='repair-network'?'&#9633;':'&#9671;'}</span><div><strong>${esc(names[e.event_type]||e.event_type)}</strong><small>${esc(e.source)}${e.data?.status?' / '+esc(e.data.status):''}</small><small title="${esc(stamp(e.occurred_at))}">${age(e.occurred_at)}</small></div></div>`).join(''):'<p class="empty">No matching events received. Create a case or run a health check.</p>';
}
function renderHistory(){const h=$('history');h.max=Math.max(0,state.snapshots.length-1);h.disabled=state.snapshots.length===0;
 if(!state.replay)h.value=h.max;
 else{const i=state.snapshots.findIndex(s=>s.id===state.replay.id);if(i>=0)h.value=i;}
 $('historyCaption').textContent=state.snapshots.length?`${state.snapshots.length} saved samples / last 60 minutes / 15-second sampling / 24-hour retention. Gaps are not interpolated.`:'No recorded snapshots yet. Collection runs on the registry, not in this browser.';
 $('historyTime').textContent=state.replay?new Date(state.replay.observed_at).toLocaleTimeString():'Now / live';$('live').className=state.replay?'':'primary';
}
function renderJobs(){const rows=state.jobs;$('operations').innerHTML=rows.length?`<table><thead><tr><th>Health check</th><th>State</th><th>Measured duration</th><th>Submitted</th><th>Action</th></tr></thead><tbody>${rows.map(j=>`<tr><td>${j.target==='registry-database'?'Registry database':'Repair Network'}<small>${esc(j.id.slice(0,8))}${j.detail?' / '+esc(j.detail):''}</small></td><td>${badge(j.status)}</td><td>${j.duration_ms==null?'--':j.duration_ms.toFixed(1)+' ms'}</td><td title="${esc(stamp(j.created_at))}">${age(j.created_at)}</td><td>${j.status==='queued'?`<button data-cancel="${esc(j.id)}" ${state.replay?'disabled':''}>Cancel</button>`:j.status==='failed'?`<button data-rerun="${j.target}" ${state.replay?'disabled':''}>Run again</button>`:'--'}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">No health checks have been run. Start with a database or Repair Network check.</p>';
 document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api(`/api/operations/probes/${b.dataset.cancel}/cancel`,{method:'POST'});toast('Queued health check cancelled.');}catch(e){toast(e.status===409?'Check already started or finished. Refreshing.':e.message);}finally{refresh();}});
 document.querySelectorAll('[data-rerun]').forEach(b=>b.onclick=()=>runProbe(b.dataset.rerun));
}
async function runProbe(target){if(state.replay)return;let p=pending.get(target);if(p?.busy)return;if(!p)p={id:requestID(),busy:false};p.busy=true;pending.set(target,p);render();$('operationError').hidden=true;
 try{await api('/api/operations/probes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({target,request_id:p.id})});pending.delete(target);toast('Health check queued. Results will appear below.');}
 catch(e){p.busy=false;if(e.status===429)pending.delete(target);$('operationError').hidden=false;$('operationError').textContent=e.status===429?'The check queue is busy. Try again shortly.':e.message+'. Retrying this same check request is safe.';}
 finally{refresh();}}
async function refresh(){if(closed)return;if(state.refreshing){state.followup=true;return;}state.refreshing=true;$('refresh').disabled=true;
 try{const result=await Promise.allSettled([api('/api/nodes'),api('/api/repair/summary'),api('/api/application-events/recent'),api('/api/observation/snapshots'),api('/api/operations/probes')]);
  state.registryOK=result[0].status==='fulfilled';if(state.registryOK){state.nodes=result[0].value;state.last=new Date().toISOString();}
  state.summary=result[1].status==='fulfilled'?result[1].value:null;
  if(result[2].status==='fulfilled')addEvents(result[2].value.events);
  if(result[3].status==='fulfilled'){state.snapshots=result[3].value.snapshots;renderHistory();}else $('historyCaption').textContent='Snapshot storage unavailable; no new history can be loaded.';
  if(result[4].status==='fulfilled'){state.jobs=result[4].value.jobs;$('operationError').hidden=true;renderJobs();}else{$('operationError').hidden=false;$('operationError').textContent='Health-check history unavailable. Existing rows may be stale.';}
  updateIslands();render();
 }finally{state.refreshing=false;$('refresh').disabled=false;if(state.followup){state.followup=false;clearTimeout(eventTimer);eventTimer=setTimeout(refresh,300);}}}
function requestRefresh(){clearTimeout(eventTimer);eventTimer=setTimeout(refresh,200);}
$('view3d').onclick=()=>view('3d');$('viewList').onclick=()=>view('list');$('refresh').onclick=refresh;
$('search').oninput=render;$('island').onchange=render;$('showSimulated').onchange=render;$('clear').onclick=()=>{$('search').value='';$('island').value='';$('showSimulated').checked=true;render();scene?.fit();};
$('fit').onclick=()=>scene?.fit();$('topView').onclick=()=>scene?.top();$('deselect').onclick=()=>select(null);
$('pause').onclick=()=>{if(!scene)return;scene.setOptions({paused:!scene.paused});$('pause').textContent=scene.paused?'Resume motion':'Pause motion';$('pause').setAttribute('aria-pressed',scene.paused);};
$('layers').onchange=()=>scene?.setOptions({layer:$('layers').value});$('explode').onchange=()=>scene?.setOptions({explode:$('explode').checked});$('links').onchange=()=>scene?.setOptions({showLinks:$('links').checked});
$('fullScreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.scene-panel').requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
document.addEventListener('fullscreenchange',()=>{$('fullScreen').textContent=document.fullscreenElement?'Exit fullscreen':'Fullscreen';scene?.resize();});
$('history').oninput=()=>{state.replay=state.snapshots[Number($('history').value)]||null;scene?.setOptions({paused:true});updateIslands();renderHistory();renderJobs();render();$('pause').textContent='Resume motion';$('pause').setAttribute('aria-pressed','true');};
$('live').onclick=()=>{state.replay=null;renderHistory();renderJobs();updateIslands();render();refresh();};
document.querySelectorAll('[data-probe]').forEach(b=>b.onclick=()=>runProbe(b.dataset.probe));
document.querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>{state.feed=b.dataset.feed;document.querySelectorAll('[data-feed]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderEvents();});
try{document.documentElement.dataset.theme=localStorage.getItem('jungle-theme')||'dark';}catch{}
$('theme').onclick=()=>{const v=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=v;try{localStorage.setItem('jungle-theme',v);}catch{}};
initScene();refresh();refreshTimer=setInterval(refresh,5000);
const stream=new EventSource('/api/events');stream.onopen=()=>{state.streamOK=true;requestRefresh();};stream.onerror=()=>{state.streamOK=false;render();};
const seen=new Set();for(const type of ['node.registered','node.heartbeat','node.health_changed','repair_case.created','repair_case.status_changed','diagnostic.completed'])stream.addEventListener(type,e=>{try{const event=JSON.parse(e.data);if(seen.has(event.id))return;seen.add(event.id);if(seen.size>1000)seen.delete(seen.values().next().value);if(!state.replay)scene?.pulse(event);if(type!=='node.heartbeat'){addEvents([event]);requestRefresh();}}catch{requestRefresh();}});
stream.addEventListener('stream.reset',requestRefresh);
window.addEventListener('pagehide',()=>{closed=true;clearInterval(refreshTimer);clearTimeout(eventTimer);clearTimeout(toastTimer);stream.close();scene?.dispose();});
// Visibility preserves CPU and never turns a disconnected registry into a healthy one.
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRefresh();});
