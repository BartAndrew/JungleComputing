// Small dependency-free WebGL renderer. All topology comes from the registry.
import {layout, health, simulated, eventNode} from './network-model.mjs';
const COLORS = {online:[.27,.77,.9],degraded:[.95,.64,.24],offline:[.53,.28,.34],stale:[.34,.41,.5],unknown:[.38,.44,.52],sim:[.6,.45,.82],gold:[.75,.47,.20]};
const mul = (a,b) => {const r=new Float32Array(16);for(let c=0;c<4;c++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)r[c*4+i]+=a[k*4+i]*b[c*4+k];return r;};
const unit = v => {const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function look(eye,target){const z=unit(eye.map((n,i)=>n-target[i])),x=unit(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,n,i)=>s+n*eye[i],0),-y.reduce((s,n,i)=>s+n*eye[i],0),-z.reduce((s,n,i)=>s+n*eye[i],0),1]);}
function perspective(aspect){const f=1/Math.tan(Math.PI/7),near=.1,far=700;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
function vertex(out,p,c){out.push(...p,...c);}
function line(out,a,b,c){vertex(out,a,c);vertex(out,b,c);}
function box(tri,lines,cx,cy,cz,w,h,d,color,wire=false){
 const p=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>[cx+v[0]*w/2,cy+v[1]*h/2,cz+v[2]*d/2]);
 if(!wire){const faces=[[0,1,2,3,.48],[4,7,6,5,.80],[0,4,5,1,.4],[3,2,6,7,1],[0,3,7,4,.63],[1,5,6,2,.73]];for(const [a,b,c,d,s] of faces)for(const v of [a,b,c,a,c,d])vertex(tri,p[v],color.map(x=>x*s));}
 for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])line(lines,p[a],p[b],color.map(x=>Math.min(1,x*1.55)));
}
export class NetworkScene {
 constructor(canvas,labels,onSelect,onUnavailable,onFrame){
  this.canvas=canvas;this.labels=labels;this.onSelect=onSelect;this.onUnavailable=onUnavailable;this.onFrame=onFrame;
  this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
  if(!this.gl){this.cpu=canvas.getContext('2d');if(!this.cpu)throw new Error('No canvas renderer available');}
  const g=this.gl;
  if(g){
  const compile=(type,source)=>{const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS)){const m=g.getShaderInfoLog(s);g.deleteShader(s);throw new Error(m);}return s;};
  this.vs=compile(g.VERTEX_SHADER,'attribute vec3 position; attribute vec3 color; uniform mat4 vp; varying vec3 vColor; varying float depth; void main(){gl_Position=vp*vec4(position,1.0);vColor=color;depth=gl_Position.w;}');
  this.fs=compile(g.FRAGMENT_SHADER,'precision mediump float; varying vec3 vColor; varying float depth; void main(){float fog=clamp((depth-35.0)/160.0,0.0,0.72);gl_FragColor=vec4(mix(vColor,vec3(0.024,0.063,0.114),fog),1.0);}');
  this.program=g.createProgram();g.attachShader(this.program,this.vs);g.attachShader(this.program,this.fs);g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw new Error('WebGL program failed');
  this.pos=g.getAttribLocation(this.program,'position');this.col=g.getAttribLocation(this.program,'color');this.uniform=g.getUniformLocation(this.program,'vp');
  this.buffers=[g.createBuffer(),g.createBuffer(),g.createBuffer()];this.counts=[0,0];
  }
  this.vertexData=[[],[],[]];this.counts=[0,0,0];
  this.yaw=.72;this.pitch=.56;this.distance=40;this.target=[8,0,8];this.nodes=[];this.model=layout([]);this.pulses=[];this.layer='all';this.explode=false;this.showLinks=true;this.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;this.visible=true;this.connected=false;this.at=Date.now();this.selected=null;this.last=0;this.frames=0;this.frameStart=performance.now();this.abort=new AbortController();this.pointers=new Map();
  const opts={signal:this.abort.signal};
  canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});this.pointers.set(e.pointerId,[e.clientX,e.clientY]);this.down=[e.clientX,e.clientY];this.moved=false;canvas.setPointerCapture(e.pointerId);},opts);
  canvas.addEventListener('pointermove',e=>{const previous=this.pointers.get(e.pointerId);if(!previous)return;const dx=e.clientX-previous[0],dy=e.clientY-previous[1];if(Math.abs(dx)+Math.abs(dy)>2)this.moved=true;
   if(this.pointers.size===2){const other=[...this.pointers].find(([id])=>id!==e.pointerId)[1];const before=Math.hypot(previous[0]-other[0],previous[1]-other[1]),after=Math.hypot(e.clientX-other[0],e.clientY-other[1]);if(after>1)this.distance=Math.max(8,Math.min(220,this.distance*before/after));}
   else if(e.shiftKey||e.buttons===2){this.target[0]-=dx*this.distance*.0015;this.target[2]-=dy*this.distance*.0015;}
   else{this.yaw-=dx*.007;this.pitch=Math.max(.16,Math.min(1.48,this.pitch+dy*.006));}this.pointers.set(e.pointerId,[e.clientX,e.clientY]);},opts);
  canvas.addEventListener('pointerup',e=>{if(!this.moved&&this.pointers.size===1)this.pick(e);this.pointers.delete(e.pointerId);},opts);
  canvas.addEventListener('pointercancel',e=>this.pointers.delete(e.pointerId),opts);
  canvas.addEventListener('contextmenu',e=>e.preventDefault(),opts);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(8,Math.min(220,this.distance*Math.exp(e.deltaY*.001)));},{...opts,passive:false});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.yaw-=.12;if(e.key==='ArrowRight')this.yaw+=.12;if(e.key==='ArrowUp')this.pitch=Math.min(1.48,this.pitch+.1);if(e.key==='ArrowDown')this.pitch=Math.max(.16,this.pitch-.1);if(e.key==='+'||e.key==='=')this.distance=Math.max(8,this.distance*.9);if(e.key==='-')this.distance=Math.min(220,this.distance*1.1);if(e.key==='0')this.fit();}},opts);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.visible=false;this.onUnavailable('Graphics context lost. The live list is still available.');},opts);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!this.disposed)this.schedule();},opts);
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();this.rebuild();this.schedule();
 }
 resize(){const previous=this.width;const r=this.canvas.parentElement.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);const d=Math.min(window.devicePixelRatio||1,1.75);this.canvas.width=Math.round(this.width*d);this.canvas.height=Math.round(this.height*d);if(previous && Math.abs(this.width/previous-1)>.3)this.fit();}
 setNodes(nodes,at,connected){const first=!this.nodes.length&&nodes.length;this.nodes=nodes;this.at=at;this.connected=connected;this.model=layout(nodes);this.rebuild();if(first)this.fit();}
 setOptions(values){Object.assign(this,values);if(values.paused)this.pulses=[];this.rebuild();}
 fit(){this.target=[...this.model.center];this.target[2]-=1;this.distance=Math.min(220,Math.max(27,this.model.radius*1.4*Math.max(1,this.height/this.width)));this.yaw=.72;this.pitch=.64;}
 top(){this.fit();this.pitch=1.47;this.yaw=0;}
 focus(id){const t=this.model.towers.find(t=>t.node.id===id);if(t){this.target=[t.x,1,t.z];this.distance=20;this.selected=id;this.rebuild();}}
 select(id){this.selected=id;this.rebuild();}
 pulse(e){if(this.paused||!this.visible||document.hidden)return;const id=eventNode(e,this.nodes);if(!id||!this.model.towers.some(t=>t.node.id===id))return;const now=performance.now();if(this.pulses.some(p=>p.id===id&&now-p.start<200))return;this.pulses.push({id,start:now,kind:e.source==='repair-network'?'app':'heartbeat'});if(this.pulses.length>64)this.pulses.shift();}
 label(text,kind,pos,id,sub=''){const b=document.createElement(id?'button':'span');b.className='scene-label '+kind+(id&&id===this.selected?' selected':'');b.textContent=text;b.style.visibility='hidden';if(id){b.dataset.node=id;b.setAttribute('aria-label','Inspect '+text);b.onclick=()=>this.onSelect(id);}if(sub){const s=document.createElement('small');s.textContent=sub;b.append(s);}this.labels.append(b);this.labelItems.push({el:b,pos,id});}
 rebuild(){
  const active=this.labels.contains(document.activeElement)?document.activeElement.dataset.node:null;
  const tri=[],lines=[];this.labels.replaceChildren();this.labelItems=[];
  const {islands,cities,towers,center}=this.model;this.gateway=[center[0],.6,-6];
  for(let a=-60;a<=150;a+=3){line(lines,[-60,-2.8,a],[150,-2.8,a],[.042,.10,.15]);line(lines,[a,-2.8,-60],[a,-2.8,150],[.042,.10,.15]);}
  for(const i of islands){box(tri,lines,i.x,-2.48,i.z,i.width,.3,i.depth,[.065,.135,.20]);this.label(i.name.toUpperCase(),'island-label',[i.x,-1.95,i.z+i.depth/2+1]);}
  for(const c of cities){box(tri,lines,c.x,-2.15,c.z,c.width,.26,c.depth,[.075,.17,.22]);this.label(c.name.toUpperCase(),'city-label',[c.x,-1.9,c.z-c.depth/2-.35]);}
  if(towers.length){box(tri,lines,this.gateway[0],-.6,-6,2.8,1.2,2.8,[.17,.20,.25]);box(tri,lines,this.gateway[0],.17,-6,2,.3,2,COLORS.gold);box(tri,lines,this.gateway[0],.8,-6,.65,.9,.65,[.64,.51,.26]);this.label('REGISTRY GATEWAY','gateway',[center[0],4.5,-6],null,'Control endpoint / not a counted node');}
  for(const t of towers){
   const n=t.node,s=health(n,this.at,this.connected),sim=simulated(n),color=s==='online'?(sim?COLORS.sim:COLORS.online):COLORS[s],split=this.explode?.55:0;
   if(this.layer!=='application')for(let j=0;j<4;j++)box(tri,lines,t.x,-1.65+j*(.42+split),t.z,2.2,.29,2.2,s==='online'?COLORS.gold:COLORS[s],sim);
   const start=this.layer==='application'?.35:this.explode?2.55:.4;
   if(this.layer!=='foundation')for(let j=0;j<t.floors;j++){box(tri,lines,t.x,start+j*(.6+split),t.z,1.7,.41,1.7,color,sim);if(!sim&&s==='online'){for(let w=-.48;w<=.5;w+=.48)box(tri,lines,t.x+w,start+j*(.6+split),t.z+.86,.13,.14,.025,[.50,.88,.94]);}}
   const top=this.layer==='foundation'?(this.explode?3:0):start+t.floors*(.6+split);
   box(tri,lines,t.x,top+.25,t.z,.18,.55,.18,color);
   this.label(n.name,'',[t.x,top+1,t.z],n.id,(sim?'SIMULATOR':'LIVE NODE')+' / '+s.toUpperCase());
   if(n.id===this.selected){const y=-1.85,r=1.5;for(let a=0;a<32;a++){const b=(a+1)*Math.PI/16,aa=a*Math.PI/16;line(lines,[t.x+Math.cos(aa)*r,y,t.z+Math.sin(aa)*r],[t.x+Math.cos(b)*r,y,t.z+Math.sin(b)*r],[.6,.96,.87]);}}
   if(this.showLinks){const path=this.path(t);for(let j=0;j<48;j+=2)line(lines,path(j/48),path((j+1)/48),s==='online'?[.14,.32,.40]:[.14,.18,.23]);}
  }
  this.upload(0,tri);this.upload(1,lines);this.restoreFocus=active;
 }
 path(t){const a=[t.x,-.1,t.z],b=this.gateway;return u=>[a[0]*(1-u)+b[0]*u,.3+Math.sin(u*Math.PI)*3,a[2]*(1-u)+b[2]*u];}
 upload(i,data){if(this.cpu){this.vertexData[i]=data;this.counts[i]=data.length/6;return;}const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,this.buffers[i]);g.bufferData(g.ARRAY_BUFFER,new Float32Array(data),g.DYNAMIC_DRAW);this.counts[i]=data.length/6;}
 draw(i,mode){if(this.cpu)return;const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,this.buffers[i]);g.enableVertexAttribArray(this.pos);g.enableVertexAttribArray(this.col);g.vertexAttribPointer(this.pos,3,g.FLOAT,false,24,0);g.vertexAttribPointer(this.col,3,g.FLOAT,false,24,12);g.drawArrays(mode,0,this.counts[i]||0);}
 project(pos){const v=[...pos,1],p=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)p[r]+=this.vp[c*4+r]*v[c];return {x:(p[0]/p[3]+1)*this.width/2,y:(1-p[1]/p[3])*this.height/2,depth:p[3],visible:p[3]>.1&&Math.abs(p[0]/p[3])<1.1&&Math.abs(p[1]/p[3])<1.1};}
 pick(e){if(!this.vp)return;const r=this.canvas.getBoundingClientRect();let best=null,d=40;for(const t of this.model.towers){const p=this.project([t.x,1,t.z]),v=Math.hypot(p.x-(e.clientX-r.left),p.y-(e.clientY-r.top));if(p.visible&&v<d){d=v;best=t.node.id;}}if(best)this.onSelect(best);}
 schedule(){if(!this.raf&&!this.disposed&&!document.hidden)this.raf=requestAnimationFrame(t=>{this.raf=null;this.frame(t);this.schedule();});}
 frame(now){if(!this.visible||document.hidden||now-this.last<1000/30)return;this.last=now;const g=this.gl;
  const eye=[this.target[0]+Math.sin(this.yaw)*Math.cos(this.pitch)*this.distance,this.target[1]+Math.sin(this.pitch)*this.distance,this.target[2]+Math.cos(this.yaw)*Math.cos(this.pitch)*this.distance];
  this.vp=mul(perspective(this.width/this.height),look(eye,this.target));if(g){g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(.024,.063,.114,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.useProgram(this.program);g.uniformMatrix4fv(this.uniform,false,this.vp);this.draw(0,g.TRIANGLES);this.draw(1,g.LINES);}
  this.pulses=this.pulses.filter(p=>now-p.start<1600);const tri=[],lines=[];
  if(!this.paused&&this.showLinks)for(const p of this.pulses){const t=this.model.towers.find(t=>t.node.id===p.id);if(!t)continue;const pos=this.path(t)((now-p.start)/1600);box(tri,lines,...pos,.24,.24,.24,p.kind==='app'?[.4,1,.77]:[.35,.8,1]);}this.upload(2,tri);if(g)this.draw(2,g.TRIANGLES);else this.drawSoftware();
  for(const item of this.labelItems){const p=this.project(item.pos);item.el.style.display=p.visible?'':'none';if(p.visible){item.el.style.visibility='visible';item.el.style.left=p.x+'px';item.el.style.top=p.y+'px';}}
  if(this.restoreFocus){this.labels.querySelector(`[data-node="${CSS.escape(this.restoreFocus)}"]`)?.focus({preventScroll:true});this.restoreFocus=null;}
  this.frames++;if(now-this.frameStart>1500){this.onFrame?.(Math.round(this.frames*1000/(now-this.frameStart)),this.cpu?'Software 3D':'WebGL');this.frames=0;this.frameStart=now;}
 }
 drawSoftware(){
  const ctx=this.cpu,d=this.canvas.width/this.width;ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#06101d';ctx.fillRect(0,0,this.width,this.height);
  const color=c=>'rgb('+c.map(x=>Math.round(Math.min(1,x)*255)).join(',')+')';
  const segments=this.vertexData[1];
  const drawLines=ground=>{for(let i=0;i<segments.length;i+=12){if((segments[i+1]===-2.8)!==ground)continue;const a=this.project(segments.slice(i,i+3)),b=this.project(segments.slice(i+6,i+9));if(a.depth<=0||b.depth<=0)continue;ctx.strokeStyle=color(segments.slice(i+3,i+6));ctx.lineWidth=ground?.55:.8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}};
  drawLines(true);
  const faces=[];
  for(const values of [this.vertexData[0],this.vertexData[2]])for(let i=0;i<values.length;i+=18){const points=[0,6,12].map(j=>this.project(values.slice(i+j,i+j+3)));if(points.some(p=>p.depth<=0)||points.every(p=>!p.visible))continue;faces.push({points,depth:points.reduce((s,p)=>s+p.depth,0)/3,color:color(values.slice(i+3,i+6))});}
  faces.sort((a,b)=>b.depth-a.depth);
  for(const f of faces){ctx.fillStyle=f.color;ctx.beginPath();ctx.moveTo(f.points[0].x,f.points[0].y);f.points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fill();}
  drawLines(false);
 }
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.abort.abort();this.resizeObserver.disconnect();const g=this.gl;if(g){this.buffers.forEach(b=>g.deleteBuffer(b));g.deleteProgram(this.program);g.deleteShader(this.vs);g.deleteShader(this.fs);}this.labels.replaceChildren();}
}
