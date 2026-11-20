// Cat family generation 2. Run once in a NEW document per character.
// params is a character record from manifest.json; no bitmap or font dependencies.
const s=params, id=s.id;
const comp=creator.createComp(512,512,30,0,3);
creator.setName(comp,s.key);creator.focusOn(comp);
creator.setBackgroundColor({red:0,green:0,blue:0,alpha:0});
const ink="#543727", cream="#FFF1DB", pink="#F2AC9C";
function color(h,a=1){let n=parseInt(h.slice(1),16);return{red:(n>>16&255)/255,green:(n>>8&255)/255,blue:(n&255)/255,alpha:a};}
const transparent={red:0,green:0,blue:0,alpha:0};
const pivots=new Map();
function group(name,x,y,parent){
 const n=creator.createGroup(comp,x,y);creator.setName(n,name);
 if(parent)creator.setParentInPlace(n,parent);
 const p=pivots.get(parent)||[0,0];pivots.set(n,[x,y]);
 return n;
}
const root=group("character",256,454);
function attach(n,name,parent,sw=3.5,stroke=ink){
 creator.setName(n,name);
 if(sw){const p=creator.addStroke(n,color(stroke),sw);creator.setStrokeCap(p,2);creator.setStrokeJoin(p,2);}
 creator.setParentInPlace(n,parent||root);return n;
}
function ellipse(name,x,y,w,h,fill,parent,sw=3.5,stroke=ink){
 return attach(creator.insertEllipse(comp,x,y,w,h,fill?color(fill):transparent),name,parent,sw,stroke);
}
function path(name,start,segs,fill,parent,sw=3.5,closed=true,stroke=ink){
 const cmds=[PathCommand.MoveTo],pts=[...start];
 for(const seg of segs){cmds.push(seg.length===6?PathCommand.CubicTo:PathCommand.LineTo);pts.push(...seg);}
 if(closed)cmds.push(PathCommand.Close);
 return attach(creator.insertPath(comp,0,0,cmds,pts,fill?color(fill):transparent),name,parent,sw,stroke);
}
function line(name,start,segs,fill=ink,parent,sw=3){return path(name,start,segs,null,parent,sw,false,fill);}
function rect(name,x,y,w,h,fill,parent,sw=3.5){
 return attach(creator.insertRect(comp,x,y,w,h,color(fill)),name,parent,sw);
}
function star(name,x,y,r,fill,parent){
 const p=Array.from({length:8},(_,i)=>{let a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.3:r;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];});
 return path(name,p[0],p.slice(1),fill,parent,0);
}
function rot(n,keys){creator.animate(n,PropertyType.Rotation,keys);}
function position(n,parent,keys){
 const p=pivots.get(n),q=pivots.get(parent)||[0,0];
 creator.animate(n,PropertyType.Position,keys.map(([t,dx,dy])=>[t,{x:p[0]-q[0]+dx,y:p[1]-q[1]+dy}]));
}
function opacity(n,keys){creator.animate(n,PropertyType.Opacity,keys);}
function uniform(n,keys){creator.animate(n,PropertyType.Scale,keys.map(([t,v])=>[t,{x:v,y:v}]));}
function bow(name,x,y,fill,parent){
 path(name+" left",[x,y],[[x-25,y-25,x-29,y+23,x,y+3]],fill,parent,2.5);
 path(name+" right",[x,y],[[x+25,y-25,x+29,y+23,x,y+3]],fill,parent,2.5);
 ellipse(name+" knot",x,y,13,16,fill,parent,2.5);
}
function paw(name,x,y,parent,fill=s.fur,w=34,h=34){
 ellipse(name,x,y,w,h,fill,parent);
 line(name+" toes",[x+2,y-6],[[x+11,y-9,x+14,y-4,x+12,y]],ink,parent,2);
}
function sleeve(name,start,segs,parent,fill=s.cloth){return path(name,start,segs,fill,parent);}
function steam(name,x,y,parent){
 const g=group(name,x,y,parent);
 line(name+" wisp",[x,y],[[x+13,y-10,x-11,y-15,x+1,y-28]],"#EADFCC",g,4);
 position(g,parent,[[0,0,2],[1.5,3,-5],[3,0,2]]);
 opacity(g,[[0,.35],[1.5,.8],[3,.35]]);return g;
}
const toddler=["bong","sua"].includes(id), child=["butchi","no"].includes(id);
const senior=["tra","mai"].includes(id), adult=["moka","la"].includes(id);
const hs=toddler?1.04:child?.98:senior?.9:adult?.85:.92;
const tail=group("tail",327,407,root);
path("tail shape",[322,414],[[370,417,401,391,408,365],[414,345,435,351,432,371],[429,419,378,441,323,434]],id==="may"?s.accent:s.fur,tail);
if(["bong","butchi","no","moka","la","tra"].includes(id)){
 line("tail stripe 1",[405,381],[[414,384,422,387,426,392]],s.accent,tail,10);
 line("tail stripe 2",[381,406],[[387,413,393,418,393,425]],s.accent,tail,10);
}
rot(tail,[[0,-.05],[1.5,.06],[3,-.05]]);
if(id==="butchi"){
 path("backpack",[184,283],[[151,286,155,352,159,390],[168,405,193,408,205,398],[308,398],[327,407,347,398,350,385],[356,341,351,286,326,282]],"#5189C4");
}
const legs=(toddler||id==="la")?s.cloth:id==="mai"?"#AA7A91":id==="may"?"#8D526D":id==="no"?cream:"#57505A";
for(const[side,x]of[["L",224],["R",288]]){
 const legTop=toddler?400:388;
 path(side+" leg",[x-24,legTop],[[x+25,legTop],[x+24,444],[x+18,453,x-19,453,x-24,444]],legs);
 ellipse(side+" foot",x,458,58,25,toddler?cream:id==="mai"?"#C5A6CB":id==="butchi"?"#566A9C":"#865F49");
 if(id==="butchi"||id==="beat"||id==="may")line(side+" shoe sole",[x-25,460],[[x-12,465,x+12,465,x+25,460]],cream,root,3);
}
if(id==="no"){
 path("pinafore dress",[208,280],[[179,298,180,360,162,414],[199,436,310,436,350,414],[332,360,333,298,304,280]],s.cloth);
}else{
 path("torso",[205,278],[[175,287,174,350,177,401],[214,418,298,418,335,401],[338,350,337,287,307,278]],s.cloth);
}
if(toddler||id==="la"||id==="no"){
 path("undershirt",[211,279],[[301,279],[302,323],[210,323]],cream);
 for(const x of[219,293]){
  rect("overall strap "+x,x,307,13,57,s.cloth);
  ellipse("overall button "+x,x,331,12,12,"#F7D470",root,2);
 }
 path("overall pocket",[235,366],[[277,366],[279,394,233,394,235,366]],s.cloth,root,2.5);
}else if(id==="beat"){
 path("hood",[204,278],[[179,282,176,306,203,315],[232,321,244,329,256,340],[268,329,280,321,309,315],[336,306,333,282,308,278]],"#B49AD8");
 for(const x of[238,274])line("hood cord "+x,[x,325],[[x,345]],cream,root,4);
 path("hoodie pocket",[224,363],[[288,363],[297,389],[215,389]],"#AB90D0",root,2.5);
}else if(id==="may"){
 path("shirt panel",[233,278],[[279,278],[280,403],[232,403]],cream);
 path("left lapel",[209,280],[[242,290],[222,315],[205,297]],"#A9DDCB");
 path("right lapel",[303,280],[[270,290],[290,315],[307,297]],"#A9DDCB");
}else if(id==="butchi"){
 for(const x of[203,309])rect("backpack strap "+x,x,329,14,87,"#4F87C8",root,2.5);
}else if(id==="moka"){
 ellipse("ribbed collar",256,290,94,34,"#F3E3C4",root,2.5);
 for(let x=220;x<=292;x+=12)line("collar rib "+x,[x,280],[[x,299]],"#C5AA84",root,2);
 line("sweater hem",[182,395],[[220,405,291,405,330,395]],"#CCB28A",root,7);
}else if(id==="tra"){
 path("shirt",[218,280],[[294,280],[256,347]],cream);
 line("cardigan seam",[256,347],[[256,408]],"#587D70",root,3);
 for(const y of[365,389])ellipse("cardigan button "+y,256,y,8,8,"#9B784A",root,2);
}else if(id==="mai"){
 for(const y of[326,351,377]){
  line("jacket frog "+y,[243,y],[[268,y]],"#E4BCCB",root,6);
 }
}
// Rounded head with distinct coat markings and age proportions.
const head=group("head",256,272,root);
const earColor=id==="may"?s.accent:id==="bong"?"#F5C45F":s.fur;
path("left ear",[144,156],[[134,126,140,64,158,55],[176,53,205,83,222,105]],earColor,head);
path("right ear",[290,105],[[307,83,336,53,354,55],[372,64,378,126,368,156]],earColor,head);
path("left inner ear",[153,132],[[151,108,153,86,161,78],[174,83,190,100,197,112]],pink,head,2.5);
path("right inner ear",[315,112],[[322,100,338,83,351,78],[359,86,361,108,359,132]],pink,head,2.5);
path("face",[256,92],[[332,90,379,131,386,189],[397,253,348,289,256,292],[164,289,115,253,126,189],[133,131,180,90,256,92]],s.fur,head);
if(["sua","mai"].includes(id)){
 path("left calico patch",[153,126],[[177,106,210,97,235,95],[235,132,221,150,195,163],[165,179,141,169,132,176],[135,155,141,139,153,126]],id==="sua"?"#F2BC93":"#B4ADB1",head,0);
 path("right calico patch",[286,95],[[340,102,376,136,385,180],[366,185,344,174,321,156],[298,139,291,117,286,95]],id==="sua"?"#B9AFAC":"#D9BA92",head,0);
}else if(["bong","butchi","no","moka","la","tra"].includes(id)){
 for(const[x,y,w,h]of[[229,112,13,31],[256,114,15,38],[283,112,13,31],[144,186,26,11],[147,209,29,11],[368,186,26,11],[365,209,29,11]])
 ellipse("stripe "+x+" "+y,x,y,w,h,s.accent,head,0);
}else if(id==="beat"){
 path("white blaze",[253,94],[[250,130,252,165,236,201],[280,201],[261,162,267,122,253,94]],"#FFF7EC",head,0);
}
if(id==="may"){
 ellipse("Siamese face mask",256,211,177,140,"#92705C",head,0);
}else ellipse("cream muzzle",256,246,199,77,id==="moka"?"#E8B887":cream,head,0);
if(id==="mai"){
 path("silver tuft",[214,106],[[212,84,235,76,247,85],[263,68,286,78,289,96],[300,99,291,114,280,115],[263,121,251,115,246,108],[234,121,217,118,214,106]],"#FFF6E8",head,2.5);
}
const eyes={};
for(const[side,x]of[["L",205],["R",307]]){
 const eye=group(side+" eye",x,184,head);eyes[side]=eye;
 ellipse(side+" sclera",x,184,50,55,"#FFFCF5",eye,3);
 if(id==="may")ellipse(side+" blue iris",x+3,187,36,45,"#68A9CA",eye,0);
 ellipse(side+" pupil",x+3,187,id==="may"?24:33,44,ink,eye,0);
 ellipse(side+" highlight",x+10,172,11,13,"#FFFFFF",eye,0);
 if(s.gender==="female"){
  const a=x+(side==="L"?-23:23),sg=side==="L"?-1:1;
  line(side+" lash",[a,177],[[a+sg*9,175,a+sg*12,169,a+sg*12,166]],ink,eye,2.5);
 }
 creator.animate(eye,PropertyType.Scale,[[0,{x:1,y:1}],[2.24,{x:1,y:1}],[2.36,{x:1,y:.06}],[2.5,{x:1,y:1}],[3,{x:1,y:1}]]);
 line(side+" brow",[x-17,145],[[x-6,137,x+6,137,x+17,145]],id==="tra"?"#FFF8F0":ink,head,id==="tra"?10:3.5);
}
if(["sua","no","may","mai"].includes(id)){
 ellipse("left blush",181,229,27,16,"#F1A69B",head,0);ellipse("right blush",331,229,27,16,"#F1A69B",head,0);
}
if(id==="tra"){
 path("moustache",[256,230],[[239,218,228,234,215,239],[222,256,243,255,256,241],[269,255,290,256,297,239],[284,234,273,218,256,230]],"#FFF7EC",head,0);
 for(const x of[219,293])ellipse("glasses "+x,x,210,39,33,null,head,3,"#BD925C");
 line("glasses bridge",[239,207],[[247,201,265,201,273,207]],"#BD925C",head,3);
}
path("nose",[244,217],[[248,212,264,212,268,217],[267,224,260,228,256,230],[252,228,245,224,244,217]],ink,head,1);
line("smile",[231,239],[[233,254,250,251,256,236],[262,251,279,254,281,239]],ink,head,3.5);
line("nose bridge",[256,230],[[256,236]],ink,head,3);
for(const sign of[-1,1])for(let i=0;i<2;i++){
 const x=256+sign*82,y=216+14*i;
 line("whisker "+sign+" "+i,[x,y],[[x+sign*14,y-3,x+sign*27,y-2+3*i,x+sign*36,y+4*i]],ink,head,2.5);
}
if(id==="sua"||id==="no")bow("hair bow",337,122,id==="sua"?"#EE8C9D":"#F48E78",head);
creator.setStaticVec2(head,PropertyType.Scale,{x:hs,y:hs});
if(id==="mai"){
 path("scarf tail",[217,289],[[237,294],[222,381],[201,377]],"#CCB4DC");
 path("scarf collar",[209,281],[[229,300,281,300,305,281],[313,294,297,311,260,314],[229,316,203,302,209,281]],"#CCB4DC");
}

function arm(name,x,y,px,py,parent=root,cloth=s.cloth){
 sleeve(name+" sleeve",[x-10,y-8],[[x-28,y+3,px-24,py-3,px-15,py+11],[px+8,py+20,px+17,py-7,px+9,py-17],[x+10,y-8]],parent,cloth);
 paw(name+" paw",px,py,parent);
}
if(id==="bong"){
 const hug=group("hug teddy",256,337,root);
 ellipse("teddy body",256,354,66,76,"#C18A57",hug);
 ellipse("teddy left foot",231,385,28,25,"#C18A57",hug);
 ellipse("teddy right foot",281,385,28,25,"#C18A57",hug);
 for(const x of[233,279])ellipse("teddy ear "+x,x,302,23,23,"#C18A57",hug);
 ellipse("teddy head",256,320,63,56,"#D6A167",hug);
 ellipse("teddy muzzle",256,332,28,20,"#F6D6A3",hug,2);
 ellipse("teddy nose",256,328,9,7,ink,hug,0);
 for(const x of[244,268])ellipse("teddy eye "+x,x,318,5,6,ink,hug,0);
 arm("left hug",190,301,226,350,hug,cream);arm("right hug",322,301,286,350,hug,cream);
 position(hug,root,[[0,0,0],[1.1,-3,-5],[1.8,-3,-5],[3,0,0]]);
 rot(head,[[0,0],[1.1,.055],[1.8,.055],[3,0]]);
 position(head,root,[[0,0,0],[1.1,-3,5],[1.8,-3,5],[3,0,0]]);
}else if(id==="sua"){
 for(const[side,x,px,d]of[["L",190,221,20],["R",322,291,-20]]){
  const a=group("clap "+side,x,306,root);arm(side+" clap",x,306,px,335,a,cream);
  position(a,root,[[0,0,0],[.5,d,-5],[.85,0,0],[1.2,d,-5],[1.6,0,0],[3,0,0]]);
 }
 for(const[i,x,y,r]of[[0,119,305,14],[1,397,250,19],[2,367,322,11]]){
  const g=group("bubble "+i,x,y,root);
  ellipse("bubble ring "+i,x,y,r*2,r*2,null,g,2.3,"#92C9D3");
  line("bubble glint "+i,[x-r*.5,y-r*.3],[[x-r*.4,y-r*.7,x,y-r*.8,x+r*.2,y-r*.7]],"#E8C5DB",g,2.5);
  position(g,root,[[0,0,12],[2.7,i%2?7:-7,-30],[3,0,12]]);
  opacity(g,[[0,0],[.3,.8],[2.4,.8],[2.7,0],[3,0]]);
 }
}else if(id==="butchi"){
 arm("left reading",192,304,213,363);arm("right reading",320,304,299,363);
 const book=group("open book",256,354,root);
 for(const[side,sg]of[["left",-1],["right",1]]){
  const page=group(side+" book",256,352,book);
  path(side+" book cover",[256,326],[[256+sg*65,315],[256+sg*66,369],[256,383]],"#EBC45F",page);
  path(side+" pages",[256,330],[[256+sg*58,321],[256+sg*58,364],[256,377]],"#FFF6DA",page,2);
  for(let j=0;j<3;j++)line(side+" text "+j,[256+sg*12,340+j*10],[[256+sg*46,334+j*10]],"#C8B187",page,2);
  creator.animate(page,PropertyType.Scale,[[0,{x:.22,y:1}],[.9,{x:1,y:1}],[2.1,{x:1,y:1}],[3,{x:.22,y:1}]]);
 }
 rot(head,[[0,-.025],[1,.025],[2,.025],[3,-.025]]);
}else if(id==="no"){
 arm("pinwheel arm",187,301,151,337,root,cream);
 arm("right resting arm",325,301,332,369,root,cream);
 line("pinwheel stick",[145,244],[[145,342]],"#B98A57",root,6);
 paw("pinwheel grip",145,330,root);
 const spin=group("pinwheel rotor",145,245,root);
 const colors=["#F3979A","#8DCBC5","#EBC965","#ADA1D3"];
 for(let i=0;i<4;i++){
  const blade=group("pinwheel blade "+i,145,245,spin);
  path("blade "+i,[145,245],[[111,234],[119,209],[145,215]],colors[i],blade,2);
  creator.setRotation(blade,i*Math.PI/2);
 }
 ellipse("pinwheel hub",145,245,13,13,"#FFF4D8",spin,2);
 rot(spin,[[0,0],[3,Math.PI*2]]);
 rot(head,[[0,-.02],[1.5,.025],[3,-.02]]);
}else if(id==="beat"){
 line("headphone band",[152,174],[[142,78,363,78,360,174]],"#7CC9B7",head,16);
 for(const x of[148,364])ellipse("headphone cup "+x,x,183,34,60,"#96D7C4",head,3);
 arm("left groove",187,307,177,370);
 const listen=group("listening hand",328,291,root);
 arm("right listening",326,306,361,231,listen);
 rot(listen,[[0,0],[.75,.03],[1.5,0],[2.25,.03],[3,0]]);
 rot(head,[[0,-.035],[.75,.035],[1.5,-.035],[2.25,.035],[3,-.035]]);
 const note=group("music note",401,147,root);
 line("note stem",[393,158],[[393,128],[411,123],[411,151]],"#8E78BF",note,4);
 ellipse("note dot1",387,158,14,10,"#8E78BF",note,0);ellipse("note dot2",405,151,14,10,"#8E78BF",note,0);
 position(note,root,[[0,0,4],[1.5,3,-8],[3,0,4]]);opacity(note,[[0,.25],[1.5,1],[3,.25]]);
}else if(id==="may"){
 const camera=group("camera rig",256,338,root);
 arm("camera left",193,304,215,343,camera);arm("camera right",319,304,297,343,camera);
 rect("camera flash housing",277,309,22,17,"#E5B4C3",camera,2);
 rect("camera body",256,337,88,55,"#DFA4BA",camera);
 rect("camera top",239,306,26,10,"#DFA4BA",camera,2);
 ellipse("camera lens rim",256,338,43,43,"#F8D5DC",camera,2.5);
 ellipse("camera lens",256,338,30,30,"#6E8B98",camera,2.5);
 ellipse("camera reflection",261,332,9,9,"#C8E5DD",camera,0);
 paw("camera left fingers",214,340,camera,s.fur,23,29);paw("camera right fingers",298,340,camera,s.fur,23,29);
 position(camera,root,[[0,0,0],[.8,0,-54],[1.5,0,-54],[2.3,0,0],[3,0,0]]);
 const flash=group("camera flash",285,240,root);
 star("flash sparkle",285,240,23,"#F7D66E",flash);
 opacity(flash,[[0,0],[1.05,0],[1.12,1],[1.3,0],[3,0]]);
 creator.animate(eyes.R,PropertyType.Scale,[[.7,{x:1,y:1}],[.85,{x:1,y:.06}],[1.5,{x:1,y:.06}],[1.7,{x:1,y:1}]]);
}else if(id==="moka"){
 arm("resting arm",322,306,328,370);
 const coffee=group("coffee hand",216,336,root);
 arm("coffee arm",191,306,214,354,coffee);
 ellipse("mug handle",255,337,32,32,null,coffee,8,"#C78364");
 path("mug",[211,317],[[249,317],[251,355,211,362,211,339]],"#CF8E6F",coffee);
 ellipse("coffee surface",230,318,38,11,"#6C4532",coffee,2.5);
 paw("coffee grip",208,346,coffee,s.fur,26,30);
 steam("coffee steam",229,310,coffee);
 position(coffee,root,[[0,0,0],[1.1,8,-38],[1.7,8,-38],[3,0,0]]);
 rot(head,[[0,0],[1.1,-.03],[1.7,-.03],[3,0]]);
}else if(id==="la"){
 arm("pot holding",320,306,315,383,root,cream);
 const pot=group("plant pot",306,367,root);
 line("plant stem",[306,377],[[306,330]],"#58875C",pot,4);
 path("left leaf",[306,347],[[283,349,274,330,279,322],[300,322,309,335,306,347]],"#A4C57D",pot,2.5);
 path("right leaf",[306,336],[[307,316,326,310,335,316],[334,333,322,341,306,336]],"#7AA56B",pot,2.5);
 path("pot",[280,359],[[332,359],[325,397],[287,397]],"#D38D70",pot);
 rect("pot rim",306,361,58,13,"#E4A486",pot,2.5);
 paw("pot fingers",329,386,root,s.fur,23,29);
 const can=group("watering hand",258,327,root);
 arm("watering arm",189,305,201,345,can,cream);
 ellipse("can handle",186,329,39,44,null,can,7,"#669CA9");
 path("can spout",[227,341],[[258,317],[266,323],[232,355]],"#8EBECB",can,2.5);
 rect("watering can",214,340,43,40,"#8EBECB",can);
 ellipse("can lid",214,319,43,9,"#A9D4DD",can,2.5);
 paw("can grip",186,337,can,s.fur,25,28);
 rot(can,[[0,-.18],[.9,.14],[1.9,.14],[3,-.18]]);
 for(let i=0;i<3;i++){
  const drop=group("water drop "+i,267+i*9,333+i*6,root);
  ellipse("water "+i,267+i*9,333+i*6,4,8,"#7CB7D0",drop,0);
  position(drop,root,[[0,0,0],[.8,0,0],[1.8,3,10],[2.3,0,0],[3,0,0]]);
  opacity(drop,[[0,0],[.65,0],[.9,1],[1.8,1],[2.1,0],[3,0]]);
 }
}else if(id==="tra"){
 arm("tea cup arm",320,307,304,376);
 ellipse("cup handle",328,357,21,20,null,root,5,"#D2BC9A");
 path("tea cup",[285,346],[[323,346],[321,374,287,374,285,346]],"#FFF1D5");
 ellipse("tea surface",304,347,38,9,"#B57A42",root,2);
 paw("cup fingers",307,374,root,s.fur,27,24);
 const pour=group("teapot hand",275,331,root);
 arm("teapot arm",190,306,203,354,pour);
 ellipse("teapot handle",190,336,32,33,null,pour,7,"#C49B69");
 path("teapot spout",[239,339],[[262,337,267,324,278,326],[281,333,263,355,238,353]],"#C89C66",pour);
 ellipse("teapot belly",221,342,61,44,"#D7AE78",pour);
 ellipse("teapot lid",221,322,43,10,"#E1BD8B",pour,2.5);
 ellipse("teapot knob",221,314,10,10,"#B88A56",pour,2);
 paw("teapot grip",189,341,pour,s.fur,25,29);
 rot(pour,[[0,-.15],[.9,.18],[1.9,.18],[3,-.15]]);
 const flow=group("tea stream",280,334,root);
 line("tea pour",[278,331],[[291,334,298,340,302,347]],"#B7854E",flow,3);
 opacity(flow,[[0,0],[.7,0],[.95,1],[1.85,1],[2.1,0],[3,0]]);
 steam("tea steam",307,338,root);
 rot(head,[[0,0],[1.5,-.025],[3,0]]);
}else if(id==="mai"){
 const left=group("tai chi left",192,305,root),right=group("tai chi right",320,306,root);
 arm("tai chi left",192,305,220,348,left);
 arm("tai chi right",320,306,359,315,right);
 rot(left,[[0,-.08],[1.5,.14],[3,-.08]]);
 rot(right,[[0,.08],[1.5,-.15],[3,.08]]);
 rot(head,[[0,-.015],[1.5,.02],[3,-.015]]);
 position(root,null,[[0,-2,0],[1.5,2,-2],[3,-2,0]]);
}
if(id!=="mai")position(root,null,[[0,0,0],[1.5,0,-2],[3,0,0]]);

{
const rig=creator.findByName("character")[0];
function sleevePoints(x,y,px,py,dx,dy){
 return [x-10,y-8,x-28,y+3,px-24+dx,py-3+dy,px-15+dx,py+11+dy,px+8+dx,py+20+dy,px+17+dx,py-7+dy,px+9+dx,py-17+dy,x+10,y-8];
}
function fixedShoulder(name,x,y,px,py,keys){
 const sleeve=creator.findByName(name+" sleeve")[0];
 creator.setParentInPlace(sleeve,rig);
 creator.animate(sleeve,PropertyType.PathPoints,keys.map(([t,dx,dy])=>[t,sleevePoints(x,y,px,py,dx,dy)]),{slice:"vec2"});
}
if(params.id==="may"){
 const k=[[0,0,0],[.8,0,-54],[1.5,0,-54],[2.3,0,0],[3,0,0]];
 fixedShoulder("camera left",193,304,215,343,k);
 fixedShoulder("camera right",319,304,297,343,k);
}
if(params.id==="moka"){
 fixedShoulder("coffee arm",191,306,214,354,[[0,0,0],[1.1,8,-38],[1.7,8,-38],[3,0,0]]);
}
if(params.id==="butchi"){
 for(const[name,x,px,dx]of[["left reading",192,213,31],["right reading",320,299,-31]]){
  const k=[[0,dx,0],[.9,0,0],[2.1,0,0],[3,dx,0]];
  fixedShoulder(name,x,304,px,363,k);
  const g=creator.createGroup(comp,0,0);creator.setName(g,name+" fingers rig");creator.setParentInPlace(g,rig);
  for(const suffix of[" paw"," paw toes"])creator.setParentInPlace(creator.findByName(name+suffix)[0],g);
  creator.animate(g,PropertyType.Position,k.map(([t,d,y])=>[t,{x:-256+d,y:-454+y}]));
 }
}
}


if(params.id==="may"||params.id==="moka"){
 const front=creator.findByName(params.id==="may"?"camera rig":"coffee hand")[0];
 for(const name of(params.id==="may"?["camera left sleeve","camera right sleeve"]:["coffee arm sleeve"])){
  creator.setChildIndex(creator.findByName(name)[0],creator.getChildIndex(front));
 }
}

return {name:s.key,comp,frames:90};

