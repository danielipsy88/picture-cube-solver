// ===== Vision: perspective warp, colour clustering, image rotation detection =====
(function(G){
function solveLinear(A,b){const n=b.length;A=A.map((r,i)=>r.concat([b[i]]));
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];
    for(let r=0;r<n;r++)if(r!==c){const f=A[r][c]/A[c][c];for(let k=c;k<=n;k++)A[r][k]-=f*A[c][k];}}
  return A.map((r,i)=>r[n]/r[i]);}
// homography mapping unit-square dst (0..S) -> src quad [tl,tr,br,bl]
function homography(src,S){const dst=[[0,0],[S,0],[S,S],[0,S]];const A=[],b=[];
  for(let i=0;i<4;i++){const [x,y]=dst[i],[u,v]=src[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v);}
  const h=solveLinear(A,b);h.push(1);return h;}
function warp(srcCanvas,quad,S){S=S||300;const sw=srcCanvas.width,sh=srcCanvas.height;
  const sd=srcCanvas.getContext('2d').getImageData(0,0,sw,sh).data;
  const out=document.createElement('canvas');out.width=out.height=S;const ctx=out.getContext('2d');const od=ctx.createImageData(S,S);
  const h=homography(quad,S);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const w=h[6]*x+h[7]*y+1;const u=(h[0]*x+h[1]*y+h[2])/w,v=(h[3]*x+h[4]*y+h[5])/w;
    const o=(y*S+x)*4;const ui=Math.floor(u),vi=Math.floor(v);
    if(ui<0||vi<0||ui>=sw-1||vi>=sh-1){od.data[o+3]=255;continue;}
    const fu=u-ui,fv=v-vi;const i00=(vi*sw+ui)*4,i10=i00+4,i01=i00+sw*4,i11=i01+4;
    for(let c=0;c<3;c++)od.data[o+c]=(sd[i00+c]*(1-fu)+sd[i10+c]*fu)*(1-fv)+(sd[i01+c]*(1-fu)+sd[i11+c]*fu)*fv;
    od.data[o+3]=255;}
  ctx.putImageData(od,0,0);return out;}
function rgb2lab(r,g,b){[r,g,b]=[r,g,b].map(v=>{v/=255;return v>0.04045?Math.pow((v+0.055)/1.055,2.4):v/12.92;});
  let x=(r*0.4124+g*0.3576+b*0.1805)/0.95047,y=r*0.2126+g*0.7152+b*0.0722,z=(r*0.0193+g*0.1192+b*0.9505)/1.08883;
  const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;x=f(x);y=f(y);z=f(z);return [116*y-16,500*(x-y),200*(y-z)];}
function median(a){a=a.slice().sort((x,y)=>x-y);return a[a.length>>1];}
// split warped face (S x S) into 9 cell canvases, locating the coloured sticker inside each cell
function cells(face){const S=face.width,c=S/3,e=Math.round(c*0.05);const fd=face.getContext('2d').getImageData(0,0,S,S).data;const out=[];
  function run(prof){let best=[0,0],st=-1;for(let i=0;i<=prof.length;i++){const v=i<prof.length&&prof[i]>0.45;if(v&&st<0)st=i;if(!v&&st>=0){if(i-st>best[1]-best[0])best=[st,i];st=-1;}}return best;}
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){
    const x0=Math.max(0,Math.round(j*c-e)),x1=Math.min(S,Math.round(j*c+c+e)),y0=Math.max(0,Math.round(i*c-e)),y1=Math.min(S,Math.round(i*c+c+e));
    const w=x1-x0,h=y1-y0,rows=new Float32Array(h),cols=new Float32Array(w);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=((y0+y)*S+x0+x)*4;const r=fd[o],g=fd[o+1],b=fd[o+2];const mx=Math.max(r,g,b),lum=(r+g+b)/3;
      if(mx>75||lum>65){rows[y]++;cols[x]++;}}
    for(let y=0;y<h;y++)rows[y]/=w;for(let x=0;x<w;x++)cols[x]/=h;
    let [r0,r1]=run(rows),[c0,c1]=run(cols);
    if(r1-r0<c*0.6||c1-c0<c*0.6||r1-r0>c*1.08||c1-c0>c*1.08){const ins=Math.round(c*0.07);r0=Math.round(i*c+ins)-y0;r1=Math.round(i*c+c-ins)-y0;c0=Math.round(j*c+ins)-x0;c1=Math.round(j*c+c-ins)-x0;}
    else{const ih=(r1-r0)*0.025,iw=(c1-c0)*0.025;r0+=ih;r1-=ih;c0+=iw;c1-=iw;}
    const cs=88,cv=document.createElement('canvas');cv.width=cv.height=cs;
    cv.getContext('2d').drawImage(face,x0+c0,y0+r0,c1-c0,r1-r0,0,0,cs,cs);out.push(cv);}
  return out;}
function grayGrid(cv,n,margin){const t=document.createElement('canvas');t.width=t.height=n;const x=t.getContext('2d');
  const m=cv.width*margin;x.imageSmoothingQuality='high';x.drawImage(cv,m,m,cv.width-2*m,cv.height-2*m,0,0,n,n);
  const d=x.getImageData(0,0,n,n).data;const a=new Float32Array(n*n);for(let i=0;i<n*n;i++)a[i]=0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2];return a;}
function norm(a){let m=0;for(const v of a)m+=v;m/=a.length;let s=0;const o=new Float32Array(a.length);for(let i=0;i<a.length;i++){o[i]=a[i]-m;s+=o[i]*o[i];}s=Math.sqrt(s)||1;for(let i=0;i<o.length;i++)o[i]/=s;return o;}
// rotate n x n array clockwise q times
function rotCW(a,n,q){q=((q%4)+4)%4;let cur=a;for(let t=0;t<q;t++){const o=new Float32Array(n*n);for(let i=0;i<n;i++)for(let j=0;j<n;j++)o[j*n+(n-1-i)]=cur[i*n+j];cur=o;}return cur;}
function features(cv){
  const g=grayGrid(cv,16,0.08);const d0=grayGrid(cv,12,0.08);const bg=median(Array.from(d0));
  const d=d0.map(v=>Math.max(0,bg-v));
  // colour from outer ring
  const s=cv.width,ctx=cv.getContext('2d'),px=ctx.getImageData(0,0,s,s).data;const R=[],Gc=[],B=[];
  const a0=Math.round(s*0.03),a1=Math.round(s*0.17);
  for(let y=a0;y<s-a0;y++)for(let x=a0;x<s-a0;x++){const inner=x>a1&&x<s-a1&&y>a1&&y<s-a1;if(inner)continue;const o=(y*s+x)*4;R.push(px[o]);Gc.push(px[o+1]);B.push(px[o+2]);}
  const rgb=[median(R),median(Gc),median(B)];
  return {g:{a:g,n:16},d:{a:d,n:12},rgb,lab:rgb2lab(...rgb)};}
function score(f,T,q){ // f rotated counter-clockwise by q compared with template T
  let s=0;for(const k of ['g','d']){const r=norm(rotCW(f[k].a,f[k].n,-q));const t=norm(T[k].a);let v=0;for(let i=0;i<r.length;i++)v+=r[i]*t[i];s+=v;}return s;}
function labDist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);}
/* faces: {U:canvas300,...}. returns {data:{f:[{c,q,conf,colorDist,cell}]}, palette:[rgb], centersByColor} */
function recognize(faces){const FACES='URFDLB';const all=[];
  for(const f of FACES){const cs=cells(faces[f]);cs.forEach((cv,k)=>all.push(Object.assign({f,k,cell:cv},features(cv))));}
  const centers=FACES.split('').map(f=>all.find(s=>s.f===f&&s.k===4));
  let means=centers.map(c=>c.lab.slice());
  function assign(){const pairs=[];for(const s of all){s.c=-1;if(s.k===4){s.c=FACES.indexOf(s.f);continue;}
      means.forEach((m,ci)=>pairs.push([labDist(s.lab,m),s,ci]));}
    pairs.sort((a,b)=>a[0]-b[0]);const cap=[8,8,8,8,8,8];
    for(const [d,s,ci] of pairs){if(s.c>=0||cap[ci]===0)continue;s.c=ci;cap[ci]--;s.colorDist=d;}
    means=means.map((m,ci)=>{const g=all.filter(s=>s.c===ci);return [0,1,2].map(k=>g.reduce((a,s)=>a+s.lab[k],0)/g.length);});}
  assign();assign();
  // second-best colour margin
  for(const s of all){const ds=means.map(m=>labDist(s.lab,m)).sort((a,b)=>a-b);s.colorMargin=ds[1]-ds[0];}
  // rotations relative to each colour's center
  for(let ci=0;ci<6;ci++){const grp=all.filter(s=>s.c===ci);let T={g:centers[ci].g,d:centers[ci].d};
    for(let pass=0;pass<2;pass++){
      for(const s of grp){if(s.k===4){s.q=0;s.rotConf=1;continue;}const sc=[0,1,2,3].map(q=>score(s,T,q));
        const order=[0,1,2,3].sort((a,b)=>sc[b]-sc[a]);s.q=order[0];s.rotConf=sc[order[0]]-sc[order[1]];}
      // averaged template, aligned to the center's frame
      const nt={};for(const k of ['g','d']){const n=T[k].n||centers[ci][k].n;const acc=new Float32Array(n*n);
        for(const s of grp){const r=norm(rotCW(s[k].a,s[k].n,-s.q));for(let i=0;i<acc.length;i++)acc[i]+=r[i];}nt[k]={a:acc,n};}
      T=nt;}}
  const data={};for(const f of FACES)data[f]=all.filter(s=>s.f===f).sort((a,b)=>a.k-b.k).map(s=>({c:s.c,q:s.q,cell:s.cell,rgb:s.rgb,rotConf:s.rotConf,colorMargin:s.colorMargin,lowConf:s.k!==4&&(s.rotConf<0.12||s.colorMargin<6)}));
  const palette=centers.map(c=>c.rgb);
  return {data,palette};}
G.Vision={warp,recognize,cells,homography,relRot:(c,t)=>{const a=features(c),b=features(t);const sc=[0,1,2,3].map(q=>score(a,b,q));return sc.map(v=>+v.toFixed(2));}};
})(window);
