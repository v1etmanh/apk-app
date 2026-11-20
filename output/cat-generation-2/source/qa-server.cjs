// Run from repository root: node output/cat-generation-2/source/qa-server.cjs
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),out=path.join(root,'output/cat-generation-2/previews');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.wasm':'application/wasm','.png':'image/png'};
http.createServer(async(req,res)=>{
 if(req.url==='/qa-save'&&req.method==='POST'){
  try{let text='';for await(const c of req)text+=c;const {name,data}=JSON.parse(text);if(!/^[a-z0-9-]+\.(png|json)$/.test(name))throw Error('invalid file');fs.writeFileSync(path.join(out,name),name.endsWith('.png')?Buffer.from(data.split(',')[1],'base64'):data);res.end('saved');}catch(e){res.writeHead(400);res.end(String(e));}return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
}).listen(8743,'127.0.0.1',()=>console.log('QA preview at http://127.0.0.1:8743/output/cat-generation-2/source/preview.html'));
