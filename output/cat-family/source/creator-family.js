// Cat family: editable vector reconstruction in LottieFiles Creator.
// Run once per document with params.kind = father|mother|brother|kitten|grandpa.
// All geometry is vector; references are visual guides, not embedded bitmaps.
const kind = params.kind;
const spec = {
 father:{fur:"#F6A03C",dark:"#CB6B26",cloth:"#384562",leg:"#384562"},
 mother:{fur:"#969EB8",dark:"#707B98",cloth:"#CE8390",leg:"#969EB8"},
 brother:{fur:"#FFF0DA",dark:"#54515A",cloth:"#528F8B",leg:"#625359"},
 kitten:{fur:"#FFD05F",dark:"#E5A335",cloth:"#ACD9B7",leg:"#FFD05F"},
 grandpa:{fur:"#39383F",dark:"#28272E",cloth:"#D3A151",leg:"#655047"}
}[kind];
if (!spec) throw new Error("Unknown character");
const comp=creator.createComp(512,512,30,0,3);
creator.setName(comp,"Cat family / "+kind);
creator.focusOn(comp);
creator.setBackgroundColor({red:0,green:0,blue:0,alpha:0});
function col(hex) {
 const n=parseInt(hex.slice(1),16);
 return {red:((n>>16)&255)/255,green:((n>>8)&255)/255,blue:(n&255)/255,alpha:1};
}
const ink="#513222", cream="#FFF0DB", pink="#F5AF9D";
function group(name,x=0,y=0,parent) {
 const g=creator.createGroup(comp,x,y);creator.setName(g,name);
 if(parent)creator.setParentInPlace(g,parent);return g;
}
const root=group(kind+" / character",256,450);
function finish(n,name,parent,stroke=3.8) {
 creator.setName(n,name);if(stroke)creator.addStroke(n,col(ink),stroke);
 creator.setParentInPlace(n,parent||root);return n;
}
function ellipse(name,x,y,w,h,fill,parent,stroke=3.8) {
 return finish(creator.insertEllipse(comp,x,y,w,h,col(fill)),name,parent,stroke);
}
function path(name,points,fill,parent,stroke=3.8,close=true) {
 const commands=[PathCommand.MoveTo,...points.slice(1).map(()=>PathCommand.LineTo)];
 if(close)commands.push(PathCommand.Close);
 const paint=fill?col(fill):{red:0,green:0,blue:0,alpha:0};
 return finish(creator.insertPath(comp,0,0,commands,points.flat(),paint),name,parent,stroke);
}
function bez(start,...segments){
 const pts=[start];let p=start;
 for(const s of segments){
  if(s.length===2){pts.push(s);p=s;continue;}
  for(let j=1;j<=16;j++){
   const t=j/16,u=1-t;
   pts.push([u*u*u*p[0]+3*u*u*t*s[0]+3*u*t*t*s[2]+t*t*t*s[4],
             u*u*u*p[1]+3*u*u*t*s[1]+3*u*t*t*s[3]+t*t*t*s[5]]);
  }p=[s[4],s[5]];
 }return pts;
}
function curve(name,start,segments,color,parent,width=3.8){
 const n=path(name,bez(start,...segments),null,parent,0,false);
 creator.addStroke(n,col(color),width);return n;
}
function star(name,x,y,r,color,parent){
 return path(name,Array.from({length:8},(_,i)=>{
 const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.30:r;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];
 }),color,parent,0);
}
function rotation(n,values){creator.animate(n,PropertyType.Rotation,values);}
function scale(n,values){creator.animate(n,PropertyType.Scale,values.map(([t,v])=>[t,{x:v,y:v}]));}
function bob(n,x,y,delta){
 creator.animate(n,PropertyType.Position,[[0,{x,y}],[1.5,{x,y:y+delta}],[3,{x,y}]]);
}
const tail=group("Tail / swish",325,401,root);
path("Tail",bez([323,414],[376,420,407,384,410,362],[414,344,434,348,434,369],[432,419,380,446,327,435]),spec.fur,tail);
if(kind==="father"||kind==="kitten") {
 curve("Tail stripe",[392,402],[[402,405,414,405,421,400]],spec.dark,tail,13);
}
rotation(tail,[[0,-.08],[1.5,.08],[3,-.08]]);
// Legs and feet
for(const [side,x]of [["L",223],["R",289]]){
 ellipse(side+" leg",x,423,53,67,spec.leg,root);
 ellipse(side+" foot",x,458,62,28,(kind==="father"?"#785146":kind==="grandpa"?"#C59C72":kind==="mother"?"#A66669":cream),root);
}
if(kind==="mother"){
 path("Dress",bez([207,279],[178,291,175,348,158,409],[184,441,328,441,354,409],[337,348,334,291,305,279]),spec.cloth);
 curve("Waist seam",[184,351],[[227,362,285,362,328,351]],ink,root,3);
}else{
 path("Torso",bez([206,276],[175,287,170,343,177,402],[216,416,296,416,335,402],[342,343,337,287,306,276]),spec.cloth);
}
if(kind==="father"||kind==="grandpa"){
 path("Shirt",[ [214,278],[298,278],[282,367],[256,390],[230,367] ],cream);
 path("Left collar",[[213,278],[256,290],[235,316]],cream);
 path("Right collar",[[299,278],[256,290],[277,316]],cream);
 if(kind==="father"){
  path("Left lapel",[[211,277],[193,303],[214,317],[201,327],[247,389]],"#465674");
  path("Right lapel",[[301,277],[319,303],[298,317],[311,327],[265,389]],"#465674");
  const tie=group("Tie / adjustment",256,299,root);
  path("Tie blade",[[249,307],[263,307],[272,361],[256,378],[240,361]],"#A13D4E",tie);
  path("Tie knot",[[244,292],[268,292],[264,309],[248,309]],"#AA4555",tie);
  bob(tie,0,-151,-5);
 }else{
  curve("Cardigan opening",[211,279],[[220,319,236,342,256,356],[256,373,256,392,256,411]],"#A97738",root,8);
  curve("Cardigan right collar",[301,279],[[292,319,276,342,256,356]],"#A97738",root,8);
 }
 for(let y=366;y<403;y+=18)ellipse("Button "+y,kind==="father"?239:257,y,8,8,"#8C6545",root,2);
 for(const x of [201,310]) path("Pocket "+x,[[x-16,367],[x+16,367],[x+14,391],[x-14,391]],spec.cloth,root,2.7);
}else if(kind==="brother"){
 path("Hood",bez([194,278],[177,283,175,307,203,317],[225,320,239,331,256,343],[273,331,287,320,309,317],[337,307,335,283,318,278]),"#609C96");
 for(const x of[238,274])curve("Hood cord "+x,[x,323],[[x,333,x,347,x,358]],cream,root,5);
 path("Hoodie pocket",bez([219,365],[219,381,211,392,211,395],[235,401,277,401,301,395],[301,392,293,381,293,365]),"#4C8581",root,2.8);
}else if(kind==="kitten"){
 path("Overall bib",[[220,307],[292,307],[300,397],[212,397]],spec.cloth);
 for(const x of[224,288]){
  path("Strap "+x,[[x-7,277],[x+7,277],[x+7,327],[x-7,327]],spec.cloth);
  ellipse("Overall button "+x,x,324,12,12,cream,root,2);
 }
 path("Overall pocket",bez([236,352],[236,382,276,382,276,352]),"#93C9A5",root,2.5);
}
// Arms behind head
if(kind==="brother"){
 for(const [side,x]of[["L",181],["R",331]]){
  ellipse(side+" sleeve",x,345,39,88,spec.cloth);
  ellipse(side+" hand",x,394,31,37,cream);
 }
}else if(kind==="father"||kind==="grandpa"){
 ellipse("Relaxed sleeve",327,346,42,89,spec.cloth);
 ellipse("Relaxed paw",329,390,30,37,spec.fur);
}
const head=group("Head / expression",256,268,root);
path("Left ear",bez([143,158],[134,128,141,64,158,55],[179,53,209,87,222,107]),spec.fur,head);
path("Right ear",bez([290,107],[303,87,333,53,354,55],[371,64,378,128,369,158]),kind==="brother"?"#F5A044":spec.fur,head);
path("Left inner ear",bez([153,131],[151,105,155,83,161,77],[174,82,188,96,196,109]),pink,head,2.7);
path("Right inner ear",bez([316,109],[324,96,338,82,351,77],[357,83,361,105,359,131]),pink,head,2.7);
path("Round face",bez([256,93],[334,90,382,132,387,191],[397,256,348,289,256,292],[164,289,115,256,125,191],[130,132,178,90,256,93]),spec.fur,head);
if(kind==="brother"){
 path("Charcoal patch",bez([154,121],[179,102,208,96,235,95],[235,144,207,158,179,165],[153,174,136,190,126,203],[125,169,133,141,154,121]),"#5B575E",head,0);
 path("Orange patch",bez([275,96],[340,102,378,136,385,182],[388,204,378,216,360,221],[331,203,315,181,295,158],[282,142,277,115,275,96]),"#F5A044",head,0);
}else if(kind==="father"||kind==="kitten"){
 for(const [x,y,w,h]of[[228,115,14,33],[255,116,17,40],[282,115,14,33],[142,186,27,12],[146,211,30,12],[370,186,27,12],[366,211,30,12]])
 ellipse("Tabby stripe "+x+" "+y,x,y,w,h,spec.dark,head,0);
}
if(kind!=="grandpa")ellipse("Cream muzzle",256,246,202,78,cream,head,0);
if(kind==="brother"){
 ellipse("Left dark circle",205,210,49,31,"#BC91B6",head,0);
 ellipse("Right dark circle",307,210,49,31,"#BC91B6",head,0);
}
for(const [side,x]of[["L",205],["R",307]]){
 const eye=group(side+" eye / blink",x,184,head);
 ellipse(side+" eye white",x,184,50,55,kind==="grandpa"?"#FFD27A":"#FFFCF3",eye,3);
 ellipse(side+" pupil",x+3,187,32,44,"#4F2C20",eye,0);
 ellipse(side+" catchlight",x+10,171,11,13,"#FFFFFF",eye,0);
 if(kind==="mother"||kind==="kitten"){
  const shine=group(side+" eye / sparkle",x,190,eye);
  star(side+" star",x-3,194,kind==="mother"?14:10,kind==="mother"?"#FFD64F":"#FFFFFF",shine);
  ellipse(side+" tiny shine",x+10,202,5,5,"#FFFFFF",shine,0);
  scale(shine,[[0,.8],[.7,1.12],[1.5,.8],[2.2,1.12],[3,.8]]);
 }
 if(kind==="brother"){
  path(side+" sleepy lid",bez([x-26,176],[x-18,148,x+18,148,x+26,176]),x<256?"#FFF0DA":"#F5A044",eye,0);
  curve(side+" heavy lid",[x-27,177],[[x-11,174,x+11,178,x+26,181]],ink,eye,4.3);
 }
 creator.animate(eye,PropertyType.Scale,[[0,{x:1,y:1}],[1.10,{x:1,y:1}],[1.22,{x:1,y:.08}],[1.36,{x:1,y:1}],[3,{x:1,y:1}]]);
 curve(side+" eyebrow",[x-19,145],[[x-7,137,x+6,137,x+18,145]],kind==="grandpa"?"#D6D4D5":ink,head,kind==="grandpa"?9:4);
}
if(kind==="kitten"){
 ellipse("Left blush",184,230,30,18,"#F6A49A",head,0);
 ellipse("Right blush",328,230,30,18,"#F6A49A",head,0);
}
path("Nose",bez([244,218],[247,213,265,213,268,218],[267,224,260,228,256,230],[252,228,245,224,244,218]),kind==="grandpa"?"#A6877A":ink,head,1);
if(kind==="grandpa"){
 path("Silver beard",bez([233,244],[226,264,234,284,245,295],[250,291,254,287,256,281],[259,291,262,295,265,296],[279,282,286,263,279,244]),"#D9D7D9",head,0);
 path("Silver moustache",bez([256,231],[242,218,224,224,214,238],[205,243,198,240,195,235],[198,261,231,266,256,243],[281,266,314,261,317,235],[314,240,307,243,298,238],[288,224,270,218,256,231]),"#E8E5E6",head,0);
}
curve("Smile",[230,238],[[232,256,250,253,256,236],[262,253,280,256,282,238]],ink,head,3.8);
curve("Nose bridge",[256,229],[[256,231,256,234,256,237]],ink,head,3);
for(const sign of[-1,1])for(let i=0;i<3;i++){
 const x=256+sign*82,y=215+i*14;
 curve("Whisker "+sign+" "+i,[x,y],[[x+sign*15,y-3,x+sign*28,y-2+i*3,x+sign*38,y+i*4]],kind==="grandpa"?"#DBD8DB":ink,head,2.7);
}
if(kind==="mother"){
 const clips=group("Hair clips",344,132,head);
 path("Pink barrette",[[320,112],[346,101],[351,111],[325,122]],"#F2AAC2",clips,3);
 star("Gold hair star",355,133,17,"#FFD448",clips);
 path("Mint barrette",[[338,155],[365,147],[368,157],[341,165]],"#9FD6BD",clips,3);
}
if(kind==="father"||kind==="grandpa"){
 const arm=group("Action paw / "+(kind==="father"?"adjust tie":"stroke beard"),193,335,root);
 path("Bent sleeve",bez([183,323],[162,338,161,356,176,364],[193,370,218,349,236,324],[229,312,216,304,205,308]),spec.cloth,arm);
 path("Cuff",[[211,306],[228,317],[216,336],[200,326]],kind==="father"?cream:"#E4B469",arm,2.8);
 ellipse("Action paw",233,306,38,43,spec.fur,arm);
 curve("Paw digits",[232,297],[[242,291,249,299,246,303]],ink,arm,2.4);
 rotation(arm,[[0,0],[.7,.12],[1.4,0],[2.1,.08],[3,0]]);
}else if(kind==="mother"){
 for(const[side,x]of[["L",178],["R",334]]){
  const a=group(side+" excited arm",x,333,root);
  ellipse(side+" forearm",x,323,35,62,spec.fur,a);
  ellipse(side+" paw",x,289,37,40,spec.fur,a);
  rotation(a,[[0,-.07],[.75,.07],[1.5,-.07],[2.25,.07],[3,-.07]]);
  if(side==="L"){
   path("Banknote",[[137,234],[175,225],[188,272],[150,281]],"#87AD56",a,3);
   path("Banknote inset",[[146,241],[170,235],[179,266],[155,272]],"#D9E6A0",a,1.5);
   ellipse("Banknote emblem",162,253,12,17,"#87AD56",a,0);
  }
 }
 for(const[x,y]of[[124,225],[157,204],[371,244]]){
  const s=group("Money glint "+x,x,y,root);star("Glint",x,y,12,"#F4C84B",s);
  scale(s,[[0,.6],[.75,1],[1.5,.6],[2.25,1],[3,.6]]);
 }
}else if(kind==="kitten"){
 for(const[side,x]of[["L",212],["R",300]]){
  const a=group(side+" cheek paw",x,310,root);
  ellipse(side+" forearm",x,314,32,45,spec.fur,a);
  ellipse(side+" tiny paw",x+(side==="L"?5:-5),291,36,38,spec.fur,a);
  rotation(a,[[0,-.04],[1.5,.04],[3,-.04]]);
 }
}
if(kind==="brother"){
 rotation(head,[[0,-.025],[1.5,-.085],[3,-.025]]);
 bob(root,256,450,3);
}else if(kind==="kitten"){
 rotation(head,[[0,-.045],[1.5,.045],[3,-.045]]);
 bob(root,256,450,-4);
}else{
 rotation(head,[[0,-.015],[1.5,.02],[3,-.015]]);
 bob(root,256,450,-2);
}
return {kind,comp:String(comp),duration:3,width:512,height:512};

