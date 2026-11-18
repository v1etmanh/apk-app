// Three additional cat-family assets. Run once per NEW Creator document.
// params.kind: grandma | sister | tabby-girl
const kind=params.kind;
const spec={
 grandma:{fur:"#FFFCFA",dark:"#D2CCCE",cloth:"#AD8CAA",leg:"#FFFCFA",shoe:"#B77692"},
 sister:{fur:"#F3C38F",dark:"#C58C53",cloth:"#8E4E67",leg:"#F3C38F",shoe:"#804559"},
 "tabby-girl":{fur:"#BA9A83",dark:"#755645",cloth:"#764B35",leg:"#527BA3",shoe:"#FFF9F0"}
}[kind];
if(!spec)throw new Error("Unknown character");
const comp=creator.createComp(512,512,30,0,3);
creator.setName(comp,"Cat family / "+kind);creator.focusOn(comp);
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

const tail=group("Tail / sway",325,401,root);
path("Tail",bez([323,414],[376,420,407,384,410,362],[414,344,434,348,434,369],[432,419,380,446,327,435]),spec.fur,tail);
if(kind!=="grandma"){
 curve("Tail stripe tip",[412,367],[[420,367,427,370,433,375]],spec.dark,tail,10);
 curve("Tail stripe middle",[396,399],[[405,402,412,407,415,412]],spec.dark,tail,11);
 curve("Tail stripe base",[366,414],[[373,418,376,427,375,435]],spec.dark,tail,11);
}
rotation(tail,[[0,-.06],[1.5,.06],[3,-.06]]);
for(const[side,x]of[["L",223],["R",289]]){
 if(kind==="tabby-girl"){
  path(side+" denim leg",[[x-28,373],[x+29,373],[x+26,452],[x-29,452]],spec.leg);
  curve(side+" denim seam",[x-22,385],[[x-24,405,x-24,431,x-24,446]],"#E8BE87",root,2);
 }else ellipse(side+" leg",x,429,49,57,spec.leg);
 ellipse(side+" shoe",x,459,62,27,spec.shoe);
 if(kind==="tabby-girl"){
  curve(side+" sneaker sole",[x-28,462],[[x-10,466,x+15,466,x+28,462]],"#BEAFA2",root,2);
  for(let y=451;y<458;y+=4)curve(side+" lace "+y,[x-12,y],[[x-4,y-2,x+4,y-2,x+12,y]],ink,root,1.6);
 }
}
if(kind==="tabby-girl"){
 path("Jeans waist",[[184,356],[328,356],[324,398],[188,398]],spec.leg);
 curve("Waist stitching",[188,376],[[220,382,292,382,324,376]],"#E8BE87",root,2);
 curve("Left jean pocket",[190,382],[[194,401,214,404,226,385]],"#E8BE87",root,2);
 curve("Right jean pocket",[322,382],[[318,401,298,404,286,385]],"#E8BE87",root,2);
 curve("Fly",[256,378],[[256,384,256,396,256,408]],ink,root,2);
 ellipse("Jeans button",256,380,7,7,"#E6C17E",root,1);
 path("Louis Vuitton tee",bez([202,275],[178,282,164,307,157,319],[166,331,177,335,187,331],[184,347,183,362,185,372],[217,383,295,383,327,372],[329,362,328,347,325,331],[335,335,346,331,355,319],[348,307,334,282,310,275]),spec.cloth);
 curve("T-shirt neckline",[224,281],[[227,308,285,308,288,281]],"#513222",root,4);
 // Vector monogram; no external font dependency.
 path("LV letter L",[[242,319],[250,319],[246,345],[264,345],[262,350],[235,350]],"#E7BD7B",root,0);
 path("LV letter V",[[254,318],[263,318],[270,338],[282,318],[288,318],[269,350],[265,350]],"#E7BD7B",root,0);
 for(const[x,y]of[[208,312],[304,312],[206,350],[305,350],[259,365]]){
  star("Monogram flower "+x+" "+y,x,y,8,"#E7BD7B",root);
  ellipse("Flower center "+x+" "+y,x,y,3,3,spec.cloth,root,0);
 }
}else{
 path("Dress",bez([207,277],[178,289,176,352,158,416],[194,438,318,438,354,416],[336,352,334,289,305,277]),spec.cloth);
 curve("Dress waist",[186,346],[[223,355,289,355,326,346]],ink,root,3);
 for(const x of[195,317])curve("Dress fold "+x,[x,368],[[x-4,383,x-5,403,x-5,419]],kind==="grandma"?"#92738F":"#744055",root,2.5);
 if(kind==="grandma"){
  path("Cream apron",bez([204,348],[205,372,190,395,196,415],[226,429,286,429,316,415],[322,395,307,372,308,348]),cream);
  path("Apron waistband",[[200,347],[312,347],[311,358],[201,358]],cream,root,2);
  curve("Cardigan opening",[256,282],[[256,303,256,320,256,346]],"#8C6B89",root,3);
  for(let y=304;y<345;y+=17)ellipse("Cardigan button "+y,256,y,6,6,"#DAC3D7",root,1.5);
  for(const x of[233,279])ellipse("Cream collar "+x,x,287,45,28,cream,root,2.5);
 }
}
// Face rig: same scale and outline family as the original five assets.
const head=group("Head / expression",256,268,root);
const earTop=kind==="sister"?38:55;
path("Left ear",bez([143,158],[134,128,141,earTop+9,158,earTop],[179,earTop-2,209,87,222,107]),spec.fur,head);
path("Right ear",bez([290,107],[303,87,333,earTop-2,354,earTop],[371,earTop+9,378,128,369,158]),spec.fur,head);
path("Left inner ear",bez([153,131],[151,105,155,earTop+28,161,earTop+22],[174,earTop+27,188,96,196,109]),pink,head,2.7);
path("Right inner ear",bez([316,109],[324,96,338,earTop+27,351,earTop+22],[357,earTop+28,361,105,359,131]),pink,head,2.7);
path("Face",bez([256,93],[334,90,382,132,387,191],[397,256,348,289,256,292],[164,289,115,256,125,191],[130,132,178,90,256,93]),spec.fur,head);
if(kind==="grandma"){
 path("White forehead fluff",bez([211,105],[204,90,219,81,231,85],[238,65,263,67,275,83],[295,78,309,93,301,107],[287,116,275,113,270,108],[260,128,240,126,235,111],[223,117,213,115,211,105]),"#FFFCFA",head,2.8);
 for(const x of[146,366])ellipse("Soft silver cheek "+x,x,207,35,11,spec.dark,head,0);
}else{
 for(const[x,y,w,h]of[[228,113,12,31],[255,113,14,38],[282,113,12,31],[142,186,27,10],[146,211,30,10],[370,186,27,10],[366,211,30,10]])
 ellipse("Tabby marking "+x+" "+y,x,y,w,h,spec.dark,head,0);
 if(kind==="tabby-girl")curve("Forehead M",[231,145],[[231,139,233,134,235,131],[245,139],[256,149],[267,139],[277,131],[279,145]],spec.dark,head,5);
}
ellipse("Pale muzzle",256,247,198,76,kind==="grandma"?"#FFFDFC":cream,head,0);
ellipse("Left blush",180,230,31,18,"#F0A69F",head,0);
ellipse("Right blush",332,230,31,18,"#F0A69F",head,0);
for(const[side,x]of[["L",205],["R",307]]){
 const eye=group(side+" eye / blink",x,184,head);
 ellipse(side+" white",x,184,50,55,"#FFFCF6",eye,3);
 if(kind==="sister")ellipse(side+" green iris",x+3,187,34,47,"#8FAD52",eye,0);
 ellipse(side+" pupil",x+3,187,kind==="sister"?21:32,42,kind==="grandma"?"#A96A32":"#513222",eye,0);
 ellipse(side+" catchlight",x+10,171,11,13,"#FFFFFF",eye,0);
 for(let j=0;j<2;j++){
  const edge=x+(side==="L"?-22:22),sign=side==="L"?-1:1;
  curve(side+" eyelash "+j,[edge,173+j*7],[[edge+sign*7,171+j*7,edge+sign*9,166+j*7,edge+sign*9,164+j*7]],ink,eye,2.7);
 }
 const wink=kind==="tabby-girl"&&side==="R";
 creator.animate(eye,PropertyType.Scale,wink?
 [[0,{x:1,y:1}],[.55,{x:1,y:1}],[.8,{x:1,y:.06}],[1.6,{x:1,y:.06}],[1.85,{x:1,y:1}],[3,{x:1,y:1}]]:
 [[0,{x:1,y:1}],[2.2,{x:1,y:1}],[2.33,{x:1,y:.08}],[2.48,{x:1,y:1}],[3,{x:1,y:1}]]);
 curve(side+" brow",[x-18,145],[[x-7,136,x+7,136,x+18,145]],ink,head,3.5);
}
if(kind==="grandma"){
 for(const x of[219,293]){
  const lens=creator.insertEllipse(comp,x,212,39,31,{red:0,green:0,blue:0,alpha:0});
  finish(lens,"Reading glasses "+x,head,3.3);
 }
 curve("Glasses bridge",[238,209],[[246,203,266,203,274,209]],ink,head,3);
}else{
 for(const x of[143,369]){
  if(kind==="sister")ellipse("Pearl earring "+x,x,157,13,13,"#FFF9EE",head,2);
  else{
   const hoop=creator.insertEllipse(comp,x,157,14,21,{red:0,green:0,blue:0,alpha:0});
   finish(hoop,"Gold hoop "+x,head,0);creator.addStroke(hoop,col("#F6CE68"),4.5);
  }
 }
}
path("Nose",bez([244,218],[247,213,265,213,268,218],[267,224,260,228,256,230],[252,228,245,224,244,218]),ink,head,1);
curve("Smile",[230,238],[[232,256,250,253,256,236],[262,253,280,256,282,238]],ink,head,3.8);
curve("Nose bridge",[256,229],[[256,231,256,234,256,237]],ink,head,3);
for(const sign of[-1,1])for(let i=0;i<2;i++){
 const x=256+sign*82,y=217+i*14;
 curve("Whisker "+sign+" "+i,[x,y],[[x+sign*15,y-3,x+sign*28,y-2+i*3,x+sign*38,y+i*4]],ink,head,2.5);
}
// Foreground articulated action rigs
if(kind==="grandma"){
 path("Holding sleeve",bez([323,299],[345,309,347,340,331,355],[320,364,301,354,292,342],[302,327,311,310,323,299]),spec.cloth);
 const cloth=group("Fabric / held cloth",280,350,root);
 path("Rose fabric",bez([252,336],[278,326,300,329,309,344],[318,369,321,388,314,398],[296,408,281,391,263,401],[246,410,224,398,232,388],[235,369,244,351,252,336]),"#DC8298",cloth);
 curve("Fabric fold",[285,339],[[275,361,275,377,263,401]],"#AF586F",cloth,2.8);
 for(let i=0;i<5;i++)curve("Stitch "+i,[250+i*10,347-i*2],[[253+i*10,346-i*2,255+i*10,345-i*2,257+i*10,344-i*2]],cream,cloth,2.3);
 ellipse("Holding paw",310,337,36,40,spec.fur);
 const sew=group("Sewing hand and needle",191,333,root);
 path("Sewing sleeve",bez([185,299],[165,311,161,339,175,351],[193,360,212,340,221,324],[210,311,197,303,185,299]),spec.cloth,sew);
 ellipse("Sewing paw",216,314,36,40,spec.fur,sew);
 curve("Needle silver",[224,300],[[234,313,247,333,258,349]],"#716C77",sew,4);
 curve("Needle glint",[224,300],[[234,313,247,333,258,349]],"#F5F2F3",sew,1.4);
 curve("Pink thread",[226,303],[[254,296,249,316,238,325],[223,341,239,353,259,348]],"#F5ABC1",sew,2.6);
 creator.animate(sew,PropertyType.Position,[[0,{x:-65,y:-117}],[.65,{x:-70,y:-134}],[1.3,{x:-65,y:-117}],[1.95,{x:-70,y:-134}],[2.6,{x:-65,y:-117}],[3,{x:-65,y:-117}]]);
 rotation(head,[[0,-.02],[1.5,.025],[3,-.02]]);
}else if(kind==="sister"){
 const mirror=group("Hand / open compact",330,330,root);
 path("Compact sleeve",bez([321,290],[345,300,351,330,338,348],[326,363,307,346,300,330]),spec.cloth,mirror);
 ellipse("Compact holding paw",348,320,37,38,spec.fur,mirror);
 ellipse("Compact lid",365,268,54,68,"#CB7D93",mirror);
 ellipse("Blue mirror",365,268,42,55,"#B6E2ED",mirror,2);
 curve("Mirror reflection",[351,281],[[357,272,369,258,377,253]],"#EFFCFF",mirror,4);
 ellipse("Compact case",350,304,67,23,"#CF8094",mirror);
 ellipse("Powder pan",350,301,52,13,"#F2B3A7",mirror,2);
 rotation(mirror,[[0,-.025],[1.5,.025],[3,-.025]]);
 const brush=group("Makeup hand / cheek brush",180,331,root);
 path("Brush sleeve",bez([187,292],[168,299,158,326,170,342],[186,352,206,336,211,314]),spec.cloth,brush);
 ellipse("Brush paw",184,294,36,39,spec.fur,brush);
 path("Brush handle",[[187,284],[196,289],[220,250],[211,244]],"#C57894",brush,2);
 path("Brush ferrule",[[204,257],[215,264],[224,251],[213,244]],"#E4BC67",brush,2);
 ellipse("Brush bristles",221,240,26,32,"#9F6655",brush,2.6);
 for(let i=0;i<3;i++)curve("Brush bristle "+i,[213+i*5,248],[[215+i*5,242,217+i*5,236,217+i*5,231]],"#754637",brush,1.2);
 rotation(brush,[[0,.20],[.6,.36],[1.2,.20],[1.8,.36],[2.4,.20],[3,.20]]);
 rotation(head,[[0,-.015],[1.5,.015],[3,-.015]]);
}else{
 path("Hip arm",bez([342,320],[359,332,344,355,324,367],[313,368,306,359,313,351],[325,343,332,331,330,323]),spec.fur);
 ellipse("Hip paw",318,360,27,27,spec.fur);
 const peace=group("Peace-sign wave",177,328,root);
 path("Raised forearm",bez([172,319],[159,316,153,298,155,283],[159,274,176,277,179,287],[183,300,188,308,190,315]),spec.fur,peace);
 path("Peace fingers",bez([158,283],[150,267,139,251,145,247],[152,241,161,258,165,263],[166,247,165,232,173,234],[182,237,178,260,181,274],[190,287,178,298,164,293]),spec.fur,peace);
 ellipse("Peace palm",169,284,35,30,spec.fur,peace,3);
 curve("Folded fingers",[160,282],[[166,274,174,278,174,284],[168,289,164,287,164,285]],ink,peace,2);
 rotation(peace,[[0,-.07],[.65,.08],[1.3,-.07],[1.95,.08],[2.6,-.07],[3,-.07]]);
 rotation(head,[[0,-.035],[1.5,.035],[3,-.035]]);
}
bob(root,256,450,-2);
return {kind,comp:String(comp),duration:3,width:512,height:512};

