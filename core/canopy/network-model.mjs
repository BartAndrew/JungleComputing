// Pure, deterministic view-model. No invented nodes, samples or throughput.
export const FRESH_MS = 25000;
export const SCENE_LIMIT = 128;
export const simulated = n => n.metadata?.simulated === true || n.metadata?.runtime === 'simulated';
export function health(n, at = Date.now(), connected = true) {
  if (!connected) return 'stale';
  const time = Date.parse(n.last_seen_at);
  if (!Number.isFinite(time)) return 'unknown';
  if (n.status === 'offline') return 'offline';
  if (at - time > FRESH_MS || time - at > FRESH_MS) return 'stale';
  return ['online', 'degraded'].includes(n.status) ? n.status : 'unknown';
}
export function filterNodes(nodes, {query = '', island = '', showSimulated = true} = {}) {
  const q = query.trim().toLowerCase();
  return nodes.filter(n => (!island || (n.island || 'Unassigned island') === island) &&
    (showSimulated || !simulated(n)) && [n.name, n.id, n.city, ...(n.capabilities || [])].some(x => String(x || '').toLowerCase().includes(q)));
}
export function layout(nodes) {
  const sorted = [...nodes].sort((a,b) => Number(simulated(a)) - Number(simulated(b)) || String(a.id).localeCompare(String(b.id)));
  const groups = new Map();
  for (const n of sorted.slice(0, SCENE_LIMIT)) {
    const island = n.island || 'Unassigned island', city = n.city || 'Unassigned city';
    if (!groups.has(island)) groups.set(island, new Map());
    const cities = groups.get(island); if (!cities.has(city)) cities.set(city, []); cities.get(city).push(n);
  }
  let x = 0; const islands = [], towers = [], cities = [];
  for (const [name, cityMap] of [...groups].sort(([a],[b]) => a.localeCompare(b))) {
    let z = 0, width = 14;
    const local = [];
    for (const [city, members] of [...cityMap].sort(([a],[b]) => a.localeCompare(b))) {
      members.sort((a,b) => String(a.id).localeCompare(String(b.id)));
      const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(members.length))));
      const rows = Math.ceil(members.length / cols), w = Math.max(10, cols * 5.5 + 2), d = rows * 6 + 2;
      width = Math.max(width, w + 4);
      const c = {name:city,island:name,x:x + 5 + (cols-1)*5.5/2,z:z + 4 + (rows-1)*3,width:w,depth:d}; local.push(c);
      members.forEach((n,i) => towers.push({node:n,x:x + 5 + (i % cols) * 5.5,z:z + 4 + Math.floor(i / cols) * 6,floors:Math.max(1,Math.min(5,(n.capabilities || []).length))}));
      z += d + 4;
    }
    cities.push(...local);
    islands.push({name,x:x + width/2,z:(z-4)/2,width,depth:Math.max(z,12)}); x += width + 10;
  }
  const maxZ = Math.max(12,...islands.map(i => i.depth));
  const center = [Math.max(0,x-10)/2,0,maxZ/2];
  return {islands,cities,towers,center,radius:Math.max(15,Math.hypot(x,maxZ)*0.6),omitted:Math.max(0,nodes.length-SCENE_LIMIT)};
}
export function eventNode(event, nodes) {
  if (event.event_type.startsWith('node.')) return nodes.find(n => n.id === event.subject)?.id;
  if (event.source === 'repair-network') return nodes.find(n => n.metadata?.application === 'repair-network' && !simulated(n))?.id;
  return null;
}
export function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function percent(value) {return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) + '%' : 'Not reported';}
