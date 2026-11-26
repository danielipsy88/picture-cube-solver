// ===== Core cube logic: sticker model with orientation, moves, validation, center-twist fixing =====
(function(G){
const FACES='URFDLB';
const N={U:[0,1,0],R:[1,0,0],F:[0,0,1],D:[0,-1,0],L:[-1,0,0],B:[0,0,-1]};
// photo frame of each face when it faces the camera (standard Kociemba facelet layout)
const UPV={U:[0,0,-1],R:[0,1,0],F:[0,1,0],D:[0,0,1],L:[0,1,0],B:[0,1,0]};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const eq=(a,b)=>a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];
const RIGHTV={};for(const f of FACES)RIGHTV[f]=cross(UPV[f],N[f]);
// rotate v clockwise (viewed from outside) q quarter turns about axis a
function rotq(a,v,q){q=((q%4)+4)%4;for(let i=0;i<q;i++){const c=cross(a,v);v=add(mul(c,-1),mul(a,dot(a,v)));}return v.map(x=>x+0);}
// direction in face frame for photo rotation q (0 up,1 right,2 down,3 left)
function dirFor(f,q){q=((q%4)+4)%4;return [UPV[f],RIGHTV[f],mul(UPV[f],-1),mul(RIGHTV[f],-1)][q].map(x=>x+0);}
function qFor(f,v){for(let q=0;q<4;q++)if(eq(dirFor(f,q),v))return q;return -1;}
// facelet position for face f, row i, col j
function slotPos(f,i,j){return add(add(N[f],mul(RIGHTV[f],j-1)),mul(UPV[f],1-i));}
// build sticker model. data[f][k] = {c: colorIndex, q: rotation in photo frame, ...extra}
function buildModel(data){
  const st=[];
  for(const f of FACES)for(let k=0;k<9;k++){const i=(k/3)|0,j=k%3,d=data[f][k];
    st.push(Object.assign({},d,{p:slotPos(f,i,j),n:N[f].slice(),up:dirFor(f,d.q),tu:UPV[f].slice(),home:f,k}));}
  return st;
}
function parseMove(m){return {f:m[0],q:m.length===1?1:(m[1]==='2'?2:3)};}
function applyMove(st,m){const {f,q}=parseMove(m),a=N[f];
  for(const s of st)if(dot(s.p,a)===1){s.p=rotq(a,s.p,q);s.n=rotq(a,s.n,q);s.up=rotq(a,s.up,q);if(s.tu)s.tu=rotq(a,s.tu,q);}return st;}
function applyAlg(st,alg){for(const m of splitAlg(alg))applyMove(st,m);return st;}
function splitAlg(a){return (Array.isArray(a)?a:a.trim().split(/\s+/)).filter(Boolean);}
function cloneModel(st){return st.map(s=>Object.assign({},s,{p:s.p.slice(),n:s.n.slice(),up:s.up.slice(),tu:s.tu?s.tu.slice():undefined}));}
// locate sticker at face f index k
function faceOf(n){for(const f of FACES)if(eq(N[f],n))return f;}
function readFacelets(st){const out={};for(const f of FACES)out[f]=new Array(9);
  for(const s of st){const f=faceOf(s.n);
    for(let k=0;k<9;k++){if(eq(slotPos(f,(k/3)|0,k%3),s.p)){out[f][k]=s;break;}}}
  return out;}
function invertAlg(a){return splitAlg(a).reverse().map(m=>m[0]+(m.length===1?"'":(m[1]==='2'?'2':''))).join(' ');}
function simplify(moves){const out=[];
  for(const m of moves){const p=parseMove(m);
    if(out.length&&out[out.length-1].f===p.f){const t=out.pop();const q=(t.q+p.q)%4;if(q)out.push({f:p.f,q});}
    else out.push(p);}
  return out.map(o=>o.f+(o.q===1?'':o.q===2?'2':"'"));}

// ===== whole-cube rotations to relabel algorithms =====
function allRotations(){const res=[],seen=new Set();
  const gens=[m=>m,v=>[v[0],-v[2],v[1]],v=>[v[2],v[1],-v[0]]];
  const queue=[v=>v];seen.add(key(v=>v));
  function key(fn){return FACES.split('').map(f=>fn(N[f]).join(',')).join('|');}
  while(queue.length){const fn=queue.shift();res.push(fn);
    for(const g of gens.slice(1)){const h=v=>g(fn(v));const k=key(h);if(!seen.has(k)){seen.add(k);queue.push(h);}}}
  return res;}
function relabel(alg,fn){return splitAlg(alg).map(m=>{const v=fn(N[m[0]]);return faceOf(v.map(x=>x+0))+m.slice(1);}).join(' ');}

// effect of an alg on centers (requires pieces unaffected). returns twist array per face or null
function centerEffect(alg){
  const data={};for(const f of FACES)data[f]=Array.from({length:9},()=>({c:FACES.indexOf(f),q:0}));
  const st=applyAlg(buildModel(data),alg);const tw={};
  for(const s of st){if(!eq(s.p,slotPos(s.home,(s.k/3)|0,s.k%3))||!eq(s.n,N[s.home]))return null;
    const want=dirFor(s.home,0);
    if(s.k===4){for(let q=0;q<4;q++)if(eq(rotq(N[s.home],want,q),s.up))tw[s.home]=q;}
    else if(!eq(s.up,want))return null;}
  return FACES.split('').map(f=>tw[f]);}

let CENTER_TABLE=null;
function buildCenterTable(baseAlgs){
  const rots=allRotations();const algs=[];const seen=new Set();
  for(const b of baseAlgs)for(const variant of [b,invertAlg(b)])for(const r of rots){
    const a=relabel(variant,r);const e=centerEffect(a);if(!e)continue;
    const k=e.join('');if(e.every(x=>x===0))continue;
    const len=splitAlg(a).length;algs.push({alg:a,eff:e,len});}
  // keep shortest per effect
  const best={};for(const a of algs){const k=a.eff.join('');if(!best[k]||best[k].len>a.len)best[k]=a;}
  const edges=Object.values(best);
  // Dijkstra over 4^6 states
  const S=4096,dist=new Float64Array(S).fill(Infinity),prev=new Int32Array(S).fill(-1),pe=new Array(S);
  dist[0]=0;const done=new Uint8Array(S);
  const enc=e=>e.reduce((s,x,i)=>s+x*Math.pow(4,i),0);const dec=s=>Array.from({length:6},(_,i)=>Math.floor(s/Math.pow(4,i))%4);
  for(;;){let u=-1,bd=Infinity;for(let i=0;i<S;i++)if(!done[i]&&dist[i]<bd){bd=dist[i];u=i;}if(u<0)break;done[u]=1;
    const du=dec(u);for(const e of edges){const v=enc(du.map((x,i)=>(x+e.eff[i])%4));const nd=dist[u]+e.len+0.5;
      if(nd<dist[v]){dist[v]=nd;prev[v]=u;pe[v]=e;}}}
  CENTER_TABLE={dist,prev,pe,enc};return CENTER_TABLE;}
function centerFix(tw){ // tw: array per FACES of needed clockwise quarter turns
  const T=CENTER_TABLE;let s=T.enc(tw);if(s===0)return [];if(!isFinite(T.dist[s]))return null;
  const parts=[];while(s!==0){parts.push(T.pe[s].alg);s=T.prev[s];}
  return parts.reverse();}

// ===== validation of a colour assignment =====
// colors: facelets[f][k] -> color index; centerColor[f] -> color index of face f
function validate(data){
  const errs=[];const cnt=[0,0,0,0,0,0];
  for(const f of FACES)for(const d of data[f])cnt[d.c]++;
  cnt.forEach((n,i)=>{if(n!==9)errs.push({type:'count',color:i,n});});
  const centers=FACES.split('').map(f=>data[f][4].c);
  if(new Set(centers).size!==6)errs.push({type:'centers'});
  if(errs.length)return errs;
  const letter=c=>FACES[centers.indexOf(c)];
  const str=FACES.split('').map(f=>data[f].map(d=>letter(d.c)).join('')).join('');
  return {str};
}
// After the pieces are solved by `moves`, find per-face majority orientation, needed center twists, and outliers
function orientationPlan(model,moves){
  const st=applyAlg(cloneModel(model),moves);const tw=[],corrections=[],agree=[];
  for(const f of FACES){const n=N[f];const on=st.filter(s=>eq(s.n,n));
    const center=on.find(s=>eq(s.p,n));const votes={};
    for(const s of on)if(s!==center){const k=s.up.join(',');votes[k]=(votes[k]||0)+1;}
    const bestK=Object.keys(votes).sort((a,b)=>votes[b]-votes[a])[0];const M=bestK.split(',').map(Number);
    agree.push(votes[bestK]);
    let k=0;for(let q=0;q<4;q++)if(eq(rotq(n,center.up,q),M))k=q;tw.push(k);
    for(const s of on)if(s!==center&&!eq(s.up,M)){let d=0;for(let q=0;q<4;q++)if(eq(rotq(n,s.up,q),M))d=q;corrections.push({home:s.home,k:s.k,delta:d});}}
  return {tw,corrections,agree};}
G.CubeCore={orientationPlan,FACES,N,UPV,RIGHTV,rotq,dirFor,qFor,slotPos,buildModel,applyMove,applyAlg,splitAlg,cloneModel,readFacelets,
  invertAlg,simplify,allRotations,relabel,centerEffect,buildCenterTable,centerFix,validate,eq,dot,faceOf,parseMove};
})(typeof window!=='undefined'?window:globalThis);
