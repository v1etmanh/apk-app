// Validate portable vector JSON, loop endpoints and exact installed copies.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json')));
assert.equal(manifest.characters.length,10);assert.equal(manifest.characters.filter(s=>s.gender==='male').length,5);
const same=(a,b,rotation=false)=>{if(typeof a==='number'&&typeof b==='number')return Math.abs(rotation?(a-b)-360*Math.round((a-b)/360):a-b)<.001;if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>same(v,b[i],rotation));if(a&&b&&typeof a==='object'&&typeof b==='object')return Object.keys(a).every(k=>same(a[k],b[k]));return a===b;};
const report=[];
for(const s of manifest.characters){
 const file=path.join(base,'lottie',s.key+'.json'),bytes=fs.readFileSync(file),j=JSON.parse(bytes);let tracks=0,shapes=0;
 assert.deepEqual([j.w,j.h,j.fr,j.ip,j.op],[512,512,30,0,90]);assert(bytes.length<150000);assert.equal((j.assets||[]).length,0);assert(!j.fonts&&!j.chars);
 function walk(x,key=''){
  if(!x||typeof x!=='object')return;
  if(typeof x.ty==='number')assert([3,4].includes(x.ty),'Non-vector layer '+x.ty);
  if(x.ty==='sh')shapes++;
  if(x.a===1&&Array.isArray(x.k)&&x.k[0]?.t!==undefined){
   tracks++;const keys=x.k;assert.equal(keys[0].t,0,'Missing initial key');assert.equal(keys.at(-1).t,90,'Missing end key');
   for(let i=1;i<keys.length;i++)assert(keys[i].t>keys[i-1].t,'Key order');
   assert(same(keys[0].s,keys.at(-1).s,key==='r'),'Non-looping track '+s.key+' '+key);
  }
  for(const[k,v]of Object.entries(x))if(typeof v==='object')walk(v,k);
 }
 walk(j);assert(tracks>=4);assert(shapes>=10);
 const installed=fs.readFileSync(path.resolve(base,'../../assets/animations/plan',s.key+'.json'));assert(bytes.equals(installed),'Installed asset differs');
 report.push({key:s.key,bytes:bytes.length,animatedTracks:tracks,bezierPaths:shapes,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
const rendered=JSON.parse(fs.readFileSync(path.join(base,'previews/render-report.json')));assert(rendered.passed);assert.equal(rendered.characters.length,10);assert.equal(rendered.characters[0].frames.at(-1).frame,89);
fs.writeFileSync(path.join(base,'validation.json'),JSON.stringify({passed:true,dimensions:'512x512',fps:30,durationSeconds:3,vectorOnly:true,externalDependencies:false,loopEndpointsMatch:true,characters:report},null,2));
console.log(JSON.stringify({passed:true,count:report.length,totalBytes:report.reduce((n,s)=>n+s.bytes,0),minBytes:Math.min(...report.map(s=>s.bytes)),maxBytes:Math.max(...report.map(s=>s.bytes))}));
