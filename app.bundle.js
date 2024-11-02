(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict"
window.glov_build_version="1730509975354"
var called_once=false
function onLoad(){if(called_once)return
called_once=true
window.time_load_onload=Date.now()
require("../glov/client/bootstrap.js")
if("multiplayer"===window.conf_env);else if("entity"===window.conf_env);else require("./main.js").main()
window.time_load_init=Date.now()}window.addEventListener("DOMContentLoaded",onLoad)
window.onload=onLoad

},{"../glov/client/bootstrap.js":12,"./main.js":7}],2:[function(require,module,exports){
"use strict"
exports.BIOMES_SAME_LOOSE=exports.BIOMES=void 0
var BIOMES={WATER_DEEP:24,WATER_SHALLOW:25,DESERT:30,GREEN_PLAINS:26,GREEN_FOREST:29,MOUNTAINS:27,MOUNTAINS_SNOW:28,FROZEN_PLAINS:10,FROZEN_MOUNTAINS:31,FROZEN_OCEAN:11,MOONROCK1:6,MOONROCK2:7,MOONROCK3:8,MOONROCK4:9,DEAD_FOREST:1,DIRT:32,DIRT_DARK:42,GAS_ORANGE_LIGHT:33,GAS_ORANGE_DARK:34,GAS_GRAY:35,MOLTEN_MOUNTAINS:36,MOLTEN_PLAINS:37,MOLTEN_LAVAFLOW:38,GAS_BLUE_DARK:39,GAS_BLUE_MED:40,GAS_BLUE_LIGHT:41,GAS_YELLOW:43,GAS_YELLOW_RED:44,GAS_RED:45,GAS_PURPLE_LIGHT:16,GAS_PURPLE_DARK:17}
exports.BIOMES=BIOMES
var BIOMES_SAME_LOOSE=function(){var ret={}
for(var key in BIOMES){var _ret$v
var v=BIOMES[key]
ret[v]=((_ret$v={})[v]=true,_ret$v)}function associate(b1,b2){ret[b1][b2]=true
ret[b2][b1]=true}associate(BIOMES.GREEN_PLAINS,BIOMES.GREEN_FOREST)
associate(BIOMES.GREEN_PLAINS,BIOMES.MOUNTAINS)
associate(BIOMES.GREEN_FOREST,BIOMES.MOUNTAINS)
return ret}()
exports.BIOMES_SAME_LOOSE=BIOMES_SAME_LOOSE

},{}],3:[function(require,module,exports){
"use strict"
exports.STAR_LAYER=exports.MAX_LAYER=exports.LAYER_STEP=exports.Galaxy=void 0
exports.createGalaxy=createGalaxy
exports.distSq=distSq
var LAYER_STEP=4
exports.LAYER_STEP=LAYER_STEP
var STAR_LAYER=6
exports.STAR_LAYER=STAR_LAYER
var MAX_LAYER=8
exports.MAX_LAYER=MAX_LAYER
var assert=require("assert")
var _glovClientEngine=require("../glov/client/engine")
var engine=_glovClientEngine
var _glovClientTextures=require("../glov/client/textures")
var TEXTURE_FORMAT=_glovClientTextures.TEXTURE_FORMAT
var textureLoad=_glovClientTextures.textureLoad
var _glovCommonRand_alea=require("../glov/common/rand_alea")
var mashString=_glovCommonRand_alea.mashString
var randCreate=_glovCommonRand_alea.randCreate
var _glovCommonUtil=require("../glov/common/util")
var clamp=_glovCommonUtil.clamp
var easeInOut=_glovCommonUtil.easeInOut
var easeOut=_glovCommonUtil.easeOut
var lerp=_glovCommonUtil.lerp
var SimplexNoise=require("simplex-noise")
var _solar_system=require("./solar_system")
var solarSystemCreate=_solar_system.solarSystemCreate
var _star_types=require("./star_types")
var hueFromID=_star_types.hueFromID
var abs=Math.abs,atan2=Math.atan2,ceil=Math.ceil,floor=Math.floor,max=Math.max,min=Math.min,sqrt=Math.sqrt,pow=Math.pow,PI=Math.PI,round=Math.round
var SUMSQ=.75
var POI_TYPE_OFFS=[[1,0,0,.5,0,-1,.5,-1,0,.5,0,1,.5,1,0],[1,0,0,.5,0,-1,.5,0,-2,.5,-1,0,.5,-2,0,.5,1,0,.5,2,0,.5,0,1,.5,0,2,.2,-1,-1,.2,1,-1,.2,-1,1,.2,1,1],[1,0,0,.2,0,-1,.2,0,-2,.2,-1,0,.2,-2,0,.2,1,0,.2,2,0,.2,0,1,.2,0,2,.2,-1,-1,.2,1,-1,.2,-1,1,.2,1,1]]
var counts={bicubic:0,getSampleBuf:0,realizeStars:0,realizeStarsFinish:0,perturb:0,assignChildStars:0,data:0,star_buf:0,hue_buf:0,getCellTextured:0,tex:0,cell:0,star:0,renderStars:0}
var star_buf_pool=[]
var hue_buf_pool=[]
var noise=new Array(2)
var rand=randCreate(0)
function genGalaxy(params){var seed=params.seed,arms=params.arms,buf_dim=params.buf_dim,twirl=params.twirl,center=params.center,poi_count=params.poi_count,len_mods=params.len_mods,noise_freq=params.noise_freq,noise_weight=params.noise_weight,star_count=params.star_count,max_zoom=params.max_zoom
for(var ii=0;ii<noise.length;++ii)noise[ii]=new SimplexNoise(seed+"n"+ii)
rand.reseed(seed)
var arm_len=new Array(len_mods)
for(var _ii=0;_ii<arm_len.length;++_ii)arm_len[_ii]=rand.random()
var data=new Float32Array(buf_dim*buf_dim)
for(var idx=0,yy=0;yy<buf_dim;++yy){var _y=yy/buf_dim*2-1
for(var xx=0;xx<buf_dim;++xx,++idx){var _x=xx/buf_dim*2-1
var d=sqrt(_x*_x+_y*_y)
var rawd=d
var theta=atan2(_x,_y)
var rawtheta=theta
var dense=(theta+=d*twirl)/(2*PI)
while(dense<0)dense+=1
var armidx=2*dense%1*arm_len.length
var armi=floor(armidx)
d*=1+lerp(easeInOut(armidx-armi,2),arm_len[armi],arm_len[(armi+1)%arm_len.length])
dense*=arms
dense=abs(2*(dense%=1)-1)
dense*=dense
var invd=max(0,1-d)
var id2=max(0,min(1,2*invd))
if(0===id2)dense=0
else dense=max(0,min(1,dense/id2-(1/id2-1)))
dense=easeOut(dense,2)
var v=void 0
v=dense=lerp(min(d,1),invd,dense)
var cv=clamp(20*(center-rawd),0,1)
v+=easeInOut(cv,2)
var noise_v1=.5*noise[0].noise2D(rawd*noise_freq,theta*d)+.5
var theta_rot=(rawtheta+2*PI)%(2*PI)+d*twirl
var noise_v2=.5*noise[0].noise2D(rawd*noise_freq,theta_rot*d)+.5
var noise_v=lerp(abs(2*((rawtheta/(2*PI)+1)%1)-1),noise_v2,noise_v1)
noise_v=2*noise_v-1
noise_v*=lerp(clamp(10*v,0,1),.05,1)
noise_v*=lerp(clamp((v-.7)/.1,0,1),1,0)
v+=(noise_v*=lerp(clamp((rawd-.7)/.3,0,1),1,0))*noise_weight
data[idx]=max(v,0)}}var POI_BORDER=5
var pois=[]
var poi_offs=.5/pow(2,max_zoom)
for(var _ii2=0;_ii2<poi_count;++_ii2){var _x2=POI_BORDER+rand.range(buf_dim-2*POI_BORDER)
var _y2=POI_BORDER+rand.range(buf_dim-2*POI_BORDER)
var _v=rand.floatBetween(.2,1)
var _idx=_x2+_y2*buf_dim
data[_idx]=max(data[_idx],.5*_v)
_x2=_x2/buf_dim+poi_offs
_y2=_y2/buf_dim+poi_offs
var type=rand.range(POI_TYPE_OFFS.length)
pois.push({x:_x2,y:_y2,type:type,v:_v})}var sum=0
var sumsq=0
for(var _ii3=0;_ii3<data.length;++_ii3){var _v2=data[_ii3]
sum+=_v2
sumsq+=_v2*_v2}return{data:data,sum:sum,sumsq:sumsq,star_count:star_count,pois:pois}}var tex_pool=[]
var tex_id_idx=0
var Galaxy=function Galaxy(params){this.buf_dim=void 0
this.tex_total_size=void 0
this.tex_data=void 0
this.layers=void 0
this.work_frame=0
this.loading=false
this.sample_buf=void 0
this.last_sample_buf=void 0
this.stars=void 0
this.params=params
var buf_dim=this.buf_dim=params.buf_dim
var tex_total_size=this.tex_total_size=buf_dim*buf_dim
this.tex_data=new Uint8Array(4*tex_total_size)
this.layers=[]}
exports.Galaxy=Galaxy
var SAMPLE_PAD=4
var cubic_weights=function(){function cub(v){return v*v*v}function p(v){return max(0,v)}function r(x){return 1/6*(cub(p(x+2))-4*cub(p(x+1))+6*cub(p(x))-4*cub(p(x-1)))}function weight(ii,jj,dx,dy){return r(ii-dx/4)*r(jj-dy/4)}var ret=[]
for(var dy=0;dy<4;++dy){var row=[]
ret.push(row)
for(var dx=0;dx<4;++dx){var w=[]
for(var ii=-1;ii<=2;++ii)for(var jj=-1;jj<=2;++jj)w.push(weight(ii,jj,dx,dy))
row.push(w)}}return ret}()
function expandBicubic16X(data,buf_dim,xq,yq){++counts.bicubic
var sample_dim=buf_dim+2*SAMPLE_PAD
var ret=new Float32Array(buf_dim*buf_dim);++counts.data
var qs=buf_dim/4
var idx_add=(yq*qs+SAMPLE_PAD)*sample_dim+xq*qs+SAMPLE_PAD
for(var yy=0;yy<buf_dim;++yy){var y_in=floor(yy/4)
var in_idx_y=y_in*sample_dim+idx_add
var w_row=cubic_weights[yy-4*y_in]
for(var xx=0;xx<buf_dim;++xx){var x_in=floor(xx/4)
var in_idx=in_idx_y+x_in
var sum=0
var weights=w_row[xx-4*x_in]
for(var ii=-1,widx=0;ii<=2;++ii)for(var jj=-1;jj<=2;++jj,++widx)sum+=data[in_idx+ii+jj*sample_dim]*weights[widx]
ret[xx+yy*buf_dim]=sum}}return ret}Galaxy.prototype.getSampleBuf=function(layer_idx,cx,cy){var sample_buf=this.sample_buf,buf_dim=this.buf_dim
var key=[layer_idx,cx,cy].join()
if(this.last_sample_buf===key)return sample_buf
var layer_res=pow(LAYER_STEP,layer_idx)
var sample_dim=buf_dim+2*SAMPLE_PAD
if(!sample_buf)sample_buf=this.sample_buf=new Float32Array(sample_dim*sample_dim)
var bufs=[]
for(var dy=-1;dy<=1;++dy){var py=cy+dy
bufs[dy]=[]
for(var dx=-1;dx<=1;++dx){var px=cx+dx
var buf=void 0
if(px<0||px>=layer_res||py<0||py>=layer_res)buf=null
else{var _cell=this.getCell(layer_idx,px+py*layer_res)
if(!_cell.ready)return null
buf=_cell.data
assert(buf)}bufs[dy][dx]=buf}}if(engine.frame_index===this.work_frame&&!this.loading)return null;++counts.getSampleBuf
for(var _dy=-1;_dy<=1;++_dy)for(var _dx=-1;_dx<=1;++_dx){var _buf=bufs[_dy][_dx]
var ox=SAMPLE_PAD+_dx*buf_dim
var oy=SAMPLE_PAD+_dy*buf_dim
var x0=max(0,-ox)
var y0=max(0,-oy)
var x1=min(buf_dim,sample_dim-ox)
var y1=min(buf_dim,sample_dim-oy)
for(var xx=x0;xx<x1;++xx)for(var yy=y0;yy<y1;++yy)sample_buf[ox+xx+(oy+yy)*sample_dim]=_buf?_buf[xx+yy*buf_dim]:0}this.last_sample_buf=key
return sample_buf}
var STAR_QUOTA=14
var realize_scratch_buf
var realize_scratch_buf_size=0
Galaxy.prototype.realizeStars=function(cell){var start=Date.now()
var layer_idx=cell.layer_idx,cell_idx=cell.cell_idx,star_count=cell.star_count,data=cell.data,sum=cell.sum,sumsq=cell.sumsq,x0=cell.x0,y0=cell.y0,w=cell.w,pois=cell.pois,star_progress=cell.star_progress,star_storage=cell.star_storage
assert(void 0!==star_count)
assert(void 0!==sum)
assert(void 0!==sumsq)
assert(pois)
var scale=star_count/lerp(SUMSQ,sum,sumsq)*1.03
assert.equal(layer_idx,STAR_LAYER)
var buf_dim=this.buf_dim
var seed=this.params.seed
var yy0
var out_idx;++counts.realizeStars
if(!star_progress){assert(star_count>=pois.length)
rand.reseed(mashString(seed+"_"+layer_idx+"_"+cell_idx))
star_storage=cell.star_storage=new Float64Array(2*star_count)
cell.star_storage_start=0
out_idx=yy0=0}else{if(star_progress.state)rand.importState(star_progress.state)
yy0=star_progress.y
out_idx=star_progress.out
assert(star_storage)}function addStarSub(x,y){assert(star_storage)
assert(pois);++counts.star
var idx
if(out_idx===star_count)idx=rand.range(star_count-pois.length)+pois.length
else idx=out_idx++
star_storage[2*idx]=x
star_storage[2*idx+1]=y
var xfloat=star_storage[2*idx]
var yfloat=star_storage[2*idx+1]
assert(xfloat>=cell.x0)
assert(xfloat<cell.x0+w)
assert(yfloat>=cell.y0)
assert(yfloat<cell.y0+w)}function addStar(xx,yy){addStarSub(x0+xx/buf_dim*w,y0+yy/buf_dim*w)}if(star_count){assert(data)
var expire=start+STAR_QUOTA
if(0===out_idx)for(var ii=0;ii<pois.length;++ii){var poi=pois[ii]
addStarSub(poi.x,poi.y)}for(var idx=yy0*buf_dim,yy=yy0;yy<buf_dim;++yy){for(var xx=0;xx<buf_dim;++xx,++idx){var v=data[idx]
var expected_stars=(v*=1+SUMSQ*(v-1))*scale
var actual_stars=floor(rand.random()*(expected_stars+1)+.5*expected_stars)
for(var _ii4=0;_ii4<actual_stars;++_ii4)addStar(xx+rand.random(),yy+rand.random())}if(Date.now()>expire&&yy!==buf_dim-1&&!this.loading){cell.star_progress={y:yy+1,state:rand.exportState(),out:out_idx}
return false}}while(out_idx<star_count)addStar(rand.floatBetween(0,buf_dim),rand.floatBetween(0,buf_dim))
assert.equal(out_idx,star_count)
var temp=new Array(star_count)
for(var _ii5=0;_ii5<star_count;++_ii5)temp[_ii5]=2*_ii5
var mod0=w/LAYER_STEP
temp.sort(function(ai,bi){assert(star_storage)
var ax=star_storage[ai]
var ay=star_storage[ai+1]
var bx=star_storage[bi]
var by=star_storage[bi+1]
var mod=mod0
var layer=layer_idx
while(true){if(layer===MAX_LAYER+1)return 0
var ayi=floor(ay/mod)
var byi=floor(by/mod)
if(ayi!==byi)return ayi-byi
var axi=floor(ax/mod)
var bxi=floor(bx/mod)
if(axi!==bxi)return axi-bxi
mod/=LAYER_STEP;++layer}})
if(star_count>realize_scratch_buf_size){realize_scratch_buf_size=ceil(1.25*star_count)
realize_scratch_buf=new Float64Array(2*realize_scratch_buf_size)}for(var _ii6=0;_ii6<star_count;++_ii6){var _idx2=temp[_ii6]
realize_scratch_buf[2*_ii6]=star_storage[_idx2]
realize_scratch_buf[2*_ii6+1]=star_storage[_idx2+1]
var _x3=realize_scratch_buf[2*_ii6]
var _y3=realize_scratch_buf[2*_ii6+1]
assert(_x3>=cell.x0)
assert(_x3<cell.x0+w)
assert(_y3>=cell.y0)
assert(_y3<cell.y0+w)}for(var _ii7=0;_ii7<2*star_count;++_ii7)star_storage[_ii7]=realize_scratch_buf[_ii7]}delete cell.star_progress;++counts.realizeStarsFinish
return true}
function hash(x){return x=((x=73244475*((x=73244475*(x>>>16^x)>>>0)>>>16^x)>>>0)>>>16^x)>>>0}function starValueFromID(id){return.75*(.5+hash(id)/4294967295)}function starVisTypeFromID(id){return(32767&hash(id))/32768*POI_TYPE_OFFS.length|0}var blur_weights=[1/16,1/8,1/16,1/8,.25,1/8,1/16,1/8,1/16]
Galaxy.prototype.renderStars=function(cell){var layer_idx=cell.layer_idx,x0=cell.x0,y0=cell.y0,w=cell.w,cx=cell.cx,cy=cell.cy
var buf_dim=this.buf_dim
var scale=buf_dim/w
var layer_res=pow(LAYER_STEP,layer_idx)
var ndata=[]
var nhue=[]
for(var yy=-1;yy<=1;++yy){var ncy=cy+yy
for(var xx=-1;xx<=1;++xx){var ncx=cx+xx
var n=void 0
if(ncy<0||ncy>=layer_res||ncx<0||ncx>=layer_res)n=cell
else n=this.getCellJustAlloc(layer_idx,ncx+ncy*layer_res)
assert(!n.tex)
if(!n.star_buf)if(star_buf_pool.length){n.star_buf=star_buf_pool.pop()
n.star_buf.fill(0)}else{n.star_buf=new Float32Array(buf_dim*buf_dim);++counts.star_buf}ndata.push(n.star_buf)
if(!n.hue_buf)if(hue_buf_pool.length){n.hue_buf=hue_buf_pool.pop()
n.hue_buf.fill(0)}else{n.hue_buf=new Uint8Array(buf_dim*buf_dim);++counts.hue_buf}nhue.push(n.hue_buf)}}assert(ndata[4]===cell.star_buf);++counts.renderStars
var weights=[]
var xpos=[]
var ypos=[]
var star_count=cell.star_count,star_storage=cell.star_storage,star_storage_start=cell.star_storage_start,star_idx=cell.star_idx
assert(star_storage)
assert(void 0!==star_storage_start)
assert(void 0!==star_count)
assert(void 0!==star_idx)
var store_idx=2*star_storage_start
for(var ii=0;ii<star_count;++ii){var _x4=star_storage[store_idx++]
var _y4=star_storage[store_idx++]
var id=star_idx+ii
var v=starValueFromID(id)
_x4=(_x4-x0)*scale
_y4=(_y4-y0)*scale
if(7===layer_idx||6===layer_idx){var hue=hueFromID(id)
var r=7===layer_idx?2:1.5
var vscale=7===layer_idx?4:2
var rsq=r*r
var wtot=0
var widx=0
var ix=floor(_x4)
var iy=floor(_y4)
if(7===layer_idx)for(yy=floor(-r);yy<=ceil(r);++yy){var dy=iy+yy-_y4+.5
if(abs(dy)>=r)continue
for(xx=floor(-r);xx<=ceil(r);++xx){var dx=ix+xx-_x4+.5
var dsq=dx*dx+dy*dy
if(dsq>=rsq)continue
var d=sqrt(dsq)
var wt=(1-d/r)*(1-d/r)
wtot+=wt
weights[widx]=wt
xpos[widx]=ix+xx
ypos[widx++]=iy+yy}}else if(6===layer_idx){weights=blur_weights
for(var _yy=-(wtot=1);_yy<=1;++_yy)for(var _xx=-1;_xx<=1;++_xx){xpos[widx]=ix+_xx
ypos[widx++]=iy+_yy}}for(var jj=0;jj<widx;++jj){var _wt=weights[jj]
var _xx2=xpos[jj]
var _yy2=ypos[jj]
var nid=4
if(_xx2<0){nid--
_xx2+=buf_dim}else if(_xx2>=buf_dim){nid++
_xx2-=buf_dim}if(_yy2<0){nid-=3
_yy2+=buf_dim}else if(_yy2>=buf_dim){nid+=3
_yy2-=buf_dim}var data=ndata[nid]
var hue_buf=nhue[nid]
var idx=_xx2+_yy2*buf_dim
var old_w=data[idx]
var new_w=_wt/wtot
data[idx]+=v*vscale*new_w
hue_buf[idx]=round((old_w*hue_buf[idx]+hue*new_w)/(new_w+old_w))}}}return true}
Galaxy.prototype.assignChildStars=function(cell){var buf_dim=this.buf_dim
var pois=cell.pois,star_count=cell.star_count,sum=cell.sum,sumsq=cell.sumsq,data=cell.data,star_idx=cell.star_idx,star_storage=cell.star_storage,star_storage_start=cell.star_storage_start
var child_data=[]
for(var ii=0;ii<LAYER_STEP*LAYER_STEP;++ii)child_data.push({pois:[]})
assert(pois)
assert(void 0!==star_count)
if(!star_storage){assert(void 0!==sumsq)
assert(void 0!==star_idx)
assert(data)
var qs=buf_dim/LAYER_STEP
var running_sum=0
var running_sumsq=0
var last_star_count=0
for(var idx=0,yy=0;yy<LAYER_STEP;++yy)for(var xx=0;xx<LAYER_STEP;++xx,++idx){if(sum){var idxbase=xx*qs+yy*qs*buf_dim
for(var jj=0;jj<qs;++jj){var idx_in=idxbase+jj*buf_dim
for(var _ii8=0;_ii8<qs;++_ii8,++idx_in){var v=data[idx_in]
running_sum+=v
running_sumsq+=v*v}}}var sc=sum?round(lerp(SUMSQ,running_sum/sum,running_sumsq/sumsq)*star_count):0
child_data[idx].star_count=sc-last_star_count
child_data[idx].star_idx=star_idx+last_star_count
last_star_count=sc}assert.equal(last_star_count,star_count)}var mul=LAYER_STEP/cell.w
for(var _ii9=0;_ii9<pois.length;++_ii9){var poi=pois[_ii9]
var qx=floor((poi.x-cell.x0)*mul)
var qy=floor((poi.y-cell.y0)*mul)
assert(qx>=0&&qx<LAYER_STEP)
assert(qy>=0&&qy<LAYER_STEP)
child_data[qy*LAYER_STEP+qx].pois.push(poi)}if(star_storage){assert(void 0!==star_storage_start)
var child_idx=0
var last_start=star_storage_start
var end=star_storage_start+star_count
for(var _ii10=star_storage_start;_ii10<end;++_ii10){var _x5=star_storage[2*_ii10]
var _y5=star_storage[2*_ii10+1]
var _qx=floor((_x5-cell.x0)*mul)
var _qy=floor((_y5-cell.y0)*mul)
assert(_qx>=0&&_qx<LAYER_STEP)
assert(_qy>=0&&_qy<LAYER_STEP)
var _idx4=_qy*LAYER_STEP+_qx
assert(_idx4>=child_idx)
while(child_idx<_idx4){child_data[child_idx].store_start=last_start
child_data[child_idx++].store_count=_ii10-last_start
last_start=_ii10}}while(child_idx<LAYER_STEP*LAYER_STEP){child_data[child_idx].store_start=last_start
child_data[child_idx++].store_count=end-last_start
last_start=end}}cell.child_data=child_data;++counts.assignChildStars}
Galaxy.prototype.perturb=function(cell,params){var buf_dim=this.buf_dim
var noise_freq=params.noise_freq,noise_weight=params.noise_weight
var data=cell.data,x0=cell.x0,y0=cell.y0,w=cell.w
assert(data)
var mul=w/buf_dim
for(var idx=0,yy=0;yy<buf_dim;++yy){var world_y=y0+yy*mul
for(var xx=0;xx<buf_dim;++xx,++idx){var world_x=x0+xx*mul
var noisev=noise[1].noise2D(world_x*noise_freq,world_y*noise_freq)
var v=data[idx]*(1+noise_weight*(.5*noisev-.5))
v=max(0,v)
data[idx]=v}}++counts.perturb}
Galaxy.prototype.getCellJustAlloc=function(layer_idx,cell_idx){return this.getCellInternal(layer_idx,cell_idx,true)}
Galaxy.prototype.getCell=function(layer_idx,cell_idx){return this.getCellInternal(layer_idx,cell_idx,false)}
Galaxy.prototype.getCellInternal=function(layer_idx,cell_idx,just_alloc){if(layer_idx>MAX_LAYER)return{}
var layers=this.layers,buf_dim=this.buf_dim,params=this.params
var layer=layers[layer_idx]
if(!layer)layer=layers[layer_idx]=[]
var cell=layer[cell_idx]
if(cell&&cell.ready)return cell
var layer_res=pow(LAYER_STEP,layer_idx)
var cx=cell_idx%layer_res
var cy=floor(cell_idx/layer_res)
var x0=cx/layer_res
var y0=cy/layer_res
var w=1/layer_res
if(!cell){++counts.cell
layer[cell_idx]=cell={x0:x0,y0:y0,w:w,h:w,layer_idx:layer_idx,cell_idx:cell_idx,cx:cx,cy:cy,ready:false,data:null,star_buf:null,hue_buf:null,tex:null}}if(just_alloc)return cell
if(0===layer_idx){assert(0===cell_idx)
var ret=genGalaxy(params)
cell.sum=ret.sum
cell.sumsq=ret.sumsq
cell.data=ret.data
cell.star_count=ret.star_count
cell.star_idx=0
cell.stars_ready=true
cell.pois=ret.pois}else{var px=floor(cx/LAYER_STEP)
var py=floor(cy/LAYER_STEP)
var pres=pow(LAYER_STEP,layer_idx-1)
var parent=this.getCell(layer_idx-1,py*pres+px)
if(!parent.ready)return cell
if(engine.frame_index===this.work_frame&&!this.loading)return cell
var qx=cx-px*LAYER_STEP
var qy=cy-py*LAYER_STEP
var qidx=qx+qy*LAYER_STEP
if(!cell.pois){assert(parent.child_data)
cell.pois=parent.child_data[qidx].pois}if(!cell.data)if(layer_idx>STAR_LAYER)cell.data=null
else{var sample_buf=this.getSampleBuf(layer_idx-1,px,py)
if(!sample_buf)return cell
this.work_frame=engine.frame_index
var data=cell.data=expandBicubic16X(sample_buf,buf_dim,qx,qy)
var key="layer"+layer_idx
if(params[key])this.perturb(cell,params[key])
var sum=0
var sumsq=0
for(var ii=0;ii<data.length;++ii){var v=data[ii]
sum+=v
sumsq+=v*v}cell.sum=sum
cell.sumsq=sumsq}if(!cell.stars_ready){assert(parent.child_data)
if(parent.star_storage){assert(void 0!==parent.star_idx)
assert(void 0!==parent.star_storage_start)
cell.star_storage=parent.star_storage
cell.star_storage_start=parent.child_data[qidx].store_start
assert(void 0!==cell.star_storage_start)
cell.star_count=parent.child_data[qidx].store_count
cell.star_idx=parent.star_idx+(cell.star_storage_start-parent.star_storage_start)}else{cell.star_count=parent.child_data[qidx].star_count
cell.star_idx=parent.child_data[qidx].star_idx
this.work_frame=engine.frame_index
if(layer_idx===STAR_LAYER)if(!this.realizeStars(cell))return cell}cell.stars_ready=true}if(layer_idx>=STAR_LAYER)if(!this.renderStars(cell))return cell}this.assignChildStars(cell)
cell.ready=true
return cell}
var debug_pix=[[0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,0,0,1,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,1,0,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,0],[0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,1,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,0],[0,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0],[0,0,0,0,0,0,1,1,1,0,0,1,0,0,0,0,1,1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,1,1,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,0,0],[0,0,0,0,0,0,1,1,1,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0],[0,0,0,0,0,0,1,1,1,0,0,1,0,1,0,0,1,1,1,0,0,1,0,1,0,0,1,1,1,0,0,0,0,0,0]]
Galaxy.prototype.getCellTextured=function(layer_idx,cell_idx){var buf_dim=this.buf_dim,tex_data=this.tex_data,tex_total_size=this.tex_total_size
var cell=this.getCell(layer_idx,cell_idx)
if(cell.tex)return cell
var data=cell.data,pois=cell.pois,x0=cell.x0,y0=cell.y0,w=cell.w,ready=cell.ready,cx=cell.cx,cy=cell.cy
if(!ready)return cell
assert(pois)
var layer_res=pow(LAYER_STEP,layer_idx)
if(layer_idx>=STAR_LAYER){data=cell.star_buf
for(var yy=-1;yy<=1;++yy){var ny=cy+yy
if(ny<0||ny>=layer_res)continue
for(var xx=-1;xx<=1;++xx){var nx=cx+xx
if(!nx&&!ny||nx<0||nx>=layer_res)continue
if(!this.getCell(layer_idx,nx+ny*layer_res).ready)return cell}}}++counts.getCellTextured
assert(data)
if(layer_res===pow(2,this.params.max_zoom)){for(var ii=0;ii<tex_total_size;++ii){tex_data[4*ii+0]=0
tex_data[4*ii+1]=0
tex_data[4*ii+2]=0
tex_data[4*ii+3]=255}var star_storage=cell.star_storage,star_count=cell.star_count,star_storage_start=cell.star_storage_start,star_idx=cell.star_idx
assert(star_storage)
assert(void 0!==star_storage_start)
assert(void 0!==star_count)
assert(void 0!==star_idx)
var store_idx=2*star_storage_start
for(var _ii11=0;_ii11<star_count;++_ii11){var _x6=star_storage[store_idx++]
var _y6=star_storage[store_idx++]
var id=star_idx+_ii11
var type=starVisTypeFromID(id)
var v=starValueFromID(id)
var hue=hueFromID(id)
_x6=floor((_x6-x0)/w*buf_dim)
_y6=floor((_y6-y0)/w*buf_dim)
var idx=4*((_x6=max(2,min(buf_dim-2-1,_x6)))+(_y6=max(2,min(buf_dim-2-1,_y6)))*buf_dim)
var offs=POI_TYPE_OFFS[type]
for(var jj=0;jj<offs.length;jj+=3){var v2=clamp(floor(v*offs[jj]*255),0,255)
var dx=offs[jj+1]
var dy=offs[jj+2]
var _xx3=_x6+dx
var _yy3=_y6+dy
if(_xx3<0||_xx3>=buf_dim||_yy3<0||_yy3>=buf_dim)continue
var d=4*(dx+dy*buf_dim)
tex_data[idx+d]=max(tex_data[idx+d],v2)
tex_data[idx+d+1]=max(tex_data[idx+d+1],hue)}}}else{var hue_buf=cell.hue_buf
for(var _ii12=0;_ii12<tex_total_size;++_ii12){var _d=data[_ii12]
tex_data[4*_ii12+0]=clamp(floor(255*_d),0,255)
tex_data[4*_ii12+1]=hue_buf?hue_buf[_ii12]:0
tex_data[4*_ii12+3]=255}for(var _ii13=0;_ii13<pois.length;++_ii13){var poi=pois[_ii13]
var _x7=poi.x,_y7=poi.y,_type=poi.type,_v3=poi.v
var _idx5=4*((_x7=floor((_x7-x0)/w*buf_dim))+(_y7=floor((_y7-y0)/w*buf_dim))*buf_dim)
var _offs=POI_TYPE_OFFS[_type]
for(var _jj=0;_jj<_offs.length;_jj+=3){var _v4=clamp(floor(_v3*_offs[_jj]*255),0,255)
var _dx2=_offs[_jj+1]
var _dy2=_offs[_jj+2]
var _xx4=_x7+_dx2
var _yy4=_y7+_dy2
if(_xx4<0||_xx4>=buf_dim||_yy4<0||_yy4>=buf_dim)continue
var _d2=4*(_dx2+_dy2*buf_dim)
tex_data[_idx5+_d2+0]=max(tex_data[_idx5+_d2+0],_v4)
tex_data[_idx5+_d2+1]=max(tex_data[_idx5+_d2+1],0)}}}if(engine.DEBUG&&false){var dbg=debug_pix[layer_idx]
if(dbg)for(var _idx6=0,_yy5=0;_yy5<7;++_yy5)for(var _xx5=0;_xx5<5;++_xx5,++_idx6){var idx2=4*(_yy5*buf_dim+_xx5)
for(var _ii14=0;_ii14<3;++_ii14)tex_data[idx2+_ii14]=dbg[_idx6]?255:0}}if(tex_pool.length){cell.tex=tex_pool.pop()
cell.tex.updateData(buf_dim,buf_dim,tex_data)}else{++counts.tex
cell.tex=textureLoad({name:"galaxy_"+ ++tex_id_idx,format:TEXTURE_FORMAT.RGBA8,width:buf_dim,height:buf_dim,data:tex_data,filter_min:gl.NEAREST,filter_mag:gl.NEAREST,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})}if(cell.star_buf){star_buf_pool.push(cell.star_buf)
cell.star_buf=null}if(cell.hue_buf){hue_buf_pool.push(cell.hue_buf)
cell.hue_buf=null}return cell}
function distSq(x1,y1,x2,y2){var dx=x2-x1
var dy=y2-y1
return dx*dx+dy*dy}var dy=[0,1,-1]
var dx=[0,1,-1]
Galaxy.prototype.starsNear=function(x,y,num){var layers=this.layers
var layer_idx=MAX_LAYER-1
var layer=layers[layer_idx]
if(!layer)return[]
var layer_res=pow(LAYER_STEP,layer_idx)
var cx=floor(x*layer_res)
var cy=floor(y*layer_res)
var closest=new Array(2*num)
for(var ddy=0;ddy<=3;++ddy){var yy=cy+dy[ddy]
if(yy<0||yy>=layer_res)continue
for(var ddx=0;ddx<=3;++ddx){var xx=cx+dx[ddx]
if(xx<0||xx>=layer_res)continue
var _cell2=layer[yy*layer_res+xx]
if(!_cell2||!_cell2.star_storage)continue
var star_storage=_cell2.star_storage,star_storage_start=_cell2.star_storage_start,star_count=_cell2.star_count,star_idx=_cell2.star_idx
assert(star_storage)
assert(void 0!==star_storage_start)
assert(void 0!==star_count)
assert(void 0!==star_idx)
var store_idx=2*star_storage_start
for(var ii=0;ii<star_count;++ii){var _star_id=star_idx+ii
var star_dist=distSq(x,y,star_storage[store_idx++],star_storage[store_idx++])
for(var jj=0;jj<closest.length;jj+=2){var other_id=closest[jj+1]
if(void 0===other_id){closest[jj]=star_dist
closest[jj+1]=_star_id
break}var other_dist=closest[jj]
if(star_dist<other_dist){closest[jj]=star_dist
closest[jj+1]=_star_id
star_dist=other_dist
_star_id=other_id}}}}}var ret=[]
for(var _ii15=1;_ii15<closest.length;_ii15+=2){var id=closest[_ii15]
if(void 0!==id)ret.push(id)}return ret}
Galaxy.prototype.getStar=function(star_id){var layers=this.layers,stars=this.stars
if(!stars)this.stars=stars={}
var existing=stars[star_id]
if(existing)return existing
function search(layer_idx,cx,cy){var cell=layers[layer_idx][cx+cy*pow(LAYER_STEP,layer_idx)]
if(!cell||!cell.stars_ready)return null
assert(void 0!==cell.star_idx)
assert(void 0!==cell.star_count)
assert(star_id>=cell.star_idx)
if(layer_idx===STAR_LAYER){var star_storage=cell.star_storage,star_storage_start=cell.star_storage_start
if(!star_storage)return null
assert(void 0!==star_storage_start)
var idx=star_id-cell.star_idx
assert(idx<cell.star_count)
var store_idx=2*(star_storage_start+idx)
var _star={x:star_storage[store_idx++],y:star_storage[store_idx++],id:star_id}
return stars[star_id]=_star}if(!cell.child_data)return null
for(var qidx=0;qidx<cell.child_data.length;++qidx){var cd=cell.child_data[qidx]
if(star_id<cd.star_idx+cd.star_count){var qx=qidx%LAYER_STEP
return search(layer_idx+1,cx*LAYER_STEP+qx,cy*LAYER_STEP+(qidx-qx)/LAYER_STEP)}}assert(false)
return null}return search(0,0,0)}
Galaxy.prototype.getStarData=function(star){if(!star.solar_system)star.solar_system=solarSystemCreate(this.params.seed,star)}
Galaxy.prototype.dispose=function(){var layers=this.layers
for(var ii=0;ii<layers.length;++ii){var layer=layers[ii]
for(var key in layer){var _cell3=layer[key]
if(_cell3.tex){tex_pool.push(_cell3.tex)
_cell3.tex=null}}}}
var debug_buf=JSON.stringify(counts,void 0,2)
setInterval(function(){var buf=JSON.stringify(counts,void 0,2)
if(debug_buf!==buf){debug_buf=buf
console.log(buf)}},5e3)
function createGalaxy(params){return new Galaxy(params)}

},{"../glov/client/engine":21,"../glov/client/textures":70,"../glov/common/rand_alea":93,"../glov/common/util":96,"./solar_system":8,"./star_types":9,"assert":undefined,"simplex-noise":undefined}],4:[function(require,module,exports){
module.exports={"font_size":8,"imageW":128,"imageH":128,"spread":2,"noFilter":1,"channels":1,"char_infos":[{"c":2,"x0":2,"y0":2,"xpad":1,"w":5,"h":8},{"c":32,"xpad":4},{"c":33,"x0":102,"y0":2,"yoffs":1,"xpad":1,"w":1,"h":5},{"c":34,"x0":97,"y0":62,"yoffs":1,"xpad":1,"w":3,"h":2},{"c":35,"x0":108,"y0":2,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":36,"x0":48,"y0":2,"yoffs":1,"xpad":1,"w":4,"h":6},{"c":37,"x0":118,"y0":2,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":38,"x0":2,"y0":15,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":39,"x0":105,"y0":62,"yoffs":1,"xpad":1,"w":1,"h":2},{"c":40,"x0":12,"y0":14,"yoffs":1,"xpad":1,"w":2,"h":5},{"c":41,"x0":19,"y0":14,"yoffs":1,"xpad":1,"w":2,"h":5},{"c":42,"x0":57,"y0":63,"yoffs":1,"xpad":1,"w":3,"h":3},{"c":43,"x0":65,"y0":63,"yoffs":2,"xpad":1,"w":3,"h":3},{"c":44,"x0":111,"y0":62,"yoffs":5,"xpad":1,"w":2,"h":2},{"c":45,"x0":18,"y0":74,"yoffs":3,"xpad":1,"w":3,"h":1},{"c":46,"x0":26,"y0":74,"yoffs":5,"xpad":1,"w":1,"h":1},{"c":47,"x0":26,"y0":14,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":48,"x0":36,"y0":14,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":49,"x0":45,"y0":14,"yoffs":1,"xpad":1,"w":2,"h":5},{"c":50,"x0":52,"y0":13,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":51,"x0":61,"y0":13,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":52,"x0":70,"y0":13,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":53,"x0":79,"y0":13,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":54,"x0":88,"y0":13,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":55,"x0":97,"y0":13,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":56,"x0":106,"y0":12,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":57,"x0":115,"y0":12,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":58,"x0":73,"y0":62,"yoffs":2,"xpad":1,"w":1,"h":3},{"c":59,"x0":51,"y0":54,"yoffs":2,"xpad":1,"w":1,"h":4},{"c":60,"x0":2,"y0":25,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":61,"x0":79,"y0":62,"yoffs":2,"xpad":1,"w":3,"h":3},{"c":62,"x0":10,"y0":25,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":63,"x0":18,"y0":24,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":64,"x0":27,"y0":24,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":65,"x0":37,"y0":24,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":66,"x0":46,"y0":24,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":67,"x0":55,"y0":23,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":68,"x0":63,"y0":23,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":69,"x0":72,"y0":23,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":70,"x0":80,"y0":23,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":71,"x0":88,"y0":23,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":72,"x0":97,"y0":23,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":73,"x0":106,"y0":22,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":74,"x0":114,"y0":22,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":75,"x0":2,"y0":35,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":76,"x0":11,"y0":35,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":77,"x0":19,"y0":34,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":78,"x0":29,"y0":34,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":79,"x0":36,"y0":14,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":80,"x0":38,"y0":34,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":81,"x0":57,"y0":2,"yoffs":1,"xpad":1,"w":4,"h":6},{"c":82,"x0":47,"y0":34,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":83,"x0":56,"y0":33,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":84,"x0":65,"y0":33,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":85,"x0":73,"y0":33,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":86,"x0":82,"y0":33,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":87,"x0":91,"y0":33,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":88,"x0":101,"y0":33,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":89,"x0":110,"y0":32,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":90,"x0":119,"y0":32,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":91,"x0":2,"y0":45,"yoffs":1,"xpad":1,"w":2,"h":5},{"c":92,"x0":9,"y0":45,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":93,"x0":19,"y0":44,"yoffs":1,"xpad":1,"w":2,"h":5},{"c":94,"x0":118,"y0":62,"yoffs":1,"xpad":1,"w":3,"h":2},{"c":95,"x0":32,"y0":73,"yoffs":5,"xpad":1,"w":4,"h":1},{"c":96,"x0":2,"y0":74,"yoffs":1,"xpad":1,"w":2,"h":2},{"c":97,"x0":57,"y0":54,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":98,"x0":26,"y0":44,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":99,"x0":66,"y0":53,"yoffs":2,"xpad":1,"w":3,"h":4},{"c":100,"x0":35,"y0":44,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":101,"x0":74,"y0":53,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":102,"x0":44,"y0":44,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":103,"x0":66,"y0":2,"yoffs":2,"xpad":1,"w":4,"h":6},{"c":104,"x0":52,"y0":44,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":105,"x0":61,"y0":43,"yoffs":1,"xpad":1,"w":1,"h":5},{"c":106,"x0":12,"y0":2,"yoffs":1,"xpad":1,"w":2,"h":7},{"c":107,"x0":67,"y0":43,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":108,"x0":76,"y0":43,"yoffs":1,"xpad":1,"w":1,"h":5},{"c":109,"x0":83,"y0":53,"yoffs":2,"xpad":1,"w":5,"h":4},{"c":110,"x0":93,"y0":53,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":111,"x0":102,"y0":53,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":112,"x0":75,"y0":2,"yoffs":2,"xpad":1,"w":4,"h":6},{"c":113,"x0":84,"y0":2,"yoffs":2,"xpad":1,"w":4,"h":6},{"c":114,"x0":111,"y0":53,"yoffs":2,"xpad":1,"w":3,"h":4},{"c":115,"x0":119,"y0":52,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":116,"x0":82,"y0":43,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":117,"x0":2,"y0":65,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":118,"x0":11,"y0":65,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":119,"x0":20,"y0":65,"yoffs":2,"xpad":1,"w":5,"h":4},{"c":120,"x0":30,"y0":64,"yoffs":2,"xpad":1,"w":3,"h":4},{"c":121,"x0":93,"y0":2,"yoffs":2,"xpad":1,"w":4,"h":6},{"c":122,"x0":38,"y0":64,"yoffs":2,"xpad":1,"w":4,"h":4},{"c":123,"x0":90,"y0":43,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":124,"x0":76,"y0":43,"yoffs":1,"xpad":1,"w":1,"h":5},{"c":125,"x0":98,"y0":43,"yoffs":1,"xpad":1,"w":3,"h":5},{"c":126,"x0":9,"y0":74,"yoffs":1,"xpad":1,"w":4,"h":2},{"c":160,"xpad":4},{"c":181,"x0":106,"y0":43,"yoffs":2,"xpad":1,"w":4,"h":5},{"c":916,"x0":47,"y0":64,"yoffs":2,"xpad":1,"w":5,"h":4},{"c":8592,"x0":115,"y0":42,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":8593,"x0":2,"y0":55,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":8594,"x0":12,"y0":55,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":8595,"x0":22,"y0":54,"yoffs":1,"xpad":1,"w":5,"h":5},{"c":9654,"x0":32,"y0":54,"yoffs":1,"xpad":1,"w":4,"h":5},{"c":9660,"x0":87,"y0":62,"yoffs":2,"xpad":1,"w":5,"h":3},{"c":9742,"x0":19,"y0":2,"yoffs":1,"xpad":1,"w":10,"h":7},{"c":9743,"x0":34,"y0":2,"yoffs":1,"xpad":1,"w":9,"h":7},{"c":65533,"x0":41,"y0":54,"yoffs":1,"xpad":1,"w":5,"h":5}]}
},{}],5:[function(require,module,exports){
module.exports={"font_size":16,"imageW":1024,"imageH":64,"spread":2,"noFilter":1,"channels":1,"char_infos":[{"c":2,"x0":2,"y0":2,"xpad":1,"w":10,"h":16},{"c":32,"xpad":8},{"c":33,"x0":152,"y0":2,"yoffs":3,"xpad":2,"w":2,"h":10},{"c":34,"x0":187,"y0":17,"yoffs":3,"xpad":2,"w":6,"h":4},{"c":35,"x0":159,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":36,"x0":74,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":12},{"c":37,"x0":174,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":38,"x0":189,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":39,"x0":198,"y0":17,"yoffs":3,"xpad":2,"w":2,"h":4},{"c":40,"x0":204,"y0":2,"yoffs":3,"xpad":2,"w":4,"h":10},{"c":41,"x0":213,"y0":2,"yoffs":3,"xpad":2,"w":4,"h":10},{"c":42,"x0":132,"y0":19,"yoffs":3,"xpad":2,"w":6,"h":6},{"c":43,"x0":143,"y0":19,"yoffs":5,"xpad":2,"w":6,"h":6},{"c":44,"x0":205,"y0":17,"yoffs":11,"xpad":2,"w":4,"h":4},{"c":45,"x0":247,"y0":17,"yoffs":7,"xpad":2,"w":6,"h":2},{"c":46,"x0":258,"y0":17,"yoffs":11,"xpad":2,"w":2,"h":2},{"c":47,"x0":222,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":48,"x0":237,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":49,"x0":250,"y0":2,"yoffs":3,"xpad":2,"w":4,"h":10},{"c":50,"x0":259,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":51,"x0":272,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":52,"x0":285,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":53,"x0":298,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":54,"x0":311,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":55,"x0":324,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":56,"x0":337,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":57,"x0":350,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":58,"x0":154,"y0":17,"yoffs":5,"xpad":2,"w":2,"h":6},{"c":59,"x0":958,"y0":2,"yoffs":5,"xpad":2,"w":2,"h":8},{"c":60,"x0":363,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":61,"x0":161,"y0":17,"yoffs":5,"xpad":2,"w":6,"h":6},{"c":62,"x0":374,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":63,"x0":385,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":64,"x0":398,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":65,"x0":413,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":66,"x0":426,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":67,"x0":439,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":68,"x0":450,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":69,"x0":463,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":70,"x0":474,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":71,"x0":485,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":72,"x0":498,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":73,"x0":511,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":74,"x0":522,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":75,"x0":535,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":76,"x0":548,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":77,"x0":559,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":78,"x0":574,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":79,"x0":237,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":80,"x0":587,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":81,"x0":87,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":12},{"c":82,"x0":600,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":83,"x0":613,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":84,"x0":626,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":85,"x0":637,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":86,"x0":650,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":87,"x0":663,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":88,"x0":678,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":89,"x0":691,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":90,"x0":704,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":91,"x0":715,"y0":2,"yoffs":3,"xpad":2,"w":4,"h":10},{"c":92,"x0":724,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":93,"x0":739,"y0":2,"yoffs":3,"xpad":2,"w":4,"h":10},{"c":94,"x0":214,"y0":17,"yoffs":3,"xpad":2,"w":6,"h":4},{"c":95,"x0":265,"y0":17,"yoffs":11,"xpad":2,"w":8,"h":2},{"c":96,"x0":225,"y0":17,"yoffs":3,"xpad":2,"w":4,"h":4},{"c":97,"x0":965,"y0":2,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":98,"x0":748,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":99,"x0":978,"y0":2,"yoffs":5,"xpad":2,"w":6,"h":8},{"c":100,"x0":761,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":101,"x0":989,"y0":2,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":102,"x0":774,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":103,"x0":100,"y0":2,"yoffs":5,"xpad":2,"w":8,"h":12},{"c":104,"x0":785,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":105,"x0":798,"y0":2,"yoffs":3,"xpad":2,"w":2,"h":10},{"c":106,"x0":17,"y0":2,"yoffs":3,"xpad":2,"w":4,"h":14},{"c":107,"x0":805,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":108,"x0":818,"y0":2,"yoffs":3,"xpad":2,"w":2,"h":10},{"c":109,"x0":1002,"y0":2,"yoffs":5,"xpad":2,"w":10,"h":8},{"c":110,"x0":2,"y0":23,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":111,"x0":15,"y0":23,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":112,"x0":113,"y0":2,"yoffs":5,"xpad":2,"w":8,"h":12},{"c":113,"x0":126,"y0":2,"yoffs":5,"xpad":2,"w":8,"h":12},{"c":114,"x0":28,"y0":21,"yoffs":5,"xpad":2,"w":6,"h":8},{"c":115,"x0":39,"y0":21,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":116,"x0":825,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":117,"x0":52,"y0":21,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":118,"x0":65,"y0":21,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":119,"x0":78,"y0":19,"yoffs":5,"xpad":2,"w":10,"h":8},{"c":120,"x0":93,"y0":19,"yoffs":5,"xpad":2,"w":6,"h":8},{"c":121,"x0":139,"y0":2,"yoffs":5,"xpad":2,"w":8,"h":12},{"c":122,"x0":104,"y0":19,"yoffs":5,"xpad":2,"w":8,"h":8},{"c":123,"x0":836,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":124,"x0":818,"y0":2,"yoffs":3,"xpad":2,"w":2,"h":10},{"c":125,"x0":847,"y0":2,"yoffs":3,"xpad":2,"w":6,"h":10},{"c":126,"x0":234,"y0":17,"yoffs":3,"xpad":2,"w":8,"h":4},{"c":160,"xpad":8},{"c":181,"x0":858,"y0":2,"yoffs":5,"xpad":2,"w":8,"h":10},{"c":916,"x0":117,"y0":19,"yoffs":5,"xpad":2,"w":10,"h":8},{"c":8592,"x0":871,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":8593,"x0":886,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":8594,"x0":901,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":8595,"x0":916,"y0":2,"yoffs":3,"xpad":2,"w":10,"h":10},{"c":9654,"x0":931,"y0":2,"yoffs":3,"xpad":2,"w":8,"h":10},{"c":9660,"x0":172,"y0":17,"yoffs":5,"xpad":2,"w":10,"h":6},{"c":9742,"x0":26,"y0":2,"yoffs":3,"xpad":2,"w":20,"h":14},{"c":9743,"x0":51,"y0":2,"yoffs":3,"xpad":2,"w":18,"h":14},{"c":65533,"x0":944,"y0":2,"yoffs":3,"xpad":1,"w":9,"h":10}]}
},{}],6:[function(require,module,exports){
module.exports={"font_size":32,"imageW":1024,"imageH":512,"spread":8,"channels":1,"char_infos":[{"c":2,"x0":8,"y0":8,"w":21,"h":32},{"c":13},{"c":32,"xpad":7.10156},{"c":33,"x0":470,"y0":224,"yoffs":4,"xpad":1.13281,"w":6,"h":22},{"c":34,"x0":988,"y0":334,"yoffs":4,"w":10,"h":8},{"c":35,"x0":774,"y0":300,"yoffs":10,"w":16,"h":17},{"c":36,"x0":253,"y0":8,"yoffs":1,"xpad":1.32031,"w":15,"h":29},{"c":37,"x0":964,"y0":141,"yoffs":4,"xpad":0.773438,"w":26,"h":23},{"c":38,"x0":8,"y0":190,"yoffs":4,"xpad":0.570313,"w":20,"h":23},{"c":39,"x0":8,"y0":381,"yoffs":4,"w":5,"h":8},{"c":40,"x0":45,"y0":190,"yoffs":5,"w":8,"h":23},{"c":41,"x0":70,"y0":190,"yoffs":5,"xpad":0.890625,"w":7,"h":23},{"c":42,"x0":754,"y0":335,"yoffs":2,"w":11,"h":11},{"c":43,"x0":807,"y0":300,"yoffs":9,"xpad":0.414063,"w":15,"h":17},{"c":44,"x0":30,"y0":381,"yoffs":22,"w":5,"h":8},{"c":45,"x0":357,"y0":375,"yoffs":16,"w":9,"h":3},{"c":46,"x0":261,"y0":376,"yoffs":22,"w":5,"h":4},{"c":47,"x0":94,"y0":190,"yoffs":4,"w":13,"h":23},{"c":48,"x0":493,"y0":224,"yoffs":5,"xpad":0.671875,"w":17,"h":22},{"c":49,"x0":500,"y0":263,"yoffs":5,"xpad":5.67188,"w":12,"h":21},{"c":50,"x0":529,"y0":263,"yoffs":5,"xpad":1.67188,"w":16,"h":21},{"c":51,"x0":527,"y0":224,"yoffs":5,"xpad":1.67188,"w":16,"h":22},{"c":52,"x0":562,"y0":263,"yoffs":5,"xpad":0.671875,"w":17,"h":21},{"c":53,"x0":560,"y0":224,"yoffs":5,"xpad":1.67188,"w":16,"h":22},{"c":54,"x0":593,"y0":224,"yoffs":5,"xpad":0.671875,"w":17,"h":22},{"c":55,"x0":596,"y0":263,"yoffs":5,"xpad":1.67188,"w":16,"h":21},{"c":56,"x0":627,"y0":224,"yoffs":5,"xpad":0.671875,"w":17,"h":22},{"c":57,"x0":661,"y0":224,"yoffs":5,"xpad":0.671875,"w":17,"h":22},{"c":58,"x0":510,"y0":341,"yoffs":12,"w":5,"h":14},{"c":59,"x0":752,"y0":300,"yoffs":12,"w":5,"h":18},{"c":60,"x0":903,"y0":99,"yoffs":4,"w":12,"h":25},{"c":61,"x0":956,"y0":334,"yoffs":14,"w":15,"h":9},{"c":62,"x0":932,"y0":99,"yoffs":4,"w":12,"h":25},{"c":63,"x0":695,"y0":224,"yoffs":4,"xpad":0.195313,"w":12,"h":22},{"c":64,"x0":124,"y0":188,"yoffs":7,"xpad":1.21094,"w":23,"h":23},{"c":65,"x0":629,"y0":263,"yoffs":5,"w":19,"h":21},{"c":66,"x0":665,"y0":263,"yoffs":5,"xpad":0.882813,"w":18,"h":21},{"c":67,"x0":724,"y0":223,"yoffs":5,"xpad":0.945313,"w":17,"h":22},{"c":68,"x0":700,"y0":263,"yoffs":5,"xpad":1.01563,"w":20,"h":21},{"c":69,"x0":737,"y0":262,"yoffs":5,"xpad":0.617188,"w":16,"h":21},{"c":70,"x0":770,"y0":262,"yoffs":5,"w":15,"h":21},{"c":71,"x0":758,"y0":223,"yoffs":5,"xpad":1.75,"w":18,"h":22},{"c":72,"x0":802,"y0":262,"yoffs":5,"xpad":2.53906,"w":18,"h":21},{"c":73,"x0":837,"y0":262,"yoffs":5,"xpad":2.54688,"w":6,"h":21},{"c":74,"x0":793,"y0":223,"yoffs":5,"xpad":2.75781,"w":6,"h":22},{"c":75,"x0":860,"y0":262,"yoffs":5,"w":19,"h":21},{"c":76,"x0":896,"y0":262,"yoffs":5,"w":16,"h":21},{"c":77,"x0":929,"y0":262,"yoffs":5,"xpad":2.27344,"w":21,"h":21},{"c":78,"x0":967,"y0":261,"yoffs":5,"xpad":2.74219,"w":19,"h":21},{"c":79,"x0":164,"y0":186,"yoffs":4,"xpad":1.22656,"w":21,"h":23},{"c":80,"x0":8,"y0":309,"yoffs":5,"xpad":0.828125,"w":17,"h":21},{"c":81,"x0":202,"y0":186,"yoffs":4,"xpad":1.22656,"w":21,"h":23},{"c":82,"x0":42,"y0":309,"yoffs":5,"w":19,"h":21},{"c":83,"x0":240,"y0":186,"yoffs":4,"xpad":1.32031,"w":15,"h":23},{"c":84,"x0":78,"y0":309,"yoffs":5,"w":17,"h":21},{"c":85,"x0":816,"y0":223,"yoffs":5,"xpad":2.04688,"w":19,"h":22},{"c":86,"x0":112,"y0":309,"yoffs":5,"w":19,"h":21},{"c":87,"x0":148,"y0":307,"yoffs":5,"w":30,"h":21},{"c":88,"x0":852,"y0":223,"yoffs":5,"w":20,"h":22},{"c":89,"x0":195,"y0":305,"yoffs":5,"w":18,"h":21},{"c":90,"x0":230,"y0":305,"yoffs":5,"xpad":0.226563,"w":17,"h":21},{"c":91,"x0":961,"y0":99,"yoffs":4,"w":9,"h":25},{"c":92,"x0":272,"y0":186,"yoffs":4,"w":13,"h":23},{"c":93,"x0":987,"y0":99,"yoffs":4,"xpad":1.70313,"w":7,"h":25},{"c":94,"x0":52,"y0":381,"yoffs":14,"xpad":0.1875,"w":13,"h":8},{"c":95,"x0":383,"y0":375,"yoffs":23,"xpad":0.4375,"w":12,"h":3},{"c":96,"x0":162,"y0":378,"yoffs":3,"w":6,"h":6},{"c":97,"x0":839,"y0":300,"yoffs":10,"xpad":1.29688,"w":14,"h":17},{"c":98,"x0":302,"y0":184,"yoffs":4,"xpad":0.890625,"w":16,"h":23},{"c":99,"x0":870,"y0":300,"yoffs":10,"xpad":0.273438,"w":14,"h":17},{"c":100,"x0":335,"y0":184,"yoffs":4,"xpad":2.07031,"w":15,"h":23},{"c":101,"x0":901,"y0":300,"yoffs":10,"xpad":1.04688,"w":15,"h":17},{"c":102,"x0":889,"y0":223,"yoffs":4,"w":10,"h":22},{"c":103,"x0":367,"y0":184,"yoffs":10,"xpad":2.07031,"w":15,"h":23},{"c":104,"x0":916,"y0":223,"yoffs":4,"xpad":1.10156,"w":16,"h":22},{"c":105,"x0":264,"y0":305,"yoffs":5,"xpad":1.34375,"w":6,"h":21},{"c":106,"x0":114,"y0":55,"yoffs":5,"xpad":1.07031,"w":7,"h":28},{"c":107,"x0":949,"y0":222,"yoffs":4,"xpad":0.171875,"w":15,"h":22},{"c":108,"x0":981,"y0":222,"yoffs":4,"xpad":1.46875,"w":6,"h":22},{"c":109,"x0":159,"y0":345,"yoffs":10,"xpad":1.14063,"w":25,"h":16},{"c":110,"x0":201,"y0":343,"yoffs":10,"xpad":2.03906,"w":15,"h":16},{"c":111,"x0":933,"y0":300,"yoffs":10,"xpad":0.828125,"w":16,"h":17},{"c":112,"x0":399,"y0":184,"yoffs":10,"xpad":0.890625,"w":16,"h":23},{"c":113,"x0":432,"y0":184,"yoffs":10,"xpad":2.07031,"w":15,"h":23},{"c":114,"x0":293,"y0":343,"yoffs":11,"xpad":0.203125,"w":10,"h":15},{"c":115,"x0":966,"y0":300,"yoffs":10,"xpad":0.28125,"w":13,"h":17},{"c":116,"x0":654,"y0":301,"yoffs":7,"xpad":0.234375,"w":10,"h":20},{"c":117,"x0":233,"y0":343,"yoffs":11,"xpad":1.64844,"w":15,"h":16},{"c":118,"x0":320,"y0":343,"yoffs":11,"w":15,"h":15},{"c":119,"x0":352,"y0":343,"yoffs":11,"w":23,"h":15},{"c":120,"x0":392,"y0":341,"yoffs":11,"w":16,"h":15},{"c":121,"x0":8,"y0":270,"yoffs":11,"w":15,"h":22},{"c":122,"x0":425,"y0":341,"yoffs":11,"xpad":0.851563,"w":13,"h":15},{"c":123,"x0":40,"y0":270,"yoffs":6,"w":9,"h":22},{"c":124,"x0":46,"y0":8,"w":7,"h":32},{"c":125,"x0":66,"y0":270,"yoffs":6,"xpad":0.460938,"w":8,"h":22},{"c":126,"x0":232,"y0":376,"yoffs":16,"xpad":0.3125,"w":12,"h":5},{"c":144,"x0":82,"y0":381,"yoffs":-5,"w":14,"h":8},{"c":160,"xpad":7.10156},{"c":161,"x0":91,"y0":270,"yoffs":4,"xpad":1.13281,"w":6,"h":22},{"c":162,"x0":464,"y0":184,"yoffs":7,"xpad":0.273438,"w":14,"h":23},{"c":163,"x0":287,"y0":305,"yoffs":5,"xpad":0.304688,"w":14,"h":21},{"c":164,"x0":681,"y0":301,"yoffs":9,"xpad":0.328125,"w":20,"h":20},{"c":165,"x0":318,"y0":305,"yoffs":5,"w":18,"h":21},{"c":166,"x0":495,"y0":184,"yoffs":4,"xpad":2.10156,"w":6,"h":23},{"c":167,"x0":138,"y0":55,"yoffs":2,"xpad":1.25,"w":17,"h":28},{"c":168,"x0":283,"y0":376,"yoffs":4,"xpad":0.453125,"w":9,"h":4},{"c":169,"x0":518,"y0":184,"yoffs":4,"xpad":0.625,"w":25,"h":23},{"c":170,"x0":660,"y0":338,"yoffs":4,"xpad":0.296875,"w":10,"h":12},{"c":171,"x0":782,"y0":334,"yoffs":13,"xpad":0.140625,"w":11,"h":11},{"c":172,"x0":838,"y0":334,"yoffs":13,"xpad":0.382813,"w":15,"h":10},{"c":173,"xpad":3.94531},{"c":174,"x0":353,"y0":303,"yoffs":1,"xpad":0.3125,"w":22,"h":21},{"c":175,"x0":309,"y0":375,"yoffs":4,"w":9,"h":4},{"c":176,"x0":137,"y0":381,"yoffs":4,"w":8,"h":7},{"c":177,"x0":996,"y0":299,"yoffs":9,"w":14,"h":17},{"c":178,"x0":532,"y0":339,"yoffs":2,"xpad":0.890625,"w":11,"h":14},{"c":179,"x0":265,"y0":343,"yoffs":2,"xpad":1.52344,"w":11,"h":16},{"c":180,"x0":185,"y0":378,"yoffs":3,"w":6,"h":6},{"c":181,"x0":114,"y0":270,"yoffs":11,"xpad":1.85938,"w":15,"h":22},{"c":182,"x0":392,"y0":303,"yoffs":5,"xpad":0.5,"w":26,"h":21},{"c":183,"x0":335,"y0":375,"yoffs":16,"w":5,"h":4},{"c":184,"x0":113,"y0":381,"yoffs":25,"xpad":0.0703125,"w":7,"h":8},{"c":185,"x0":560,"y0":339,"yoffs":2,"xpad":0.6875,"w":10,"h":14},{"c":186,"x0":687,"y0":338,"yoffs":4,"xpad":0.625,"w":11,"h":12},{"c":187,"x0":810,"y0":334,"yoffs":13,"xpad":0.140625,"w":11,"h":11},{"c":188,"x0":285,"y0":8,"yoffs":2,"xpad":0.0546875,"w":25,"h":29},{"c":189,"x0":172,"y0":55,"yoffs":2,"xpad":1.22656,"w":25,"h":28},{"c":190,"x0":327,"y0":8,"yoffs":2,"xpad":0.109375,"w":26,"h":29},{"c":191,"x0":146,"y0":268,"yoffs":6,"xpad":0.09375,"w":13,"h":22},{"c":192,"x0":214,"y0":55,"yoffs":-2,"w":19,"h":28},{"c":193,"x0":250,"y0":55,"yoffs":-2,"w":19,"h":28},{"c":194,"x0":286,"y0":54,"yoffs":-2,"w":19,"h":28},{"c":195,"x0":684,"y0":99,"w":19,"h":26},{"c":196,"x0":288,"y0":99,"yoffs":-1,"w":19,"h":27},{"c":197,"x0":322,"y0":54,"yoffs":-2,"w":19,"h":28},{"c":198,"x0":435,"y0":303,"yoffs":5,"xpad":0.28125,"w":27,"h":21},{"c":199,"x0":358,"y0":54,"yoffs":5,"xpad":0.945313,"w":17,"h":28},{"c":200,"x0":392,"y0":54,"yoffs":-2,"xpad":0.617188,"w":16,"h":28},{"c":201,"x0":425,"y0":54,"yoffs":-2,"xpad":0.617188,"w":16,"h":28},{"c":202,"x0":458,"y0":54,"yoffs":-2,"xpad":0.617188,"w":16,"h":28},{"c":203,"x0":324,"y0":99,"yoffs":-1,"xpad":0.617188,"w":16,"h":27},{"c":204,"x0":491,"y0":54,"yoffs":-2,"xpad":1.54688,"w":7,"h":28},{"c":205,"x0":515,"y0":54,"yoffs":-2,"xpad":0.546875,"w":8,"h":28},{"c":206,"x0":540,"y0":54,"yoffs":-2,"w":11,"h":28},{"c":207,"x0":357,"y0":99,"yoffs":-1,"w":9,"h":27},{"c":208,"x0":479,"y0":303,"yoffs":5,"xpad":1.22656,"w":20,"h":21},{"c":209,"x0":720,"y0":99,"xpad":2.74219,"w":19,"h":26},{"c":210,"x0":370,"y0":8,"yoffs":-2,"xpad":1.22656,"w":21,"h":29},{"c":211,"x0":408,"y0":8,"yoffs":-2,"xpad":1.22656,"w":21,"h":29},{"c":212,"x0":446,"y0":8,"yoffs":-2,"xpad":1.22656,"w":21,"h":29},{"c":213,"x0":383,"y0":99,"xpad":1.22656,"w":21,"h":27},{"c":214,"x0":568,"y0":54,"yoffs":-1,"xpad":1.22656,"w":21,"h":28},{"c":215,"x0":455,"y0":341,"yoffs":11,"xpad":0.359375,"w":15,"h":15},{"c":216,"x0":560,"y0":184,"yoffs":4,"xpad":1.22656,"w":21,"h":23},{"c":217,"x0":484,"y0":8,"yoffs":-2,"xpad":2.04688,"w":19,"h":29},{"c":218,"x0":520,"y0":8,"yoffs":-2,"xpad":2.04688,"w":19,"h":29},{"c":219,"x0":556,"y0":8,"yoffs":-2,"xpad":2.04688,"w":19,"h":29},{"c":220,"x0":606,"y0":54,"yoffs":-1,"xpad":2.04688,"w":19,"h":28},{"c":221,"x0":642,"y0":54,"yoffs":-2,"w":18,"h":28},{"c":222,"x0":516,"y0":301,"yoffs":5,"xpad":1.00781,"w":17,"h":21},{"c":223,"x0":550,"y0":301,"yoffs":5,"xpad":1.30469,"w":17,"h":21},{"c":224,"x0":100,"y0":147,"yoffs":3,"xpad":1.29688,"w":14,"h":24},{"c":225,"x0":131,"y0":145,"yoffs":3,"xpad":1.29688,"w":14,"h":24},{"c":226,"x0":162,"y0":145,"yoffs":3,"xpad":1.29688,"w":14,"h":24},{"c":227,"x0":598,"y0":184,"yoffs":4,"xpad":1.29688,"w":14,"h":23},{"c":228,"x0":629,"y0":184,"yoffs":4,"xpad":1.29688,"w":14,"h":23},{"c":229,"x0":8,"y0":148,"yoffs":2,"xpad":1.29688,"w":14,"h":25},{"c":230,"x0":8,"y0":347,"yoffs":10,"xpad":0.960938,"w":24,"h":17},{"c":231,"x0":660,"y0":184,"yoffs":10,"xpad":0.273438,"w":14,"h":23},{"c":232,"x0":193,"y0":145,"yoffs":3,"xpad":1.04688,"w":15,"h":24},{"c":233,"x0":225,"y0":145,"yoffs":3,"xpad":1.04688,"w":15,"h":24},{"c":234,"x0":257,"y0":145,"yoffs":3,"xpad":1.04688,"w":15,"h":24},{"c":235,"x0":691,"y0":184,"yoffs":4,"xpad":1.04688,"w":15,"h":23},{"c":236,"x0":723,"y0":183,"yoffs":3,"xpad":1.34375,"w":6,"h":23},{"c":237,"x0":746,"y0":183,"yoffs":3,"w":8,"h":23},{"c":238,"x0":771,"y0":183,"yoffs":3,"w":11,"h":23},{"c":239,"x0":176,"y0":266,"yoffs":4,"w":9,"h":22},{"c":240,"x0":799,"y0":183,"yoffs":4,"xpad":1.53125,"w":15,"h":23},{"c":241,"x0":202,"y0":266,"yoffs":4,"xpad":2.03906,"w":15,"h":22},{"c":242,"x0":289,"y0":143,"yoffs":3,"xpad":0.828125,"w":16,"h":24},{"c":243,"x0":322,"y0":143,"yoffs":3,"xpad":0.828125,"w":16,"h":24},{"c":244,"x0":355,"y0":143,"yoffs":3,"xpad":0.828125,"w":16,"h":24},{"c":245,"x0":831,"y0":183,"yoffs":4,"xpad":0.828125,"w":16,"h":23},{"c":246,"x0":864,"y0":183,"yoffs":4,"xpad":0.828125,"w":16,"h":23},{"c":247,"x0":587,"y0":339,"yoffs":11,"xpad":0.453125,"w":14,"h":14},{"c":248,"x0":49,"y0":347,"yoffs":10,"xpad":0.828125,"w":16,"h":17},{"c":249,"x0":388,"y0":143,"yoffs":3,"xpad":1.64844,"w":15,"h":24},{"c":250,"x0":420,"y0":143,"yoffs":3,"xpad":1.64844,"w":15,"h":24},{"c":251,"x0":452,"y0":143,"yoffs":3,"xpad":1.64844,"w":15,"h":24},{"c":252,"x0":897,"y0":183,"yoffs":4,"xpad":1.64844,"w":15,"h":23},{"c":253,"x0":102,"y0":8,"yoffs":3,"w":15,"h":30},{"c":254,"x0":592,"y0":8,"yoffs":4,"xpad":0.890625,"w":16,"h":29},{"c":255,"x0":625,"y0":8,"yoffs":4,"w":15,"h":29},{"c":256,"x0":756,"y0":99,"w":19,"h":26},{"c":257,"x0":929,"y0":182,"yoffs":4,"xpad":1.29688,"w":14,"h":23},{"c":258,"x0":421,"y0":99,"yoffs":-1,"w":19,"h":27},{"c":259,"x0":484,"y0":143,"yoffs":3,"xpad":1.29688,"w":14,"h":24},{"c":260,"x0":677,"y0":54,"yoffs":5,"w":21,"h":28},{"c":261,"x0":960,"y0":182,"yoffs":10,"w":16,"h":23},{"c":262,"x0":657,"y0":8,"yoffs":-2,"xpad":0.945313,"w":17,"h":29},{"c":263,"x0":515,"y0":143,"yoffs":3,"xpad":0.273438,"w":14,"h":24},{"c":268,"x0":691,"y0":8,"yoffs":-2,"xpad":0.945313,"w":17,"h":29},{"c":269,"x0":546,"y0":143,"yoffs":3,"xpad":0.273438,"w":14,"h":24},{"c":270,"x0":715,"y0":54,"yoffs":-2,"xpad":1.01563,"w":20,"h":28},{"c":271,"x0":993,"y0":181,"yoffs":4,"w":22,"h":23},{"c":272,"x0":479,"y0":303,"yoffs":5,"xpad":1.22656,"w":20,"h":21},{"c":273,"x0":8,"y0":230,"yoffs":4,"xpad":0.0703125,"w":17,"h":23},{"c":274,"x0":792,"y0":99,"xpad":0.617188,"w":16,"h":26},{"c":275,"x0":42,"y0":230,"yoffs":4,"xpad":1.04688,"w":15,"h":23},{"c":278,"x0":457,"y0":99,"yoffs":-1,"xpad":0.617188,"w":16,"h":27},{"c":279,"x0":74,"y0":230,"yoffs":4,"xpad":1.04688,"w":15,"h":23},{"c":280,"x0":752,"y0":54,"yoffs":5,"xpad":0.617188,"w":16,"h":28},{"c":281,"x0":106,"y0":230,"yoffs":10,"xpad":1.04688,"w":15,"h":23},{"c":282,"x0":785,"y0":54,"yoffs":-2,"xpad":0.617188,"w":16,"h":28},{"c":283,"x0":577,"y0":143,"yoffs":3,"xpad":1.04688,"w":15,"h":24},{"c":286,"x0":818,"y0":54,"yoffs":-1,"xpad":1.75,"w":18,"h":28},{"c":287,"x0":134,"y0":8,"yoffs":3,"xpad":2.07031,"w":15,"h":30},{"c":290,"x0":853,"y0":54,"yoffs":5,"xpad":1.75,"w":18,"h":28},{"c":291,"x0":70,"y0":8,"yoffs":2,"xpad":2.07031,"w":15,"h":31},{"c":298,"x0":825,"y0":99,"w":9,"h":26},{"c":299,"x0":234,"y0":266,"yoffs":4,"w":9,"h":22},{"c":302,"x0":888,"y0":54,"yoffs":5,"xpad":0.546875,"w":8,"h":28},{"c":303,"x0":913,"y0":54,"yoffs":5,"w":8,"h":28},{"c":304,"x0":490,"y0":99,"yoffs":-1,"xpad":1.54688,"w":7,"h":27},{"c":305,"x0":487,"y0":341,"yoffs":11,"xpad":1.34375,"w":6,"h":15},{"c":310,"x0":725,"y0":8,"yoffs":5,"w":19,"h":29},{"c":311,"x0":166,"y0":8,"yoffs":4,"xpad":0.171875,"w":15,"h":30},{"c":313,"x0":938,"y0":54,"yoffs":-2,"w":16,"h":28},{"c":314,"x0":851,"y0":99,"w":8,"h":26},{"c":315,"x0":761,"y0":8,"yoffs":5,"w":16,"h":29},{"c":316,"x0":198,"y0":8,"yoffs":4,"xpad":1.46875,"w":6,"h":30},{"c":317,"x0":260,"y0":266,"yoffs":4,"w":16,"h":22},{"c":318,"x0":293,"y0":266,"yoffs":4,"w":12,"h":22},{"c":321,"x0":584,"y0":301,"yoffs":5,"xpad":0.046875,"w":16,"h":21},{"c":322,"x0":322,"y0":264,"yoffs":4,"w":11,"h":22},{"c":323,"x0":971,"y0":54,"yoffs":-2,"xpad":2.74219,"w":19,"h":28},{"c":324,"x0":138,"y0":228,"yoffs":3,"xpad":2.03906,"w":15,"h":23},{"c":325,"x0":794,"y0":8,"yoffs":5,"xpad":2.74219,"w":19,"h":29},{"c":326,"x0":609,"y0":143,"yoffs":10,"xpad":2.03906,"w":15,"h":24},{"c":327,"x0":8,"y0":103,"yoffs":-2,"xpad":2.74219,"w":19,"h":28},{"c":328,"x0":170,"y0":226,"yoffs":3,"xpad":2.03906,"w":15,"h":23},{"c":332,"x0":514,"y0":99,"xpad":1.22656,"w":21,"h":27},{"c":333,"x0":202,"y0":226,"yoffs":4,"xpad":0.828125,"w":16,"h":23},{"c":336,"x0":830,"y0":8,"yoffs":-2,"xpad":1.22656,"w":21,"h":29},{"c":337,"x0":641,"y0":143,"yoffs":3,"xpad":0.828125,"w":16,"h":24},{"c":338,"x0":350,"y0":264,"yoffs":5,"xpad":0.390625,"w":29,"h":22},{"c":339,"x0":82,"y0":347,"yoffs":10,"xpad":0.65625,"w":25,"h":17},{"c":340,"x0":44,"y0":103,"yoffs":-2,"w":19,"h":28},{"c":341,"x0":235,"y0":226,"yoffs":3,"xpad":0.203125,"w":10,"h":23},{"c":342,"x0":868,"y0":8,"yoffs":5,"w":19,"h":29},{"c":343,"x0":262,"y0":226,"yoffs":11,"xpad":0.203125,"w":10,"h":23},{"c":344,"x0":80,"y0":102,"yoffs":-2,"w":19,"h":28},{"c":345,"x0":289,"y0":226,"yoffs":3,"xpad":0.203125,"w":10,"h":23},{"c":346,"x0":904,"y0":8,"yoffs":-2,"xpad":1.32031,"w":15,"h":29},{"c":347,"x0":674,"y0":143,"yoffs":3,"xpad":0.28125,"w":13,"h":24},{"c":350,"x0":936,"y0":8,"yoffs":4,"xpad":1.32031,"w":15,"h":29},{"c":351,"x0":316,"y0":224,"yoffs":10,"xpad":0.28125,"w":13,"h":23},{"c":352,"x0":968,"y0":8,"yoffs":-2,"xpad":1.32031,"w":15,"h":29},{"c":353,"x0":704,"y0":142,"yoffs":3,"xpad":0.28125,"w":13,"h":24},{"c":354,"x0":116,"y0":100,"yoffs":5,"w":17,"h":28},{"c":355,"x0":876,"y0":99,"yoffs":7,"xpad":0.234375,"w":10,"h":26},{"c":356,"x0":150,"y0":100,"yoffs":-2,"w":17,"h":28},{"c":357,"x0":346,"y0":224,"yoffs":4,"w":15,"h":23},{"c":362,"x0":552,"y0":99,"xpad":2.04688,"w":19,"h":27},{"c":363,"x0":378,"y0":224,"yoffs":4,"xpad":1.64844,"w":15,"h":23},{"c":366,"x0":8,"y0":57,"yoffs":-2,"xpad":2.04688,"w":19,"h":29},{"c":367,"x0":39,"y0":148,"yoffs":2,"xpad":1.64844,"w":15,"h":25},{"c":368,"x0":44,"y0":57,"yoffs":-2,"xpad":2.04688,"w":19,"h":29},{"c":369,"x0":734,"y0":142,"yoffs":3,"xpad":1.64844,"w":15,"h":24},{"c":370,"x0":184,"y0":100,"yoffs":5,"xpad":2.04688,"w":19,"h":28},{"c":371,"x0":396,"y0":264,"yoffs":11,"w":17,"h":22},{"c":376,"x0":588,"y0":99,"yoffs":-1,"w":18,"h":27},{"c":377,"x0":220,"y0":100,"yoffs":-2,"xpad":0.226563,"w":17,"h":28},{"c":378,"x0":410,"y0":224,"yoffs":3,"xpad":0.851563,"w":13,"h":23},{"c":379,"x0":623,"y0":99,"yoffs":-1,"xpad":0.226563,"w":17,"h":27},{"c":380,"x0":430,"y0":264,"yoffs":4,"xpad":0.851563,"w":13,"h":22},{"c":381,"x0":254,"y0":100,"yoffs":-2,"xpad":0.226563,"w":17,"h":28},{"c":382,"x0":440,"y0":224,"yoffs":3,"xpad":0.851563,"w":13,"h":23},{"c":402,"x0":71,"y0":148,"yoffs":4,"w":12,"h":25},{"c":536,"x0":221,"y0":8,"yoffs":4,"xpad":1.32031,"w":15,"h":30},{"c":537,"x0":766,"y0":142,"yoffs":10,"xpad":0.28125,"w":13,"h":24},{"c":538,"x0":80,"y0":56,"yoffs":5,"w":17,"h":29},{"c":539,"x0":657,"y0":99,"yoffs":7,"xpad":0.234375,"w":10,"h":27},{"c":916,"x0":460,"y0":264,"yoffs":4,"xpad":3.88281,"w":23,"h":22},{"c":8226,"x0":208,"y0":376,"yoffs":13,"xpad":0.28125,"w":7,"h":6},{"c":8482,"x0":715,"y0":338,"yoffs":5,"xpad":0.882813,"w":22,"h":12},{"c":8592,"x0":870,"y0":334,"yoffs":11,"xpad":0.882813,"w":26,"h":10},{"c":8593,"x0":796,"y0":142,"yoffs":4,"xpad":7.88281,"w":19,"h":24},{"c":8594,"x0":913,"y0":334,"yoffs":11,"xpad":0.882813,"w":26,"h":10},{"c":8595,"x0":832,"y0":142,"yoffs":4,"xpad":7.88281,"w":19,"h":24},{"c":8734,"x0":618,"y0":339,"yoffs":11,"xpad":0.6875,"w":25,"h":14},{"c":9654,"x0":718,"y0":301,"yoffs":6,"w":17,"h":19},{"c":9660,"x0":124,"y0":347,"yoffs":7,"w":18,"h":17},{"c":9742,"x0":868,"y0":142,"yoffs":4,"w":31,"h":24},{"c":9743,"x0":916,"y0":141,"yoffs":4,"w":31,"h":24},{"c":65533,"x0":617,"y0":301,"yoffs":5,"w":20,"h":21}]}
},{}],7:[function(require,module,exports){
"use strict"
exports.main=main
require("../glov/client/local_storage.js").setStoragePrefix("galaxy-gen")
var assert=require("assert")
var _glovClientAutoatlas=require("../glov/client/autoatlas")
var autoAtlas=_glovClientAutoatlas.autoAtlas
var _glovClientCamera2d=require("../glov/client/camera2d")
var camera2d=_glovClientCamera2d
var _glovClientEngine=require("../glov/client/engine")
var engine=_glovClientEngine
var _glovClientEngine2=require("../glov/client/engine")
var debugDefineIsSet=_glovClientEngine2.debugDefineIsSet
var getFrameDt=_glovClientEngine2.getFrameDt
var getFrameTimestamp=_glovClientEngine2.getFrameTimestamp
var _glovClientFramebuffer=require("../glov/client/framebuffer")
var copyCanvasToClipboard=_glovClientFramebuffer.copyCanvasToClipboard
var _glovClientInput=require("../glov/client/input")
var KEYS=_glovClientInput.KEYS
var inputClick=_glovClientInput.inputClick
var inputDrag=_glovClientInput.inputDrag
var keyDown=_glovClientInput.keyDown
var keyDownEdge=_glovClientInput.keyDownEdge
var mouseMoved=_glovClientInput.mouseMoved
var mousePos=_glovClientInput.mousePos
var mouseWheel=_glovClientInput.mouseWheel
var _glovClientLocal_storage=require("../glov/client/local_storage")
var localStorageGetJSON=_glovClientLocal_storage.localStorageGetJSON
var localStorageSetJSON=_glovClientLocal_storage.localStorageSetJSON
var _glovClientNet=require("../glov/client/net")
var netClient=_glovClientNet.netClient
var netDisconnected=_glovClientNet.netDisconnected
var netInit=_glovClientNet.netInit
var _glovClientPerf=require("../glov/client/perf")
var addMetric=_glovClientPerf.addMetric
var _glovClientShaders=require("../glov/client/shaders")
var shaderCreate=_glovClientShaders.shaderCreate
var _glovClientSlider=require("../glov/client/slider")
var slider=_glovClientSlider.slider
var _glovClientSpot=require("../glov/client/spot")
var spotSuppressPad=_glovClientSpot.spotSuppressPad
var _glovClientSprite_setsJs=require("../glov/client/sprite_sets.js")
var spriteSetGet=_glovClientSprite_setsJs.spriteSetGet
var _glovClientSprites=require("../glov/client/sprites")
var BLEND_ADDITIVE=_glovClientSprites.BLEND_ADDITIVE
var spriteCreate=_glovClientSprites.spriteCreate
var spriteQueueRaw=_glovClientSprites.spriteQueueRaw
var _glovClientTextures=require("../glov/client/textures")
var textureLoad=_glovClientTextures.textureLoad
var textureWhite=_glovClientTextures.textureWhite
var _glovClientUi=require("../glov/client/ui")
var LINE_CAP_ROUND=_glovClientUi.LINE_CAP_ROUND
var LINE_NO_AA=_glovClientUi.LINE_NO_AA
var buttonText=_glovClientUi.buttonText
var drawCircle=_glovClientUi.drawCircle
var drawElipse=_glovClientUi.drawElipse
var drawHollowCircle=_glovClientUi.drawHollowCircle
var drawHollowRect2=_glovClientUi.drawHollowRect2
var drawLine=_glovClientUi.drawLine
var drawRect=_glovClientUi.drawRect
var panel=_glovClientUi.panel
var print=_glovClientUi.print
var scaleSizes=_glovClientUi.scaleSizes
var setFontHeight=_glovClientUi.setFontHeight
var uiButtonHeight=_glovClientUi.uiButtonHeight
var uiButtonWidth=_glovClientUi.uiButtonWidth
var uiTextHeight=_glovClientUi.uiTextHeight
var walltime=require("../glov/client/walltime")
var _glovCommonUtil=require("../glov/common/util")
var clamp=_glovCommonUtil.clamp
var clone=_glovCommonUtil.clone
var deepEqual=_glovCommonUtil.deepEqual
var easeInOut=_glovCommonUtil.easeInOut
var easeOut=_glovCommonUtil.easeOut
var lerp=_glovCommonUtil.lerp
var merge=_glovCommonUtil.merge
var mod=_glovCommonUtil.mod
var _glovCommonVmath=require("../glov/common/vmath")
var unit_vec=_glovCommonVmath.unit_vec
var v2add=_glovCommonVmath.v2add
var v2addScale=_glovCommonVmath.v2addScale
var v2copy=_glovCommonVmath.v2copy
var v2distSq=_glovCommonVmath.v2distSq
var v2floor=_glovCommonVmath.v2floor
var v2set=_glovCommonVmath.v2set
var vec2=_glovCommonVmath.vec2
var vec4=_glovCommonVmath.vec4
var _biomes=require("./biomes")
var BIOMES=_biomes.BIOMES
var _galaxy=require("./galaxy")
var LAYER_STEP=_galaxy.LAYER_STEP
var createGalaxy=_galaxy.createGalaxy
var distSq=_galaxy.distSq
var _solar_system2=require("./solar_system")
var BIT_SAME_LOOSE=_solar_system2.BIT_SAME_LOOSE
var PLANET_TYPE_NAMES=_solar_system2.PLANET_TYPE_NAMES
var planetCreate=_solar_system2.planetCreate
var planetMapFlatTexture=_solar_system2.planetMapFlatTexture
var planetMapTexture=_solar_system2.planetMapTexture
var solarSystemCreate=_solar_system2.solarSystemCreate
var abs=Math.abs,ceil=Math.ceil,cos=Math.cos,floor=Math.floor,max=Math.max,min=Math.min,pow=Math.pow,round=Math.round,sin=Math.sin,sqrt=Math.sqrt,PI=Math.PI
window.Z=window.Z||{}
Z.BACKGROUND=1
Z.SPRITES=10
Z.PARTICLES=20
Z.SOLAR=60
Z.PLANET=70
Z.PLANET_MAP=80
Z.UI=100
var game_width=346
var game_height=256
function zoomTime(amount){return 500*abs(amount)}var Zoomer=function(){function Zoomer(zoom_level_key,zoom_offs_key,max_zoom,auto_recenter){this.zoom_level=void 0
this.zoom_offs=vec2()
this.target_zoom_level=void 0
this.queued_zooms=[]
this.zoom_level_key=zoom_level_key
this.zoom_offs_key=zoom_offs_key
this.max_zoom=max_zoom
this.auto_recenter=auto_recenter
this.zoom_level=localStorageGetJSON(this.zoom_level_key,0)
v2set(this.zoom_offs,localStorageGetJSON(this.zoom_offs_key+"x",0),localStorageGetJSON(this.zoom_offs_key+"y",0))
this.target_zoom_level=this.zoom_level}var _proto=Zoomer.prototype
_proto.resetZoom=function resetZoom(zoom_level,offsx,offsy){this.queued_zooms=[]
this.zoom_level=this.target_zoom_level=zoom_level
v2set(this.zoom_offs,offsx,offsy)
localStorageSetJSON(this.zoom_level_key,zoom_level)}
_proto.doZoomActual=function doZoomActual(x,y,delta){var zoom_offs=this.zoom_offs
var zoom_level=this.zoom_level
var cur_zoom=pow(2,zoom_level)
var new_zoom_level=max(0,min(zoom_level+delta,this.max_zoom))
var new_zoom=pow(2,new_zoom_level)
var point_x=zoom_offs[0]+x/cur_zoom
var point_y=zoom_offs[1]+y/cur_zoom
zoom_offs[0]=point_x-x/new_zoom
zoom_offs[1]=point_y-y/new_zoom
if(0===(zoom_level=new_zoom_level)&&this.auto_recenter)zoom_offs[0]=zoom_offs[1]=0
this.zoom_level=zoom_level
localStorageSetJSON(this.zoom_offs_key+"x",zoom_offs[0])
localStorageSetJSON(this.zoom_offs_key+"y",zoom_offs[1])
localStorageSetJSON(this.zoom_level_key,zoom_level)}
_proto.zoomTick=function zoomTick(max_okay_zoom,dt){var queued_zooms=this.queued_zooms
for(var ii=0;ii<queued_zooms.length;++ii){var zm=queued_zooms[ii]
var new_progress=min(1,zm.progress+dt/zoomTime(zm.delta))
var dp=void 0
if(debugDefineIsSet("ATTRACT"))dp=new_progress-zm.progress
else dp=easeOut(new_progress,2)-easeOut(zm.progress,2)
var new_zoom_level=min(this.zoom_level+zm.delta*dp,this.max_zoom)
if(zm.delta>0&&new_zoom_level>max_okay_zoom&&false)continue
zm.progress=new_progress
this.doZoomActual(zm.x,zm.y,zm.delta*dp)
if(1===new_progress)queued_zooms.splice(ii,1)}if(!queued_zooms.length)this.zoom_level=this.target_zoom_level}
_proto.doZoom=function doZoom(x,y,delta){this.target_zoom_level=max(0,min(this.target_zoom_level+delta,this.max_zoom))
this.queued_zooms.push({x:x,y:y,delta:delta,progress:0})}
_proto.drag=function drag(delta,w){var zoom=pow(2,this.zoom_level)
this.zoom_offs[0]-=delta[0]/w/zoom
this.zoom_offs[1]-=delta[1]/w/zoom
localStorageSetJSON(this.zoom_offs_key+"x",this.zoom_offs[0])
localStorageSetJSON(this.zoom_offs_key+"y",this.zoom_offs[1])}
return Zoomer}()
function main(){var _BIOME_TO_BASE
if(engine.DEBUG)netInit({engine:engine})
var view=localStorageGetJSON("view",1)
var show_panel=Boolean(localStorageGetJSON("panel",false))
var font_info_04b03x2=require("./img/font/04b03_8x2.json")
var font_info_04b03x1=require("./img/font/04b03_8x1.json")
var font_info_palanquin32=require("./img/font/palanquin32.json")
var pixely=1===view?"strict":"on"
var font_init
var ui_sprites
if("strict"===pixely||true){font_init={info:font_info_04b03x1,texture:"font/04b03_8x1"}
ui_sprites=spriteSetGet("pixely")}else if(pixely&&"off"!==pixely){font_init={info:font_info_04b03x2,texture:"font/04b03_8x2"}
ui_sprites=spriteSetGet("pixely")}else font_init={info:font_info_palanquin32,texture:"font/palanquin32"}
if(!engine.startup({game_width:game_width,game_height:game_height,pixely:pixely,font:font_init,viewport_postprocess:false,antialias:false,do_borders:false,show_fps:debugDefineIsSet("ATTRACT")?false:void 0,ui_sprites:ui_sprites,pixel_perfect:.8}))return
var font=engine.font
scaleSizes(13/32)
setFontHeight(8)
var tex_palette=textureLoad({url:"palette/pal2.png",filter_min:gl.NEAREST,filter_mag:gl.NEAREST,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})
var tex_palette_planets=textureLoad({url:"palette/pal_planets.png",filter_min:gl.NEAREST,filter_mag:gl.NEAREST,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})
var shader_galaxy_pixel=shaderCreate("shaders/galaxy_blend_pixel.fp")
var shader_galaxy_blend=shaderCreate("shaders/galaxy_blend.fp")
var shader_planet_pixel=shaderCreate("shaders/planet_pixel.fp")
var shader_planet_pixel_flat=shaderCreate("shaders/planet_pixel_flat.fp")
var shader_pixelart=shaderCreate("shaders/pixelart.fp")
var white_tex=textureWhite()
var sprites={grass0:autoAtlas("grass","def"),grass1:autoAtlas("grass-l1","def"),grass2:autoAtlas("grass-l2","def"),lava0:autoAtlas("lava","def"),lava1:autoAtlas("lava-l1","def"),lava2:autoAtlas("lava-l2","def"),ice0:autoAtlas("ice","def"),ice1:autoAtlas("ice-l1","def"),ice2:autoAtlas("ice-l2","def"),sand0:autoAtlas("sand","def"),sand1:autoAtlas("sand-l1","def"),sand2:autoAtlas("sand-l2","def"),treesmountains0:autoAtlas("trees-mountains","def"),treesmountains1:autoAtlas("trees-mountains-l1","def"),treesmountains2:autoAtlas("trees-mountains-l2","def"),ocean0:autoAtlas("ocean-animated","def"),ocean1:autoAtlas("ocean-animated-l1","def"),ocean2:autoAtlas("ocean-animated-l2","def")}
var MAX_ZOOM=16
var MAX_SOLAR_VIEW=1
var MAX_PLANET_VIEW=2
var MAX_PLANET_ZOOM=7
var PLANET_PIXELART_LEVEL=3
var buf_dim=256
var params={buf_dim:buf_dim,dither:.5,arms:7,len_mods:4,twirl:4,center:.09,seed:1349,noise_freq:5,noise_weight:.22,poi_count:200,width_ly:131072,star_count:1e11,max_zoom:MAX_ZOOM,layer1:{noise_freq:20,noise_weight:.2},layer2:{noise_freq:80,noise_weight:.2},layer3:{noise_freq:250,noise_weight:.2},layer4:{noise_freq:750,noise_weight:.25},layer5:{noise_freq:2500,noise_weight:.3}}
var solar_params=merge({seed:80,star_id:55},localStorageGetJSON("solar_params",{}))
var planet_params=merge({name:"M",size:12,seed:50},localStorageGetJSON("planet_params",{}))
var planet_view_params=merge({orbit:0,rot:0},localStorageGetJSON("planet_view_params",{}))
var gen_params
var gen_solar_params
var gen_planet_params
var debug_sprite
var galaxy
function allocSprite(){if(!debug_sprite){var tex=galaxy.getCellTextured(0,0).tex
assert(tex)
debug_sprite=spriteCreate({texs:[tex,tex,tex]})}}function round4(v){return round(1e3*v)/1e3}function roundZoom(v){return 1===view?round(v):v}function format(v){assert(v>=0)
if(!v)return"0"
if(v>9e8)return(v/1e9).toFixed(1)+"B"
if(v>9e5)return(v/1e6).toFixed(1)+"M"
if(v>900)return(v/1e3).toFixed(1)+"K"
if(v>9)return""+round(v)
var precis=1
var check=.2
while(true){if(v>check)return v.toFixed(precis)
check*=.1
precis++}}var cells_drawn=0
addMetric({name:"cells",show_stat:"false",labels:{"cells: ":function cells(){return cells_drawn.toString()}}})
var gal_zoomer=new Zoomer("zoom","offs",MAX_ZOOM,true)
var solar_view=localStorageGetJSON("solar_view",0)
var solar_override=localStorageGetJSON("solar_override",false)
var solar_override_system=null
var selected_star_id=localStorageGetJSON("selected_star",null)
var planet_view=localStorageGetJSON("planet_view",0)
var planet_override=localStorageGetJSON("planet_override",false)
var planet_flatmap=localStorageGetJSON("planet_flatmap",false)
var planet_override_planet=null
var selected_planet_index=localStorageGetJSON("selected_planet",null)
var planet_zoomer=new Zoomer("planet_zoom","planet_offs",MAX_PLANET_ZOOM,false)
var style=font.styleColored(null,255)
var mouse_pos=vec2()
var use_mouse_pos=false
var font_style_fade=font.styleColored(null,4294967104)
var color_legend_fade=vec4(1,1,1,.25)
var color_highlight=vec4(1,1,0,.75)
var color_text_backdrop=vec4(0,0,0,.5)
var eff_solar_view=solar_view
var eff_solar_view_unsmooth=solar_view
var eff_planet_view=planet_view
var eff_planet_view_unsmooth=planet_view
var last_planet_rot=0
function zoomTick(max_okay_zoom){var dt=getFrameDt()
gal_zoomer.zoomTick(max_okay_zoom,dt)
planet_zoomer.zoomTick(planet_zoomer.max_zoom,dt)
var dsolar=.003*dt
if(eff_solar_view_unsmooth<solar_view)eff_solar_view_unsmooth=min(solar_view,eff_solar_view_unsmooth+dsolar)
else if(eff_solar_view_unsmooth>solar_view)eff_solar_view_unsmooth=max(solar_view,eff_solar_view_unsmooth-dsolar)
var iesvu=floor(eff_solar_view_unsmooth)
eff_solar_view=round4(iesvu+easeInOut(eff_solar_view_unsmooth-iesvu,2))
var dplanet=.003*dt
if(eff_planet_view_unsmooth<planet_view)eff_planet_view_unsmooth=min(planet_view,eff_planet_view_unsmooth+dplanet)
else if(eff_planet_view_unsmooth>planet_view)eff_planet_view_unsmooth=max(planet_view,eff_planet_view_unsmooth-dplanet)
var iepvu=floor(eff_planet_view_unsmooth)
eff_planet_view=round4(iepvu+easeInOut(eff_planet_view_unsmooth-iepvu,2))}function solarZoom(delta){solar_view=clamp(solar_view+delta,0,MAX_SOLAR_VIEW)
localStorageSetJSON("solar_view",solar_view)
localStorageSetJSON("selected_star",solar_view?selected_star_id:null)}function planetZoom(x,y,delta){if(planet_view===MAX_PLANET_VIEW&&delta>0)return planet_zoomer.doZoom(x,y,delta)
else if(planet_view===MAX_PLANET_VIEW&&delta<0)if(planet_zoomer.target_zoom_level>0)return planet_zoomer.doZoom(x,y,delta)
planet_view=clamp(planet_view+delta,0,MAX_PLANET_VIEW)
localStorageSetJSON("planet_view",planet_view)
localStorageSetJSON("selected_planet",planet_view?selected_planet_index:null)
if(2===planet_view)planet_zoomer.resetZoom(0,2*last_planet_rot,0)}function doZoom(x,y,delta){if(gal_zoomer.target_zoom_level===MAX_ZOOM&&delta>0){if(null!==selected_star_id)if(solar_view&&null!==selected_planet_index)planetZoom(x,y,delta)
else solarZoom(1)
return}if(solar_view&&delta<0){if(planet_view)planetZoom(x,y,delta)
else solarZoom(-1)
return}gal_zoomer.doZoom(x,y,delta)}var last_img
var img_id=0
function saveSnapshot(){var src=engine.canvas
var viewport=engine.viewport
var canvas_full=document.createElement("canvas")
canvas_full.width=4*game_width
canvas_full.height=4*game_height
var ctx=canvas_full.getContext("2d")
assert(ctx)
ctx.imageSmoothingEnabled=false
ctx.drawImage(src,viewport[0],src.height-viewport[3]+viewport[1],viewport[2],viewport[3],0,0,canvas_full.width,canvas_full.height)
var data_full=canvas_full.toDataURL("image/png")
if(data_full===last_img)return
last_img=data_full
if(netClient()){var pak=netClient().pak("img")
pak.writeInt(img_id++)
pak.writeString(data_full)
pak.send()}else{var win=window.open("","img_preview")
assert(win)
var elems=win.document.getElementsByTagName("img")
if(elems&&elems.length)elems[0].remove()
win.document.write('<html><body><img src="'+data_full+'"/></body></html>')}}var VSCALE=.5
function drawHollowElipse(x,y,z,r0,r1,color){var segments=max(20,r0-10)
var last_pos=[0,0]
var cur_pos=[0,0]
for(var ii=0;ii<=segments+1;++ii){v2copy(last_pos,cur_pos)
var theta=ii/segments*PI*2+.1
v2set(cur_pos,x+cos(theta)*r0,y+sin(theta)*r1)
if(1===view){v2floor(cur_pos,cur_pos)
v2addScale(cur_pos,cur_pos,unit_vec,.5)}if(ii)drawLine(last_pos[0],last_pos[1],cur_pos[0],cur_pos[1],z,1,1,color,LINE_NO_AA|LINE_CAP_ROUND)}}var ORBIT_RATE=2e-4
var ROTATION_RATE=15e-5
var temp_fade=vec4(1,1,1,1)
function drawPlanet(solar_system,selected_planet,x0,y0,z,w,h,fade){var planet=solar_system.planets[selected_planet.idx]
var theta=planet.orbit+planet.orbit_speed*walltime()*ORBIT_RATE
theta%=2*PI
var rot=getFrameTimestamp()*ROTATION_RATE
if(planet_override&&planet_override_planet){planet=planet_override_planet
if(planet_view_params.orbit)theta=planet_view_params.orbit/360*2*PI
if(planet_view_params.rot)rot=planet_view_params.rot/360}last_planet_rot=rot=mod(rot,1)
x0=lerp(fade,selected_planet.x,x0)
y0=lerp(fade,selected_planet.y,y0)
w*=fade
h*=fade
var FULL_SIZE=128
var sprite_size=lerp(fade,planet.size,FULL_SIZE)
if(planet_flatmap){var pmtex=planetMapFlatTexture()
var planet_shader_params={params:[0,0,mod(2-theta/PI+2*rot,2),0]}
var planet_tex=planet.getTexture(1,FULL_SIZE,0,0,0,false)
if(planet_tex)spriteQueueRaw([pmtex,planet_tex,tex_palette_planets],x0,y0+h/2-w/4,z,w,w/2,0,0,1,1,[1,1,1,min(8*fade,1)],shader_planet_pixel,planet_shader_params)}else{var _pmtex=planetMapTexture(true)
var xmid=x0+w/2
var ymid=y0+h/2
var _planet_shader_params={params:[rot,_pmtex.width/sprite_size*1.5/255,2-theta/PI,0]}
var x=xmid
var y=ymid
temp_fade[3]=min(8*fade,1)
var _planet_tex=planet.getTexture(1,FULL_SIZE,0,0,0,false)
if(_planet_tex)spriteQueueRaw([_pmtex,_planet_tex,tex_palette_planets],x-sprite_size,y-sprite_size,z,2*sprite_size,2*sprite_size,0,0,1,1,temp_fade,shader_planet_pixel,_planet_shader_params)}}var MAP_FULL_SIZE=256
var MAP_SUBDIVIDE=2
var MAP_SUB_SIZE=MAP_FULL_SIZE/pow(2,MAP_SUBDIVIDE)
var EMPTY_RAW_DATA=new Uint8Array(MAP_SUB_SIZE*MAP_SUB_SIZE)
var NULL_ROWPAIR=[EMPTY_RAW_DATA,EMPTY_RAW_DATA]
function frameListToBitmask(list){var ret={}
for(var key in list){var offs=list[key]
var qs=[]
var v=0
var len=key.length
for(var ii=0;ii<len;++ii){var bit=1<<len-1-ii
if("?"===key[ii])qs.push(bit)
else if("1"===key[ii])v|=bit}var maxval=1<<qs.length
for(var _ii=0;_ii<maxval;++_ii){for(var jj=0;jj<qs.length;++jj)if(_ii&1<<jj)v|=qs[jj]
else v&=~qs[jj]
var v0=ret[v]
if(void 0===v0)v0=ret[v]=[]
if(Array.isArray(offs))for(var kk=0;kk<offs.length;++kk)v0.push(offs[kk])
else v0.push(offs)}}return ret}var frame_offs_regular=frameListToBitmask({"????00?01":2,"???000?1?":3,"???00?10?":4,"?1?100?0?":5,"?1?001?0?":7,"?0??01?0?":18,"?0?10??0?":20,"?01?00???":34,"?1?000???":35,"10?00????":36,"?0?100?1?":37,"?0?001?1?":39,"?1?101?0?":[5,18],"?1?10??1?":[37,35],"?1??01?1?":[7,3],"?0?101?1?":[39,20]})
var frame_offs_water=frameListToBitmask({"000000001":88,"000000?1?":40,"000000100":120,"?1?100?00":0,"?1?00100?":56,"001000100":80,100000001:48,"00?00100?":64,"?00100?00":8,"001000000":96,"?1?000000":24,1e8:128,"?00100?1?":16,"00?001?1?":72})
var frame_offs_tree=frameListToBitmask({"0001":1,"0010":3,"0011":2,"0100":105,"0101":53,"0110":108,"0111":4,1e3:107,1001:109,1010:55,1011:5,1100:106,1101:56,1110:57,1111:54})
var BASE={NULL:{sprite:"grass",frame:1},WATER_DEEP:{sprite:"ocean",frame:48,anim:true},WATER_SHALLOW:{sprite:"ocean",frame:8,anim:true,ovr_idx:16,frame_offs:frame_offs_water},SAND:{sprite:"sand",frame:1,ovr_idx:280,frame_offs:frame_offs_regular},SAND2:{sprite:"sand",frame:17,ovr_idx:232,frame_offs:frame_offs_regular},GRASS:{sprite:"grass",frame:1,ovr_idx:272,frame_offs:frame_offs_regular},GRASS2:{sprite:"grass",frame:17,ovr_idx:232,frame_offs:frame_offs_regular},ICE:{sprite:"ice",frame:1,ovr_idx:280,frame_offs:frame_offs_regular},ICE2:{sprite:"ice",frame:17,ovr_idx:232,frame_offs:frame_offs_regular},DARK_DIRT:{sprite:"lava",frame:1,ovr_idx:280,frame_offs:frame_offs_regular},DETAIL_TREES1:{sprite:"treesmountains",frame:1,frame_offs:frame_offs_tree},DETAIL_MOUNTAINS1:{sprite:"treesmountains",frame:1145,frame_offs:frame_offs_tree},DETAIL_MOUNTAINS_SNOW:{sprite:"treesmountains",frame:1184,frame_offs:frame_offs_tree}}
var ord=0
for(var key in BASE)BASE[key].ord=ord++
var BIOME_TO_BASE=((_BIOME_TO_BASE={})[BIOMES.WATER_DEEP]=[BASE.WATER_DEEP,BASE.WATER_DEEP],_BIOME_TO_BASE[BIOMES.WATER_SHALLOW]=[BASE.WATER_SHALLOW,BASE.WATER_SHALLOW],_BIOME_TO_BASE[BIOMES.GREEN_FOREST]=[BASE.GRASS,BASE.GRASS2,BASE.DETAIL_TREES1],_BIOME_TO_BASE[BIOMES.MOUNTAINS]=[BASE.GRASS,BASE.GRASS2,BASE.DETAIL_MOUNTAINS1],_BIOME_TO_BASE[BIOMES.GREEN_PLAINS]=[BASE.GRASS,BASE.GRASS2],_BIOME_TO_BASE[BIOMES.MOUNTAINS_SNOW]=[BASE.DARK_DIRT,BASE.DARK_DIRT,BASE.DETAIL_MOUNTAINS_SNOW],_BIOME_TO_BASE[BIOMES.FROZEN_PLAINS]=[BASE.ICE,BASE.ICE2],_BIOME_TO_BASE[BIOMES.FROZEN_MOUNTAINS]=[BASE.ICE,BASE.ICE2,BASE.DETAIL_MOUNTAINS_SNOW],_BIOME_TO_BASE[BIOMES.DESERT]=[BASE.SAND,BASE.SAND2],_BIOME_TO_BASE)
var anim_frame
function overlayFor(base,mask){if(!base.frame_offs)return null
var offs=base.frame_offs[mask]
if(void 0===offs)return null
var r=[]
for(var ii=0;ii<offs.length;++ii)r.push(base.ovr_idx+offs[ii]+(base.anim?anim_frame:0))
return[base.sprite,r]}function detailFor(detail,mask){var add=detail.anim?anim_frame:0
if(!detail.frame_offs)return[detail.frame+add]
var ul=432===(432&mask)?8:0
var ur=216===(216&mask)?4:0
var ll=54===(54&mask)?2:0
var lr=27===(27&mask)?1:0
var offs=detail.frame_offs[mask=ul|ur|ll|lr]
if(void 0===offs)return[detail.frame+add]
var r=[]
for(var ii=0;ii<offs.length;++ii)r.push(detail.frame+offs[ii]+add)
return r}function planetMapMode(planet,x,y,z_base,h,alpha,zoom_level){var planet_shader_params={}
temp_fade[3]=alpha
var z0=z_base
function drawSubLayer(sublayer,z,no_draw){var all_good=true
if(0===sublayer){var layer0=planet.getTexture(2,MAP_FULL_SIZE,0,0,0,false)
if(layer0&&!no_draw)spriteQueueRaw([layer0,tex_palette_planets],camera2d.x0Real(),y,z,camera2d.wReal(),h,(camera2d.x0Real()-x)/(2*h),0,(camera2d.x1Real()-x)/(2*h),1,temp_fade,shader_planet_pixel_flat,planet_shader_params)
else all_good=false}else{var zoom=pow(2,sublayer+MAP_SUBDIVIDE)
var sub_dim=h/zoom
var sub_num_horiz=2*zoom
var sub_num_vert=zoom
var sub_x0=floor((camera2d.x0Real()-x)/sub_dim)
var sub_x1=floor((camera2d.x1Real()-x)/sub_dim)
var sub_y0=floor((camera2d.y0Real()-y)/sub_dim)
var sub_y1=floor((camera2d.y1Real()-y)/sub_dim)
for(var yy=sub_y0;yy<=sub_y1;++yy)for(var xx=sub_x0;xx<=sub_x1;++xx){var layer=planet.getTexture(2,MAP_SUB_SIZE,sublayer+MAP_SUBDIVIDE,mod(xx,sub_num_horiz),mod(yy,sub_num_vert),false)
if(layer&&!no_draw)spriteQueueRaw([layer,tex_palette_planets],x+xx*sub_dim,y+yy*sub_dim,z,sub_dim,sub_dim,0,0,1,1,temp_fade,shader_planet_pixel_flat,planet_shader_params)
else all_good=false}var pad=game_height/4
sub_x0=floor((camera2d.x0Real()-pad-x)/sub_dim)
sub_x1=floor((camera2d.x1Real()+pad-x)/sub_dim)
sub_y0=floor((camera2d.y0Real()-pad-y)/sub_dim)
sub_y1=floor((camera2d.y1Real()+pad-y)/sub_dim)
for(var _yy=sub_y0;_yy<=sub_y1;++_yy)for(var _xx=sub_x0;_xx<=sub_x1;++_xx)planet.getTexture(2,MAP_SUB_SIZE,sublayer+MAP_SUBDIVIDE,mod(_xx,sub_num_horiz),mod(_yy,sub_num_vert),false)}return all_good}var sublayer=round(zoom_level)
var filled=false
for(var ii=min(PLANET_PIXELART_LEVEL,sublayer);ii>=0;--ii){if(drawSubLayer(ii,z_base,filled))filled=true;--z_base}if(sublayer>=PLANET_PIXELART_LEVEL+2){var bget=function bget(out,xx,yy){var eff_yy=mod(yy,map_num_vert)
var sub_y=floor(eff_yy/MAP_SUB_SIZE)
var row=raw_datas[sub_y]
var tile_y_offs=eff_yy%MAP_SUB_SIZE*MAP_SUB_SIZE
var eff_xx=mod(xx,map_num_horiz)
var sub_x=floor(eff_xx/MAP_SUB_SIZE)
var tile_x_offs=eff_xx%MAP_SUB_SIZE
var rowpair=row&&row[sub_x]||NULL_ROWPAIR
var v=rowpair[0][tile_y_offs+tile_x_offs]||0
var details=rowpair[1]
var detailv=details&&details[tile_y_offs+tile_x_offs]||0
var pair=BIOME_TO_BASE[v]
if(pair){out.base=pair[detailv&BIT_SAME_LOOSE?1:0]
out.detail=pair[2]}else{out.base=BASE.NULL
out.detail=void 0}}
var lod=clamp(MAX_PLANET_ZOOM-sublayer,0,2)
var zoom=pow(2,(sublayer=PLANET_PIXELART_LEVEL)+MAP_SUBDIVIDE)
var sub_dim=h/zoom
var sub_num_horiz=2*zoom
var sub_num_vert=zoom
var tile_h=h/MAP_SUB_SIZE/zoom
var sub_x0=floor((camera2d.x0Real()-x-tile_h)/sub_dim)
var sub_x1=floor((camera2d.x1Real()-x+tile_h)/sub_dim)
var sub_y0=floor((camera2d.y0Real()-y-tile_h)/sub_dim)
var sub_y1=floor((camera2d.y1Real()-y+tile_h)/sub_dim)
var raw_datas={}
for(var yy=sub_y0;yy<=sub_y1;++yy){var row=raw_datas[yy]={}
for(var xx=sub_x0;xx<=sub_x1;++xx){var eff_xx=mod(xx,sub_num_horiz)
var layer=planet.getTexture(2,MAP_SUB_SIZE,sublayer+MAP_SUBDIVIDE,eff_xx,mod(yy,sub_num_vert),true)
if(layer)row[eff_xx]=[layer.raw_data,layer.details]}}anim_frame=floor(.0086*getFrameTimestamp())%8
var map_num_vert=MAP_SUB_SIZE*zoom
var map_num_horiz=2*map_num_vert
var tile_x0=floor((camera2d.x0Real()-x)/tile_h)
var tile_x1=floor((camera2d.x1Real()-x)/tile_h)
var tile_y0=floor((camera2d.y0Real()-y)/tile_h)
var tile_y1=floor((camera2d.y1Real()-y)/tile_h)
var draw_param={x:0,y:0,w:0,h:0,z:0,frame:0,shader:shader_pixelart,nozoom:true}
var ndata=[]
for(var _ii2=0;_ii2<9;++_ii2)ndata.push({base:BASE.NULL,detail:void 0})
for(var _yy2=tile_y0;_yy2<=tile_y1;++_yy2){for(var jj=0;jj<3;++jj)for(var _ii3=0;_ii3<2;++_ii3)bget(ndata[3*jj+_ii3+1],tile_x0-1+_ii3,_yy2-1+jj)
var pixy=round(y+_yy2*tile_h)
var next_pixy=round(y+(_yy2+1)*tile_h)
draw_param.y=pixy
draw_param.h=next_pixy-pixy
for(var _xx2=tile_x0;_xx2<=tile_x1;++_xx2){for(var _jj=0;_jj<3;++_jj){var t=ndata[3*_jj]
ndata[3*_jj]=ndata[3*_jj+1]
ndata[3*_jj+1]=ndata[3*_jj+2]
bget(t,_xx2+1,_yy2-1+_jj)
ndata[3*_jj+2]=t}var my_info=ndata[4]
if(!my_info.base.ord)continue
var pixx=round(x+_xx2*tile_h)
var next_pixx=round(x+(_xx2+1)*tile_h)
var extra=my_info.detail
draw_param.x=pixx
draw_param.w=next_pixx-pixx
var base=my_info.base
draw_param.z=z0+1
draw_param.frame=base.frame+(base.anim?anim_frame:0)
sprites[""+base.sprite+lod].draw(draw_param)
var masks={}
var dmask=0
var overlays=[]
for(var _jj2=0,idx=8;_jj2<3;++_jj2)for(var _ii4=0;_ii4<3;++_ii4,--idx){var n=ndata[3*_jj2+_ii4]
var nb=n.base
if(nb.ord>base.ord)if(!masks[nb.ord]){overlays.push(nb)
masks[nb.ord]=1<<idx}else masks[nb.ord]|=1<<idx
if(n.detail===my_info.detail)dmask|=1<<idx}overlays.sort(function(a,b){return a.ord-b.ord})
for(var _ii5=0;_ii5<overlays.length;++_ii5){var _n=overlays[_ii5]
var ovr=overlayFor(_n,masks[_n.ord])
if(ovr)for(var _jj3=0;_jj3<ovr[1].length;++_jj3){draw_param.z++
draw_param.frame=ovr[1][_jj3]
sprites[""+ovr[0]+lod].draw(draw_param)}}if(extra){draw_param.z++
var _ovr=detailFor(extra,dmask)
for(var _jj4=0;_jj4<_ovr.length;++_jj4){draw_param.frame=_ovr[_jj4]
sprites[""+extra.sprite+lod].draw(draw_param)}}}}}}var solar_mouse_pos=vec2()
function drawSolarSystem(solar_system,x0,y0,z,w,h,star_xp,star_yp,fade){mousePos(solar_mouse_pos)
var pmtex=planetMapTexture(false)
x0=lerp(fade,star_xp,x0)
y0=lerp(fade,star_yp,y0)
var star_data=solar_system.star_data,planets=solar_system.planets
var xmid=x0+(w*=fade)/2
var ymid=y0+(h*=fade)/2
var sun_radius=star_data.game_radius
var sun_pad=.1*w
var c=star_data.color
drawCircle(xmid,ymid,z,sun_radius+2,.25,[c[0],c[1],c[2],fade],BLEND_ADDITIVE)
drawCircle(xmid,ymid,z+.005,sun_radius,.95,[c[0],c[1],c[2],fade])
var rstep=(w/2-sun_pad)/(planets.length+2)
var r0=sun_pad+rstep
var closest_planet=null
var closest_dist=Infinity
var allow_planet_select=!planet_view&&!eff_planet_view
for(var ii=0;ii<planets.length;++ii){var r=r0+rstep*ii
var planet=planets[ii]
var theta=planet.orbit+planet.orbit_speed*walltime()*ORBIT_RATE
var x=xmid+cos(theta%=2*PI)*r
var y=ymid+sin(theta)*r*VSCALE
var zz=z+(y-ymid)/h
var dist=v2distSq(solar_mouse_pos,[x,y])
if(dist<closest_dist&&dist<900&&allow_planet_select||!allow_planet_select&&ii===selected_planet_index){closest_dist=dist
closest_planet={idx:ii,x:x,y:y,z:zz}}drawHollowElipse(xmid,ymid,z-2,r,r*VSCALE,[.5,.5,0,fade])
var sprite_size=planet.size
var planet_shader_params={params:[getFrameTimestamp()*ROTATION_RATE,pmtex.width/sprite_size*1.5/255,2-theta/PI,0]}
var planet_tex=planet.getTexture(0,2*sprite_size/2,0,0,0,false)
if(planet_tex)spriteQueueRaw([pmtex,planet_tex,tex_palette_planets],x-sprite_size,y-sprite_size,zz,2*sprite_size,2*sprite_size,0,0,1,1,[1,1,1,fade],shader_planet_pixel,planet_shader_params)}if(closest_planet){var _planet=planets[closest_planet.idx]
drawCircle(closest_planet.x,closest_planet.y,closest_planet.z-.01,_planet.size+2,.85,[.5,1,1,fade],BLEND_ADDITIVE)
selected_planet_index=closest_planet.idx}else selected_planet_index=null
var br0=w/2*1.5
var br1=h/2*VSCALE*1.5
drawElipse(xmid-br0,ymid-br1,xmid+br0,ymid+br1,z-2.1,0,[0,0,0,fade])
return closest_planet}var last_solar_system=null
var last_selected_planet=null
var drag_temp=vec2()
function test(dt){gl.clearColor(0,0,0,1)
var z=Z.UI
var button_height=uiButtonHeight()
var button_width=uiButtonWidth()
var font_height=uiTextHeight()
var x=4
var button_spacing=button_height+6
var y=4
var w=min(game_width,game_height)
var map_x0=show_panel?game_width-w:(game_width-w)/2
var map_y0=0
spotSuppressPad()
function checkLevel(check_zoom_level){var zoom_level=gal_zoomer.zoom_level,zoom_offs=gal_zoomer.zoom_offs
var zoom=pow(2,zoom_level)
var layer_idx=floor(check_zoom_level/(LAYER_STEP/2))
var gal_x0=(camera2d.x0Real()-map_x0)/w/zoom+zoom_offs[0]
var gal_x1=(camera2d.x1Real()-map_x0)/w/zoom+zoom_offs[0]
var gal_y0=(camera2d.y0Real()-map_y0)/w/zoom+zoom_offs[1]
var gal_y1=(camera2d.y1Real()-map_y0)/w/zoom+zoom_offs[1]
var layer_res=pow(LAYER_STEP,layer_idx)
var layer_x0=max(0,floor(gal_x0*layer_res))
var layer_x1=min(layer_res-1,floor(gal_x1*layer_res))
var layer_y0=max(0,floor(gal_y0*layer_res))
var layer_y1=min(layer_res-1,floor(gal_y1*layer_res))
for(var cy=layer_y0;cy<=layer_y1;++cy)for(var cx=layer_x0;cx<=layer_x1;++cx)if(!galaxy.getCellTextured(layer_idx,cy*layer_res+cx).tex)return false
return true}var max_okay_zoom=gal_zoomer.zoom_level
if(galaxy){var zlis=[LAYER_STEP/2*ceil(gal_zoomer.zoom_level/(LAYER_STEP/2)),LAYER_STEP/2*ceil((gal_zoomer.zoom_level+1)/(LAYER_STEP/2))]
for(var ii=0;ii<zlis.length;++ii)if(checkLevel(zlis[ii]))max_okay_zoom=zlis[ii]}if(galaxy&&!debugDefineIsSet("ATTRACT"))galaxy.loading=false
if(!deepEqual(params,gen_params)){gen_params=clone(params)
var first=true
if(galaxy){first=false
galaxy.dispose()}(galaxy=createGalaxy(params)).loading=first||debugDefineIsSet("ATTRACT")
allocSprite()}if(keyDown(KEYS.CTRL)&&keyDownEdge(KEYS.C))copyCanvasToClipboard()
var hide_solar=eff_planet_view>=2
if(eff_planet_view<1&&planet_zoomer.target_zoom_level)planet_zoomer.resetZoom(0,0,0)
if(show_panel){if(buttonText({x:x,y:y,text:"View: "+(view?"Pixely":"Raw"),w:.75*button_width})||keyDownEdge(KEYS.V)){localStorageSetJSON("view",view=(view+1)%2)
setTimeout(function(){return engine.setPixelyStrict(1===view)},0)}if(buttonText({x:x+button_width-button_height,y:y,text:"<<",w:button_height})||keyDownEdge(KEYS.ESC))localStorageSetJSON("panel",show_panel=!show_panel)
y+=button_spacing
if(planet_view){if(buttonText({x:x,y:y,z:z,text:planet_override?"Override":"Generated"})){localStorageSetJSON("planet_override",planet_override=!planet_override)
planet_override_planet=null}y+=button_spacing
if(!hide_solar){if(buttonText({x:x,y:y,z:z,text:planet_flatmap?"Flatmap":"Globe"}))localStorageSetJSON("planet_flatmap",planet_flatmap=!planet_flatmap)
y+=button_spacing}var solar_system=last_solar_system
if(solar_system){print(style,x,y,z,"StarID: "+solar_system.star_id)
y+=font_height
if(planet_override){print(style,x,y,z,"Type: "+planet_params.name)
y+=font_height
var name_idx=PLANET_TYPE_NAMES.indexOf(planet_params.name)+1||1
name_idx=round(slider(name_idx,{x:x,y:y,z:z,min:1,max:PLANET_TYPE_NAMES.length}))
planet_params.name=PLANET_TYPE_NAMES[name_idx-1]
y+=button_spacing
if(!hide_solar){var orbit=planet_view_params.orbit
print(style,x,y,z,"Orbit: "+round(orbit))
y+=font_height
planet_view_params.orbit=round(slider(orbit,{x:x,y:y,z:z,min:0,max:360}))
y+=button_spacing
if(planet_view_params.orbit!==orbit)localStorageSetJSON("planet_view_params",planet_view_params)
var rot=planet_view_params.rot
print(style,x,y,z,"Rotation: "+round(rot))
y+=font_height
planet_view_params.rot=round(slider(rot,{x:x,y:y,z:z,min:0,max:360}))
y+=button_spacing
if(planet_view_params.rot!==rot)localStorageSetJSON("planet_view_params",planet_view_params)}print(style,x,y,z,"Seed: "+planet_params.seed)
y+=font_height
planet_params.seed=round(slider(planet_params.seed,{x:x,y:y,z:z,min:1,max:99}))
y+=button_spacing}else if(last_selected_planet){var planet=solar_system.planets[last_selected_planet.idx]
print(style,x,y,z,"Type: "+planet.type.name)
print(style,x,y+=font_height,z,"Size: "+round4(planet.size))
print(style,x,y+=font_height,z,"Seed: "+planet.seed)
y+=font_height
y+=button_spacing}}}else if(solar_view){if(buttonText({x:x,y:y,z:z,text:solar_override?"Override":"Generated"})){localStorageSetJSON("solar_override",solar_override=!solar_override)
solar_override_system=null}y+=button_spacing
if(solar_override){print(style,x,y,z,"StarID: "+solar_params.star_id)
y+=font_height
solar_params.star_id=round(slider(solar_params.star_id,{x:x,y:y,z:z,min:1,max:99}))
print(style,x,y+=button_spacing,z,"Seed: "+solar_params.seed)
y+=font_height
solar_params.seed=round(slider(solar_params.seed,{x:x,y:y,z:z,min:1,max:99}))
y+=button_spacing}}else{print(style,x,y,z,"Seed: "+params.seed)
y+=font_height
params.seed=round(slider(params.seed,{x:x,y:y,z:z,min:1,max:9999}))
y+=button_spacing
if(gal_zoomer.zoom_level<1.9){print(style,x,y,z,"Arms: "+params.arms)
y+=font_height
params.arms=round(slider(params.arms,{x:x,y:y,z:z,min:1,max:16}))
print(style,x,y+=button_spacing,z,"Arm Mods: "+params.len_mods)
y+=font_height
params.len_mods=round(slider(params.len_mods,{x:x,y:y,z:z,min:1,max:32}))
print(style,x,y+=button_spacing,z,"Twirl: "+params.twirl)
y+=font_height
params.twirl=round4(slider(params.twirl,{x:x,y:y,z:z,min:0,max:8}))
print(style,x,y+=button_spacing,z,"Center: "+params.center)
y+=font_height
params.center=round4(slider(params.center,{x:x,y:y,z:z,min:0,max:.3}))
print(style,x,y+=button_spacing,z,"Noise Freq: "+params.noise_freq)
y+=font_height
params.noise_freq=round4(slider(params.noise_freq,{x:x,y:y,z:z,min:.1,max:10}))
print(style,x,y+=button_spacing,z,"Noise Weight: "+params.noise_weight)
y+=font_height
params.noise_weight=round4(slider(params.noise_weight,{x:x,y:y,z:z,min:0,max:4}))
print(style,x,y+=button_spacing,z,"Lone Clusters: "+params.poi_count)
y+=font_height
params.poi_count=round(slider(params.poi_count,{x:x,y:y,z:z,min:0,max:1e3}))
y+=button_spacing}else{var layer_idx=round(gal_zoomer.zoom_level/(LAYER_STEP/2))
print(style,x,y,z,"Layer #"+layer_idx+":")
y+=font_height+2
var param=params["layer"+layer_idx]
if(param){print(style,x,y,z,"Noise Freq: "+param.noise_freq)
y+=font_height
param.noise_freq=round4(slider(param.noise_freq,{x:x,y:y,z:z,min:.1,max:100*pow(2,layer_idx)}))
print(style,x,y+=button_spacing,z,"Noise Weight: "+param.noise_weight)
y+=font_height
param.noise_weight=round4(slider(param.noise_weight,{x:x,y:y,z:z,min:0,max:4}))
y+=button_spacing}}}panel({x:x-4,y:0,w:button_width+8,h:y,z:z-1})}else{if(!debugDefineIsSet("ATTRACT")&&buttonText({x:x,y:y,text:">>",w:button_height})||keyDownEdge(KEYS.ESC))localStorageSetJSON("panel",show_panel=!show_panel)
y+=button_spacing}if(solar_view&&solar_override)if(!solar_override_system||!deepEqual(solar_params,gen_solar_params)){gen_solar_params=clone(solar_params)
localStorageSetJSON("solar_params",solar_params)
solar_override_system=solarSystemCreate(solar_params.seed,{id:solar_params.star_id})
planet_override_planet=null}if(planet_view&&planet_override)if(!planet_override_planet||!deepEqual(planet_params,gen_planet_params)){gen_planet_params=clone(planet_params)
localStorageSetJSON("planet_params",planet_params)
planet_override_planet=planetCreate((solar_override?solar_params.seed:galaxy.params.seed)+planet_params.seed,solar_override?solar_params.star_id:last_solar_system&&last_solar_system.star_id||0,planet_params)}if(buttonText({x:x=game_width-w+4,y:y=w-button_height,z:z,w:button_height,text:"-"})||keyDownEdge(KEYS.MINUS)||keyDownEdge(KEYS.Q)){use_mouse_pos=false
doZoom(.5,.5,-1)}x+=button_height+2
var SLIDER_W=110
var eff_zoom=gal_zoomer.target_zoom_level+solar_view+planet_view+planet_zoomer.target_zoom_level
var new_zoom=roundZoom(slider(eff_zoom,{x:x,y:y,z:z,w:SLIDER_W,min:0,max:MAX_ZOOM+MAX_PLANET_VIEW+planet_zoomer.max_zoom+1}))
if(abs(new_zoom-eff_zoom)>1e-6)doZoom(.5,.5,new_zoom-eff_zoom)
if(buttonText({x:x+=SLIDER_W+2,y:y,z:z,w:button_height,text:"+"})||keyDownEdge(KEYS.EQUALS)||keyDownEdge(KEYS.E)){use_mouse_pos=false
doZoom(.5,.5,1)}x+=button_height+2
var mouse_wheel=mouseWheel()
if(inputClick({button:2}))--mouse_wheel
if(mouse_wheel){use_mouse_pos=true
mousePos(mouse_pos)
if(mouse_wheel<0&&eff_solar_view_unsmooth&&!solar_view||mouse_wheel<0&&eff_planet_view_unsmooth&&!planet_view||mouse_wheel<0&&planet_view&&planet_zoomer.zoom_level&&!planet_zoomer.target_zoom_level||mouse_wheel<0&&planet_view&&eff_planet_view_unsmooth>planet_view||mouse_wheel>0&&planet_view&&eff_planet_view_unsmooth<planet_view||mouse_wheel>0&&solar_view&&eff_solar_view_unsmooth<solar_view);else doZoom((mouse_pos[0]-map_x0)/w,(mouse_pos[1]-map_y0)/w,mouse_wheel)}zoomTick(max_okay_zoom)
var zoom=pow(2,gal_zoomer.zoom_level)
var zoom_text_y=floor(y+(button_height-font_height)/2)
var zoom_text_w=print(null,x,zoom_text_y,z,solar_view?planet_view?planet_view>1?"Atmos":"Orbit ":"Solar":zoom.toFixed(0)+"X")
drawRect(x-2,zoom_text_y,x+zoom_text_w+2,zoom_text_y+font_height,z-1,color_text_backdrop)
var planet_zoom=pow(2,planet_zoomer.zoom_level)
x=game_width-w
if(!solar_view){var legend_scale=.25
var legend_x0=game_width-w*legend_scale-2
var legend_x1=game_width-4
var legend_color=solar_view?color_legend_fade:unit_vec
drawLine(legend_x0,(y=w)-4.5,legend_x1,y-4.5,z,1,1,legend_color)
drawLine(legend_x0-.5,y-7,legend_x0-.5,y-2,z,1,1,legend_color)
drawLine(legend_x1+.5,y-7,legend_x1+.5,y-2,z,1,1,legend_color)
var ly=legend_scale*params.width_ly/zoom
var legend_y=y-6-font_height
font.drawSizedAligned(solar_view?font_style_fade:null,legend_x0,legend_y,z,font_height,font.ALIGN.HCENTER,legend_x1-legend_x0,0,format(ly)+"ly")
drawRect(legend_x0-2,legend_y,legend_x1+2,y,z-1,color_text_backdrop)}x=map_x0
y=map_y0
v2set(drag_temp,0,0)
var kb_scale=keyDown(KEYS.SHIFT)?.5:.125
drag_temp[0]+=keyDown(KEYS.A)*kb_scale
drag_temp[0]-=keyDown(KEYS.D)*kb_scale
drag_temp[1]+=keyDown(KEYS.W)*kb_scale
drag_temp[1]-=keyDown(KEYS.S)*kb_scale
var drag=inputDrag()
if(drag&&drag.delta){v2add(drag_temp,drag_temp,drag.delta)
use_mouse_pos=true}if(drag_temp[0]||drag_temp[1])if(solar_view){if(eff_planet_view>1)planet_zoomer.drag(drag_temp,w)}else gal_zoomer.drag(drag_temp,w)
if(debugDefineIsSet("ATTRACT")||true){gal_zoomer.zoom_offs[0]=clamp(gal_zoomer.zoom_offs[0],0,1-1/zoom)
gal_zoomer.zoom_offs[1]=clamp(gal_zoomer.zoom_offs[1],0,1-1/zoom)}else{gal_zoomer.zoom_offs[0]=clamp(gal_zoomer.zoom_offs[0],-1/zoom,1)
gal_zoomer.zoom_offs[1]=clamp(gal_zoomer.zoom_offs[1],-1/zoom,1)}if(eff_planet_view>1){if(planet_zoomer.zoom_offs[0]<-1)planet_zoomer.zoom_offs[0]+=2
if(planet_zoomer.zoom_offs[0]>1)planet_zoomer.zoom_offs[0]-=2
planet_zoomer.zoom_offs[1]=clamp(planet_zoomer.zoom_offs[1],0,1-1/planet_zoom)}if(mouseMoved())use_mouse_pos=true
if(use_mouse_pos)mousePos(mouse_pos)
else{mouse_pos[0]=map_x0+w/2
mouse_pos[1]=map_y0+w/2}mouse_pos[0]=gal_zoomer.zoom_offs[0]+(mouse_pos[0]-map_x0)/w/zoom
mouse_pos[1]=gal_zoomer.zoom_offs[1]+(mouse_pos[1]-map_y0)/w/zoom
var overlay_y=0
var overlay_x=show_panel?map_x0+2:2*button_height
var overlay_w=0
function overlayText(line){if(debugDefineIsSet("ATTRACT"))return
var textw=print(null,overlay_x,overlay_y,z,line)
overlay_w=max(overlay_w,textw)
overlay_y+=font_height}if(0)overlayText((use_mouse_pos?"Mouse":"Target")+": "+mouse_pos[0].toFixed(9)+","+mouse_pos[1].toFixed(9))
function highlightCell(cell){var zoom_offs=gal_zoomer.zoom_offs
var xp=x+(cell.x0-zoom_offs[0])*zoom*w
var yp=y+(cell.y0-zoom_offs[1])*zoom*w
var wp=w*zoom*cell.w
var hp=w*zoom*cell.h
if(1===view){xp=round(xp)
yp=round(yp)
hp=round(hp)
wp=round(wp)}if(debugDefineIsSet("CELL")){drawHollowRect2({x:xp-.5,y:yp-.5,w:wp+1,h:hp+1,z:Z.UI-8,color:color_highlight})
overlayText("Layer "+cell.layer_idx+", Cell "+cell.cell_idx+" ("+cell.cx+","+cell.cy+")")
overlayText("Stars: "+format(cell.star_count))
if(cell.pois.length)overlayText("POIs: "+cell.pois.length)}if(debugDefineIsSet("CURSOR")){var dx=floor((mouse_pos[0]-cell.x0)/cell.w*galaxy.buf_dim)
var dy=floor((mouse_pos[1]-cell.y0)/cell.w*galaxy.buf_dim)
if(cell.data)overlayText("Value: "+cell.data[dy*galaxy.buf_dim+dx].toFixed(5))}}var did_highlight=false
function checkCellHighlight(cell){if(cell.ready&&!did_highlight&&mouse_pos[0]>=cell.x0&&mouse_pos[0]<cell.x0+cell.w&&mouse_pos[1]>=cell.y0&&mouse_pos[1]<cell.y0+cell.h){did_highlight=true
highlightCell(cell)}}function drawCell(alpha,parent,cell){var zoom_level=gal_zoomer.zoom_level,zoom_offs=gal_zoomer.zoom_offs;++cells_drawn
var qx=cell.cx-parent.cx*LAYER_STEP
var qy=cell.cy-parent.cy*LAYER_STEP
var draw_param={x:x+(cell.x0-zoom_offs[0])*zoom*w,y:y+(cell.y0-zoom_offs[1])*zoom*w,w:w*zoom*cell.w,h:w*zoom*cell.h,z:Z.BACKGROUND,nozoom:true,shader:1===view?shader_galaxy_pixel:shader_galaxy_blend,shader_params:void 0}
var partial=false
if(!parent.tex){if(!cell.tex)return
alpha=1
partial=true}else if(!cell.tex){alpha=0
partial=true}var dither=lerp(clamp(zoom_level-12.5,0,1),params.dither,0)
draw_param.shader_params={params:[alpha?buf_dim:buf_dim/LAYER_STEP,dither],scale:[qx/LAYER_STEP,qy/LAYER_STEP,1/LAYER_STEP,alpha]}
var texs=cell.texs
if(!texs){texs=[cell.tex||white_tex,parent.tex||white_tex,tex_palette]
if(!partial)cell.texs=texs}debug_sprite.texs=texs
debug_sprite.draw(draw_param)}function drawLevel(layer_idx,alpha,do_highlight){var zoom_offs=gal_zoomer.zoom_offs
var gal_x0=(camera2d.x0Real()-map_x0)/w/zoom+zoom_offs[0]
var gal_x1=(camera2d.x1Real()-map_x0)/w/zoom+zoom_offs[0]
var gal_y0=(camera2d.y0Real()-map_y0)/w/zoom+zoom_offs[1]
var gal_y1=(camera2d.y1Real()-map_y0)/w/zoom+zoom_offs[1]
var layer_res=pow(LAYER_STEP,layer_idx)
var layer_x0=max(0,floor(gal_x0*layer_res))
var layer_x1=min(layer_res-1,floor(gal_x1*layer_res))
var layer_y0=max(0,floor(gal_y0*layer_res))
var layer_y1=min(layer_res-1,floor(gal_y1*layer_res))
var pres=pow(LAYER_STEP,layer_idx-1)
for(var cy=layer_y0;cy<=layer_y1;++cy)for(var cx=layer_x0;cx<=layer_x1;++cx){var cell=galaxy.getCellTextured(layer_idx,cy*layer_res+cx)
var px=floor(cx/LAYER_STEP)
var py=floor(cy/LAYER_STEP)
var parent=galaxy.getCellTextured(layer_idx-1,py*pres+px)
drawCell(alpha,parent,cell)
if(do_highlight)checkCellHighlight(cell)
else checkCellHighlight(parent)}}var blend_range=1
var draw_level=max(cells_drawn=0,(gal_zoomer.zoom_level-1)/(LAYER_STEP/2)+blend_range/2)
var level0=floor(draw_level)
var extra=min((draw_level-level0)/blend_range,1)
if(!extra&&level0){level0--
extra=1}drawLevel(level0+1,extra,Boolean(extra))
if(gal_zoomer.zoom_level>=12){var star
var SELECT_DIST=40
if(!solar_override_system)if((solar_view||eff_solar_view)&&null!==selected_star_id)star=galaxy.getStar(selected_star_id)
else{var closest=galaxy.starsNear(mouse_pos[0],mouse_pos[1],1)
var star_id=closest.length?closest[0]:null
if((star=null!==star_id&&galaxy.getStar(star_id))&&sqrt(distSq(star.x,star.y,mouse_pos[0],mouse_pos[1]))*zoom*w>SELECT_DIST)star=null
if(star)selected_star_id=star_id
else selected_star_id=null}var xp=x+w/2
var yp=y+w/2
if(star){if(debugDefineIsSet("STAR")){overlayText("star.x: "+star.x.toFixed(10))
overlayText("star.y: "+star.y.toFixed(10))}var _max_zoom=pow(2,gal_zoomer.max_zoom)
xp=star.x*_max_zoom*buf_dim
yp=star.y*_max_zoom*buf_dim
if(debugDefineIsSet("STAR")){overlayText("rel star.x: "+xp.toFixed(2))
overlayText("rel star.y: "+yp.toFixed(2))}if(1===view){xp=floor(xp)
yp=floor(yp)}xp=x+(xp*zoom/_max_zoom/buf_dim-gal_zoomer.zoom_offs[0]*zoom)*w
yp=y+(yp*zoom/_max_zoom/buf_dim-gal_zoomer.zoom_offs[1]*zoom)*w
if(1===view){xp=round(xp)
yp=round(yp)}var _r=4/(1+gal_zoomer.max_zoom-gal_zoomer.zoom_level)
if(!solar_view){drawHollowCircle(xp+.5,yp+.5,Z.UI-5,_r,.5,[1,1,0,1],BLEND_ADDITIVE)
if(inputClick({x:xp-SELECT_DIST,y:yp-SELECT_DIST,w:2*SELECT_DIST,h:2*SELECT_DIST})){if(gal_zoomer.zoom_level<gal_zoomer.max_zoom)doZoom((xp-map_x0)/w,(yp-map_y0)/w,gal_zoomer.max_zoom-gal_zoomer.zoom_level)
solarZoom(1)}}galaxy.getStarData(star)}var _solar_system=solar_override_system||star&&star.solar_system
last_solar_system=_solar_system||null
if(_solar_system){var planets=_solar_system.planets,star_data=_solar_system.star_data,name=_solar_system.name
if(!hide_solar){overlayText((name||(star&&star.id?"Star #"+star.id:"")||"Override Star")+(", Type: "+star_data.label))
for(var _ii6=0;_ii6<planets.length;++_ii6){var _planet2=planets[_ii6]
if(!planet_view||selected_planet_index===_ii6)overlayText((!planet_view&&selected_planet_index===_ii6?"*":" ")+" Planet #"+(_ii6+1)+": Class "+_planet2.type.name)}}var do_solar_view=eff_solar_view?eff_solar_view:debugDefineIsSet("AUTOSOLAR")&&gal_zoomer.zoom_level>15.5?1:0
if(hide_solar)do_solar_view=0
if(do_solar_view){var selected_planet=drawSolarSystem(_solar_system,map_x0,map_y0,Z.SOLAR,w,w,xp,yp,do_solar_view)
last_selected_planet=selected_planet
if(solar_view){var do_planet_view=eff_planet_view?min(eff_planet_view,1):0
if(do_planet_view&&null!==selected_planet_index&&(selected_planet||planet_override&&planet_override_planet))drawPlanet(_solar_system,selected_planet||{idx:0,x:0,y:0,z:Z.SOLAR},map_x0,map_y0,Z.PLANET,w,w,do_planet_view)
else if(!selected_planet){selected_planet_index=null
planet_view=0}}}}else if(star)overlayText("Star #"+star.id)
if(eff_planet_view>1){assert(_solar_system)
assert(null!==selected_planet_index)
var _planets=_solar_system.planets
var _planet3=planet_override?planet_override_planet:_planets[selected_planet_index]
if(!_planet3){planet_view=0
if(planet_zoomer.target_zoom_level)planet_zoomer.resetZoom(0,0,0)}else{var ww=planet_zoom*w
planetMapMode(_planet3,map_x0+(0-planet_zoomer.zoom_offs[0])*ww,map_y0+(0-planet_zoomer.zoom_offs[1])*ww,Z.PLANET_MAP,ww,clamp(eff_planet_view-1,0,1),planet_zoomer.zoom_level)}}}if(inputClick({x:-Infinity,y:-Infinity,w:Infinity,h:Infinity})){use_mouse_pos=true
mousePos(mouse_pos)
doZoom((mouse_pos[0]-map_x0)/w,(mouse_pos[1]-map_y0)/w,solar_view&&(null===selected_planet_index||planet_view)?-1:1)}drawRect(overlay_x-2,0,overlay_x+overlay_w+2,overlay_y,z-1,color_text_backdrop)
if(debugDefineIsSet("ATTRACT")&&!netDisconnected())engine.postRender(saveSnapshot)}function testInit(dt){engine.setState(test)
test(dt)}engine.setState(testInit)}

},{"../glov/client/autoatlas":11,"../glov/client/camera2d":15,"../glov/client/engine":21,"../glov/client/framebuffer":29,"../glov/client/input":37,"../glov/client/local_storage":40,"../glov/client/local_storage.js":40,"../glov/client/net":48,"../glov/client/perf":51,"../glov/client/shaders":61,"../glov/client/slider":63,"../glov/client/spot":66,"../glov/client/sprite_sets.js":67,"../glov/client/sprites":68,"../glov/client/textures":70,"../glov/client/ui":72,"../glov/client/walltime":75,"../glov/common/util":96,"../glov/common/vmath":98,"./biomes":2,"./galaxy":3,"./img/font/04b03_8x1.json":4,"./img/font/04b03_8x2.json":5,"./img/font/palanquin32.json":6,"./solar_system":8,"assert":undefined}],8:[function(require,module,exports){
"use strict"
exports.SolarSystem=exports.Planet=exports.PLANET_TYPE_NAMES=exports.BIT_SAME_LOOSE=exports.BIT_SAME9=void 0
exports.planetCreate=planetCreate
exports.planetMapFlatTexture=planetMapFlatTexture
exports.planetMapTexture=planetMapTexture
exports.solarSystemCreate=solarSystemCreate
var _BIOME_VARIATION
var BIT_SAME9=1
exports.BIT_SAME9=BIT_SAME9
var BIT_SAME_LOOSE=2
exports.BIT_SAME_LOOSE=BIT_SAME_LOOSE
var assert=require("assert")
var _glovClientEngine=require("../glov/client/engine")
var getFrameIndex=_glovClientEngine.getFrameIndex
var _glovClientTextures=require("../glov/client/textures")
var TEXTURE_FORMAT=_glovClientTextures.TEXTURE_FORMAT
var textureLoad=_glovClientTextures.textureLoad
var _glovCommonRand_alea=require("../glov/common/rand_alea")
var mashString=_glovCommonRand_alea.mashString
var randCreate=_glovCommonRand_alea.randCreate
var _glovCommonUtil=require("../glov/common/util")
var clamp=_glovCommonUtil.clamp
var defaults=_glovCommonUtil.defaults
var lerp=_glovCommonUtil.lerp
var nextHighestPowerOfTwo=_glovCommonUtil.nextHighestPowerOfTwo
var _glovCommonVmath=require("../glov/common/vmath")
var vec2=_glovCommonVmath.vec2
var vec3=_glovCommonVmath.vec3
var vec4=_glovCommonVmath.vec4
var SimplexNoise=require("simplex-noise")
var _biomes=require("./biomes")
var BIOMES=_biomes.BIOMES
var BIOMES_SAME_LOOSE=_biomes.BIOMES_SAME_LOOSE
var _star_types=require("./star_types")
var starTypeData=_star_types.starTypeData
var starTypeFromID=_star_types.starTypeFromID
var abs=Math.abs,atan2=Math.atan2,max=Math.max,min=Math.min,round=Math.round,sqrt=Math.sqrt,PI=Math.PI,pow=Math.pow
var rand=[randCreate(0),randCreate(0),randCreate(0),randCreate(0)]
var planet_gen_layer
var sampleBiomeMap
function weightDefault(){return.5}function weightBiomeRange(mn,mx,weight){return function(x,y,h){var v=sampleBiomeMap()
return v>mn&&v<mx?weight:0}}var BOTTOM_LAYER=5
var BIOME_VARIATION=((_BIOME_VARIATION={})[BIOMES.GREEN_PLAINS]=[{weight:.1,biome:BIOMES.GREEN_FOREST},{min_layer:BOTTOM_LAYER-1,offs:1,weight:.05,freqx:111,freqy:111,biome:BIOMES.WATER_SHALLOW}],_BIOME_VARIATION[BIOMES.DESERT]=[{weight:.01,biome:BIOMES.WATER_SHALLOW}],_BIOME_VARIATION[BIOMES.GREEN_FOREST]=[{weight:.01,biome:BIOMES.WATER_SHALLOW},{min_layer:BOTTOM_LAYER-1,offs:1,weight:.05,freqx:111,freqy:111,biome:BIOMES.GREEN_PLAINS}],_BIOME_VARIATION)
var color_table_frozen=[.23,BIOMES.FROZEN_OCEAN,.77,BIOMES.FROZEN_PLAINS,1,BIOMES.FROZEN_MOUNTAINS]
var color_table_earthlike=[.4,BIOMES.WATER_DEEP,.5,BIOMES.WATER_SHALLOW,.65,BIOMES.GREEN_PLAINS,.75,BIOMES.MOUNTAINS,1,BIOMES.MOUNTAINS_SNOW]
var color_table_earthlike_forest=[.4,BIOMES.WATER_DEEP,.5,BIOMES.WATER_SHALLOW,.52,BIOMES.GREEN_PLAINS,.64,BIOMES.GREEN_FOREST,.65,BIOMES.GREEN_PLAINS,.75,BIOMES.MOUNTAINS,1,BIOMES.MOUNTAINS_SNOW]
var color_table_earthlike_desert=[.4,BIOMES.WATER_DEEP,.5,BIOMES.WATER_SHALLOW,.65,BIOMES.DESERT,.75,BIOMES.MOUNTAINS,1,BIOMES.MOUNTAINS_SNOW]
var biome_entry_earthlike={weight_func:weightDefault,color_table:color_table_earthlike}
var biome_entry_icecaps={weight_func:function weight_func(x,y,h){return 1-5*min(y,1-y)+1.8*(h-.5)},color_table:color_table_frozen}
var biome_table_earthlike=[biome_entry_earthlike,biome_entry_icecaps,{weight_func:weightBiomeRange(.6,1,.55),color_table:color_table_earthlike_forest},{weight_func:function weight_func(x,y,h){if(0===planet_gen_layer)return 0
var v=sampleBiomeMap()
return 1-8*abs(y-.5)-4*h+2.5+v-.5},color_table:color_table_earthlike_desert}]
var biome_entry_earthlike_islands={weight_func:weightDefault,color_table:[.6,BIOMES.WATER_DEEP,.7,BIOMES.WATER_SHALLOW,.8,BIOMES.GREEN_FOREST,1,BIOMES.GREEN_PLAINS]}
var biome_table_earthlike_islands=[biome_entry_earthlike_islands]
var biome_entry_earthlike_pangea={weight_func:weightDefault,color_table:[.25,BIOMES.WATER_DEEP,.3,BIOMES.WATER_SHALLOW,.68,BIOMES.GREEN_FOREST,.75,BIOMES.GREEN_PLAINS,1,BIOMES.MOUNTAINS]}
var biome_table_earthlike_pangea=[biome_entry_earthlike_pangea,biome_entry_icecaps]
var biome_entry_water_world={weight_func:weightDefault,color_table:[.5,BIOMES.WATER_DEEP,.8,BIOMES.WATER_SHALLOW,1,BIOMES.WATER_DEEP]}
var biome_table_water_world=[biome_entry_water_world]
var biome_entry_low_life={weight_func:weightDefault,color_table:[.3,BIOMES.WATER_SHALLOW,.7,BIOMES.DIRT,1,BIOMES.DEAD_FOREST]}
var biome_table_low_life=[biome_entry_low_life]
var biome_entry_molten={weight_func:weightDefault,color_table:[.25,BIOMES.MOLTEN_MOUNTAINS,.46,BIOMES.MOLTEN_PLAINS,.54,BIOMES.MOLTEN_LAVAFLOW,.75,BIOMES.MOLTEN_PLAINS,1,BIOMES.MOLTEN_MOUNTAINS]}
var biome_table_molten=[biome_entry_molten]
var biome_entry_molten_small={weight_func:weightDefault,color_table:[.4,BIOMES.MOLTEN_PLAINS,.6,BIOMES.MOLTEN_LAVAFLOW,1,BIOMES.MOLTEN_MOUNTAINS]}
var biome_table_molten_small=[biome_entry_molten_small]
var biome_entry_gray={weight_func:weightDefault,color_table:[.25,BIOMES.MOONROCK1,.5,BIOMES.MOONROCK2,.75,BIOMES.MOONROCK3,1,BIOMES.MOONROCK4]}
var biome_table_gray=[biome_entry_gray]
var biome_entry_frozen={weight_func:weightDefault,color_table:color_table_frozen}
var biome_table_frozen=[biome_entry_frozen]
var biome_entry_gasgiant1={weight_func:weightDefault,color_table:[.2,BIOMES.GAS_ORANGE_LIGHT,.35,BIOMES.GAS_ORANGE_DARK,.5,BIOMES.GAS_GRAY,.65,BIOMES.GAS_ORANGE_LIGHT,.8,BIOMES.GAS_ORANGE_DARK,1,BIOMES.GAS_GRAY]}
var biome_table_gasgiant1=[biome_entry_gasgiant1]
var biome_entry_dirt={weight_func:weightDefault,color_table:[.5,BIOMES.DIRT,1,BIOMES.DIRT_DARK]}
var biome_table_dirt=[biome_entry_dirt]
var biome_entry_gasgiant2={weight_func:weightDefault,color_table:[.2,BIOMES.GAS_PURPLE_LIGHT,.4,BIOMES.GAS_PURPLE_DARK,.6,BIOMES.GAS_PURPLE_LIGHT,.8,BIOMES.GAS_PURPLE_DARK,1,BIOMES.GAS_PURPLE_LIGHT]}
var biome_table_gasgiant2=[biome_entry_gasgiant2]
var biome_entry_gasgiant3={weight_func:weightDefault,color_table:[.2,BIOMES.GAS_RED,.4,BIOMES.GAS_YELLOW_RED,.6,BIOMES.GAS_RED,.8,BIOMES.GAS_YELLOW_RED,1,BIOMES.GAS_RED]}
var biome_table_gasgiant3=[biome_entry_gasgiant3]
var biome_entry_gasgiant4={weight_func:weightDefault,color_table:[.2,BIOMES.GAS_BLUE_MED,.35,BIOMES.GAS_BLUE_LIGHT,.5,BIOMES.GAS_BLUE_DARK,.65,BIOMES.GAS_BLUE_MED,.8,BIOMES.GAS_BLUE_LIGHT,1,BIOMES.GAS_BLUE_DARK]}
var biome_table_gasgiant4=[biome_entry_gasgiant4]
var biome_entry_gasgiant5={weight_func:weightDefault,color_table:[.2,BIOMES.GAS_YELLOW,.35,BIOMES.GAS_YELLOW_RED,.5,BIOMES.GAS_ORANGE_LIGHT,.65,BIOMES.GAS_YELLOW,.8,BIOMES.GAS_YELLOW_RED,1,BIOMES.GAS_ORANGE_LIGHT]}
var biome_table_gasgiant5=[biome_entry_gasgiant5]
var noise_base={frequency:2,amplitude:1,persistence:.5,lacunarity:{min:1.6,max:2.8,freq:.3},octaves:6,cutoff:.5,domain_warp:0,warp_freq:1,warp_amp:.1,skew_x:1,skew_y:1}
function noiseMod(opts,base){return defaults(opts,(base=base||noise_base)||noise_base)}var noise_biome_base=noiseMod({lacunarity:2})
var noise_gasgiant=noiseMod({skew_x:.2,domain_warp:1,warp_amp:.1})
var noise_molten=noiseMod({domain_warp:0,warp_amp:.1})
var noise_dirt=noiseMod({domain_warp:1,warp_amp:.3})
var noise_waterworld=noiseMod({skew_x:.5,domain_warp:1,warp_amp:.3})
var PLANET_TYPE_NAMES=["D","H","J","K","L","M","N","P","R","T","W","Y"]
exports.PLANET_TYPE_NAMES=PLANET_TYPE_NAMES
var planet_types=[{name:"D",size:[4,8],color:vec4(.7,.7,.7,1),biome_tables:[biome_table_gray],noise:noise_base},{name:"H",size:[6,10],color:vec4(.3,.4,.5,1),biome_tables:[biome_table_gray],noise:noise_base},{name:"J",size:[12,20],color:vec4(.9,.6,0,1),biome_tables:[biome_table_gasgiant1,biome_table_gasgiant4],noise:noise_gasgiant},{name:"K",size:[8,12],color:vec4(.5,.3,.2,1),biome_tables:[biome_table_dirt],noise:noise_dirt},{name:"L",size:[6,10],bias:1,color:vec4(.3,.7,.3,1),biome_tables:[biome_table_frozen],noise:noise_base},{name:"M",size:[9,12],color:vec4(0,1,0,1),biome_tables:[biome_table_earthlike,biome_table_earthlike_islands,biome_table_earthlike_pangea],noise:noise_base},{name:"N",size:[4,8],bias:-1,color:vec4(.6,.6,0,1),biome_tables:[biome_table_molten_small],noise:noise_molten},{name:"P",size:[4,14],bias:1,color:vec4(.5,.7,1,1),biome_tables:[biome_table_frozen],noise:noise_base},{name:"R",size:[6,12],color:vec4(.2,.3,.2,1),biome_tables:[biome_table_low_life],noise:noise_base},{name:"T",size:[12,20],color:vec4(.6,.9,0,1),biome_tables:[biome_table_gasgiant2,biome_table_gasgiant3,biome_table_gasgiant5],noise:noise_gasgiant},{name:"W",size:[8,18],color:vec4(.3,.3,1,1),biome_tables:[biome_table_water_world],noise:noise_waterworld},{name:"Y",size:[8,18],color:vec4(1,.3,0,1),biome_tables:[biome_table_molten],noise:noise_base}]
function randExp(idx,mn,mx){var v=rand[idx].random()
return mn+(mx-mn)*(v*=v)}function typeFromName(name){for(var ii=0;ii<planet_types.length;++ii)if(planet_types[ii].name===name)return planet_types[ii]
assert(false)}var Planet=function Planet(override_data){this.type=void 0
this.size=void 0
this.orbit=void 0
this.orbit_speed=void 0
this.seed=void 0
this.biome_table=void 0
this.tex_idx=0
this.work_frame=0
this.texpairs={}
this.type=(override_data=override_data||{}).name?typeFromName(override_data.name):planet_types[rand[2].range(planet_types.length)]
this.size=override_data.size||randExp(3,this.type.size[0],this.type.size[1])
this.orbit=11*rand[0].floatBetween(0,2*PI)
this.orbit_speed=randExp(1,.1,1)
this.seed=override_data.seed||rand[2].uint32()
var biome_tables=this.type.biome_tables
this.biome_table=biome_tables[rand[1].range(biome_tables.length)]}
exports.Planet=Planet
var noise
var noise_warp
var noise_skew=vec2()
var total_amplitude
var noise_field
var subopts
function initNoise(seed,subopts_in){subopts=subopts_in
noise=new Array(subopts.octaves+2)
for(var ii=0;ii<noise.length;++ii)noise[ii]=new SimplexNoise(seed+"n"+ii)
noise_warp=new Array(subopts.domain_warp)
for(var _ii=0;_ii<noise_warp.length;++_ii)noise_warp[_ii]=new SimplexNoise(seed+"w"+_ii)
total_amplitude=0
var amp=subopts.amplitude
var p=subopts.persistence&&subopts.persistence.max||subopts.persistence
for(var _ii2=0;_ii2<subopts.octaves;_ii2++){total_amplitude+=amp
amp*=p}noise_field={}
for(var f in subopts){var v=subopts[f]
if("object"===typeof v){var f2=f
noise_field[f2]=new SimplexNoise(seed+"f"+subopts.key+f2)
v.mul=.5*(v.max-v.min)
v.add=v.min+v.mul}}noise_skew[0]=2*subopts.skew_x
noise_skew[1]=subopts.skew_y}var biome_subopts
var biome_total_amplitude
function initBiomeNoise(subopts_in){biome_subopts=subopts_in
biome_total_amplitude=0
var amp=subopts.amplitude
var p=biome_subopts.persistence
for(var ii=0;ii<biome_subopts.octaves;ii++){biome_total_amplitude+=amp
amp*=p}}var sample_pos=vec2()
function sampleBiomeMapAtPos(x,y){sample_pos[0]=2*x+77
sample_pos[1]=y+77
var total=0
var amp=biome_subopts.amplitude
var freq=biome_subopts.frequency
var p=biome_subopts.persistence
var lac=biome_subopts.lacunarity
for(var i=0;i<biome_subopts.octaves;i++){total+=(.5+.5*noise[i].noise2D(sample_pos[0]*freq,sample_pos[1]*freq))*amp
amp*=p
freq*=lac}return total/biome_total_amplitude}var biome_map_pos=vec3()
var biome_value=null
sampleBiomeMap=function sampleBiomeMap(){if(null===biome_value){var v=sampleBiomeMapAtPos(biome_map_pos[0],biome_map_pos[1])
var w=biome_map_pos[2]
if(w<1){var v2=sampleBiomeMapAtPos(biome_map_pos[0]-1,biome_map_pos[1])
v=lerp(w,v,v2)}biome_value=v}return biome_value}
var get=function get(field){var v=subopts[field]
if("object"!==typeof v)return v
return v.add+v.mul*noise_field[field].noise2D(sample_pos[0]*v.freq,sample_pos[1]*v.freq)}
var sample=function sample(x,y){sample_pos[0]=x*noise_skew[0]
sample_pos[1]=y*noise_skew[1]
var warp_freq=subopts.warp_freq
var warp_amp=subopts.warp_amp
for(var ii=0;ii<subopts.domain_warp;++ii){var dx=noise_warp[ii].noise2D(sample_pos[0]*warp_freq,sample_pos[1]*warp_freq)
var dy=noise_warp[ii].noise2D((sample_pos[0]+7)*warp_freq,sample_pos[1]*warp_freq)
sample_pos[0]+=dx*warp_amp
sample_pos[1]+=dy*warp_amp}var total=0
var amp=subopts.amplitude
var freq=get("frequency")
var p=get("persistence")
var lac=get("lacunarity")
for(var i=0;i<subopts.octaves;i++){total+=(.5+.5*noise[i].noise2D(sample_pos[0]*freq,sample_pos[1]*freq))*amp
amp*=p
freq*=lac}return total/total_amplitude}
var colorIndex=function colorIndex(table,value){for(var ii=0;ii<table.length;ii+=2)if(value<=table[ii])return table[ii+1]
return table[table.length-1]}
var MAX_TEXTURES=20
var tex_pools={}
var planet_tex_id=0
var PLANET_MIN_RES=8
var PLANET_MAX_RES=256
var tex_data_temp=new Uint8Array(PLANET_MAX_RES*PLANET_MAX_RES*2)
Planet.prototype.getDetails=function(tex,nmap,texture_size,sub_x,sub_y){assert(!tex.details)
var ret=new Uint8Array(texture_size*texture_size)
var ndata=[0,0,0,0,0,0,0,0,0]
function nget(xx,yy){var nidx=4
if(yy<0){nidx-=3
yy+=texture_size}else if(yy>=texture_size){nidx+=3
yy-=texture_size}if(xx<0){nidx--
xx+=texture_size}else if(xx>=texture_size){nidx++
xx-=texture_size}return nmap[nidx][yy*texture_size+xx]}for(var yy=0,idx=0;yy<texture_size;++yy){for(var jj=0;jj<3;++jj)for(var ii=0;ii<2;++ii)ndata[3*jj+ii+1]=nget(ii-1,yy-1+jj)
for(var xx=0;xx<texture_size;++xx,++idx){for(var _jj=0;_jj<3;++_jj){ndata[3*_jj]=ndata[3*_jj+1]
ndata[3*_jj+1]=ndata[3*_jj+2]
ndata[3*_jj+2]=nget(xx+1,yy-1+_jj)}var my_v=ndata[4]
var all_same=true
var all_same_loose=true
for(var _ii3=0;_ii3<9;++_ii3)if(ndata[_ii3]!==my_v){all_same=false
if(!BIOMES_SAME_LOOSE[my_v][ndata[_ii3]]){all_same_loose=false
break}}var ret_bits=0
if(all_same)ret_bits|=BIT_SAME9
if(all_same_loose)ret_bits|=BIT_SAME_LOOSE
ret[idx]=ret_bits}}tex.details=ret}
Planet.prototype.getTexture=function(layer,texture_size,sublayer,sub_x,sub_y,want_details){if(2!==layer)assert(!sublayer&&!sub_x&&!sub_y)
var tp_idx=layer+65536*(65536*sublayer+sub_y)+sub_x
var tp=this.texpairs[tp_idx]
if(tp&&tp.tex.planet_tex_id===tp.tex_id){if(want_details&&!tp.tex.details&&getFrameIndex()!==this.work_frame){var _nmap=[]
var nready=true
var hhh=pow(2,sublayer)
var www=2*hhh
outer:for(var dy=-1;dy<=1;++dy)for(var dx=-1;dx<=1;++dx){var elem=this.getTexture(layer,texture_size,sublayer,(sub_x+dx+www)%www,(sub_y+dy+hhh)%hhh,false)
if(!elem){nready=false
break outer}_nmap[3*(dy+1)+dx+1]=elem.raw_data}if(nready&&getFrameIndex()!==this.work_frame){this.getDetails(tp.tex,_nmap,texture_size,sub_x,sub_y)
this.work_frame=getFrameIndex()}}return tp.tex}if(getFrameIndex()===this.work_frame)return null
this.work_frame=getFrameIndex()
var tex_data=tp?tp.tex.raw_data:tex_data_temp
var biome_table=this.biome_table
var planet_h=clamp(nextHighestPowerOfTwo(texture_size),PLANET_MIN_RES,PLANET_MAX_RES)
var planet_w=2*planet_h
var tex_h=planet_h
var tex_w=planet_w
var zoom=pow(2,sublayer)
if(sublayer){tex_w=tex_h
planet_h*=zoom
planet_w*=zoom}assert(tex_data.length>=tex_h*tex_w)
initNoise(this.seed,this.type.noise)
initBiomeNoise(this.type.noise_biome||noise_biome_base)
planet_gen_layer=layer
for(var idx=0,jj=0;jj<tex_h;++jj){var unif_y=(sub_y*tex_h+jj)/planet_h
biome_map_pos[1]=unif_y
var blend_offs=clamp(.05*(noise[noise.length-1].noise2D(5*unif_y,.5)+1),0,.1)+.1
for(var ii=0;ii<tex_w;++ii,++idx){var unif_x=(sub_x*tex_w+ii)/planet_w
var v=sample(unif_x,unif_y)
biome_map_pos[0]=unif_x
biome_value=null
if(unif_x>1-blend_offs){var w=min((unif_x-(1-blend_offs))/.1,1)
var v2=sample(unif_x-1,unif_y)
biome_map_pos[2]=w
v=lerp(w,v,v2)
if(w>.5)unif_x--}else biome_map_pos[2]=1
var winner=0
var winner_weight=0
for(var kk=0;kk<biome_table.length;++kk){var _w=biome_table[kk].weight_func(unif_x,unif_y,v)
if(_w>winner_weight){winner_weight=_w
winner=kk}}var b=colorIndex(biome_table[winner].color_table,v)
var varilist=BIOME_VARIATION[b]
if(varilist)for(var _kk=0;_kk<varilist.length;++_kk){var vari=varilist[_kk]
if(sublayer>=(vari.min_layer||BOTTOM_LAYER))if(.5*noise[noise.length-2].noise2D(2*(unif_x+(vari.offs||0))*(vari.freqx||7777),unif_y*(vari.freqy||7777))+.5<vari.weight)b=vari.biome}tex_data[idx]=b}}var tex_key=0===sublayer?tex_w+"x"+tex_h:"planet"
var tex_pool=tex_pools[tex_key]
if(!tex_pool)tex_pool=tex_pools[tex_key]={texs:[],tex_idx:0}
var tex
var tex_idx
if(0===sublayer){tex_idx=tex_pool.tex_idx
tex_pool.tex_idx=(tex_pool.tex_idx+1)%MAX_TEXTURES}else if(tp){assert(void 0!==tp.tex_idx)
tex_idx=tp.tex_idx
assert(tp.tex===tex_pool.texs[tex_idx])}else tex_idx=this.tex_idx++
if(tex=tex_pool.texs[tex_idx])tex.updateData(tex_w,tex_h,tex_data)
else tex=tex_pool.texs[tex_idx]=textureLoad({name:"planet_"+planet_tex_id,format:TEXTURE_FORMAT.R8,width:tex_w,height:tex_h,data:tex_data,filter_min:gl.NEAREST,filter_mag:gl.NEAREST,wrap_s:0===sublayer?gl.REPEAT:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})
var raw_data=tex_data===tex_data_temp?tex_data.slice(0,tex_w*tex_h):tex_data
var ret=tex
ret.raw_data=raw_data;(tp={tex:ret,tex_id:++planet_tex_id,tex_idx:tex_idx}).tex.planet_tex_id=tp.tex_id
this.texpairs[tp_idx]=tp
return ret}
var PMRES_LOW=128
var PMRES_HIGH=256
var PMBORDER=16
var pmtex
var pmtex_hires
function planetMapTexture(high_res){if(pmtex&&!high_res)return pmtex
if(pmtex_hires&&high_res)return pmtex_hires
var res=high_res?PMRES_HIGH:PMRES_LOW
var tex_data=new Uint8Array(res*res*3)
var idx=0
var mid=res/2
var PMR=res/2-PMBORDER
function encodeRadian(rad){if(rad<0)rad+=2*PI
return clamp(round((rad-PI/2)/PI*255),0,255)}for(var yy=0;yy<res;++yy){var unif_y=(yy-mid)/PMR
for(var xx=0;xx<res;++xx){var unif_x=(xx-mid)/PMR
var dsq=unif_x*unif_x+unif_y*unif_y
var r=sqrt(dsq)
var eff_r=max(1,r)
var unif_z=r>=1?0:sqrt(eff_r*eff_r-dsq)
var longitude=-atan2(unif_x,-unif_z)
var flat_uv_longitude=round(255*(.5*unif_x+.5))
var xz_len=sqrt(unif_x*unif_x+unif_z*unif_z)
var latitude=atan2(-unif_y,-xz_len)
tex_data[idx++]=round((flat_uv_longitude+encodeRadian(longitude))/4)
tex_data[idx++]=encodeRadian(latitude)
tex_data[idx++]=round(r/2*255)}}assert.equal(idx,tex_data.length)
var tex=textureLoad({name:"pmtex"+(high_res?"hi":"lo"),format:TEXTURE_FORMAT.RGB8,width:res,height:res,data:tex_data,filter_min:gl.LINEAR,filter_mag:gl.LINEAR,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})
if(high_res)pmtex_hires=tex
else pmtex=tex
return tex}var pmflattex
function planetMapFlatTexture(){if(pmflattex)return pmflattex
var res=PMRES_HIGH
var tex_data=new Uint8Array(res*res*3)
var idx=0
for(var yy=0;yy<res;++yy)for(var xx=0;xx<res;++xx){tex_data[idx++]=round(xx/res*255)
tex_data[idx++]=round(yy/res*255)
tex_data[idx++]=0}assert.equal(idx,tex_data.length)
var tex=textureLoad({name:"pmtexflat",format:TEXTURE_FORMAT.RGB8,width:res,height:res,data:tex_data,filter_min:gl.NEAREST,filter_mag:gl.NEAREST,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})
return pmflattex=tex}function cmpSize(a,b){return a.size-b.size}var SolarSystem=function SolarSystem(global_seed,star){this.star_data=void 0
this.name=void 0
this.planets=void 0
this.star_id=void 0
var id=star.id
var classif=starTypeFromID(id)
var star_data=starTypeData(classif)
this.star_data=star_data
this.star_id=id
for(var ii=0;ii<rand.length;++ii)rand[ii].reseed(mashString(id+"_"+global_seed+"_"+ii))
var planets=[]
if(98897686813===id){this.name="Sol"
planets.push(new Planet({name:"D",size:4}))
planets.push(new Planet({name:"K",size:6}))
planets.push(new Planet({name:"M",size:8,seed:5}))
planets.push(new Planet({name:"Y",size:5}))
planets.push(new Planet({name:"T",size:16,seed:1}))
planets.push(new Planet({name:"J",size:12,seed:1}))
planets.push(new Planet({name:"P",size:9}))
planets.push(new Planet({name:"W",size:8}))}else{var num_planets=rand[0].range(4)
var chance=.5
while(num_planets){planets.push(new Planet)
if(!--num_planets)if(rand[1].random()<chance){++num_planets
chance*=.9}}var p1=[]
var p2=[]
for(var _ii4=0;_ii4<planets.length;++_ii4){var planet=planets[_ii4]
if(!planet.type.bias&&rand[0].range(2)||planet.type.bias<0)p1.push(planet)
else p2.push(planet)}p1.sort(cmpSize)
p2.sort(cmpSize).reverse()
planets=p1.concat(p2)}this.planets=planets}
exports.SolarSystem=SolarSystem
function solarSystemCreate(global_seed,star){return new SolarSystem(global_seed,star)}function planetCreate(global_seed,star_id,params){for(var ii=0;ii<rand.length;++ii)rand[ii].reseed(mashString(star_id+"_"+global_seed+"_"+ii))
return new Planet(params)}

},{"../glov/client/engine":21,"../glov/client/textures":70,"../glov/common/rand_alea":93,"../glov/common/util":96,"../glov/common/vmath":98,"./biomes":2,"./star_types":9,"assert":undefined,"simplex-noise":undefined}],9:[function(require,module,exports){
"use strict"
exports.hueFromID=hueFromID
exports.hueFromType=hueFromType
exports.starTypeData=starTypeData
exports.starTypeFromID=starTypeFromID
var assert=require("assert")
var _glovClientEngine=require("../glov/client/engine")
var engine=_glovClientEngine
var _glovCommonRand_alea=require("../glov/common/rand_alea")
var mashI53=_glovCommonRand_alea.mashI53
var _glovCommonVmath=require("../glov/common/vmath")
var rovec4=_glovCommonVmath.rovec4
var colors=[rovec4(.816,1,1,1),rovec4(.98,.204,0,1),rovec4(1,.467,0,1),rovec4(1,1,.408,1),rovec4(1,1,.8,1),rovec4(.922,1,1,1),rovec4(.875,1,1,1),rovec4(.816,1,1,1)]
var sg_scale=.001/94.301
var star_types=function(){var raw={O:["O",.001,7,10,50,1e5,30],B:["B",.1,6,5,10,1e3,25],A:["A",.7,5,1.7,2,20,23],F:["F",2,4,1.3,1.5,4,22],G:["G",3.5,3,1,1,1,21],K:["K",8,2,.8,.7,.2,20],M:["M",80,1,.3,.2,.01,18],gG:["Giant G",4/92*.4,3,50,5,1e3,36],gK:["Giant K",8/92*.4,2,20,3.5,400,33],gM:["Giant M",80/92*.4,1,10,1,50,30],D:["White Dwarf",5,6,.01,1.4,.01,6],sgO:["Supergiant O",.001*sg_scale,7,500,70,1e6,40],sgB:["Supergiant B",.1*sg_scale,6,300,60,82e3,37],sgA:["Supergiant A",.7*sg_scale,5,120,50,6e4,35],sgF:["Supergiant F",2*sg_scale,4,100,35,5e4,34],sgG:["Supergiant G",3.5*sg_scale,3,80,16,44e3,33],sgK:["Supergiant K",8*sg_scale,2,72,12,38e3,32],sgM:["Supergiant M",80*sg_scale,1,30,10,3e4,30]}
var ret={}
for(var key in raw){var rd=raw[key]
ret[key]={label:rd[0],odds:rd[1],hue:rd[2],color:colors[rd[2]],astro_radius:rd[3],mass:rd[4],lumin:rd[5],game_radius:rd[6]}}return ret}()
var star_types_total=function(){var ret=0
for(var key in star_types)ret+=star_types[key].odds
return ret}()
function starType(choice){choice*=star_types_total
for(var key in star_types)if((choice-=star_types[key].odds)<=0)return key
assert(!engine.DEBUG)
return"M"}function starTypeFromID(id){return starType(mashI53(id))}function hueFromID(id){return star_types[starType(mashI53(id))].hue}function starTypeData(key){return star_types[key]}function hueFromType(key){return star_types[key].hue}

},{"../glov/client/engine":21,"../glov/common/rand_alea":93,"../glov/common/vmath":98,"assert":undefined}],10:[function(require,module,exports){
"use strict"
exports.abTestGet=abTestGet
exports.abTestGetMetrics=abTestGetMetrics
exports.abTestGetMetricsAndPlatform=abTestGetMetricsAndPlatform
exports.abTestRegister=abTestRegister
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var assert=require("assert")
var _glovCommonRand_alea=require("../common/rand_alea")
var mashString=_glovCommonRand_alea.mashString
var _client_config=require("./client_config")
var platformGetID=_client_config.platformGetID
var _local_storage=require("./local_storage")
var localStorageGet=_local_storage.localStorageGet
var localStorageSet=_local_storage.localStorageSet
var _net=require("./net")
var netPostInit=_net.netPostInit
var netSubs=_net.netSubs
var netUserId=_net.netUserId
var _wsclient=require("./wsclient")
var wsclientSetExtraParam=_wsclient.wsclientSetExtraParam
var floor=Math.floor
var KEY_LOCAL_ID="abtests_id"
var KEY_TEST_PREFIX="abtest."
function evaluateSplitGroup(state,id){var values=state.values,name=state.name
var local_key=""+KEY_TEST_PREFIX+state.name
var new_value=null
if(state.permanent){var _state$allowed_values
var stored_value=localStorageGet(local_key)
if(stored_value&&(state.values.includes(stored_value)||null!=(_state$allowed_values=state.allowed_values)&&_state$allowed_values.includes(stored_value)))new_value=stored_value}if(!new_value)new_value=values[floor(mashString(name+":"+id)/4294967296*values.length)]
state.value=new_value
null==state.cb||state.cb(state.value)
if("client"===state.scope)localStorageSet(local_key,state.value)}var abtest_defs={}
var metrics_string=""
var metrics_and_platform_string=""
function abTestGetMetrics(){return metrics_string}function abTestGetMetricsAndPlatform(){return metrics_and_platform_string}function updateMetricsString(){var data=[]
for(var key in abtest_defs){var def=abtest_defs[key]
if(def.metrics&&def.value)data.push(""+def.metrics+def.value)}metrics_string=data.join(",")
data.push(platformGetID())
metrics_and_platform_string=data.join(",")}function updateWSClient(){var data=[]
for(var key in abtest_defs){var def=abtest_defs[key]
if("client"===def.scope&&def.metrics)data.push(""+def.metrics+def.value)}wsclientSetExtraParam("abt",data.join(","))}var user_id=null
function evaluatePerUserABTests(){assert(user_id)
for(var key in abtest_defs){var state=abtest_defs[key]
if("user"!==state.scope)continue
evaluateSplitGroup(state,user_id)}updateMetricsString()}function abTestPostNetInit(){netSubs().on("login",function(){user_id=netUserId()
evaluatePerUserABTests()})
netSubs().on("logout",function(){user_id=null})}var local_id
var did_startup=false
function abTestStartup(){if(did_startup)return
did_startup=true
if(!(local_id=localStorageGet(KEY_LOCAL_ID)||"")){local_id="id"+Math.random()
localStorageSet(KEY_LOCAL_ID,local_id)}netPostInit(abTestPostNetInit)}function abTestRegister(def){abTestStartup()
var state=_extends({},def,{value:null})
if("client"===(abtest_defs[state.name]=state).scope)evaluateSplitGroup(state,local_id)
if("client"===state.scope&&state.metrics){assert(!netSubs())
updateWSClient()
updateMetricsString()}if("user"===state.scope){assert(!state.permanent)
assert(!netSubs()||!netUserId())}}function abTestGet(name){var def=abtest_defs[name]
assert(def)
assert(null!==def.value)
return def.value}

},{"../common/rand_alea":93,"./client_config":16,"./local_storage":40,"./net":48,"./wsclient":78,"assert":undefined}],11:[function(require,module,exports){
"use strict"
exports.autoAtlas=autoAtlas
exports.autoAtlasTextureOpts=autoAtlasTextureOpts
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var assert=require("assert")
var _glovCommonData_error=require("../common/data_error")
var dataError=_glovCommonData_error.dataError
var _glovCommonVmath=require("../common/vmath")
var v4set=_glovCommonVmath.v4set
var vec4=_glovCommonVmath.vec4
var _engine=require("./engine")
var engineStartupFunc=_engine.engineStartupFunc
var _filewatch=require("./filewatch")
var filewatchOn=_filewatch.filewatchOn
var _sprites=require("./sprites")
var spriteCreate=_sprites.spriteCreate
var _textures=require("./textures")
var textureError=_textures.textureError
var textureLoad=_textures.textureLoad
var _webfs=require("./webfs")
var webFSGetFile=_webfs.webFSGetFile
var webFSOnReady=_webfs.webFSOnReady
var load_opts={}
var hit_startup=false
function autoAtlasTextureOpts(name,opts){assert(!hit_startup)
load_opts[name]=opts}var uidata_error={rects:[[0,0,1,1]],wh:[1],hw:[1],widths:[1],heights:[1],aspect:null,total_w:1,total_h:1}
function spriteMakeError(sprite){v4set(sprite.uvs,0,0,1,1)
sprite.texs=[textureError()]
sprite.uidata=uidata_error}var AutoAtlasImp=function(){var _proto=AutoAtlasImp.prototype
_proto.prealloc=function prealloc(){var sprite=spriteCreate({texs:this.texs,uvs:vec4(0,0,1,1)})
sprite.uidata=uidata_error
return sprite}
_proto.verifySprites=function verifySprites(seen){var sprites=this.sprites
for(var img_name in sprites)if(sprites[img_name].autoatlas_used&&!seen[img_name]&&"def"!==img_name){dataError('AutoAtlas "'+this.atlas_name+'" does not contain image "'+img_name+'"')
spriteMakeError(sprites[img_name])}}
_proto.doInit=function doInit(){var _this=this
var sprites=this.sprites,atlas_name=this.atlas_name,texs=this.texs
var atlas_data=webFSGetFile(atlas_name+".auat","jsobj")
var root_sprite=sprites.def=this.prealloc()
var root_rects=[]
var root_aspect=[]
var tiles=atlas_data.tiles,w=atlas_data.w,h=atlas_data.h
var seen={}
for(var tile_id=0;tile_id<tiles.length;++tile_id){var _ref=tiles[tile_id],tile_name=_ref[0],x=_ref[1],y=_ref[2],ws=_ref[3],hs=_ref[4],padh=_ref[5],padv=_ref[6]
seen[tile_name]=true
var total_w=0
for(var jj=0;jj<ws.length;++jj)total_w+=ws[jj]
var total_h=0
for(var _jj=0;_jj<hs.length;++_jj)total_h+=hs[_jj]
root_aspect.push(total_w/total_h)
var sprite=sprites[tile_name]
if(!sprite)sprite=sprites[tile_name]=this.prealloc()
sprite.texs=texs
var tile_uvs=sprite.uvs
v4set(tile_uvs,x/w,y/h,(x+total_w)/w,(y+total_h)/h)
root_rects.push(tile_uvs)
root_rects[tile_name]=tile_uvs
var wh=[]
for(var ii=0;ii<ws.length;++ii)wh.push(ws[ii]/total_h)
var hw=[]
for(var _ii=0;_ii<hs.length;++_ii)hw.push(hs[_ii]/total_w)
var aspect=[]
var non_square=false
var yy=y
var rects=[]
for(var _jj2=0;_jj2<hs.length;++_jj2){var xx=x
for(var _ii2=0;_ii2<ws.length;++_ii2){var r=vec4(xx/w,yy/h,(xx+ws[_ii2])/w,(yy+hs[_jj2])/h)
rects.push(r)
var asp=ws[_ii2]/hs[_jj2]
if(1!==asp)non_square=true
aspect.push(asp)
xx+=ws[_ii2]}yy+=hs[_jj2]}sprite.uidata={widths:ws,heights:hs,wh:wh,hw:hw,rects:rects,aspect:non_square?aspect:null,padh:padh,padv:padv,total_w:total_w,total_h:total_h}}root_sprite.uidata={rects:root_rects,aspect:root_aspect,total_h:h,total_w:w,widths:null,heights:null,wh:null,hw:null}
if(hit_startup)this.verifySprites(seen)
if(this.did_tex_load)return
this.did_tex_load=true
engineStartupFunc(function(){hit_startup=true
var opts=load_opts[atlas_name]||{}
if(atlas_data.layers)for(var idx=0;idx<atlas_data.layers;++idx){var tex=textureLoad(_extends({wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE},opts,{url:"img/atlas_"+atlas_name+"_"+idx+".png"}))
texs.push(tex)}else{var _tex=textureLoad(_extends({wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE},opts,{url:"img/atlas_"+atlas_name+".png"}))
texs.push(_tex)}_this.verifySprites(seen)})}
function AutoAtlasImp(atlas_name){this.sprites={}
this.texs=[]
this.did_tex_load=false
this.atlas_name=atlas_name
webFSOnReady(this.doInit.bind(this))}_proto.get=function get(img_name){var ret=this.sprites[img_name]
if(!ret){ret=this.sprites[img_name]=this.prealloc()
if(hit_startup){dataError('AutoAtlas "'+this.atlas_name+'" does not contain image "'+img_name+'"')
spriteMakeError(ret)}}ret.autoatlas_used=true
return ret}
return AutoAtlasImp}()
var atlases
function autoAtlasReload(filename){filename=filename.slice(0,-5)
var atlas=atlases[filename]
if(!atlas)return
atlas.doInit()}function autoAtlasGet(atlas_name){if(!atlases){atlases={}
filewatchOn(".auat",autoAtlasReload)}var atlas=atlases[atlas_name]
if(!atlas)atlas=atlases[atlas_name]=new AutoAtlasImp(atlas_name)
return atlas}function autoAtlas(atlas_name,img_name){return autoAtlasGet(atlas_name).get(img_name)}

},{"../common/data_error":84,"../common/vmath":98,"./engine":21,"./filewatch":27,"./sprites":68,"./textures":70,"./webfs":76,"assert":undefined}],12:[function(require,module,exports){
"use strict"
require("./polyfill.js")
var debug=document.getElementById("debug")
window.onerror=function(e,file,line,col,errorobj){var msg=String(e)
if(msg.startsWith("[object ")){try{msg=JSON.stringify(e)}catch(ignored){}msg=msg.slice(0,600)}if("string"===typeof errorobj)msg=msg+" "+errorobj
if(file||line>0||col>0)msg+="\n  at "+file+"("+line+":"+col+")"
var got_stack=false
if(errorobj&&errorobj.stack){got_stack=true
msg=""+errorobj.stack
if(errorobj.message)if(-1===msg.indexOf(errorobj.message))msg=errorobj.message+"\n"+msg
var origin=document.location.origin||""
if(origin){if("/"!==origin.slice(-1))origin+="/"
msg=msg.split(origin).join("")}msg=msg.replace(/\[\d+\]<\/?/g,"").replace(/\/</g,"").replace(/<?\/<?/g,"/").replace(/\n\//g,"\n").replace(/\n([^ ])/g,"\n  $1")}if(-1===msg.indexOf("Error:"))msg="Error: "+msg
if(errorobj&&errorobj.errortype)if("unhandledrejection"===errorobj.errortype)msg="Uncaught (in promise) "+msg
if(errorobj)try{if("object"===typeof errorobj)for(var key in errorobj)if("string"===typeof errorobj[key]){var value=errorobj[key]
if("errortype"!==key&&!(("stack"===key||"message"===key)&&got_stack))msg=msg+"\n"+key+"="+value}}catch(ignored){}var show=true
if(window.glov_error_report)show=window.glov_error_report(msg,file,line,col)
else if(!window.glov_error_early)window.glov_error_early={msg:msg,file:file,line:line,col:col}
if(show)debug.innerText=msg+"\n\nPlease report this error to the developer, and then reload this page or restart the app."}
window.addEventListener("unhandledrejection",function(event){var errorobj=event.reason
if(!errorobj)return
if(!errorobj||"object"!==typeof errorobj)errorobj={stack:errorobj}
var file
if(event.reason&&event.reason.srcElement&&event.reason.srcElement.src)file=event.reason.srcElement.src
try{errorobj.errortype=event.type}catch(ignored){}window.onerror(event.reason,file,0,0,errorobj)})
window.debugmsg=function(msg,clear){if(clear)debug.innerText=msg
else debug.innerText+=msg+"\n"}
window.profilerStart=window.profilerStop=window.profilerStopStart=function nop(){}

},{"./polyfill.js":54}],13:[function(require,module,exports){
"use strict"
exports.safari_version_minor=exports.safari_version_major=exports.is_windows_phone=exports.is_webkit=exports.is_mac_osx=exports.is_itch_app=exports.is_ipad=exports.is_ios_safari=exports.is_ios_chrome=exports.is_ios=exports.is_firefox=exports.is_discrete_gpu=exports.is_android=void 0
var ua=window.navigator.userAgent
var is_mac_osx=ua.match(/Mac OS X/)
exports.is_mac_osx=is_mac_osx
var is_ios=!window.MSStream&&ua.match(/iPad|iPhone|iPod/)
exports.is_ios=is_ios
var is_ipad=Boolean(ua.match(/iPad/))
exports.is_ipad=is_ipad
var is_webkit=ua.match(/WebKit/i)
exports.is_webkit=is_webkit
var is_ios_safari=is_ios&&is_webkit&&!ua.match(/CriOS/i)
exports.is_ios_safari=is_ios_safari
var is_ios_chrome=is_ios&&is_webkit&&ua.match(/CriOS/i)
exports.is_ios_chrome=is_ios_chrome
var m=ua.match(/OS (\d+)(_\d+)?(_\d+)?\s/)
var safari_version_major=is_ios&&m?Number(m[1]||"0"):0
exports.safari_version_major=safari_version_major
var safari_version_minor=is_ios&&m?Number(m[2]&&m[2].slice(1)||"0"):0
exports.safari_version_minor=safari_version_minor
var is_windows_phone=ua.match(/windows phone/i)
var is_android=!(exports.is_windows_phone=is_windows_phone)&&ua.match(/android/i)
exports.is_android=is_android
var is_firefox=ua.match(/Firefox/i)
exports.is_firefox=is_firefox
var is_itch_app=-1!==String(window.location.protocol).indexOf("itch")
exports.is_itch_app=is_itch_app
var is_discrete_gpu=false
exports.is_discrete_gpu=is_discrete_gpu
function init(){try{var canvas=document.createElement("canvas")
canvas.width=4
canvas.height=4
var gltest=canvas.getContext("webgl")
if(gltest){var debug_info=gltest.getExtension("WEBGL_debug_renderer_info")
if(debug_info){var renderer_unmasked=gltest.getParameter(debug_info.UNMASKED_RENDERER_WEBGL)
exports.is_discrete_gpu=is_discrete_gpu=Boolean(renderer_unmasked&&(renderer_unmasked.match(/nvidia|radeon/i)||renderer_unmasked.match(/apple gpu/i)&&is_mac_osx&&!is_ios))}}}catch(e){}}init()

},{}],14:[function(require,module,exports){
"use strict"
exports.buildUIStartup=buildUIStartup
var camera2d=require("./camera2d.js")
var engine=require("./engine.js")
var renderNeeded=engine.renderNeeded
var glov_font=require("./font.js")
var min=Math.min
var _require=require("./scroll_area.js"),scrollAreaCreate=_require.scrollAreaCreate
var ui=require("./ui.js")
var net=require("./net.js")
var _require2=require("../common/data_error.js"),dataErrorEx=_require2.dataErrorEx,dataErrorQueueClear=_require2.dataErrorQueueClear,dataErrorQueueGet=_require2.dataErrorQueueGet
var _require3=require("../common/util.js"),plural=_require3.plural
var _require4=require("../common/vmath.js"),vec4=_require4.vec4
var gbstate
var server_error
Z.BUILD_ERRORS=Z.BUILD_ERRORS||9900
function onGBState(state){gbstate=state
renderNeeded()}function onServerError(err){server_error=err
renderNeeded()}function onDataErrors(err_list){for(var ii=0;ii<err_list.length;++ii)dataErrorEx(err_list[ii])
renderNeeded()}var PAD=4
var color_panel=vec4(0,0,0,1)
var style_title=glov_font.styleColored(null,4280295679)
var style=glov_font.styleColored(null,3722305023)
var style_task=glov_font.styleColored(null,14540287)
var style_job=glov_font.styleColored(null,539033599)
var color_line=vec4(1,1,1,1)
var strip_ansi=/\u001b\[(?:[0-9;]*)[0-9A-ORZcf-nqry=><]/g
var scroll_area
function buildUITick(){var data_errors=dataErrorQueueGet()
if(!gbstate&&!server_error&&!data_errors.length)return
var x0=camera2d.x0()+PAD
var y0=camera2d.y0()+PAD
var z=Z.BUILD_ERRORS
var w=.75*camera2d.w()
var font=ui.font,title_font=ui.title_font,font_height=ui.font_height
var x=x0
var y=y0
var error_count=((null==gbstate?void 0:gbstate.error_count)||0)+(server_error?1:0)+data_errors.length
var warning_count=(null==gbstate?void 0:gbstate.warning_count)||0
title_font.drawSizedAligned(style_title,x,y,z,font_height,font.ALIGN.HCENTERFIT,w,0,error_count+" "+plural(error_count,"error")+", "+warning_count+" "+plural(warning_count,"warning"))
y+=font_height+1
ui.drawLine(x0+.3*w,y,x0+.7*w,y,z,.5,true,color_line)
y+=PAD
if(!scroll_area)scroll_area=scrollAreaCreate({z:z,background_color:null,auto_hide:true})
var max_h=camera2d.y1()-PAD-y
var scroll_y_start=y
scroll_area.begin({x:x,y:y,w:w,h:max_h})
var sub_w=w-PAD-scroll_area.barWidth()
y=0
z=Z.UI
var indent=0
function printLine(type,str){str=str.replace(strip_ansi,"")
y+=font.drawSizedWrapped(style,x+indent,y,z,sub_w-indent,0,font_height,type+": "+str)}if(gbstate)for(var task_name in gbstate.tasks){var task=gbstate.tasks[task_name]
indent=x=0
font.drawSizedAligned(style_task,x,y,z,font_height,font.ALIGN.HLEFT,sub_w,0,task_name+":")
y+=font_height
indent+=font_height
var printed_any=false
for(var job_name in task.jobs){var job=task.jobs[job_name]
var warnings=job.warnings,errors=job.errors
if("all"!==job_name){if(job_name.startsWith("source:"))job_name=job_name.slice(7)
y+=font.drawSizedWrapped(style_job,indent,y,z,sub_w,0,font_height,job_name)}if(warnings)for(var ii=0;ii<warnings.length;++ii){printLine("Warning",warnings[ii])
printed_any=true}if(errors)for(var _ii=0;_ii<errors.length;++_ii){printLine("Error",errors[_ii])
printed_any=true}}if(!printed_any&&task.err)printLine("Error",task.err)
y+=PAD}if(server_error){x=indent=0
font.drawSizedAligned(style_task,x,y,z,font_height,font.ALIGN.HLEFT,sub_w,0,"Server Error:")
y+=font_height
x+=font_height
printLine("Server error",server_error)}for(var _ii2=0;_ii2<data_errors.length;++_ii2){var msg=data_errors[_ii2].msg
x=0
printLine("Data error",msg)}scroll_area.end(y)
y=scroll_y_start+min(max_h,y)
var button_h=1.5*font_height
if(ui.buttonText({x:x0+w-button_h,y:y0,z:Z.BUILD_ERRORS+1,w:button_h,h:button_h,text:"X"})){server_error=gbstate=null
dataErrorQueueClear()}ui.panel({x:x0-PAD,y:y0-PAD,z:Z.BUILD_ERRORS-1,w:w+2*PAD,h:y-y0+2*PAD,color:color_panel})}function buildUIStartup(){if(net.client&&engine.DEBUG){net.client.onMsg("gbstate",onGBState)
net.client.onMsg("server_error",onServerError)
net.client.onMsg("data_errors",onDataErrors)
net.subs.on("connect",function(){var pak=net.client.pak("gbstate_enable")
pak.writeBool(true)
pak.send()})
engine.addTickFunc(buildUITick)}}

},{"../common/data_error.js":84,"../common/util.js":96,"../common/vmath.js":98,"./camera2d.js":15,"./engine.js":21,"./font.js":28,"./net.js":48,"./scroll_area.js":58,"./ui.js":72}],15:[function(require,module,exports){
"use strict"
exports.calcMap=calcMap
exports.canvasToVirtual=canvasToVirtual
exports.clipTestRect=clipTestRect
exports.data=void 0
exports.domDeltaToVirtual=domDeltaToVirtual
exports.domToCanvasRatio=domToCanvasRatio
exports.domToVirtual=domToVirtual
exports.h=h
exports.hReal=hReal
exports.htmlPos=htmlPos
exports.htmlSize=htmlSize
exports.pop=pop
exports.push=push
exports.render_viewport_w=exports.render_viewport_h=exports.render_offset_y_bottom=exports.render_offset_x=void 0
exports.safeAreaPadding=safeAreaPadding
exports.screenAspect=screenAspect
exports.set=set
exports.setAspectFixed=setAspectFixed
exports.setAspectFixed2=setAspectFixed2
exports.setAspectFixedRespectPixelPerfect=setAspectFixedRespectPixelPerfect
exports.setDOMFontPixelScale=setDOMFontPixelScale
exports.setDOMMapped=setDOMMapped
exports.setInputClipping=setInputClipping
exports.setNormalized=setNormalized
exports.setSafeAreaPadding=setSafeAreaPadding
exports.setScreen=setScreen
exports.shift=shift
exports.startup=startup
exports.tickCamera2D=tickCamera2D
exports.transformX=transformX
exports.transformY=transformY
exports.virtualToCanvas=virtualToCanvas
exports.virtualToDom=virtualToDom
exports.virtualToDomPosParam=virtualToDomPosParam
exports.virtualToFontSize=virtualToFontSize
exports.w=w
exports.wReal=wReal
exports.x0=x0
exports.x0Real=x0Real
exports.x1=x1
exports.x1Real=x1Real
exports.xScale=xScale
exports.y0=y0
exports.y0Real=y0Real
exports.y1=y1
exports.y1Real=y1Real
exports.yScale=yScale
exports.zoom=zoom
var assert=require("assert")
var engine=require("./engine.js")
var max=Math.max,floor=Math.floor,round=Math.round
var safearea_pad=new Float32Array(4)
var data=new Float32Array(15)
exports.data=data
var screen_width
var screen_height
var render_width
var render_height
var render_viewport_w
exports.render_viewport_w=render_viewport_w
var render_viewport_h
exports.render_viewport_h=render_viewport_h
var render_offset_x
exports.render_offset_x=render_offset_x
var render_offset_y_top
var render_offset_y_bottom
exports.render_offset_y_bottom=render_offset_y_bottom
function reapply(){if(render_width){data[4]=render_width/data[13]
data[5]=render_height/data[14]
data[7]=data[13]/render_viewport_w
data[8]=data[14]/render_viewport_h}else{data[4]=screen_width/data[13]
data[5]=screen_height/data[14]}}function virtualToCanvas(dst,src){dst[0]=(src[0]-data[0])*data[4]
dst[1]=(src[1]-data[1])*data[5]}function transformX(x){return(x-data[0])*data[4]}function transformY(y){return(y-data[1])*data[5]}function canvasToVirtual(dst,src){dst[0]=src[0]/data[4]+data[0]
dst[1]=src[1]/data[5]+data[1]}function safeScreenWidth(){return max(1,screen_width-safearea_pad[0]-safearea_pad[1])}function safeScreenHeight(){return max(1,screen_height-safearea_pad[2]-safearea_pad[3])}function set(x0,y0,x1,y1,ignore_safe_area){assert(isFinite(x0))
assert(isFinite(y0))
assert(isFinite(x1))
assert(isFinite(y1))
if(ignore_safe_area||render_width){data[9]=data[0]=x0
data[10]=data[1]=y0
data[11]=data[2]=x1
data[12]=data[3]=y1
data[13]=x1-x0
data[14]=y1-y0}else{data[9]=x0
data[10]=y0
data[11]=x1
data[12]=y1
var wscale=(x1-x0)/safeScreenWidth()
var hscale=(y1-y0)/safeScreenHeight()
var x0_real=x0-safearea_pad[0]*wscale
var y0_real=y0-safearea_pad[2]*hscale
var x1_real=x1+safearea_pad[1]*wscale
var y1_real=y1+safearea_pad[3]*hscale
data[0]=x0_real
data[1]=y0_real
data[2]=x1_real
data[3]=y1_real
data[13]=x1_real-x0_real
data[14]=y1_real-y0_real}reapply()}function setSafeAreaPadding(left,right,top,bottom){safearea_pad[0]=round(left)
safearea_pad[1]=round(right)
safearea_pad[2]=round(top)
safearea_pad[3]=round(bottom)}function safeAreaPadding(){return safearea_pad}var stack=[]
function push(){stack.push(data.slice(0))}function pop(){var old=stack.pop()
for(var ii=0;ii<old.length;++ii)data[ii]=old[ii]
reapply()}function domToCanvasRatio(){return data[6]}function screenAspect(){return safeScreenWidth()/safeScreenHeight()}function setAspectFixed(w,h){var pa=render_width?1:engine.pixel_aspect
var inv_aspect=h/pa/w
var inv_desired_aspect
var screen_w
var screen_h
if(render_width){screen_w=render_width
screen_h=render_height}else{screen_w=safeScreenWidth()
screen_h=safeScreenHeight()}if(inv_aspect>(inv_desired_aspect=screen_h/screen_w)){var virtual_w=h/pa/inv_desired_aspect
var virtual_to_screen=screen_w/virtual_w
var margin=virtual_w-w
var left_margin=round(margin*virtual_to_screen/2)/virtual_to_screen
set(-left_margin,0,w+(margin-left_margin),h,false)}else{var virtual_h=w*pa*inv_desired_aspect
var _virtual_to_screen=screen_h/virtual_h
var _margin=virtual_h-h
var top_margin=round(_margin*_virtual_to_screen/2)/_virtual_to_screen
set(0,-top_margin,w,h+(_margin-top_margin),false)}}function setAspectFixedRespectPixelPerfect(w,h){if(render_width||!engine.render_pixel_perfect)return void setAspectFixed(w,h)
var pa=engine.pixel_aspect
var inv_aspect=h/pa/w
var screen_w=safeScreenWidth()
var screen_h=safeScreenHeight()
var my_viewport_w=screen_w
if(inv_aspect>screen_h/screen_w)my_viewport_w=w*pa/h*screen_h
var scalar=my_viewport_w/w
var int_scalar=floor(scalar)
if(scalar>1&&scalar-int_scalar<=engine.render_pixel_perfect);else return void setAspectFixed(w,h)
var margin=screen_w-w*(scalar=int_scalar)
var left_margin=floor(margin/2)/scalar
var right_margin=screen_w/scalar-w-left_margin
var desired_height=round(h*scalar/pa)
var top_margin=floor((margin=screen_h-desired_height)/2)/scalar
set(-left_margin,-top_margin,w+right_margin,h+(screen_h/scalar-h-top_margin),false)}function setAspectFixed2(w,h){var pa=render_width?1:engine.pixel_aspect
var inv_aspect=h/pa/w
var inv_desired_aspect
if(render_width)inv_desired_aspect=render_height/render_width
else inv_desired_aspect=1/screenAspect()
if(inv_aspect>inv_desired_aspect)set(0,0,w+(h/pa/inv_desired_aspect-w),h,false)
else set(0,0,w,h+(w*pa*inv_desired_aspect-h),false)}function zoom(x,y,factor){var inv_factor=1/factor
set(x-(x-data[0])*inv_factor,y-(y-data[1])*inv_factor,x+(data[2]-x)*inv_factor,y+(data[3]-y)*inv_factor,true)}function shift(dx,dy){set(data[0]+dx,data[1]+dy,data[2]+dx,data[3]+dy,true)}function calcMap(out,src_rect,dest_rect){var cur_w=data[11]-data[9]
var cur_h=data[12]-data[10]
var vx0=(src_rect[0]-data[9])/cur_w
var vy0=(src_rect[1]-data[10])/cur_h
var vx1=(src_rect[2]-data[9])/cur_w
var vy1=(src_rect[3]-data[10])/cur_h
var vw=vx1-vx0
var vh=vy1-vy0
var dest_vw=dest_rect[2]-dest_rect[0]
var dest_vh=dest_rect[3]-dest_rect[1]
out[0]=dest_rect[0]-dest_vw/vw*vx0
out[1]=dest_rect[1]-dest_vh/vh*vy0
out[2]=dest_rect[2]+dest_vw/vw*(1-vx1)
out[3]=dest_rect[3]+dest_vh/vh*(1-vy1)
return out}function setNormalized(){set(0,0,1,1,true)}function setScreen(no_dpi_aware){if(render_width)set(0,0,render_width,render_height)
else if(no_dpi_aware)set(0,0,safeScreenWidth(),safeScreenHeight())
else set(0,0,safeScreenWidth()/engine.dom_to_canvas_ratio,safeScreenHeight()/engine.dom_to_canvas_ratio)}function setDOMMapped(){if(render_width){var f=1/engine.dom_to_canvas_ratio
set(render_offset_x*f,render_offset_y_top*f,(screen_width-render_offset_x)*f,(screen_height-render_offset_y_top)*f,true)}else set(0,0,screen_width/engine.dom_to_canvas_ratio,screen_height/engine.dom_to_canvas_ratio,true)}function x0Real(){return data[0]}function y0Real(){return data[1]}function x1Real(){return data[2]}function y1Real(){return data[3]}function wReal(){return data[13]}function hReal(){return data[14]}function x0(){return data[9]}function y0(){return data[10]}function x1(){return data[11]}function y1(){return data[12]}function w(){return data[11]-data[9]}function h(){return data[12]-data[10]}function xScale(){return data[4]}function yScale(){return data[5]}function htmlPos(x,y){if(render_width)return[((x-data[0])/data[7]+render_offset_x)/screen_width*100,((y-data[1])/data[8]+render_offset_y_top)/screen_height*100]
else return[100*(x-data[0])/(data[2]-data[0]),100*(y-data[1])/(data[3]-data[1])]}function htmlSize(w,h){if(render_width)return[100*w/data[7]/screen_width,100*h/data[8]/screen_height]
else return[100*w/(data[2]-data[0]),100*h/(data[3]-data[1])]}var input_clipping
function setInputClipping(xywh){input_clipping=xywh}function domToVirtual(dst,src){var ret=true
if(input_clipping)if(src[0]<input_clipping[0]||src[0]>input_clipping[0]+input_clipping[2]||src[1]<input_clipping[1]||src[1]>input_clipping[1]+input_clipping[3])ret=false
if(render_width){dst[0]=(src[0]*data[6]-render_offset_x)*data[7]+data[0]
dst[1]=(src[1]*data[6]-render_offset_y_top)*data[8]+data[1]}else{dst[0]=src[0]*data[6]/data[4]+data[0]
dst[1]=src[1]*data[6]/data[5]+data[1]}return ret}function domDeltaToVirtual(dst,src){if(render_width){dst[0]=src[0]*data[6]*data[7]
dst[1]=src[1]*data[6]*data[8]}else{dst[0]=src[0]*data[6]/data[4]
dst[1]=src[1]*data[6]/data[5]}}var input_clipping_virtual=new Float32Array(4)
function updateVirtualInputClipping(){domToVirtual(input_clipping_virtual,input_clipping)
if(render_width){input_clipping_virtual[2]=input_clipping[2]*data[6]*data[7]
input_clipping_virtual[3]=input_clipping[3]*data[6]*data[8]}else{input_clipping_virtual[2]=input_clipping[2]*data[6]/data[4]
input_clipping_virtual[3]=input_clipping[3]*data[6]/data[5]}}function virtualToDom(dst,src){if(render_width){dst[0]=(render_offset_x+(src[0]-data[0])/data[7])/data[6]
dst[1]=(render_offset_y_top+(src[1]-data[1])/data[8])/data[6]}else{dst[0]=(src[0]-data[0])*data[4]/data[6]
dst[1]=(src[1]-data[1])*data[5]/data[6]}}var font_pixel_scale=.84
function setDOMFontPixelScale(scale){font_pixel_scale=scale}function virtualToFontSize(height){if(render_width)return height/(data[6]*data[8])*font_pixel_scale
else return height*data[5]/data[6]*font_pixel_scale}function virtualToDomPosParam(dst,src){if(render_width){dst.x=(render_offset_x+(src.x-data[0])/data[7])/data[6]
dst.w=src.w/data[7]/data[6]
dst.y=(render_offset_y_top+(src.y-data[1])/data[8])/data[6]
dst.h=src.h/data[8]/data[6]}else{dst.x=(src.x-data[0])*data[4]/data[6]
dst.w=src.w*data[4]/data[6]
dst.y=(src.y-data[1])*data[5]/data[6]
dst.h=src.h*data[5]/data[6]}if(input_clipping){if(dst.x<input_clipping[0]){dst.w=max(0,dst.w-(input_clipping[0]-dst.x))
dst.x=input_clipping[0]}if(dst.y<input_clipping[1]){dst.h=max(0,dst.h-(input_clipping[1]-dst.y))
dst.y=input_clipping[1]}if(dst.x>input_clipping[0]+input_clipping[2])dst.w=0
if(dst.y>input_clipping[1]+input_clipping[3])dst.h=0}}function clipTestRect(rect){if(!input_clipping)return true
updateVirtualInputClipping()
var icv=input_clipping_virtual
if(rect.x>icv[0]+icv[2]||rect.x+rect.w<icv[0]||rect.y>icv[1]+icv[3]||rect.y+rect.h<icv[1])return false
if(rect.x<icv[0]){rect.w-=icv[0]-rect.x
rect.x=icv[0]}if(rect.y<icv[1]){rect.h-=icv[1]-rect.y
rect.y=icv[1]}if(rect.x+rect.w>icv[0]+icv[2])rect.w=icv[0]+icv[2]-rect.x
if(rect.y+rect.h>icv[1]+icv[3])rect.h=icv[1]+icv[3]-rect.y
return true}function tickCamera2D(){data[6]=engine.dom_to_canvas_ratio
screen_width=engine.width
screen_height=engine.height
var viewport=[0,0,screen_width,screen_height]
if(engine.render_width){render_width=engine.render_width
render_height=engine.render_height
var pa=engine.pixel_aspect
var inv_aspect=render_height/pa/render_width
var eff_screen_width=safeScreenWidth()
var eff_screen_height=safeScreenHeight()
var inv_desired_aspect=eff_screen_height/eff_screen_width
if(inv_aspect>inv_desired_aspect){var margin=(render_height/inv_desired_aspect-render_width*pa)/2*eff_screen_height/render_height
exports.render_offset_x=render_offset_x=safearea_pad[0]+round(margin)
render_offset_y_top=safearea_pad[2]
exports.render_offset_y_bottom=render_offset_y_bottom=safearea_pad[3]
exports.render_viewport_w=render_viewport_w=round(eff_screen_width-2*margin)
exports.render_viewport_h=render_viewport_h=eff_screen_height}else{var _margin3=(render_width*inv_desired_aspect-render_height/pa)/2*eff_screen_width/render_width
exports.render_offset_x=render_offset_x=safearea_pad[0]
render_offset_y_top=safearea_pad[2]+round(_margin3)
exports.render_offset_y_bottom=render_offset_y_bottom=safearea_pad[3]+round(_margin3)
exports.render_viewport_w=render_viewport_w=eff_screen_width
exports.render_viewport_h=render_viewport_h=round(eff_screen_height-2*_margin3)}if(engine.render_pixel_perfect){var scalar=render_viewport_w/render_width
var int_scalar=floor(scalar)
if(scalar>1&&scalar-int_scalar<=engine.render_pixel_perfect){var desired_width=render_width*(scalar=int_scalar)
var xoffs=floor(.5*(render_viewport_w-desired_width))
exports.render_offset_x=render_offset_x+=xoffs
exports.render_viewport_w=render_viewport_w=desired_width
var desired_height=round(render_height*scalar/pa)
var yoffs=render_viewport_h-desired_height
var yoffs_top=floor(.5*yoffs)
render_offset_y_top+=yoffs_top
exports.render_offset_y_bottom=render_offset_y_bottom+=yoffs-yoffs_top
exports.render_viewport_h=render_viewport_h=desired_height}}viewport[2]=render_width
viewport[3]=render_height}else{render_width=render_height=0
exports.render_offset_x=render_offset_x=0
render_offset_y_top=0
exports.render_offset_y_bottom=render_offset_y_bottom=0}reapply()
engine.setViewport(viewport)}function startup(){screen_width=engine.width
screen_height=engine.height
set(0,0,engine.width,engine.height)
tickCamera2D()}

},{"./engine.js":21,"assert":undefined}],16:[function(require,module,exports){
"use strict"
exports.PLATFORM=exports.MODE_PRODUCTION=exports.MODE_DEVELOPMENT=void 0
exports.getAbilityChat=getAbilityChat
exports.getAbilityReload=getAbilityReload
exports.getAbilityReloadUpdates=getAbilityReloadUpdates
exports.platformGetID=platformGetID
exports.platformOverrideID=platformOverrideID
exports.platformParameterGet=platformParameterGet
exports.setAbilityChat=setAbilityChat
exports.setAbilityReload=setAbilityReload
exports.setAbilityReloadUpdates=setAbilityReloadUpdates
var assert=require("assert")
var _glovCommonPlatform=require("../common/platform")
var platformIsValid=_glovCommonPlatform.platformIsValid
var platformOverrideParameter=_glovCommonPlatform.platformOverrideParameter
var platformParameter=_glovCommonPlatform.platformParameter
assert(platformIsValid(window.conf_platform))
var PLATFORM=window.conf_platform
var override_platform=exports.PLATFORM=PLATFORM
function platformOverrideID(id){override_platform=id}function platformGetID(){return override_platform}function platformParameterGet(parameter){return platformParameter(platformGetID(),parameter)}var platform_devmode=platformParameter(PLATFORM,"devmode")
var MODE_DEVELOPMENT="on"===platform_devmode||"auto"===platform_devmode&&Boolean(String(document.location).match(/^https?:\/\/localhost/))
var MODE_PRODUCTION=!(exports.MODE_DEVELOPMENT=MODE_DEVELOPMENT)
exports.MODE_PRODUCTION=MODE_PRODUCTION
function getAbilityReload(){return platformParameterGet("reload")}function setAbilityReload(value){platformOverrideParameter("reload",platformParameterGet("reload")&&value)}function getAbilityReloadUpdates(){return platformParameterGet("reload_updates")}function setAbilityReloadUpdates(value){platformOverrideParameter("reload_updates",platformParameterGet("reload_updates")&&value)}var ability_chat=true
function getAbilityChat(){return ability_chat}function setAbilityChat(value){ability_chat=value}

},{"../common/platform":92,"assert":undefined}],17:[function(require,module,exports){
"use strict"
exports.safearea=exports.cmd_parse=void 0
var assert=require("assert")
var _glovCommonCmd_parse=require("../common/cmd_parse")
var cmdParseCreate=_glovCommonCmd_parse.cmdParseCreate
var _local_storage=require("./local_storage")
var local_storage=_local_storage
var _urlhash=require("./urlhash")
var urlhash=_urlhash
var cmd_parse=cmdParseCreate({storage:local_storage})
exports.cmd_parse=cmd_parse
var safearea=[-1,-1,-1,-1]
exports.safearea=safearea
function cmdDesc(cmd_data){return"**/"+cmd_data.cmd+"** - "+cmd_data.help}cmd_parse.register({cmd:"help",help:"Searches commands",func:function func(str,resp_func){var list=cmd_parse.autoComplete("",this&&this.access)
if(str){var str_cname=cmd_parse.canonical(str)
var str_lc=str.toLowerCase()
list=list.filter(function(cmd_data){return-1!==cmd_data.cname.indexOf(str_cname)||-1!==cmd_data.help.toLowerCase().indexOf(str_lc)})}if(!list.length)return void resp_func(null,'No commands found matching "'+str+'"')
resp_func(null,list.map(cmdDesc).join("\n"))}})
cmd_parse.registerValue("safe_area",{label:"Safe Area",type:cmd_parse.TYPE_STRING,usage:"Safe Area value: Use -1 for auto based on browser environment,\nor 0-25 for percentage of screen size\n  Usage: /safe_area [value]\n  Usage: /safe_area horizontal,vertical\n  Usage: /safe_area left,right,top,bottom",default_value:"-1",get:function get(){return-1===safearea[0]?"-1 (auto)":safearea.join(",")},set:function set(v){var keys=(v=String(v)).split(",")
if(v&&1===keys.length)safearea[0]=safearea[1]=safearea[2]=safearea[3]=Number(v)
else if(2===keys.length){safearea[0]=safearea[1]=Number(keys[0])
safearea[2]=safearea[3]=Number(keys[1])}else if(4===keys.length)for(var ii=0;ii<4;++ii)safearea[ii]=Number(keys[ii])
for(var _ii=0;_ii<4;++_ii)if(!isFinite(safearea[_ii]))safearea[_ii]=-1},store:true})
cmd_parse.register({cmd:"webgl2_auto",help:"Resets WebGL2 auto-detection",func:function func(str,resp_func){if(!local_storage.getJSON("webgl2_disable"))return resp_func(null,"WebGL2 is already being auto-detected")
local_storage.setJSON("webgl2_disable",void 0)
return resp_func(null,"WebGL2 was disabled, will attempt to use it again on the next load")}})
cmd_parse.register({cmd:"url",help:"Opens an internal URL",func:function func(str,resp_func){setTimeout(function(){profilerStart("/url")
urlhash.go(str)
profilerStop("/url")},1)}})
cmd_parse.register({cmd:"client_crash",help:"(Debug) - Crash on the client",access_show:["sysadmin"],func:function func(str,resp_func){var foo
foo.bar++}})
cmd_parse.register({cmd:"client_assert",help:"(Debug) - Fail an assert on the client",access_show:["sysadmin"],func:function func(str,resp_func){assert(false)}})
cmd_parse.register({cmd:"client_reject_now",help:"(Debug) - Fail an unhandled promise rejection on the client (Error, sync)",access_show:["sysadmin"],func:function func(str,resp_func){new Promise(function(resolve,reject){reject(new Error("client_reject_now"))})}})

},{"../common/cmd_parse":82,"./local_storage":40,"./urlhash":74,"assert":undefined}],18:[function(require,module,exports){
"use strict"
exports.FACE_XYZ=exports.FACE_XY=exports.FACE_NONE=exports.FACE_FRUSTUM=exports.FACE_DEFAULT=exports.FACE_CUSTOM=exports.FACE_CAMERA=exports.BUCKET_OPAQUE=exports.BUCKET_DECAL=exports.BUCKET_ALPHA=void 0
exports.dynGeomAlloc=dynGeomAlloc
exports.dynGeomDrawAlpha=dynGeomDrawAlpha
exports.dynGeomDrawOpaque=dynGeomDrawOpaque
exports.dynGeomLookAt=dynGeomLookAt
exports.dynGeomQueueSprite=dynGeomQueueSprite
exports.dynGeomSpriteSetup=dynGeomSpriteSetup
exports.sprite3d_vshader=void 0
var BUCKET_OPAQUE=1
exports.BUCKET_OPAQUE=BUCKET_OPAQUE
var BUCKET_DECAL=2
exports.BUCKET_DECAL=BUCKET_DECAL
var BUCKET_ALPHA=3
exports.BUCKET_ALPHA=BUCKET_ALPHA
var FACE_NONE=0
exports.FACE_NONE=FACE_NONE
var FACE_XY=1
exports.FACE_XY=FACE_XY
var FACE_XYZ=2
exports.FACE_XYZ=FACE_XYZ
var FACE_FRUSTUM=4
exports.FACE_FRUSTUM=FACE_FRUSTUM
var FACE_CAMERA=8
exports.FACE_CAMERA=FACE_CAMERA
var FACE_DEFAULT=FACE_XY|FACE_FRUSTUM
exports.FACE_DEFAULT=FACE_DEFAULT
var FACE_CUSTOM=16
exports.FACE_CUSTOM=FACE_CUSTOM
var DYN_VERT_SIZE=12
var MAX_VERT_ELEM_COUNT=65532*DYN_VERT_SIZE
var assert=require("assert")
var mat4LookAt=require("gl-mat4/lookAt")
var _require=require("../common/util.js"),log2=_require.log2,nextHighestPowerOfTwo=_require.nextHighestPowerOfTwo
var _require2=require("../common/vmath.js"),mat4=_require2.mat4,v3addScale=_require2.v3addScale,v3copy=_require2.v3copy,v3cross=_require2.v3cross,v3iNormalize=_require2.v3iNormalize,v3scale=_require2.v3scale,v3sub=_require2.v3sub,vec3=_require2.vec3,zero_vec=_require2.zero_vec
var _require3=require("./cmds.js"),cmd_parse=_require3.cmd_parse
var engine=require("./engine.js")
var engineStartupFunc=engine.engineStartupFunc,setGlobalMatrices=engine.setGlobalMatrices
var geom=require("./geom.js")
var ceil=Math.ceil,max=Math.max,min=Math.min
var settings=require("./settings.js")
var _require4=require("./shaders.js"),SEMANTIC=_require4.SEMANTIC,shaderCreate=_require4.shaderCreate,shadersBind=_require4.shadersBind,shadersPrelink=_require4.shadersPrelink
var sprites=require("./sprites.js")
var BLEND_ALPHA=sprites.BLEND_ALPHA,blendModeReset=sprites.blendModeReset,blendModeSet=sprites.blendModeSet
var _require5=require("./textures.js"),textureCmpArray=_require5.textureCmpArray,textureBindArray=_require5.textureBindArray
settings.register({gl_polygon_offset_a:{default_value:.1,type:cmd_parse.TYPE_FLOAT,range:[0,100],access_show:["sysadmin"]},gl_polygon_offset_b:{default_value:4,type:cmd_parse.TYPE_FLOAT,range:[0,100],access_show:["sysadmin"]}})
var mat_vp
var mat_view=mat4()
var geom_stats
var last_uid=0
var sprite_fshader
var sprite3d_vshader
exports.sprite3d_vshader=sprite3d_vshader
var sprite3d_shader_params={}
var buckets=[null,[],[],[]]
var TRI_QUAD=new Uint16Array([1,3,0,1,2,3])
var TRI_QUAD_DOUBLE=new Uint16Array([1,3,0,1,2,3,0,3,1,3,2,1])
var dyn_freelist=[]
function DynGeomData(){this.num_tris=0
this.tris=null
this.tri_pool_idx=0
this.num_verts=0
this.verts=null
this.vert_pool_idx=0
this.texs=null
this.shader=null
this.vshader=null
this.shader_params=null
this.blend=0
this.sort_z=0
this.uid=0}function dynGeomAlloc(){var ret
if(dyn_freelist.length)ret=dyn_freelist.pop()
else ret=new DynGeomData
return ret}DynGeomData.prototype.queue=function(bucket,sort_z){assert(isFinite(sort_z))
assert(this.texs)
assert(this.shader)
assert(this.vshader)
this.sort_z=sort_z
this.uid=++last_uid;++geom_stats.dyn
buckets[bucket].push(this)}
var vert_pool=new Array(15).join(",").split(",").map(function(){return[]})
vert_pool[0]=null
var tri_pool=new Array(15).join(",").split(",").map(function(){return[]})
tri_pool[0]=null
var POOL_UPPER_LIMIT=4096
var VERT_POOL_MAX_SIZE=vert_pool.map(function(a,idx){return min(POOL_UPPER_LIMIT,1<<14-idx)})
var TRI_POOL_MAX_SIZE=vert_pool.map(function(a,idx){return min(POOL_UPPER_LIMIT,1<<17-idx)})
DynGeomData.prototype.allocVerts=function(num_verts){assert(num_verts*DYN_VERT_SIZE<MAX_VERT_ELEM_COUNT)
this.num_verts=num_verts
var vert_pool_idx=log2(this.num_verts)
assert(vert_pool_idx>0)
this.vert_pool_idx=vert_pool_idx
var pool=vert_pool[this.vert_pool_idx]
if(pool&&pool.length)this.verts=pool.pop()
else{var alloc_num_verts=pool?nextHighestPowerOfTwo(num_verts):num_verts
this.verts=new Float32Array(DYN_VERT_SIZE*alloc_num_verts)}}
DynGeomData.prototype.allocTris=function(num_tris){this.num_tris=num_tris
var tri_pool_idx=log2(this.num_tris)
assert(tri_pool_idx>0)
this.tri_pool_idx=tri_pool_idx
var pool=tri_pool[this.tri_pool_idx]
if(pool&&pool.length)this.tris=pool.pop()
else{var alloc_num_tris=pool?nextHighestPowerOfTwo(num_tris):num_tris
this.tris=new Uint16Array(3*alloc_num_tris)}}
DynGeomData.prototype.alloc=function(num_verts,num_tris){this.allocVerts(num_verts)
this.allocTris(num_tris)}
DynGeomData.prototype.allocQuad=function(doublesided){this.allocVerts(4)
this.tris=doublesided?TRI_QUAD_DOUBLE:TRI_QUAD
this.num_tris=this.tris.length/3
this.tri_pool_idx=0}
DynGeomData.prototype.dispose=function(){var pool=vert_pool[this.vert_pool_idx]
if(pool&&pool.length<VERT_POOL_MAX_SIZE[this.vert_pool_idx])pool.push(this.verts)
this.verts=null
if((pool=tri_pool[this.tri_pool_idx])&&pool.length<TRI_POOL_MAX_SIZE[this.tri_pool_idx])pool.push(this.tris)
this.tris=null
dyn_freelist.push(this)}
var down=vec3()
var up=vec3()
var cam_down=vec3()
var cam_pos=vec3()
var right=vec3()
var forward=vec3()
var look_at_called=false
function dynGeomLookAt(cam_pos_in,target_pos,up_in){look_at_called=true
v3copy(cam_pos,cam_pos_in)
v3copy(up,up_in)
v3scale(down,up,-1)
v3sub(forward,target_pos,cam_pos)
v3iNormalize(forward)
v3cross(right,forward,up)
v3iNormalize(right)
v3cross(cam_down,forward,right)
v3iNormalize(cam_down)
mat4LookAt(mat_view,cam_pos,target_pos,up)
setGlobalMatrices(mat_view)}var temp=vec3()
var xaxis=vec3(1,0,0)
var target_right=vec3()
function dynGeomSpriteSetup(params){assert(look_at_called)
var pos=params.pos,shader=params.shader,shader_params=params.shader_params,bucket=params.bucket,facing=params.facing,vshader=params.vshader
bucket=bucket||BUCKET_ALPHA
shader=shader||sprite_fshader
vshader=vshader||sprite3d_vshader
shader_params=shader_params||null
var my_right
var my_down
if((facing=void 0===facing?FACE_DEFAULT:facing)===FACE_CUSTOM){my_right=params.face_right
my_down=params.face_down}else if(facing&FACE_XY){my_right=right
my_down=down}else if(facing&FACE_XYZ){my_right=right
my_down=cam_down}else{my_right=xaxis
my_down=down}if(my_right===right&&facing&FACE_CAMERA){v3sub(temp,pos,cam_pos)
v3cross(target_right,temp,up)
my_right=v3iNormalize(target_right)}return{bucket:bucket,my_right:my_right,my_down:my_down,sort_z:mat_vp[2]*pos[0]+mat_vp[6]*pos[1]+mat_vp[10]*pos[2]+mat_vp[14],shader:shader,vshader:vshader,shader_params:shader_params}}var pos0=vec3()
function dynGeomQueueSprite(sprite,params){var _dynGeomSpriteSetup=dynGeomSpriteSetup(params),bucket=_dynGeomSpriteSetup.bucket,my_right=_dynGeomSpriteSetup.my_right,my_down=_dynGeomSpriteSetup.my_down,sort_z=_dynGeomSpriteSetup.sort_z,shader=_dynGeomSpriteSetup.shader,vshader=_dynGeomSpriteSetup.vshader,shader_params=_dynGeomSpriteSetup.shader_params
var pos=params.pos,offs=params.offs,size=params.size,uvs=params.uvs,blend=params.blend,color=params.color,doublesided=params.doublesided
var elem=dynGeomAlloc()
color=color||sprite.color
offs=offs||zero_vec
elem.shader=shader
elem.vshader=vshader
elem.shader_params=shader_params
elem.texs=sprite.texs
elem.blend=blend||BLEND_ALPHA
doublesided=doublesided||false
var origin=sprite.origin
var w=size[0],h=size[1]
v3addScale(pos0,pos,my_right,-origin[0]*w+offs[0])
v3addScale(pos0,pos0,my_down,-origin[1]*h+offs[1])
elem.allocQuad(doublesided)
var verts=elem.verts
verts[0]=pos0[0]
verts[1]=pos0[1]
verts[2]=pos0[2]
verts[4]=color[0]
verts[5]=color[1]
verts[6]=color[2]
verts[7]=color[3]
verts[8]=uvs[0]
verts[9]=uvs[1]
verts[12]=pos0[0]+my_down[0]*h
verts[13]=pos0[1]+my_down[1]*h
verts[14]=pos0[2]+my_down[2]*h
verts[16]=color[0]
verts[17]=color[1]
verts[18]=color[2]
verts[19]=color[3]
verts[20]=uvs[0]
verts[21]=uvs[3]
verts[24]=pos0[0]+my_right[0]*w+my_down[0]*h
verts[25]=pos0[1]+my_right[1]*w+my_down[1]*h
verts[26]=pos0[2]+my_right[2]*w+my_down[2]*h
verts[28]=color[0]
verts[29]=color[1]
verts[30]=color[2]
verts[31]=color[3]
verts[32]=uvs[2]
verts[33]=uvs[3]
verts[36]=pos0[0]+my_right[0]*w
verts[37]=pos0[1]+my_right[1]*w
verts[38]=pos0[2]+my_right[2]*w
verts[40]=color[0]
verts[41]=color[1]
verts[42]=color[2]
verts[43]=color[3]
verts[44]=uvs[2]
verts[45]=uvs[1]
elem.queue(bucket,sort_z)}var batch_state
var sprite_geom
var sprite_buffer_vert
var sprite_buffer_vert_cur=0
var sprite_buffer_idx
var sprite_buffer_idx_cur=0
var sprite_buffer_idx_batch_start=0
var do_blending
var last_bound_shader
var last_bound_vshader
var batches=[]
function commit(){if(sprite_buffer_idx_cur===sprite_buffer_idx_batch_start)return
batches.push({state:batch_state,start:sprite_buffer_idx_batch_start,end:sprite_buffer_idx_cur})
sprite_buffer_idx_batch_start=sprite_buffer_idx_cur}function commitAndFlush(){commit()
if(!batches.length)return
assert(sprite_buffer_idx_cur)
sprite_geom.updateIndex(sprite_buffer_idx,sprite_buffer_idx_cur)
var num_verts=sprite_buffer_vert_cur/DYN_VERT_SIZE
sprite_geom.update(sprite_buffer_vert,num_verts)
sprite_geom.bind()
geom_stats.tris+=sprite_buffer_idx_cur/3
geom_stats.verts+=num_verts
for(var ii=0;ii<batches.length;++ii){var batch=batches[ii]
var state=batch.state,start=batch.start,end=batch.end
if(last_bound_shader!==state.shader||last_bound_vshader!==state.vshader||state.shader_params){shadersBind(state.vshader,state.shader,state.shader_params||sprite3d_shader_params)
last_bound_shader=state.shader
last_bound_vshader=state.vshader}if(do_blending)blendModeSet(state.blend)
textureBindArray(state.texs);++geom_stats.draw_calls_dyn
gl.drawElements(sprite_geom.mode,end-start,gl.UNSIGNED_SHORT,2*start)}batches.length=0
sprite_buffer_idx_batch_start=sprite_buffer_idx_cur=sprite_buffer_vert_cur=0}function drawSetup(do_blend){do_blending=do_blend
last_bound_vshader=last_bound_shader=-1
if(!sprite_geom){sprite_geom=geom.create([[SEMANTIC.POSITION,gl.FLOAT,4,false],[SEMANTIC.COLOR,gl.FLOAT,4,false],[SEMANTIC.TEXCOORD,gl.FLOAT,4,false]],[],[],geom.TRIANGLES)
sprite_buffer_vert=new Float32Array(1024)
sprite_buffer_idx=new Uint16Array(1024)}}function drawElem(elem){if(!batch_state||textureCmpArray(elem.texs,batch_state.texs)||elem.shader!==batch_state.shader||elem.vshader!==batch_state.vshader||elem.shader_params!==batch_state.shader_params||do_blending&&elem.blend!==batch_state.blend){commit()
batch_state=elem}var num_floats=elem.num_verts*DYN_VERT_SIZE
if(sprite_buffer_vert_cur+num_floats>sprite_buffer_vert.length){commitAndFlush()
if(sprite_buffer_vert.length!==MAX_VERT_ELEM_COUNT){var cur_tris=sprite_buffer_vert.length/DYN_VERT_SIZE/3
var new_length=min(max(num_floats,3*ceil(1.25*cur_tris)*DYN_VERT_SIZE),MAX_VERT_ELEM_COUNT)
sprite_buffer_vert=new Float32Array(new_length)}}var num_idxs=3*elem.num_tris
if(sprite_buffer_idx_cur+num_idxs>sprite_buffer_idx.length){commitAndFlush()
var _cur_tris=sprite_buffer_idx.length/3
var _new_length=max(elem.tris.length,3*ceil(1.25*_cur_tris))
sprite_buffer_idx=new Uint16Array(_new_length)}var vidx0=sprite_buffer_vert_cur/DYN_VERT_SIZE
if(elem.verts.length===num_floats){sprite_buffer_vert.set(elem.verts,sprite_buffer_vert_cur)
sprite_buffer_vert_cur+=num_floats}else for(var ii=0;ii<num_floats;++ii)sprite_buffer_vert[sprite_buffer_vert_cur++]=elem.verts[ii]
for(var _ii=0;_ii<num_idxs;++_ii)sprite_buffer_idx[sprite_buffer_idx_cur++]=vidx0+elem.tris[_ii]}function finishDraw(){commitAndFlush()
blendModeReset()}function queueDraw(do_blend,queue,start_idx,end_idx){drawSetup(do_blend)
for(var ii=start_idx;ii<end_idx;++ii){var elem=queue[ii]
drawElem(elem)
elem.dispose()}finishDraw()}function cmpOpaue(a,b){var d=a.vshader.id-b.vshader.id
if(d)return d
if(d=a.shader.id-b.shader.id)return d
if(d=textureCmpArray(a.texs,b.texs))return d
return a.uid-b.uid}function cmpAlpha(a,b){var d=b.sort_z-a.sort_z
if(d)return d
return a.uid-b.uid}function dynGeomDrawOpaque(){profilerStart("dynGeomDrawOpaque")
var queue=buckets[BUCKET_OPAQUE]
if(queue.length){queue.sort(cmpOpaue)
queueDraw(false,queue,0,queue.length)
queue.length=0}if((queue=buckets[BUCKET_DECAL]).length){queue.sort(cmpOpaue)
gl.enable(gl.BLEND)
gl.depthMask(false)
gl.enable(gl.POLYGON_OFFSET_FILL)
gl.polygonOffset(-settings.gl_polygon_offset_a,-settings.gl_polygon_offset_b)
queueDraw(true,queue,0,queue.length)
queue.length=0
gl.disable(gl.POLYGON_OFFSET_FILL)
gl.depthMask(true)
gl.disable(gl.BLEND)}profilerStop("dynGeomDrawOpaque")}function dynGeomDrawAlpha(){profilerStart("dynGeomDrawAlpha")
assert(!buckets[BUCKET_OPAQUE].length)
assert(!buckets[BUCKET_DECAL].length)
var queue=buckets[BUCKET_ALPHA]
if(queue.length){queue.sort(cmpAlpha)
queueDraw(true,queue,0,queue.length)
queue.length=0}profilerStop("dynGeomDrawAlpha")}function dynGeomStartup(){geom_stats=geom.stats
exports.sprite3d_vshader=sprite3d_vshader=shaderCreate("shaders/sprite3d.vp")
sprite_fshader=sprites.sprite_fshader
shadersPrelink(sprite3d_vshader,sprite_fshader)
mat_vp=engine.mat_vp}engineStartupFunc(dynGeomStartup)

},{"../common/util.js":96,"../common/vmath.js":98,"./cmds.js":17,"./engine.js":21,"./geom.js":30,"./settings.js":59,"./shaders.js":61,"./sprites.js":68,"./textures.js":70,"assert":undefined,"gl-mat4/lookAt":undefined}],19:[function(require,module,exports){
"use strict"
exports.editBox=editBox
exports.editBoxAnyActive=editBoxAnyActive
exports.editBoxCreate=editBoxCreate
exports.editBoxTick=editBoxTick
exports.showOnscreenKeyboard=showOnscreenKeyboard
exports.create=editBoxCreate
var assert=require("assert")
var _glovCommonUtil=require("../common/util")
var clamp=_glovCommonUtil.clamp
var trimEnd=_glovCommonUtil.trimEnd
var _glovCommonVerify=require("../common/verify")
var verify=_glovCommonVerify
var _glovCommonVmath=require("../common/vmath")
var v2same=_glovCommonVmath.v2same
var _camera2d=require("./camera2d")
var camera2d=_camera2d
var _engine=require("./engine")
var engine=_engine
var _input=require("./input")
var KEYS=_input.KEYS
var eatAllKeyboardInput=_input.eatAllKeyboardInput
var inputClick=_input.inputClick
var inputTouchMode=_input.inputTouchMode
var keyDownEdge=_input.keyDownEdge
var keyUpEdge=_input.keyUpEdge
var mouseConsumeClicks=_input.mouseConsumeClicks
var pointerLockEnter=_input.pointerLockEnter
var pointerLockExit=_input.pointerLockExit
var pointerLocked=_input.pointerLocked
var _localization=require("./localization")
var getStringIfLocalizable=_localization.getStringIfLocalizable
var _spot=require("./spot")
var spotFocusCheck=_spot.spotFocusCheck
var spotFocusSteal=_spot.spotFocusSteal
var spotSuppressKBNav=_spot.spotSuppressKBNav
var spotUnfocus=_spot.spotUnfocus
var spotlog=_spot.spotlog
var _ui=require("./ui")
var drawLine=_ui.drawLine
var drawRect=_ui.drawRect
var getUIElemData=_ui.getUIElemData
var uiButtonWidth=_ui.uiButtonWidth
var uiGetDOMElem=_ui.uiGetDOMElem
var uiGetDOMTabIndex=_ui.uiGetDOMTabIndex
var uiGetFont=_ui.uiGetFont
var uiTextHeight=_ui.uiTextHeight
var round=Math.round
var form_hook_registered=false
var active_edit_box
var active_edit_box_frame
var this_frame_edit_boxes=[]
var last_frame_edit_boxes=[]
function editBoxTick(){var expected_last_frame=engine.frame_index-1
for(var ii=0;ii<last_frame_edit_boxes.length;++ii){var edit_box=last_frame_edit_boxes[ii]
if(edit_box.last_frame<expected_last_frame)edit_box.unrun()}last_frame_edit_boxes=this_frame_edit_boxes
this_frame_edit_boxes=[]}function setActive(edit_box){active_edit_box=edit_box
active_edit_box_frame=engine.frame_index}function editBoxAnyActive(){return active_edit_box&&active_edit_box_frame>=engine.frame_index-1}var osk_elem
var osk_timeout
function showOnscreenKeyboardCleanup(){if(osk_timeout){clearTimeout(osk_timeout)
osk_timeout=null
document.body.removeChild(osk_elem)
osk_elem=null}}function showOnscreenKeyboardInEvent(){if(!osk_elem){(osk_elem=document.createElement("input")).setAttribute("type","search")
osk_elem.setAttribute("style","position: fixed; top: -100px; left: -100px;")
document.body.appendChild(osk_elem)
osk_timeout=setTimeout(showOnscreenKeyboardCleanup,1e3)}osk_elem.focus()}function showOnscreenKeyboard(){return inputTouchMode()||true?showOnscreenKeyboardInEvent:void 0}function formHook(ev){ev.preventDefault()
if(!editBoxAnyActive())return
active_edit_box.submitted=true
active_edit_box.updateText()
if(active_edit_box.pointer_lock&&!active_edit_box.text)pointerLockEnter("edit_box_submit")}function charIdxToXY(text,offset){offset=clamp(offset,0,text.length)
var lines=text.split("\n")
var linenum=0
while(linenum<lines.length){var line=lines[linenum]
if(offset<=line.length)return[offset,linenum]
offset-=line.length
assert(offset>0)
offset--
linenum++}verify(false)
return[0,linenum]}var last_key_id=0
var GlovUIEditBox=function(){function GlovUIEditBox(params){this.key="eb"+ ++last_key_id
this.x=0
this.y=0
this.z=Z.UI
this.w=uiButtonWidth()
this.type="text"
this.font_height=uiTextHeight()
this.last_set_text=""
this.text=""
this.placeholder=""
this.max_len=0
this.max_visual_size=null
this.zindex=null
this.uppercase=false
this.initial_focus=false
this.onetime_focus=false
this.auto_unfocus=true
this.focus_steal=false
this.initial_select=false
this.spellcheck=true
this.esc_clears=true
this.esc_unfocuses=true
this.multiline=0
this.enforce_multiline=true
this.suppress_up_down=false
this.autocomplete=false
this.center=false
this.sticky_focus=true
this.canvas_render=null
this.applyParams(params)
assert.equal(typeof this.text,"string")
this.last_autocomplete=null
this.last_placeholder=null
this.is_focused=false
this.elem=null
this.input=null
this.submitted=false
this.pointer_lock=false
this.last_frame=0
this.out={}
this.last_valid_state={sel_start:0,sel_end:0}
this.resetCSSCaching()
this.had_overflow=false}var _proto=GlovUIEditBox.prototype
_proto.resetCSSCaching=function resetCSSCaching(){this.last_tab_index=-1
this.last_font_size=""
this.last_clip_path=""}
_proto.applyParams=function applyParams(params){if(!params)return
for(var f in params)if("text"!==f)this[f]=params[f]
if(params.text&&params.text!==this.last_set_text)this.setText(params.text)
this.h=(this.multiline||1)*this.font_height}
_proto.getSelection=function getSelection(){return[charIdxToXY(this.text,this.input.selectionStart),charIdxToXY(this.text,this.input.selectionEnd)]}
_proto.setSelectionRange=function setSelectionRange(sel_start,sel_end){this.input.setSelectionRange(sel_start,sel_end)}
_proto.updateText=function updateText(){var input=this.input
if(!input)return
var new_text=input.value
var saved_new_text=new_text
var sel_start=input.selectionStart
var sel_end=input.selectionEnd
if(new_text===this.text){this.last_valid_state.sel_start=sel_start
this.last_valid_state.sel_end=sel_end
return}var multiline=this.multiline,enforce_multiline=this.enforce_multiline,max_len=this.max_len,max_visual_size=this.max_visual_size
var valid=true
var old_text=this.text
function debug(msg){if(engine.defines.EDITBOX){console.log("Editbox (multiline="+multiline+", max_len="+max_len+": "+engine.frame_index+": "+msg)
console.log("  Old sel range = ["+sel_start+","+sel_end+"]")
console.log("  New sel range = ["+input.selectionStart+","+input.selectionEnd+"]")
console.log("  Old text         = "+JSON.stringify(old_text))
console.log("  Desired new text = "+JSON.stringify(saved_new_text))
console.log("  New text         = "+JSON.stringify(new_text))}}if(enforce_multiline&&multiline&&new_text.split("\n").length>multiline)if(trimEnd(new_text).split("\n").length<=multiline){while(new_text.split("\n").length>multiline)if(new_text[new_text.length-1].match(/\s/))new_text=new_text.slice(0,-1)
if(this.text===new_text)if(sel_end<=new_text.length){input.value=new_text
this.setSelectionRange(sel_start,sel_end)
debug("trimming helped to keep selection")}else{valid=false
debug("trimmed equal orig")}else{input.value=new_text
this.setSelectionRange(sel_start,sel_end)
debug("trimming helped")}}else{valid=false
debug("trimmed too long")}if(max_len>0||max_visual_size){var eff_max_len=max_len||Infinity
var lines=multiline?new_text.split("\n"):[new_text]
for(var ii=0;ii<lines.length;++ii){var line=lines[ii]
var over=line.length>eff_max_len
var font=max_visual_size?uiGetFont():null
if(max_visual_size&&!over)over=font.getStringWidth(null,max_visual_size.font_height,line)>max_visual_size.width
var trimmed=trimEnd(line)
var trim_over=over&&trimmed.length>eff_max_len
if(max_visual_size&&over&&!trim_over)trim_over=font.getStringWidth(null,max_visual_size.font_height,trimmed)>max_visual_size.width
if(max_visual_size&&over&&trim_over&&font.getStringWidth(null,max_visual_size.font_height,line.slice(0,-2))>max_visual_size.width)while(trimmed.length&&font.getStringWidth(null,max_visual_size.font_height,trimmed)>max_visual_size.width){trimmed=trimmed.slice(0,-1)
trim_over=false}if(over)if(!trim_over){var old_line_end_pos=lines.slice(0,ii+1).join("\n").length
lines[ii]=trimmed
var new_line_end_pos=lines.slice(0,ii+1).join("\n").length
new_text=lines.join("\n")
var shift=old_line_end_pos-new_line_end_pos
if(sel_start>old_line_end_pos)sel_start-=shift
else if(sel_start>new_line_end_pos)sel_start=new_line_end_pos
if(sel_end>=old_line_end_pos)sel_end-=shift
else if(sel_end>new_line_end_pos)sel_end=new_line_end_pos
input.value=new_text
this.setSelectionRange(sel_start,sel_end)
debug("over but not trim_over; updating text and sel")}else{valid=false
debug("invalid: over")}}}if(!valid){var old_was_invalid=false
if(max_len>0||max_visual_size){var _eff_max_len=max_len||Infinity
var _lines=multiline?this.text.split("\n"):[this.text]
for(var _ii=0;_ii<_lines.length;++_ii){var _line=_lines[_ii]
if(_line.length>_eff_max_len)old_was_invalid=true
if(max_visual_size&&!old_was_invalid)old_was_invalid=uiGetFont().getStringWidth(null,max_visual_size.font_height,_line)>max_visual_size.width}}if(old_was_invalid)if(new_text.length<this.text.length)valid=true}if(!valid){this.had_overflow=true
input.value=this.text
this.setSelectionRange(this.last_valid_state.sel_start,this.last_valid_state.sel_end)
debug("invalid: reset sel range to ["+this.last_valid_state.sel_start+", "+this.last_valid_state.sel_end+"]")}else{this.text=new_text
this.last_valid_state.sel_start=sel_start
this.last_valid_state.sel_end=sel_end}}
_proto.getText=function getText(){return this.text}
_proto.hadOverflow=function hadOverflow(){var ret=this.had_overflow
this.had_overflow=false
return ret}
_proto.setText=function setText(new_text){new_text=String(new_text)
var max_len=this.max_len,max_visual_size=this.max_visual_size,multiline=this.multiline
var font=max_visual_size?uiGetFont():null
if(max_len>0&&max_visual_size){var lines=multiline?new_text.split("\n"):[new_text]
for(var ii=0;ii<lines.length;++ii){var line=lines[ii]
if(max_len>0){if(line.length>max_len)line=trimEnd(line)
if(line.length>max_len)line=line.slice(0,max_len)}if(max_visual_size)while(line.length&&font.getStringWidth(null,max_visual_size.font_height,line)>max_visual_size.width)line=line.slice(0,line.length-1)
lines[ii]=line}new_text=lines.join("\n")}var input=this.input
if(input&&input.value!==new_text){if(engine.defines.EDITBOX){console.log("Editbox (multiline="+multiline+", max_len="+max_len+": "+engine.frame_index+": setText()")
console.log("  Sel range = ["+input.selectionStart+","+input.selectionEnd+"]")
console.log("  Old text         = "+JSON.stringify(input.value))
console.log("  New text         = "+JSON.stringify(new_text))}input.value=new_text}this.text=new_text
this.last_set_text=new_text}
_proto.focus=function focus(){if(this.input){this.input.focus()
showOnscreenKeyboardCleanup()
if(this.select_on_focus)this.input.select()
setActive(this)}else this.onetime_focus=true
spotFocusSteal(this)
this.is_focused=true
if(this.pointer_lock&&pointerLocked())pointerLockExit()}
_proto.unfocus=function unfocus(){spotUnfocus()}
_proto.isFocused=function isFocused(){return this.is_focused}
_proto.updateFocus=function updateFocus(is_reset){var was_glov_focused=this.is_focused
var spot_ret=spotFocusCheck(this)
var focused=spot_ret.focused
var dom_focused=this.input&&document.activeElement===this.input
if(was_glov_focused!==focused){if(focused&&!dom_focused){spotlog("GLOV focused, DOM not, focusing",this)
if(this.input){this.input.focus()
showOnscreenKeyboardCleanup()
if(this.select_on_focus)this.input.select()}else this.onetime_focus=true}if(!focused&&dom_focused){spotlog("DOM focused, GLOV not, and changed, blurring",this)
this.input.blur()}}else if(dom_focused&&!focused){spotlog("DOM focused, GLOV not, stealing",this)
spotFocusSteal(this)
if(this.input&&this.select_on_focus)this.input.select()
focused=true}else if(!dom_focused&&focused)if(is_reset){this.onetime_focus=true
spotlog("GLOV focused, DOM not, new edit box, focusing",this)}else if(document.activeElement===engine.canvas||document.activeElement===this.postspan){spotlog("GLOV focused, DOM canvas focused, unfocusing",this)
spotUnfocus()}if(focused){setActive(this)
var key_opt=this.pointer_lock&&!this.text?{in_event_cb:pointerLockEnter}:null
if((this.esc_clears||this.esc_unfocuses)&&keyUpEdge(KEYS.ESC,key_opt))if(this.text&&this.esc_clears)this.setText("")
else{spotUnfocus()
if(this.input)this.input.blur()
focused=false
this.canceled=true}}this.is_focused=focused
return spot_ret}
_proto.run=function run(params){var _this=this
this.applyParams(params)
var canvas_render=this.canvas_render,font_height=this.font_height,multiline=this.multiline,enforce_multiline=this.enforce_multiline,max_len=this.max_len
if(this.focus_steal){this.focus_steal=false
this.focus()
showOnscreenKeyboardCleanup()}var is_reset=false
if(!verify(this.last_frame!==engine.frame_index))return null
if(this.last_frame!==engine.frame_index-1){this.submitted=false
is_reset=true}this.last_frame=engine.frame_index
this.canceled=false
var _this$updateFocus=this.updateFocus(is_reset),allow_focus=_this$updateFocus.allow_focus,focused=_this$updateFocus.focused
if(focused)spotSuppressKBNav(true,Boolean(multiline||this.suppress_up_down))
var text=this.text,x=this.x,y=this.y,z=this.z,w=this.w,h=this.h
var clipped_rect={x:x,y:y,w:w,h:h}
if(allow_focus&&!camera2d.clipTestRect(clipped_rect))allow_focus=false
this_frame_edit_boxes.push(this)
var elem=allow_focus&&uiGetDOMElem(this.elem,true)
if(elem!==this.elem){this.resetCSSCaching()
if(elem){if(!form_hook_registered){form_hook_registered=true
var form=document.getElementById("dynform")
if(form)form.addEventListener("submit",formHook,true)}elem.textContent=""
var input=document.createElement(multiline?"textarea":"input")
var classes=[]
if(canvas_render)classes.push("canvas_render")
if(multiline&&max_len)classes.push("fixed")
if(this.center)classes.push("center")
input.className=classes.join(" ")
var eff_type="number"===this.type?"tel":"text"===this.type&&!this.autocomplete?"search":this.type
input.setAttribute("type",eff_type)
if("search"===eff_type&&"search"!==this.type)input.style["-webkit-appearance"]="none"
var placeholder=getStringIfLocalizable(this.placeholder)
input.setAttribute("placeholder",placeholder)
this.last_placeholder=placeholder
if(max_len)if(multiline)input.setAttribute("cols",max_len)
else input.setAttribute("maxLength",max_len)
if(multiline)input.setAttribute("rows",multiline)
elem.appendChild(input)
var span=document.createElement("span")
this.postspan=span
elem.appendChild(span)
input.value=this.text
if(this.uppercase)input.style["text-transform"]="uppercase"
this.input=input
if(this.initial_focus||this.onetime_focus){input.focus()
showOnscreenKeyboardCleanup()
setActive(this)
this.onetime_focus=false}if(this.initial_select)input.select()
if(multiline&&enforce_multiline||max_len){var onChange=function onChange(e){_this.updateText()
return true}
input.addEventListener("keyup",onChange)
input.addEventListener("keydown",onChange)
input.addEventListener("change",onChange)}}else this.input=null
this.last_autocomplete=null
this.last_placeholder=null
this.submitted=false
this.elem=elem}else if(this.input){this.updateText()
this.last_set_text=this.text}if(elem){var pos=camera2d.htmlPos(x,y)
if(!this.spellcheck)elem.spellcheck=false
elem.style.left=pos[0]+"%"
elem.style.top=pos[1]+"%"
var size=camera2d.htmlSize(w,h)
elem.style.width=size[0]+"%"
elem.style.height=size[1]+"%"
var clip_path=""
if(clipped_rect.x!==x||clipped_rect.y!==y||clipped_rect.w!==w||clipped_rect.h!==h){var x0=(clipped_rect.x-x)/w*100+"%"
var x1=(clipped_rect.x+clipped_rect.w-x)/w*100+"%"
var y0=(clipped_rect.y-y)/h*100+"%"
var y1=(clipped_rect.y+clipped_rect.w-y)/h*100+"%"
clip_path="polygon("+x0+" "+y0+", "+x1+" "+y0+", "+x1+" "+y1+", "+x0+" "+y1+")"}else clip_path=""
if(clip_path!==this.last_clip_path)elem.style.clipPath=this.last_clip_path=clip_path
var new_fontsize=camera2d.virtualToFontSize(font_height).toFixed(8)+"px"
if(new_fontsize!==this.last_font_size){this.last_font_size=new_fontsize
var preciseFontSize=camera2d.virtualToFontSize(font_height)
var roundedSize=Math.floor(preciseFontSize)
var s=preciseFontSize/roundedSize
elem.style.fontSize=roundedSize+"px"
var scale="translate(-50%, -50%)\n                       scale("+s+")\n                       translate(50%, 50%)"
this.input.style.width=(1/s*100).toFixed(8)+"%"
elem.style.transform=scale}if(this.zindex)elem.style["z-index"]=this.zindex
if(this.last_autocomplete!==this.autocomplete){this.last_autocomplete=this.autocomplete
this.input.setAttribute("autocomplete",this.autocomplete||"auto_off_"+Math.random())}var _placeholder=getStringIfLocalizable(this.placeholder)
if(this.last_placeholder!==_placeholder){this.input.setAttribute("placeholder",_placeholder)
this.last_placeholder=_placeholder}var tab_index1=uiGetDOMTabIndex()
var tab_index2=uiGetDOMTabIndex()
if(tab_index1!==this.last_tab_index){this.last_tab_index=tab_index1
this.input.setAttribute("tabindex",tab_index1)
this.postspan.setAttribute("tabindex",tab_index2)}}else this.resetCSSCaching()
if(focused){if(this.auto_unfocus)if(inputClick({peek:true}))spotUnfocus()
if(keyDownEdge(KEYS.ENTER))this.submitted=true
eatAllKeyboardInput()}mouseConsumeClicks({x:x,y:y,w:w,h:h})
if(canvas_render){var center=this.center
var char_width=canvas_render.char_width,char_height=canvas_render.char_height,color_selection=canvas_render.color_selection,color_caret=canvas_render.color_caret,style_text=canvas_render.style_text
var font=uiGetFont()
var lines=text.split("\n")
var line_width=[]
for(var ii=0;ii<lines.length;++ii){var line=lines[ii]
var line_w=font.draw({style:style_text,height:font_height,x:x,y:y+ii*char_height,z:z+.8,w:w,text:line,align:center?font.ALIGN.HCENTER:void 0})
line_width.push(line_w)}if(focused){var selection=this.getSelection()
if(!v2same(selection[0],selection[1])){var first_row=selection[0][1]
var last_row=selection[1][1]
for(var jj=first_row;jj<=last_row;++jj){var _line2=lines[jj]
var selx0=jj===first_row?selection[0][0]:0
var selx1=jj===last_row?selection[1][0]:_line2&&_line2.length||1
var xoffs=center?round((w-line_width[jj])/2):0
drawRect(x+char_width*selx0-1+xoffs,y+jj*char_height,x+char_width*selx1+xoffs,y+(jj+1)*char_height,z+.75,color_selection)}}else{var _jj=selection[1][1]
var caret_x=x+char_width*selection[1][0]-1
if(center)caret_x+=round((w-line_width[_jj])/2)
drawLine(caret_x,y+char_height*_jj,caret_x,y+char_height*(_jj+1)-1,z+.5,1,1,color_caret)}}}if(this.submitted){this.submitted=false
return this.SUBMIT}if(this.canceled){this.canceled=false
return this.CANCEL}return null}
_proto.unrun=function unrun(){this.elem=null
this.input=null}
return GlovUIEditBox}()
GlovUIEditBox.prototype.SUBMIT="submit"
GlovUIEditBox.prototype.CANCEL="cancel"
function editBoxCreate(params){if(void 0!==params.glov_initial_text)params.text=params.glov_initial_text
return new GlovUIEditBox(params)}function editBox(params,current){params.glov_initial_text=current
var edit_box=getUIElemData("edit_box",params,editBoxCreate)
return{result:edit_box.run(params),text:edit_box.getText(),edit_box:edit_box}}

},{"../common/util":96,"../common/verify":97,"../common/vmath":98,"./camera2d":15,"./engine":21,"./input":37,"./localization":41,"./spot":66,"./ui":72,"assert":undefined}],20:[function(require,module,exports){
"use strict"
exports.additiveMatrix=additiveMatrix
exports.applyColorMatrix=applyColorMatrix
exports.applyCopy=applyCopy
exports.applyGaussianBlur=applyGaussianBlur
exports.applyPixelyExpand=applyPixelyExpand
exports.brightnessAddMatrix=brightnessAddMatrix
exports.brightnessScaleMatrix=brightnessScaleMatrix
exports.clearAlpha=clearAlpha
exports.contrastMatrix=contrastMatrix
exports.effectsIsFinal=effectsIsFinal
exports.effectsLastFramebuffer=effectsLastFramebuffer
exports.effectsPassAdd=effectsPassAdd
exports.effectsPassConsume=effectsPassConsume
exports.effectsQueue=effectsQueue
exports.effectsReset=effectsReset
exports.effectsStartup=effectsStartup
exports.effectsTopOfFrame=effectsTopOfFrame
exports.grayScaleMatrix=grayScaleMatrix
exports.hueMatrix=hueMatrix
exports.negativeMatrix=negativeMatrix
exports.registerShader=registerShader
exports.saturationMatrix=saturationMatrix
exports.sepiaMatrix=sepiaMatrix
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var assert=require("assert")
var engine=require("./engine.js")
var renderWidth=engine.renderWidth,renderHeight=engine.renderHeight
var _require=require("./framebuffer.js"),framebufferEnd=_require.framebufferEnd,framebufferStart=_require.framebufferStart,framebufferTopOfFrame=_require.framebufferTopOfFrame
var geom=require("./geom.js")
var _require2=require("./shaders.js"),SEMANTIC=_require2.SEMANTIC,shaderCreate=_require2.shaderCreate,shadersBind=_require2.shadersBind,shadersPrelink=_require2.shadersPrelink
var _require3=require("./sprites.js"),spriteQueueFn=_require3.spriteQueueFn
var _require4=require("./textures.js"),textureBindArray=_require4.textureBindArray,textureWhite=_require4.textureWhite
var _require5=require("../common/vmath.js"),vec3=_require5.vec3,vec4=_require5.vec4,v4set=_require5.v4set
var shader_data={vp_copy:{vp:"shaders/effects_copy.vp"},copy:{fp:"shaders/effects_copy.fp"},pixely_expand:{fp:"shaders/pixely_expand.fp"},gaussian_blur:{fp:"shaders/effects_gaussian_blur.fp"},color_matrix:{fp:"shaders/effects_color_matrix.fp"}}
function registerShader(key,obj){shader_data[key]=obj}function getShader(key){var elem=shader_data[key]
if(!elem.shader)if(elem.fp)elem.shader=shaderCreate(elem.fp)
else elem.shader=shaderCreate(elem.vp)
return elem.shader}var inited=false
var clip_space=vec4(2,2,-1,-1)
var copy_uv_scale=vec4(1,1,0,0)
var shader_params_default={clip_space:clip_space,copy_uv_scale:copy_uv_scale}
var shader_params_color_matrix
var shader_params_gaussian_blur
var shader_params_pixely_expand
var quad_geom
function startup(){inited=true
quad_geom=geom.create([[SEMANTIC.POSITION,gl.FLOAT,2,false]],new Float32Array([0,0,1,0,1,1,0,1]),null,geom.QUADS)
shader_params_color_matrix={clip_space:clip_space,copy_uv_scale:copy_uv_scale,colorMatrix:new Float32Array([0,0,0,0,0,0,0,0,0,0,0,0])}
shader_params_gaussian_blur={clip_space:clip_space,copy_uv_scale:copy_uv_scale,sampleRadius:vec3(1,1,1),Gauss:new Float32Array([.93,.8,.7,.6,.5,.4,.3,.2,.1])}
shader_params_pixely_expand={clip_space:clip_space,copy_uv_scale:copy_uv_scale,orig_pixel_size:vec4()}}var num_passes=0
function effectsPassAdd(){++num_passes}function effectsPassConsume(){assert(num_passes);--num_passes}var last_framebuffer_source
function effectsLastFramebuffer(){return last_framebuffer_source}function doEffect(fn){effectsPassConsume()
fn()}function effectsQueue(z,fn){effectsPassAdd()
spriteQueueFn(z,doEffect.bind(null,fn))}function effectsTopOfFrame(){num_passes=0
framebufferTopOfFrame()}function effectsReset(){assert.equal(num_passes,0)}function effectsIsFinal(){return!num_passes}function grayScaleMatrix(dst){dst[0]=.2126
dst[1]=.2126
dst[2]=.2126
dst[3]=.7152
dst[4]=.7152
dst[5]=.7152
dst[6]=.0722
dst[7]=.0722
dst[8]=.0722
dst[9]=dst[10]=dst[11]=0}function sepiaMatrix(dst){dst[0]=.393
dst[1]=.349
dst[2]=.272
dst[3]=.769
dst[4]=.686
dst[5]=.534
dst[6]=.189
dst[7]=.168
dst[8]=.131
dst[9]=dst[10]=dst[11]=0}function negativeMatrix(dst){dst[0]=dst[4]=dst[8]=-1
dst[1]=dst[2]=dst[3]=dst[5]=dst[6]=dst[7]=0
dst[9]=dst[10]=dst[11]=1}function saturationMatrix(dst,saturationScale){var is=1-saturationScale
dst[0]=.2126*is+saturationScale
dst[1]=.2126*is
dst[2]=.2126*is
dst[3]=.7152*is
dst[4]=.7152*is+saturationScale
dst[5]=.7152*is
dst[6]=.0722*is
dst[7]=.0722*is
dst[8]=.0722*is+saturationScale
dst[9]=dst[10]=dst[11]=0}function hueMatrix(dst,angle){var c=Math.cos(angle)
var s=Math.sin(angle)
dst[0]=.7874*c+-.3712362230889293*s+.2126
dst[1]=-.2126*c+.20611404610069642*s+.2126
dst[2]=-.2126*c+-.9485864922785551*s+.2126
dst[3]=-.7152*c+-.4962902913954023*s+.7152
dst[4]=.2848*c+.08105997779422341*s+.7152
dst[5]=-.7152*c+.6584102469838492*s+.7152
dst[6]=-.0722*c+.8675265144843316*s+.0722
dst[7]=-.0722*c+-.28717402389491986*s+.0722
dst[8]=.9278*c+.290176245294706*s+.0722
dst[9]=dst[10]=dst[11]=0}function brightnessAddMatrix(dst,brightnessOffset){dst[0]=dst[4]=dst[8]=1
dst[1]=dst[2]=dst[3]=dst[5]=dst[6]=dst[7]=0
dst[9]=dst[10]=dst[11]=brightnessOffset}function brightnessScaleMatrix(dst,scale){dst[0]=dst[4]=dst[8]=scale
dst[1]=dst[2]=dst[3]=dst[5]=dst[6]=dst[7]=0
dst[9]=dst[10]=dst[11]=0}function additiveMatrix(dst,additiveRGB){dst[0]=dst[4]=dst[8]=1
dst[1]=dst[2]=dst[3]=dst[5]=dst[6]=dst[7]=0
dst[9]=additiveRGB[0]
dst[10]=additiveRGB[1]
dst[11]=additiveRGB[2]}function contrastMatrix(dst,contrastScale){dst[0]=dst[4]=dst[8]=contrastScale
dst[1]=dst[2]=dst[3]=dst[5]=dst[6]=dst[7]=0
dst[9]=dst[10]=dst[11]=.5*(1-contrastScale)}function applyEffect(effect,view_w,view_h){var final=false!==effect.final&&effectsIsFinal()||effect.final
if(effect.no_framebuffer){var viewport=engine.viewport
var target_w=viewport[2]
var target_h=viewport[3]
view_h=view_h||target_h
clip_space[0]=2*(view_w=view_w||target_w)/target_w
clip_space[1]=2*view_h/target_h}else if(effect.viewport){var _viewport=effect.viewport
var _target_w=_viewport[2]
var _target_h=_viewport[3]
view_h=view_h||_target_h
clip_space[0]=2*(view_w=view_w||_target_w)/_target_w
clip_space[1]=2*view_h/_target_h
framebufferStart({clear:effect.clear,clear_all:effect.clear_all,clear_color:effect.clear_color,viewport:_viewport,final:final,need_depth:effect.need_depth_begin})}else{clip_space[0]=2
clip_space[1]=2
view_w=view_w||renderWidth()
view_h=view_h||renderHeight()
framebufferStart({width:view_w,height:view_h,final:final,need_depth:effect.need_depth_begin})}shadersBind(getShader("vp_copy"),getShader(effect.shader),effect.params)
textureBindArray(effect.texs)
quad_geom.draw()}function applyCopy(params){if(!inited)startup()
var source=params.source
if(!source){source=framebufferEnd({filter_linear:params.filter_linear,need_depth:params.need_depth})
last_framebuffer_source=source}params.shader=params.shader||"copy"
params.params=params.params?_extends({},shader_params_default,params.params):shader_params_default
if(Array.isArray(source))params.texs=source
else params.texs=[source]
applyEffect(params)}function applyPixelyExpand(params){if(!inited)startup()
var source=params.source
assert(!source)
if(!source){source=framebufferEnd({filter_linear:true})
last_framebuffer_source=source}var resx=source.width
var resy=source.height
var sampleRadius=(params.hblur||.25)/resx
shader_params_gaussian_blur.sampleRadius[0]=sampleRadius
shader_params_gaussian_blur.sampleRadius[1]=0
shader_params_gaussian_blur.sampleRadius[2]=1
applyEffect({shader:"gaussian_blur",params:shader_params_gaussian_blur,texs:[source],final:false},resx,resy)
var hblur=framebufferEnd({filter_linear:true})
sampleRadius=(params.vblur||.75)/resy
shader_params_gaussian_blur.sampleRadius[0]=0
shader_params_gaussian_blur.sampleRadius[1]=sampleRadius
shader_params_gaussian_blur.sampleRadius[2]=1
applyEffect({shader:"gaussian_blur",params:shader_params_gaussian_blur,texs:[hblur],final:false},resx,resy)
var vblur=framebufferEnd({filter_linear:true})
v4set(shader_params_pixely_expand.orig_pixel_size,source.width,source.height,1/source.width,1/source.height)
applyEffect({shader:"pixely_expand",params:shader_params_pixely_expand,texs:[source,hblur,vblur],clear:params.clear,clear_all:params.clear_all,clear_color:params.clear_color,viewport:params.viewport})}function applyGaussianBlur(params){if(!inited)startup()
var source=framebufferEnd({filter_linear:true})
last_framebuffer_source=source
var max_size=params.max_size||512
var min_size=params.min_size||128
var inputTexture0=source
var viewport=engine.viewport
var res=max_size
while(res>viewport[2]||res>viewport[3])res/=2
while(res>min_size){applyEffect({shader:params.shader_copy||"copy",params:shader_params_default,texs:[inputTexture0],final:false},res,res)
inputTexture0=framebufferEnd({filter_linear:true})
res/=2}var sampleRadius=(params.blur||1)/res
shader_params_gaussian_blur.sampleRadius[0]=sampleRadius
shader_params_gaussian_blur.sampleRadius[1]=0
shader_params_gaussian_blur.sampleRadius[2]=params.glow||1
applyEffect({shader:"gaussian_blur",params:shader_params_gaussian_blur,texs:[inputTexture0],final:false},res,res)
var blur=framebufferEnd({filter_linear:true})
shader_params_gaussian_blur.sampleRadius[0]=0
shader_params_gaussian_blur.sampleRadius[1]=sampleRadius
shader_params_gaussian_blur.sampleRadius[2]=params.glow||1
applyEffect({shader:"gaussian_blur",params:shader_params_gaussian_blur,texs:[blur]})
return true}function applyColorMatrix(params){if(!inited)startup()
var source=framebufferEnd({filter_linear:true})
last_framebuffer_source=source
var matrix=params.colorMatrix
var mout=shader_params_color_matrix.colorMatrix
mout[0]=matrix[0]
mout[1]=matrix[3]
mout[2]=matrix[6]
mout[3]=matrix[9]
mout[4]=matrix[1]
mout[5]=matrix[4]
mout[6]=matrix[7]
mout[7]=matrix[10]
mout[8]=matrix[2]
mout[9]=matrix[5]
mout[10]=matrix[8]
mout[11]=matrix[11]
applyEffect({shader:"color_matrix",params:shader_params_color_matrix,texs:[source]})
return true}function clearAlpha(){var old_dt=gl.getParameter(gl.DEPTH_TEST)
if(old_dt)gl.disable(gl.DEPTH_TEST)
gl.colorMask(false,false,false,true)
applyCopy({source:textureWhite(),no_framebuffer:true})
gl.colorMask(true,true,true,true)
if(old_dt)gl.enable(gl.DEPTH_TEST)}function effectsStartup(prelink_effects){prelink_effects.forEach(function(name){shadersPrelink(getShader("vp_copy"),getShader(name))})}

},{"../common/vmath.js":98,"./engine.js":21,"./framebuffer.js":29,"./geom.js":30,"./shaders.js":61,"./sprites.js":68,"./textures.js":70,"assert":undefined}],21:[function(require,module,exports){
"use strict"
exports.ZNEAR=exports.ZFAR=exports.PERF_HISTORY_SIZE=exports.DEBUG=void 0
exports.addTickFunc=addTickFunc
exports.addViewSpaceGlobal=addViewSpaceGlobal
exports.canvas=exports.border_color=exports.border_clear_color=exports.app_state=exports.antialias_unavailable=exports.antialias=void 0
exports.clearHad3DThisFrame=clearHad3DThisFrame
exports.debugDefineIsSet=debugDefineIsSet
exports.defineCausesReload=defineCausesReload
exports.defineOnChange=defineOnChange
exports.defines=void 0
exports.definesChanged=definesChanged
exports.definesClearAll=definesClearAll
exports.dirtyRenderSet=dirtyRenderSet
exports.disableRender=disableRender
exports.dom_to_canvas_ratio=void 0
exports.engineSetReloadFunc=engineSetReloadFunc
exports.engineStartupFunc=engineStartupFunc
exports.fixNatives=fixNatives
exports.game_width=exports.game_height=exports.frame_timestamp=exports.frame_index=exports.frame_dt=exports.fov_y=exports.fov_x=exports.font=void 0
exports.getFrameDt=getFrameDt
exports.getFrameDtActual=getFrameDtActual
exports.getFrameIndex=getFrameIndex
exports.getFrameTimestamp=getFrameTimestamp
exports.getViewportPostprocess=getViewportPostprocess
exports.glCheckError=glCheckError
exports.hrtime=exports.hrnow=exports.height=exports.had_3d_this_frame=exports.glov_particles=void 0
exports.isInBackground=isInBackground
exports.isInBackgroundOrBlurred=isInBackgroundOrBlurred
exports.light_dir_ws=exports.light_diffuse=exports.light_ambient=exports.is_loading=void 0
exports.loadPendingDelta=loadPendingDelta
exports.loadsPending=loadsPending
exports.mat_vp=exports.mat_view=exports.mat_projection=void 0
exports.needDepthIn2D=needDepthIn2D
exports.onEnterBackground=onEnterBackground
exports.onExitBackground=onExitBackground
exports.onLoadMetrics=onLoadMetrics
exports.pixel_aspect=exports.perf_state=void 0
exports.postRender=postRender
exports.postTick=postTick
exports.postprocessing=void 0
exports.postprocessingAllow=postprocessingAllow
exports.preSpriteRender=preSpriteRender
exports.projectionZBias=projectionZBias
exports.releaseCanvas=releaseCanvas
exports.reloadSafe=reloadSafe
exports.removeTickFunc=removeTickFunc
exports.renderHeight=renderHeight
exports.renderNeeded=renderNeeded
exports.renderWidth=renderWidth
exports.render_width=exports.render_pixel_perfect=exports.render_height=void 0
exports.resizing=resizing
exports.setFOV=setFOV
exports.setFonts=setFonts
exports.setGameDims=setGameDims
exports.setGlobalMatrices=setGlobalMatrices
exports.setMatVP=setMatVP
exports.setPixelyStrict=setPixelyStrict
exports.setProjection=setProjection
exports.setState=setState
exports.setViewport=setViewport
exports.setViewportPostprocess=setViewportPostprocess
exports.setZRange=setZRange
exports.setupProjection=setupProjection
exports.start3DRendering=start3DRendering
exports.startSpriteRendering=startSpriteRendering
exports.startup=startup
exports.stateActive=stateActive
exports.updateMatrices=updateMatrices
exports.width=exports.webgl2=exports.viewport=void 0
require("./bootstrap.js")
var client_config=require("./client_config.js")
var DEBUG=client_config.MODE_DEVELOPMENT
exports.DEBUG=DEBUG
var startup_funcs=[]
exports.require=require
var assert=require("assert")
var _require=require("./browser.js"),is_ios=_require.is_ios,is_ios_chrome=_require.is_ios_chrome,is_ios_safari=_require.is_ios_safari,is_ipad=_require.is_ipad,safari_version_major=_require.safari_version_major,safari_version_minor=_require.safari_version_minor
var _require2=require("./build_ui.js"),buildUIStartup=_require2.buildUIStartup
var camera2d=require("./camera2d.js")
var cmds=require("./cmds.js")
require("./engine_cmds.js")
var _require3=require("../common/data_error.js"),dataErrorQueueEnable=_require3.dataErrorQueueEnable
var effects=require("./effects.js")
var effectsReset=effects.effectsReset,effectsTopOfFrame=effects.effectsTopOfFrame,effectsIsFinal=effects.effectsIsFinal,effectsPassAdd=effects.effectsPassAdd,effectsPassConsume=effects.effectsPassConsume
var _require4=require("./error_report.js"),errorReportDisable=_require4.errorReportDisable,errorReportSetTimeAccum=_require4.errorReportSetTimeAccum,errorReportSetDetails=_require4.errorReportSetDetails,glovErrorReportDisableSubmit=_require4.glovErrorReportDisableSubmit,glovErrorReportSetCrashCB=_require4.glovErrorReportSetCrashCB
var glov_font=require("./font.js")
var fontTick=glov_font.fontTick
var _require5=require("./framebuffer.js"),framebufferStart=_require5.framebufferStart,framebufferEndOfFrame=_require5.framebufferEndOfFrame
var _require6=require("./geom.js"),geomResetState=_require6.geomResetState,geomStartup=_require6.geomStartup
var input=require("./input.js")
var _require7=require("./input.js"),inputAllowAllEvents=_require7.inputAllowAllEvents
var local_storage=require("./local_storage.js")
var mat3FromMat4=require("gl-mat3/fromMat4")
var mat4Copy=require("gl-mat4/copy")
var mat4Invert=require("gl-mat4/invert")
var mat4Mul=require("gl-mat4/multiply")
var mat4Transpose=require("gl-mat4/transpose")
var mat4Perspective=require("gl-mat4/perspective")
var asin=Math.asin,cos=Math.cos,floor=Math.floor,min=Math.min,max=Math.max,PI=Math.PI,round=Math.round,sin=Math.sin,sqrt=Math.sqrt
var _require8=require("./models.js"),modelLoadCount=_require8.modelLoadCount,modelStartup=_require8.modelStartup
var perf=require("./perf.js")
var _require9=require("./profiler.js"),profilerFrameStart=_require9.profilerFrameStart,profilerGarbageEstimate=_require9.profilerGarbageEstimate
var _require10=require("./profiler_ui.js"),profilerUIStartup=_require10.profilerUIStartup
var _require11=require("../common/perfcounters.js"),perfCounterTick=_require11.perfCounterTick
var settings=require("./settings.js")
var shaders=require("./shaders.js")
var _require12=require("./shaders.js"),shadersAddGlobal=_require12.shadersAddGlobal,shadersHandleDefinesChanged=_require12.shadersHandleDefinesChanged,shadersStartup=_require12.shadersStartup,shadersResetState=_require12.shadersResetState
var _require13=require("./shader_debug_ui.js"),shaderDebugUIStartup=_require13.shaderDebugUIStartup
var _require14=require("./sound.js"),soundLoading=_require14.soundLoading,soundStartup=_require14.soundStartup,soundTick=_require14.soundTick
var _require15=require("./spot.js"),spotEndInput=_require15.spotEndInput
var _require16=require("./sprites.js"),blendModeReset=_require16.blendModeReset,spriteDraw=_require16.spriteDraw,spriteDrawReset=_require16.spriteDrawReset,spriteStartup=_require16.spriteStartup,spriteResetTopOfFrame=_require16.spriteResetTopOfFrame
var _require17=require("./textures.js"),textureBind=_require17.textureBind,textureDefaultFilters=_require17.textureDefaultFilters,textureError=_require17.textureError,textureLoadCount=_require17.textureLoadCount,textureResetState=_require17.textureResetState,textureStartup=_require17.textureStartup,textureTick=_require17.textureTick
var glov_transition=require("./transition.js")
var _require18=require("./ui.js"),drawRect=_require18.drawRect,_require18$internal=_require18.internal,cleanupDOMElems=_require18$internal.cleanupDOMElems,uiEndFrame=_require18$internal.uiEndFrame,uiSetFonts=_require18$internal.uiSetFonts,uiStartup=_require18$internal.uiStartup,uiTick=_require18$internal.uiTick,uiBindSounds=_require18.uiBindSounds
var urlhash=require("./urlhash.js")
var _require19=require("../common/util.js"),callEach=_require19.callEach,clamp=_require19.clamp,nearSame=_require19.nearSame,ridx=_require19.ridx
var verify=require("../common/verify.js")
var _require20=require("../common/vmath.js"),mat3=_require20.mat3,mat4=_require20.mat4,mat4isFinite=_require20.mat4isFinite,vec3=_require20.vec3,vec4=_require20.vec4,v3mulMat4=_require20.v3mulMat4,v3iNormalize=_require20.v3iNormalize,v4copy=_require20.v4copy,v4same=_require20.v4same,v4scale=_require20.v4scale,v4set=_require20.v4set
var _require21=require("./webfs.js"),webFSStartup=_require21.webFSStartup
var _require22=require("./words/profanity.js"),profanityStartupLate=_require22.profanityStartupLate
var canvas
exports.canvas=canvas
var webgl2
exports.webgl2=webgl2
var glov_particles
exports.glov_particles=glov_particles
var width
exports.width=width
var height
exports.height=height
var width_3d
var height_3d
var pixel_aspect=1
exports.pixel_aspect=pixel_aspect
var render_pixel_perfect=0
exports.render_pixel_perfect=render_pixel_perfect
var dom_to_canvas_ratio=window.devicePixelRatio||1
exports.dom_to_canvas_ratio=dom_to_canvas_ratio
var antialias
exports.antialias=antialias
var antialias_unavailable
exports.antialias_unavailable=antialias_unavailable
var game_width
exports.game_width=game_width
var game_height
exports.game_height=game_height
var game_aspect
var render_width
exports.render_width=render_width
var render_height
exports.render_height=render_height
var defines=urlhash.register({key:"D",type:urlhash.TYPE_SET,change:definesChanged})
exports.defines=defines
urlhash.register({key:"nocoop"})
var ZFAR
exports.ZFAR=ZFAR
var ZNEAR
exports.ZNEAR=ZNEAR
var fov_y=1
exports.fov_y=fov_y
var fov_x=1
exports.fov_x=fov_x
var mat_projection=mat4()
exports.mat_projection=mat_projection
var mat_view=mat4()
exports.mat_view=mat_view
var mat_m=mat4()
var mat_vp=mat4()
exports.mat_vp=mat_vp
var mat_mv=mat4()
var mat_mv_no_skew=mat4()
var mat_mvp=mat4()
var mat_mv_inv_transform=mat3()
var mat_inv_view=mat3()
var light_diffuse=vec3(.75,.75,.75)
exports.light_diffuse=light_diffuse
var light_ambient=vec3(.25,.25,.25)
exports.light_ambient=light_ambient
var light_dir_ws=vec3(-1,-2,-3)
exports.light_dir_ws=light_dir_ws
var font
exports.font=font
var app_state=null
exports.app_state=app_state
var border_color=vec4(0,0,0,1)
exports.border_color=border_color
var border_clear_color=vec4(0,0,0,1)
exports.border_clear_color=border_clear_color
var no_render=false
var dirty_render=false
var render_frames_needed=3
function renderNeeded(frames){render_frames_needed=max(render_frames_needed,frames||3)}function disableRender(new_value){inputAllowAllEvents(no_render=new_value)
if(no_render)cleanupDOMElems()}var view_space_globals=[]
function addViewSpaceGlobal(name){var ws_name=name+"_ws"
var ws_vec=shaders.globals[ws_name]
assert(ws_vec)
assert.equal(ws_vec.length,3)
var vs_name=name+"_vs"
var vs_vec=vec3()
shadersAddGlobal(vs_name,vs_vec)
view_space_globals.push({vs:vs_vec,ws:ws_vec})}var mat_temp=mat4()
function setGlobalMatrices(_mat_view){assert(mat4isFinite(_mat_view))
mat4Copy(mat_view,_mat_view)
mat4Mul(mat_vp,mat_projection,mat_view)
v3iNormalize(light_dir_ws)
for(var ii=0;ii<view_space_globals.length;++ii){var vsg=view_space_globals[ii]
v3mulMat4(vsg.vs,vsg.ws,mat_view)}mat4Invert(mat_temp,mat_view)
mat3FromMat4(mat_inv_view,mat_temp)}function setMatVP(_mat_view){assert(mat4isFinite(_mat_view))
setupProjection(fov_y,width_3d,height_3d,ZNEAR,ZFAR)
mat4Copy(mat_view,_mat_view)
mat4Mul(mat_vp,mat_projection,mat_view)}function setFOV(fov_min){var aspect=width_3d/height_3d
if(aspect>game_aspect){exports.fov_y=fov_y=fov_min
var rise=sin(fov_y/2)/cos(fov_y/2)*aspect
exports.fov_x=fov_x=2*asin(rise/sqrt(rise*rise+1))}else{var _rise=sin(fov_min/2)/cos(fov_min/2)*game_aspect
exports.fov_x=fov_x=2*asin(_rise/sqrt(_rise*_rise+1))
var rise2=sin(fov_x/2)/cos(fov_x/2)/aspect
exports.fov_y=fov_y=2*asin(rise2/sqrt(rise2*rise2+1))}}function setGameDims(w,h){exports.game_width=game_width=w
exports.game_height=game_height=h
game_aspect=game_width/game_height}var postprocessing_reset_version="5"
var postprocessing=local_storage.get("glov_no_postprocessing")!==postprocessing_reset_version
exports.postprocessing=postprocessing
function postprocessingAllow(allow){local_storage.set("glov_no_postprocessing",allow?void 0:postprocessing_reset_version)
exports.postprocessing=postprocessing=allow}function glCheckError(){var gl_err=gl.getError()
if(gl_err){console.error(gl_err)
throw new Error(gl_err)}}function releaseCanvas(){try{if(gl){var ext=gl.getExtension("WEBGL_lose_context")
if(ext)ext.loseContext()}}catch(ignored){}}function reloadDefault(){document.location.reload()}var reload_func=reloadDefault
function engineSetReloadFunc(fn){reload_func=fn}function reloadSafe(){errorReportDisable()
releaseCanvas()
reload_func()}window.reloadSafe=reloadSafe
var reloading_defines={}
function defineCausesReload(define){reloading_defines[define]=defines[define]}defineCausesReload("FORCEWEBGL2")
defineCausesReload("NOWEBGL2")
var define_change_cbs={}
function defineOnChange(define,cb){(define_change_cbs[define]=define_change_cbs[define]||{value:defines[define],cbs:[]}).cbs.push(cb)}function definesChanged(){for(var key in reloading_defines)if(defines[key]!==reloading_defines[key]){urlhash.onURLChange(reloadSafe)
break}for(var _key in define_change_cbs){var elem=define_change_cbs[_key]
if(defines[_key]!==elem.value){callEach(elem.cbs)
elem.value=defines[_key]}}shadersHandleDefinesChanged()}function definesClearAll(){var any_changed=false
for(var key in defines){defines[key]=false
any_changed=true}if(any_changed)definesChanged()
return any_changed}function debugDefineIsSet(define){return defines[define]}function normalizeRow(m,idx){var len=m[idx]*m[idx]+m[idx+1]*m[idx+1]+m[idx+2]*m[idx+2]
if(len>0){len=1/sqrt(len)
m[idx]*=len
m[idx+1]*=len
m[idx+2]*=len}}function updateMatrices(mat_model){mat4Copy(mat_m,mat_model)
mat4Mul(mat_mv,mat_view,mat_model)
mat4Mul(mat_mvp,mat_projection,mat_mv)
mat4Copy(mat_temp,mat_model)
normalizeRow(mat_temp,0)
normalizeRow(mat_temp,4)
normalizeRow(mat_temp,8)
mat4Mul(mat_mv_no_skew,mat_view,mat_temp)
mat4Invert(mat_temp,mat_mv_no_skew)
mat4Transpose(mat_temp,mat_temp)
mat3FromMat4(mat_mv_inv_transform,mat_temp)}var frame_timestamp=0
exports.frame_timestamp=frame_timestamp
function getFrameTimestamp(){return frame_timestamp}var frame_index=0
exports.frame_index=frame_index
function getFrameIndex(){return frame_index}var frame_dt=0
exports.frame_dt=frame_dt
function getFrameDt(){return frame_dt}var hrtime=0
exports.hrtime=hrtime
var this_frame_time_actual=0
function getFrameDtActual(){return this_frame_time_actual}var after_loading_state=null
var is_loading=true
exports.is_loading=is_loading
function setState(new_state){if(is_loading)after_loading_state=new_state
else exports.app_state=app_state=new_state
renderNeeded()}function stateActive(test_state){if(is_loading)return after_loading_state===test_state
else return app_state===test_state}var mspf=1e3
var mspf_update_time=0
var mspf_frame_count=0
var last_tick_cpu=0
var mspf_tick=1e3
var mspf_tick_accum=0
var garbage_estimate=0
var PERF_HISTORY_SIZE=128
exports.PERF_HISTORY_SIZE=PERF_HISTORY_SIZE
var perf_state=window.glov_perf_state={fpsgraph:{index:0,history:new Float32Array(2*PERF_HISTORY_SIZE)},gpu_mem:{tex:0,geom:0}}
var fpsgraph=(exports.perf_state=perf_state).fpsgraph
perf.addMetric({name:"fps",show_stat:"show_fps",show_graph:"fps_graph",labels:{"fps: ":function fps(){return(1e3/mspf).toFixed(1)},"ms/f: ":function msF(){return mspf.toFixed(0)},"cpu: ":function cpu(){return mspf_tick.toFixed(0)},"gc/f: ":function gcF(){return garbage_estimate?garbage_estimate.toFixed(1):""}},data:fpsgraph,line_scale_top:50,colors:[vec4(1,.925,.153,1),vec4(0,.894,.212,1)]},true)
var do_borders=true
var do_viewport_postprocess=false
var need_repos=0
function resizing(){return need_repos}var app_tick_functions=[]
function addTickFunc(cb){app_tick_functions.push(cb)}function removeTickFunc(cb){var idx=app_tick_functions.indexOf(cb)
if(-1!==idx){app_tick_functions.splice(idx,1)
return true}return false}var post_tick=[]
function postTick(opts){opts.ticks=opts.ticks||1
opts.inactive=opts.inactive||false
assert.equal(typeof opts.fn,"function")
post_tick.push(opts)}var pre_sprite_render=null
function preSpriteRender(fn){if(!pre_sprite_render)pre_sprite_render=[]
pre_sprite_render.push(fn)}var post_render=null
function postRender(fn){if(!post_render)post_render=[]
post_render.push(fn)}function resetEffects(){effectsReset()
framebufferEndOfFrame()}function renderWidth(){return render_width||width}function renderHeight(){return render_height||height}var SAFARI_FULLSCREEN_ASPECT=function(){var screen=window.screen
if(!is_ios_safari||!screen)return 0
return{"926,428":926/428,"844,390":844/390,"896,414":896/414,"812,375":812/375,"736,414":736/414,"716,414":736/414,"667,375":667/375,"647,375":667/375,"548,320":1.775}[max(screen.availWidth,screen.availHeight)+","+min(screen.availWidth,screen.availHeight)]||0}()
function safariTopSafeArea(view_w,view_h){if(is_ios_safari&&safari_version_major<16)if(SAFARI_FULLSCREEN_ASPECT&&nearSame(view_w/view_h,SAFARI_FULLSCREEN_ASPECT,.001))return 28
return 0}function isPortrait(view_w,view_h){return view_h>=.8*view_w}var kb_up_last_w=0
var kb_up_last_h=0
var kb_up_ret=false
var kb_up_frame=0
function isKeyboardUp(view_w,view_h){if(!view_w)return kb_up_ret
if(!is_ios)return false
if(!nearSame(view_w,kb_up_last_w,5))kb_up_ret=false
else if(!nearSame(view_h,kb_up_last_h,5))if(view_h<kb_up_last_h)kb_up_ret=true
else if(view_h>kb_up_last_h)kb_up_ret=false
kb_up_last_w=view_w
kb_up_last_h=view_h
if(++kb_up_frame<3)kb_up_ret=false
return kb_up_ret}function safariBottomSafeArea(view_w,view_h){if(is_ios_safari&&15===safari_version_major&&safari_version_minor<2&&isKeyboardUp()&&isPortrait(view_w,view_h))if(0===safari_version_minor)return 52
else if(1===safari_version_minor)if(!is_ipad)return 8
if(is_ios_chrome&&is_ipad&&safari_version_major>=13&&isKeyboardUp())return 44
return 0}function getSafeAreaFromDOM(out,safearea,view_w,view_h){if(safearea&&safearea.offsetWidth&&safearea.offsetHeight){out[0]=safearea.offsetLeft
out[1]=view_w-safearea.offsetWidth-safearea.offsetLeft
out[2]=max(safearea.offsetTop,view_h-window.innerHeight)
out[3]=view_h-safearea.offsetHeight-safearea.offsetTop}}var last_canvas_width
var last_canvas_height
var last_body_height
var safearea_elem
var safearea_ignore_bottom=false
var safearea_dom=vec4()
var safearea_canvas=vec4()
var last_safearea_canvas=vec4()
function checkResize(){profilerStart("checkResize")
var vv=window.visualViewport
var dom_to_pixels=window.devicePixelRatio||1
exports.dom_to_canvas_ratio=dom_to_canvas_ratio=dom_to_pixels*settings.render_scale_all
var view_w=vv?vv.width:window.innerWidth
var view_h=vv?vv.height:is_ios_safari&&window.pageYOffset?document.documentElement.clientHeight:window.innerHeight
if(view_h!==last_body_height){last_body_height=view_h
if(document.body)document.body.style.height=view_h+"px"}v4set(safearea_dom,0,0,0,0)
getSafeAreaFromDOM(safearea_dom,safearea_elem,view_w,view_h)
isKeyboardUp(view_w,view_h-safearea_dom[2]-safearea_dom[3])
safearea_dom[2]=max(safearea_dom[2],safariTopSafeArea(view_w,view_h))
if(safearea_dom[3]&&(is_ios&&isKeyboardUp()||safearea_ignore_bottom))safearea_dom[3]=0
safearea_dom[3]=max(safearea_dom[3],safariBottomSafeArea(view_w,view_h))
var rect=canvas.getBoundingClientRect()
var new_width=round(rect.width*dom_to_canvas_ratio)||1
var new_height=round(rect.height*dom_to_canvas_ratio)||1
if(-1===cmds.safearea[0])v4scale(safearea_canvas,safearea_dom,dom_to_canvas_ratio)
else v4set(safearea_canvas,new_width*clamp(cmds.safearea[0],0,25)/100,new_width*clamp(cmds.safearea[1],0,25)/100,new_height*clamp(cmds.safearea[2],0,25)/100,new_height*clamp(cmds.safearea[3],0,25)/100)
if(!v4same(safearea_canvas,last_safearea_canvas)){v4copy(last_safearea_canvas,safearea_canvas)
camera2d.setSafeAreaPadding(safearea_canvas[0],safearea_canvas[1],safearea_canvas[2],safearea_canvas[3])
need_repos=max(need_repos,1)}if(new_width!==last_canvas_width||new_height!==last_canvas_height){window.pixel_scale=dom_to_canvas_ratio
last_canvas_width=canvas.width=new_width||1
last_canvas_height=canvas.height=new_height||1
exports.width=width=canvas.width
exports.height=height=canvas.height
need_repos=10
renderNeeded()}if(window.visualViewport&&(is_ios_safari||true))if(window.pageYOffset||window.document.body&&window.document.body.scrollTop)window.scroll(0,0)
profilerStop("checkResize")}var viewport=vec4(0,0,1,1)
exports.viewport=viewport
function setViewport(xywh){v4copy(viewport,xywh)
gl.viewport(xywh[0],xywh[1],xywh[2],xywh[3])}var MAX_FRAME_TIME=1e4
var frames_requested=0
function requestFrame(user_time){var max_fps=settings.max_fps
var desired_frames=max_fps>=250?10:1
if(frames_requested>=desired_frames)return
if(defines.SLOWLOAD&&is_loading)max_fps=2
if(desired_frames>1)while(frames_requested<desired_frames){setTimeout(tick,1)
frames_requested++}else if(max_fps&&max_fps>settings.use_animation_frame){var desired_delay=min(MAX_FRAME_TIME,max(0,round(1e3/max_fps-(user_time||0))))
frames_requested++
setTimeout(tick,desired_delay)}else{frames_requested++
requestAnimationFrame(tick)}}var mat_projection_10
var had_3d_this_frame
exports.had_3d_this_frame=had_3d_this_frame
var need_depth_this_frame
function clearHad3DThisFrame(){exports.had_3d_this_frame=had_3d_this_frame=false}function needDepthIn2D(){need_depth_this_frame=true}function setupProjection(use_fov_y,use_width,use_height,znear,zfar){mat4Perspective(mat_projection,use_fov_y,use_width/use_height,znear,zfar)
mat_projection_10=mat_projection[10]}function setProjection(new_mat){mat4Copy(mat_projection,new_mat)
mat_projection_10=mat_projection[10]}function setZRange(znear,zfar){exports.ZNEAR=ZNEAR=znear
exports.ZFAR=ZFAR=zfar
if(had_3d_this_frame)setupProjection(fov_y,width_3d,height_3d,ZNEAR,ZFAR)}function set3DRenderResolution(w,h){width_3d=w
height_3d=h}var want_render_scale_3d_this_frame
var had_render_scale_3d_this_frame
function start3DRendering(opts){if((opts=opts||{}).width)set3DRenderResolution(opts.width,opts.height)
setFOV(opts.fov||settings.fov*PI/180)
exports.had_3d_this_frame=had_3d_this_frame=true
need_depth_this_frame=false
if(!opts.width&&want_render_scale_3d_this_frame&&!defines.NOCOPY){had_render_scale_3d_this_frame=true
effectsPassAdd()}blendModeReset(true)
gl.enable(gl.BLEND)
gl.enable(gl.DEPTH_TEST)
gl.depthMask(true)
var backbuffer_width=width_3d
var backbuffer_height=height_3d
if(opts.viewport){backbuffer_width=render_width||width
backbuffer_height=render_height||height}framebufferStart({width:backbuffer_width,height:backbuffer_height,final:effectsIsFinal(),need_depth:opts.need_depth||true,clear:true,clear_all:void 0===opts.clear_all?settings.render_scale_clear:opts.clear_all,viewport:opts.viewport})
setupProjection(fov_y,width_3d,height_3d,ZNEAR,ZFAR)
gl.enable(gl.CULL_FACE)}function renderScaleFinish(){if(defines.NOCOPY){gl.disable(gl.SCISSOR_TEST)
v4set(viewport,0,0,width,height)
gl.viewport(viewport[0],viewport[1],viewport[2],viewport[3])}else{effectsPassConsume()
if(2===settings.render_scale_mode)effects.applyPixelyExpand({final:effectsIsFinal(),clear:false})
else effects.applyCopy({filter_linear:0===settings.render_scale_mode})}}function startSpriteRendering(){gl.disable(gl.CULL_FACE)
blendModeReset(true)
gl.enable(gl.BLEND)
gl.disable(gl.DEPTH_TEST)
gl.depthMask(false)
spriteDrawReset()}function projectionZBias(dist,at_z){if(!dist){mat_projection[10]=mat_projection_10
return}var e=dist/(at_z*(at_z+dist))*.2
e=max(e,2e-7)
mat_projection[10]=mat_projection_10+e}function fixNatives(is_startup){var b=[]
for(var a in b){console[is_startup?"log":"error"]('Found invasive enumerable property "'+a+'" on Array.prototype, removing...')
var old_val=b[a]
errorReportSetDetails("had_native_"+a,typeof old_val)
delete Array.prototype[a]
Object.defineProperty(Array.prototype,a,{value:old_val,enumerable:false})}for(var _a in b)assert(false,"Array.prototype has unremovable member "+_a)}function resetState(){profilerStart("resetState")
profilerStart("textures")
textureResetState()
profilerStopStart("shaders")
shadersResetState()
profilerStopStart("geom;gl")
geomResetState()
blendModeReset(true)
gl.enable(gl.BLEND)
gl.enable(gl.DEPTH_TEST)
gl.depthMask(true)
gl.enable(gl.CULL_FACE)
gl.depthFunc(gl.LEQUAL)
gl.disable(gl.SCISSOR_TEST)
gl.cullFace(gl.BACK)
gl.viewport(0,0,width,height)
profilerStop()
profilerStop("resetState")}var blurred=false
var in_background=false
var enter_background_cb=[]
var exit_background_cb=[]
function isInBackground(){return in_background}function isInBackgroundOrBlurred(){return in_background||blurred}function onEnterBackground(fn){enter_background_cb.push(fn)}function onExitBackground(fn){exit_background_cb.push(fn)}function dirtyRenderSet(value){dirty_render=value}var hrnow=window.performance&&window.performance.now?window.performance.now.bind(window.performance):Date.now.bind(Date)
exports.hrnow=hrnow
var last_tick=0
var last_tick_hr=0
var frame_limit_time_left=0
function tick(timestamp){profilerFrameStart()
profilerStart("tick")
profilerStart("top")
frames_requested--
if(render_frames_needed)--render_frames_needed
if(dirty_render&&!render_frames_needed){resetEffects()
input.tickInputInactive()
last_tick_cpu=0
for(var ii=post_tick.length-1;ii>=0;--ii)if(post_tick[ii].inactive&&!--post_tick[ii].ticks){post_tick[ii].fn()
ridx(post_tick,ii)}requestFrame()
profilerStop()
return profilerStop("tick")}exports.hrtime=hrtime=hrnow()
var dt_raw=hrtime-last_tick_hr
last_tick_hr=hrtime
var max_fps=settings.max_fps
if(max_fps&&max_fps<=settings.use_animation_frame){if((frame_limit_time_left-=dt_raw)>0){requestFrame()
profilerStop("top")
return profilerStop("tick")}var frame_time=min(MAX_FRAME_TIME,1e3/max_fps-.1)
if((frame_limit_time_left+=frame_time)<0)frame_limit_time_left=0}var now=round(hrtime)
if(!last_tick)last_tick=now
var dt=min(max(this_frame_time_actual=now-last_tick,1),250)
exports.frame_dt=frame_dt=dt
last_tick=now
exports.frame_timestamp=frame_timestamp+=dt
errorReportSetTimeAccum(frame_timestamp)
fixNatives(false)
fpsgraph.history[fpsgraph.index%PERF_HISTORY_SIZE*2+1]=this_frame_time_actual
fpsgraph.index++
fpsgraph.history[fpsgraph.index%PERF_HISTORY_SIZE*2+0]=0;++mspf_frame_count
mspf_tick_accum+=last_tick_cpu
if(now-mspf_update_time>1e3*settings.fps_window)if(!mspf_update_time)mspf_update_time=now
else{mspf=(now-mspf_update_time)/mspf_frame_count
mspf_tick=mspf_tick_accum/mspf_frame_count
mspf_tick_accum=0
garbage_estimate=profilerGarbageEstimate()/1024
mspf_frame_count=0
mspf_update_time=now}perfCounterTick(dt)
effectsTopOfFrame()
if(document.hidden||document.webkitHidden||no_render){resetEffects()
input.tickInputInactive()
last_tick_cpu=0
for(var _ii=post_tick.length-1;_ii>=0;--_ii)if(post_tick[_ii].inactive&&!--post_tick[_ii].ticks){post_tick[_ii].fn()
ridx(post_tick,_ii)}requestFrame()
profilerStop()
return profilerStop("tick")}exports.frame_index=++frame_index
if(in_background){in_background=false
callEach(exit_background_cb)}checkResize()
exports.had_3d_this_frame=had_3d_this_frame=false
had_render_scale_3d_this_frame=want_render_scale_3d_this_frame=need_depth_this_frame=false
if(render_width){set3DRenderResolution(render_width,render_height)
effectsPassAdd()}else{width_3d=max(1,round(width*settings.render_scale))
height_3d=max(1,round(height*settings.render_scale))
if(width_3d!==width)want_render_scale_3d_this_frame=true}resetState()
spriteResetTopOfFrame()
textureBind(0,textureError())
fontTick()
camera2d.tickCamera2D()
glov_transition.render(dt)
camera2d.setAspectFixedRespectPixelPerfect(game_width,game_height)
profilerStopStart("mid")
soundTick(dt)
input.tickInput()
uiTick(dt)
if(need_repos){--need_repos
var ul=[]
camera2d.virtualToDom(ul,[0,0])
var lr=[]
camera2d.virtualToDom(lr,[game_width-1,game_height-1])
var viewport2=[ul[0],ul[1],lr[0],lr[1]]
var view_height=viewport2[3]-viewport2[1]
var font_size=min(256,max(2,floor(view_height/800*16)))
var elem_fullscreen=document.getElementById("fullscreen")
if(elem_fullscreen)elem_fullscreen.style["font-size"]=font_size+"px"}if(do_borders){drawRect(camera2d.x0Real(),camera2d.y0Real(),camera2d.x1Real(),0,Z.BORDERS,border_color)
drawRect(camera2d.x0Real(),game_height,camera2d.x1Real(),camera2d.y1Real(),Z.BORDERS,border_color)
drawRect(camera2d.x0Real(),0,0,game_height,Z.BORDERS,border_color)
drawRect(game_width,0,camera2d.x1Real(),game_height,Z.BORDERS,border_color)}perf.draw()
profilerStopStart("app_state")
for(var _ii2=0;_ii2<app_tick_functions.length;++_ii2)app_tick_functions[_ii2](dt)
if(app_state)app_state(dt)
profilerStopStart("bottom")
spotEndInput()
glov_particles.tick(dt)
if(had_3d_this_frame){if(had_render_scale_3d_this_frame)renderScaleFinish()}else if(render_width)framebufferStart({width:render_width,height:render_height,clear:true,clear_all:settings.render_scale_clear,final:effectsIsFinal(),need_depth:need_depth_this_frame})
else framebufferStart({width:width,height:height,clear:true,final:effectsIsFinal(),need_depth:need_depth_this_frame})
if(pre_sprite_render)callEach(pre_sprite_render,pre_sprite_render=null)
startSpriteRendering()
spriteDraw()
uiEndFrame()
if(post_render)callEach(post_render,post_render=null)
if(render_width){effectsPassConsume()
var final_viewport=[camera2d.render_offset_x,camera2d.render_offset_y_bottom,camera2d.render_viewport_w,camera2d.render_viewport_h]
var params={clear:true,clear_all:true,clear_color:border_clear_color,viewport:final_viewport}
if(do_viewport_postprocess)effects.applyPixelyExpand(params)
else effects.applyCopy(params)}input.endFrame()
resetEffects()
textureTick()
for(var _ii3=post_tick.length-1;_ii3>=0;--_ii3)if(!--post_tick[_ii3].ticks){post_tick[_ii3].fn()
ridx(post_tick,_ii3)}last_tick_cpu=hrnow()-now
fpsgraph.history[fpsgraph.index%PERF_HISTORY_SIZE*2+0]=last_tick_cpu
requestFrame(hrnow()-hrtime)
profilerStop("bottom")
return profilerStop("tick")}function onBlur(evt){blurred=true}function onFocus(evt){blurred=false}function periodiclyRequestFrame(){requestFrame()
setTimeout(periodiclyRequestFrame,1e3)
if(!in_background&&blurred)if(round(hrnow())-last_tick>400){in_background=true
callEach(enter_background_cb)}}function setPixelyStrict(on){if(on){exports.render_width=render_width=game_width
exports.render_height=render_height=game_height}else{exports.render_width=render_width=void 0
exports.render_height=render_height=void 0}}function getViewportPostprocess(){return do_viewport_postprocess}function setViewportPostprocess(viewport_postprocess){do_viewport_postprocess=viewport_postprocess}function setFonts(new_font,title_font){exports.font=font=new_font
uiSetFonts(new_font,title_font)}function engineStartupFunc(func){if(startup_funcs)startup_funcs.push(func)
else func()}function startup(params){fixNatives(true)
assert(window.glov_webfs,"Failed to load fsdata.js")
webFSStartup(window.glov_webfs,urlhash.getURLBase())
exports.canvas=canvas=document.getElementById("canvas")
safearea_elem=document.getElementById("safearea")
if(false===params.error_report)glovErrorReportDisableSubmit()
if(DEBUG)dataErrorQueueEnable(true)
if(DEBUG&&!window.spector)Object.defineProperty(Number.prototype,"length",{get:function get(){assert(false,"Numbers do not have a length property")
return}})
safearea_ignore_bottom=params.safearea_ignore_bottom||false
window.addEventListener("resize",checkResize,false)
checkResize()
var is_pixely=params.pixely&&"off"!==params.pixely
exports.antialias=antialias=params.antialias||!is_pixely&&false!==params.antialias
var powerPreference=params.high?"high-performance":"default"
var context_names=["webgl2","webgl","experimental-webgl"]
var force_webgl1=defines.NOWEBGL2
var disable_data=local_storage.getJSON("webgl2_disable")
if(disable_data&&disable_data.ua===navigator.userAgent&&disable_data.ts>Date.now()-6048e5){console.log("Disabling WebGL2 because a previous run encountered a related error")
force_webgl1=true}if(DEBUG&&!(defines.FORCEWEBGL2||params.force_webgl2)){var rc=local_storage.getJSON("run_count",0)+1
local_storage.setJSON("run_count",rc)
if(rc%2)force_webgl1=true}if(force_webgl1)context_names.splice(0,1)
var context_opts=[{antialias:antialias,powerPreference:powerPreference,alpha:false},{powerPreference:powerPreference,alpha:false},{antialias:antialias,alpha:false},{alpha:false},{}]
var good=false
exports.webgl2=webgl2=false
for(var i=0;!good&&i<context_names.length;i+=1)for(var jj=0;!good&&jj<context_opts.length;++jj)try{window.gl=canvas.getContext(context_names[i],context_opts[jj])
if(window.gl){if("webgl2"===context_names[i])exports.webgl2=webgl2=true
if(antialias&&!context_opts[jj].antialias){exports.antialias_unavailable=antialias_unavailable=true
exports.antialias=antialias=false}good=true
break}}catch(e){}if(!window.requestAnimationFrame)good=false
if(good)if(!shadersStartup({light_diffuse:light_diffuse,light_dir_ws:light_dir_ws,ambient:light_ambient,mat_m:mat_m,mat_mv:mat_mv,mat_vp:mat_vp,mvp:mat_mvp,mv_inv_trans:mat_mv_inv_transform,mat_inv_view:mat_inv_view,view:mat_view,projection:mat_projection}))good=false
if(!good){window.alert((window.gl?"Error initializing WebGL.\n":"Error initializing WebGL: your browser does not support WebGL or does not have it enabled.\n")+"Try completely closing and re-opening the app or browser.  If the problem persists, try restarting your device.")
document.getElementById("loading").style.visibility="hidden"
document.getElementById("nowebgl").style.visibility="visible"
return false}glovErrorReportSetCrashCB(function(){setTimeout(requestFrame,1)})
var nocanvas=document.getElementById("nocanvas")
if(verify(nocanvas))nocanvas.style.visibility="hidden"
console.log("Using WebGL"+(webgl2?2:1))
assert(gl)
canvas.focus()
setGameDims(params.game_width||1280,params.game_height||960)
exports.ZNEAR=ZNEAR=params.znear||.7
exports.ZFAR=ZFAR=params.zfar||1e4
setPixelyStrict("strict"===params.pixely)
if(params.viewport_postprocess)do_viewport_postprocess=true
exports.pixel_aspect=pixel_aspect=params.pixel_aspect||1
exports.render_pixel_perfect=render_pixel_perfect=params.pixel_perfect||0
gl.depthFunc(gl.LEQUAL)
gl.cullFace(gl.BACK)
gl.clearColor(0,.1,.2,1)
gl.pixelStorei(gl.UNPACK_ALIGNMENT,1)
textureStartup()
geomStartup()
addViewSpaceGlobal("light_dir")
camera2d.startup()
spriteStartup()
input.startup(canvas,params)
modelStartup()
window.addEventListener("blur",onBlur,false)
window.addEventListener("focus",onFocus,false)
exports.glov_particles=glov_particles=require("./particles.js").create()
if(is_pixely){textureDefaultFilters(gl.NEAREST,gl.NEAREST)
settings.runTimeDefault("render_scale_mode",1)}else textureDefaultFilters(gl.LINEAR_MIPMAP_LINEAR,gl.LINEAR)
assert(params.font)
params.font=exports.font=font=glov_font.create(params.font.info,params.font.texture)
if(params.title_font)params.title_font=glov_font.create(params.title_font.info,params.title_font.texture)
uiStartup(params)
soundStartup(params.sound)
uiBindSounds(params.ui_sounds)
buildUIStartup()
shaderDebugUIStartup()
profilerUIStartup()
callEach(startup_funcs,startup_funcs=null)
camera2d.setAspectFixedRespectPixelPerfect(game_width,game_height)
if(params.state)setState(params.state)
if(void 0!==params.do_borders)do_borders=params.do_borders
if(void 0!==params.show_fps)settings.show_fps=params.show_fps
dirty_render=Boolean(params.dirty_render)
periodiclyRequestFrame()
return true}var custom_loads_pending=0
function loadPendingDelta(delta){custom_loads_pending+=delta}function loadsPending(){return textureLoadCount()+soundLoading()+modelLoadCount()+custom_loads_pending}var on_load_metrics=[]
function onLoadMetrics(cb){on_load_metrics.push(cb)}onLoadMetrics(function(obj){console.log(["Load time summary","  "+obj.time_js_load+"ms JS load","  "+obj.time_js_init+"ms JS init","  "+obj.time_resource_load+"ms resource load",obj.time_total+"ms total"].join("\n"))})
function loadingFinished(){var now=Date.now()
var time_js_load=window.time_load_onload-window.time_load_start
var time_js_init=window.time_load_init-window.time_load_onload
var time_resource_load=now-window.time_load_init
var time_total=now-window.time_load_start
callEach(on_load_metrics,null,{time_js_load:time_js_load,time_js_init:time_js_init,time_resource_load:time_resource_load,time_total:time_total})
profanityStartupLate()}function loading(){var load_count=loadsPending()
var elem_loading_text=document.getElementById("loading_text")
if(elem_loading_text)elem_loading_text.innerText="Loading ("+load_count+")..."
renderNeeded()
if(!load_count){exports.is_loading=is_loading=false
exports.app_state=app_state=after_loading_state
postTick({ticks:2,fn:function fn(){loadingFinished()
renderNeeded()
var loading_elem=document.getElementById("loading")
if(loading_elem)loading_elem.style.visibility="hidden"}})}}exports.app_state=app_state=loading
window.glov_engine=exports

},{"../common/data_error.js":84,"../common/perfcounters.js":91,"../common/util.js":96,"../common/verify.js":97,"../common/vmath.js":98,"./bootstrap.js":12,"./browser.js":13,"./build_ui.js":14,"./camera2d.js":15,"./client_config.js":16,"./cmds.js":17,"./effects.js":20,"./engine_cmds.js":22,"./error_report.js":24,"./font.js":28,"./framebuffer.js":29,"./geom.js":30,"./input.js":37,"./local_storage.js":40,"./models.js":47,"./particles.js":50,"./perf.js":51,"./profiler.js":55,"./profiler_ui.js":56,"./settings.js":59,"./shader_debug_ui.js":60,"./shaders.js":61,"./sound.js":65,"./spot.js":66,"./sprites.js":68,"./textures.js":70,"./transition.js":71,"./ui.js":72,"./urlhash.js":74,"./webfs.js":76,"./words/profanity.js":77,"assert":undefined,"gl-mat3/fromMat4":undefined,"gl-mat4/copy":undefined,"gl-mat4/invert":undefined,"gl-mat4/multiply":undefined,"gl-mat4/perspective":undefined,"gl-mat4/transpose":undefined}],22:[function(require,module,exports){
"use strict"
exports.resetSettings=resetSettings
var _glovCommonCmd_parse=require("../common/cmd_parse")
var cmd_parse_mod=_glovCommonCmd_parse
var _glovCommonWscommon=require("../common/wscommon")
var netDelayGet=_glovCommonWscommon.netDelayGet
var netDelaySet=_glovCommonWscommon.netDelaySet
var _cmds=require("./cmds")
var cmd_parse=_cmds.cmd_parse
var _engine=require("./engine")
var engine=_engine
var _error_report=require("./error_report")
var errorReportDetailsString=_error_report.errorReportDetailsString
var _fetch=require("./fetch")
var fetchDelaySet=_fetch.fetchDelaySet
var _net=require("./net")
var netClient=_net.netClient
var netDisconnected=_net.netDisconnected
var _shaders=require("./shaders")
var SEMANTIC=_shaders.SEMANTIC
var _textures=require("./textures")
var textureGetAll=_textures.textureGetAll
window.cmd=function(str){cmd_parse.handle(null,str,cmd_parse_mod.defaultHandler)}
function byteFormat(bytes){if(bytes>85e4)return(bytes/1048576).toFixed(2)+"MB"
if(bytes>850)return(bytes/1024).toFixed(2)+"KB"
return bytes+"B"}cmd_parse.register({cmd:"texmem",help:"Displays texture memory usage",func:function func(str,resp_func){var all_textures=textureGetAll()
var keys=Object.keys(all_textures);(keys=keys.filter(function(a){return all_textures[a].gpu_mem>1024})).sort(function(a,b){return all_textures[a].gpu_mem-all_textures[b].gpu_mem})
resp_func(null,keys.map(function(a){return byteFormat(all_textures[a].gpu_mem)+" "+a}).join("\n"))}})
cmd_parse.register({cmd:"gpumem",help:"Displays GPU memory usage summary",func:function func(str,resp_func){var gpu_mem=engine.perf_state.gpu_mem
resp_func(null,byteFormat(gpu_mem.geom)+" Geo\n"+byteFormat(gpu_mem.tex)+" Tex\n"+byteFormat(gpu_mem.geom+gpu_mem.tex)+" Total")}})
function validDefine(str){if(void 0!==SEMANTIC[str])return false
return str.match(/^[A-Z][A-Z0-9_]*$/)}cmd_parse.register({cmd:"d",help:"Toggles a debug define",func:function func(str,resp_func){if(!(str=str.toUpperCase().trim()))if(engine.definesClearAll())return void resp_func(null,"All debug defines cleared")
else return void resp_func(null,"No debug defines active")
if(!validDefine(str))return void resp_func("Invalid define specified")
engine.defines[str]=!engine.defines[str]
resp_func(null,"D="+str+" now "+(engine.defines[str]?"SET":"unset"))
engine.definesChanged()}})
cmd_parse.register({cmd:"renderer",help:"Displays current renderer",func:function func(str,resp_func){resp_func(null,"Renderer=WebGL"+(engine.webgl2?2:1))}})
cmd_parse.registerValue("postprocessing",{label:"Postprocessing",type:cmd_parse.TYPE_INT,help:"Enables/disables postprocessing",get:function get(){return engine.postprocessing?1:0},set:function set(v){return engine.postprocessingAllow(v)}})
cmd_parse.register({cmd:"net_delay",help:"Sets/shows network delay values",usage:"$HELP\n/net_delay time_base time_rand",func:function func(str,resp_func){if(str){var params=str.split(" ")
netDelaySet(Number(params[0]),Number(params[1])||0)
fetchDelaySet(Number(params[0]),Number(params[1])||0)}var cur=netDelayGet()
resp_func(null,"Client NetDelay: "+cur[0]+"+"+cur[1])}})
cmd_parse.register({cmd:"error_report_details",help:"Shows details submitted with any error report",access_show:["hidden"],func:function func(str,resp_func){resp_func(null,errorReportDetailsString())}})
cmd_parse.register({cmd:"disconnect",help:"Forcibly disconnect WebSocket connection (Note: will auto-reconnect)",prefix_usage_with_help:true,usage:"/disconnect [disconnnect_duration [disconnect_delay]]",func:function func(str,resp_func){var _netClient
var socket=null==(_netClient=netClient())?void 0:_netClient.socket
if(!socket)return void resp_func("No socket")
if(netDisconnected())return void resp_func("Not connected")
var params=str.split(" ").map(Number)
var disconnect_duration=isFinite(params[0])?params[0]:0
var disconnect_delay=isFinite(params[1])?params[1]:0
netClient().retry_extra_delay=disconnect_duration
if(disconnect_delay)setTimeout(socket.close.bind(socket),disconnect_delay)
else socket.close()
resp_func()}})
function resetSettings(){var results=cmd_parse.resetSettings()
if(engine.definesClearAll())results.push("Debug defines cleared")
if(!results.length)return null
results.push("Please restart the app or reload to page for the new settings to take effect.")
return results.join("\n")}cmd_parse.register({cmd:"reset_settings",help:"Resets all settings and options to their defaults (Note: requires an app restart)",func:function func(str,resp_func){resp_func(null,resetSettings()||"No stored settings to reset")}})

},{"../common/cmd_parse":82,"../common/wscommon":100,"./cmds":17,"./engine":21,"./error_report":24,"./fetch":26,"./net":48,"./shaders":61,"./textures":70}],23:[function(require,module,exports){
"use strict"
exports.environmentsInit=environmentsInit
exports.getAPIPath=getAPIPath
exports.getCurrentEnvironment=getCurrentEnvironment
exports.getExternalTextureURL=getExternalTextureURL
exports.getLinkBase=getLinkBase
exports.setCurrentEnvironment=setCurrentEnvironment
var assert=require("assert")
var _client_config=require("./client_config")
var setAbilityReloadUpdates=_client_config.setAbilityReloadUpdates
var _net=require("./net")
var netForceDisconnect=_net.netForceDisconnect
var _urlhash=require("./urlhash")
var urlhash=_urlhash
var all_environments={}
var current_environment=null
var default_environment=null
var link_base
var api_path
var texture_base
function applyEnvironment(){link_base=current_environment&&current_environment.link_base||urlhash.getURLBase()
api_path=current_environment&&current_environment.api_path||link_base+"api/"
texture_base=link_base.replace("//localhost:","//127.0.0.1:")}applyEnvironment()
function getCurrentEnvironment(){return current_environment}function setCurrentEnvironment(environment_name){var prev_environment=current_environment
if((current_environment=environment_name&&all_environments[environment_name]||default_environment)!==prev_environment){applyEnvironment()
setAbilityReloadUpdates(false)
netForceDisconnect()}}function getLinkBase(){return link_base}function getAPIPath(){return api_path}function getExternalTextureURL(url){return url.match(/^.{2,7}:/)?url:""+texture_base+url}function environmentsInit(environments,cmd_parse,default_environment_name){all_environments={}
var all_names=[]
for(var i=0,len=environments.length;i<len;i++){var env=environments[i]
var env_name=env.name
assert(env_name.length>0)
all_environments[env_name]=env
all_names.push(env_name)}current_environment=default_environment=default_environment_name&&all_environments[default_environment_name]||null
applyEnvironment()
if(!all_names.some(function(name){return"default"===name.toLowerCase()}))all_names.push("default")
if(cmd_parse){cmd_parse.registerValue("environment",{type:cmd_parse.TYPE_STRING,help:"Display or set the current client environment",usage:"Display the current client environment\n  Usage: /environment\nSet the current client environment ("+all_names.join(", ")+")\n  Usage: /environment <environment_name>",label:"Environment",get:function get(){return JSON.stringify(getCurrentEnvironment()||"default",null,2)},set:setCurrentEnvironment,access_show:["sysadmin"]})
cmd_parse.register({cmd:"env",help:"Alias for /environment",access_show:["sysadmin"],func:function func(str,resp_func){cmd_parse.handle(this,"environment "+str,resp_func)}})}if(document.location.pathname.match(/index\.\d+\.\d+\.\d+\.html$/))setAbilityReloadUpdates(false)}

},{"./client_config":16,"./net":48,"./urlhash":74,"assert":undefined}],24:[function(require,module,exports){
"use strict"
exports.errorReportClear=errorReportClear
exports.errorReportDetailsString=errorReportDetailsString
exports.errorReportDisable=errorReportDisable
exports.errorReportIgnoreUncaughtPromises=errorReportIgnoreUncaughtPromises
exports.errorReportSetDetails=errorReportSetDetails
exports.errorReportSetDynamicDetails=errorReportSetDynamicDetails
exports.errorReportSetTimeAccum=errorReportSetTimeAccum
exports.glovErrorReport=glovErrorReport
exports.glovErrorReportDisableSubmit=glovErrorReportDisableSubmit
exports.glovErrorReportSetCrashCB=glovErrorReportSetCrashCB
exports.hasCrashed=hasCrashed
exports.reportingAPIPath=reportingAPIPath
exports.reportingUseAppAPIPath=reportingUseAppAPIPath
exports.session_uid=void 0
var session_uid=""+String(Date.now()).slice(-8)+String(Math.random()).slice(2,8)
exports.session_uid=session_uid
var error_report_details={}
var error_report_dynamic_details={}
var _glovClientEnvironments=require("./environments")
var getAPIPath=_glovClientEnvironments.getAPIPath
var _client_config=require("./client_config")
var platformGetID=_client_config.platformGetID
var _fetch=require("./fetch")
var fetch=_fetch.fetch
var _local_storage=require("./local_storage")
var getStoragePrefix=_local_storage.getStoragePrefix
var _locate_asset=require("./locate_asset")
var unlocatePaths=_locate_asset.unlocatePaths
var error_report_disabled=false
function errorReportDisable(){error_report_disabled=true}var ignore_promises=false
function errorReportIgnoreUncaughtPromises(){ignore_promises=true}function errorReportSetDetails(key,value){if(value)error_report_details[key]=escape(String(value))
else delete error_report_details[key]}function errorReportSetDynamicDetails(key,fn){error_report_dynamic_details[key]=fn}errorReportSetDetails("build","1730509975354")
errorReportSetDetails("project",getStoragePrefix())
errorReportSetDetails("sesuid",session_uid)
errorReportSetDynamicDetails("platform",platformGetID)
var time_start=Date.now()
errorReportSetDetails("time_start",time_start)
errorReportSetDynamicDetails("url",function(){return escape(location.href)})
errorReportSetDynamicDetails("time_up",function(){return Date.now()-time_start})
var time_accum=0
function errorReportSetTimeAccum(new_value){time_accum=new_value}errorReportSetDynamicDetails("time_accum",function(){return time_accum})
function getDynamicDetail(key){var value=error_report_dynamic_details[key]()
if(!value&&0!==value)return""
return"&"+key+"="+value}function errorReportDetailsString(){return"&"+Object.keys(error_report_details).map(function(k){return k+"="+error_report_details[k]}).join("&")+Object.keys(error_report_dynamic_details).map(getDynamicDetail).join("")}var last_error_time=0
var crash_idx=0
function hasCrashed(){return crash_idx>0}function errorReportClear(){last_error_time=0
window.debugmsg("",true)}var submit_errors=true
function glovErrorReportDisableSubmit(){submit_errors=false}var on_crash_cb=null
function glovErrorReportSetCrashCB(cb){on_crash_cb=cb}var reporting_api_path="http://www.dashingstrike.com/reports/api/"
if(-1!==window.location.host.indexOf("localhost")||-1!==window.location.host.indexOf("staging"))reporting_api_path="http://staging.dashingstrike.com/reports/api/"
if(window.location.href.startsWith("https://"))reporting_api_path=reporting_api_path.replace(/^http:/,"https:")
var use_app_api_path=false
function reportingUseAppAPIPath(){use_app_api_path=true}function reportingAPIPath(){return use_app_api_path?getAPIPath():reporting_api_path}var filtered_errors=new RegExp(["^Error: Script error\\.$","^Error: Script error\\.\n  at \\(0:0\\)$","^Error: null$","^Error: null\n  at null\\(null:null\\)$","avast_submit","vc_request_action","getElementsByTagName\\('video'\\)",'document\\.getElementById\\("search"\\)',"change_ua","chrome-extension","setConnectedRobot","Failed to (?:start|stop) the audio device","zaloJSV2","getCookie is not defined","originalPrompt","_AutofillCallbackHandler","sytaxError","bannerNight","privateSpecialRepair","__gCrWeb","\\$wrap is not","wsWhitelisted","#darkcss","chrome://userjs","worker-hammerhead","ammerhead-browser","hammerhead","isFeatureBroken","PureRead","uv\\.handler\\.js","dashawn\\.cf","clearTransInfo","firefoxSample","gourmetads","apstag","otBannerSdk\\.js","setOTDataLayer","otSDKStub","otTCF","pubads_20","ima3\\.js","window\\.setDgResult","TranslateService","bdTransJSBridge","ciuvoSDK","stubScriptElement","chrome://internal","getElementById\\('items'\\)","closeModal","WeixinJSBridge","/prebid","property: websredir","property: googletag","ResizeObserver loop","nav_call_update_item_status","GetHTMLElementsAtPoint","ToolbarStatus","betal\\.org","changeNetWork","CookieDeprecationLabel","__firefox__"].join("|"))
function glovErrorReport(is_fatal,msg,file,line,col){msg=unlocatePaths(msg)
console.error(msg)
if(on_crash_cb)on_crash_cb()
if(is_fatal){if(msg.match(filtered_errors)||file&&file.match(filtered_errors))return false;++crash_idx
var now=Date.now()
var dt=now-last_error_time
last_error_time=now
if(error_report_disabled)return false
if(dt<3e4)return false}var url=reportingAPIPath()
url+=(is_fatal?"errorReport":"errorLog")+"?cidx="+crash_idx+"&file="+escape(unlocatePaths(file))+"&line="+(line||0)+"&col="+(col||0)+"&msg="+escape(msg)+errorReportDetailsString()
if(submit_errors){fetch({method:"POST",url:url},function(){})
if(window.gtag)window.gtag("event","exception",{description:msg,fatal:is_fatal})}if(ignore_promises&&msg.match(/Uncaught \(in promise\)/))return false
return true}window.glov_error_report=glovErrorReport.bind(null,true)
var early_err=window.glov_error_early
if(early_err)window.glov_error_report(early_err.msg,early_err.file,early_err.line,early_err.col)

},{"./client_config":16,"./environments":23,"./fetch":26,"./local_storage":40,"./locate_asset":42}],25:[function(require,module,exports){
"use strict"
exports.externalUsersAutoLoginFallbackProvider=externalUsersAutoLoginFallbackProvider
exports.externalUsersAutoLoginProvider=externalUsersAutoLoginProvider
exports.externalUsersCheckEmailVerified=externalUsersCheckEmailVerified
exports.externalUsersCurrentUser=externalUsersCurrentUser
exports.externalUsersEmailPassLoginProvider=externalUsersEmailPassLoginProvider
exports.externalUsersEnabled=externalUsersEnabled
exports.externalUsersFriends=externalUsersFriends
exports.externalUsersLogIn=externalUsersLogIn
exports.externalUsersLogOut=externalUsersLogOut
exports.externalUsersLoggedIn=externalUsersLoggedIn
exports.externalUsersPartyId=externalUsersPartyId
exports.externalUsersSendEmailConfirmation=externalUsersSendEmailConfirmation
exports.externalUsersSendRecoverEmail=externalUsersSendRecoverEmail
exports.externalUsersSetup=externalUsersSetup
exports.externalUsersSetupProvider=externalUsersSetupProvider
var assert=require("assert")
var _glovCommonExternal_users_common=require("../common/external_users_common")
var ERR_INVALID_PROVIDER=_glovCommonExternal_users_common.ERR_INVALID_PROVIDER
var ERR_NOT_AVAILABLE=_glovCommonExternal_users_common.ERR_NOT_AVAILABLE
var ERR_UNAUTHORIZED=_glovCommonExternal_users_common.ERR_UNAUTHORIZED
var _social=require("./social")
var registerExternalUserInfoProvider=_social.registerExternalUserInfoProvider
var invalid_provider={getProvider:function getProvider(){assert(false)},enabled:function enabled(){return false},loggedIn:function loggedIn(){return false},logIn:function logIn(login_options,cb){cb(ERR_INVALID_PROVIDER)},logOut:function logOut(){},getCurrentUser:function getCurrentUser(cb){cb(ERR_INVALID_PROVIDER)}}
var setup_clients={}
var setup_auto_login_provider
var setup_auto_login_fallback_provider
var setup_email_pass_login_provider
function getClient(provider){return setup_clients[provider]||invalid_provider}function externalUsersEnabled(provider){var client=setup_clients[provider]
return client&&client.enabled()||false}function externalUsersLoggedIn(provider){var client=setup_clients[provider]
return client&&client.loggedIn()||false}function externalUsersAutoLoginProvider(){return setup_auto_login_provider}function externalUsersAutoLoginFallbackProvider(){return setup_auto_login_fallback_provider}function externalUsersEmailPassLoginProvider(){return setup_email_pass_login_provider}function externalUsersSendEmailConfirmation(email,cb){assert(setup_email_pass_login_provider)
var client=getClient(setup_email_pass_login_provider)
assert(client.sendActivationEmail)
client.sendActivationEmail(email,cb)}function externalUsersCheckEmailVerified(cb){assert(setup_email_pass_login_provider)
var client=getClient(setup_email_pass_login_provider)
assert(client.checkEmailVerified)
client.checkEmailVerified(cb)}function externalUsersSendRecoverEmail(email,cb){assert(setup_email_pass_login_provider)
var client=getClient(setup_email_pass_login_provider)
assert(client.sendRecoverEmail)
client.sendRecoverEmail(email,cb)}function externalUsersLogIn(provider,login_options,cb){getClient(provider).logIn(login_options,cb)}function externalUsersLogOut(provider){if(provider)getClient(provider).logOut()
else for(var key in setup_clients)getClient(key).logOut()}function externalUsersCurrentUser(provider,cb){getClient(provider).getCurrentUser(cb)}function externalUsersFriends(provider,cb){var client=getClient(provider)
if(client.getFriends)client.getFriends(cb)
else cb(ERR_NOT_AVAILABLE)}function externalUsersPartyId(provider,cb){var client=getClient(provider)
if(client.getPartyId)client.getPartyId(cb)
else cb(ERR_NOT_AVAILABLE)}function externalUsersSetupProvider(client){var provider=client.getProvider()
setup_clients[provider]=client
registerExternalUserInfoProvider(provider,function(cb){if(client.loggedIn())client.getCurrentUser(cb)
else cb(ERR_UNAUTHORIZED)},client.getFriends&&function(cb){if(client.loggedIn())client.getFriends(cb)
else cb(ERR_UNAUTHORIZED)})}function externalUsersSetup(clients,auto_login_provider,auto_login_fallback_provider,email_pass_login_provider){setup_auto_login_provider=auto_login_provider
setup_auto_login_fallback_provider=auto_login_fallback_provider
setup_email_pass_login_provider=email_pass_login_provider
clients.forEach(externalUsersSetupProvider)}

},{"../common/external_users_common":87,"./social":64,"assert":undefined}],26:[function(require,module,exports){
"use strict"
exports.ERR_TIMEOUT=exports.ERR_CONNECTION=void 0
exports.fetch=fetch
exports.fetchDelaySet=fetchDelaySet
var assert=require("assert")
var random=Math.random,round=Math.round
var ERR_CONNECTION="ERR_CONNECTION"
exports.ERR_CONNECTION=ERR_CONNECTION
var ERR_TIMEOUT="ERR_TIMEOUT"
exports.ERR_TIMEOUT=ERR_TIMEOUT
var fetch_delay=0
var fetch_delay_rand=0
function fetchDelaySet(delay,rand){fetch_delay=delay
fetch_delay_rand=rand}var regex_with_host=/\/\/[^/]+\/([^?#]+)/
var regex_no_host=/([^?#]+)/
function labelFromURL(url){var m=url.match(regex_with_host)
if(m)return m[1]
return(m=url.match(regex_no_host))?m[1]:url}function fetch(params,cb){var is_done=false
var timer
function done(err,response){if(is_done)return
is_done=true
if(timer)clearTimeout(timer)
cb(err,response)}var method=params.method,url=params.url,response_type=params.response_type,label=params.label,body=params.body,_params$headers=params.headers,headers=void 0===_params$headers?{}:_params$headers,timeout=params.timeout
method=method||"GET"
assert(url)
label=label||labelFromURL(url)
var xhr=new XMLHttpRequest
xhr.open(method,url,true)
if(timeout){xhr.timeout=timeout
timer=setTimeout(function(){timer=setTimeout(function(){profilerStart("fetch_timeout:"+label)
done(ERR_TIMEOUT)
profilerStop()},timeout)},timeout)}if(response_type&&"json"!==response_type)xhr.responseType=response_type
for(var header in headers)xhr.setRequestHeader(header,headers[header])
xhr.onload=function(){profilerStart("fetch_onload:"+label)
if(0!==xhr.status&&xhr.status<200||xhr.status>=300){var text
if("arraybuffer"!==response_type)try{text=xhr.responseText}catch(e){}done(String(xhr.status),text||"")}else if("json"===response_type){var _text
var obj
try{_text=xhr.responseText
obj=JSON.parse(_text)}catch(e){console.error("Received invalid JSON response from "+url+": "+(_text||"<empty response>"))
done(e)
profilerStop()
return}done(null,obj)}else if("arraybuffer"===response_type)if(xhr.response)done(null,xhr.response)
else done("empty response")
else done(null,xhr.responseText)
profilerStop()}
xhr.onabort=xhr.onerror=function(){profilerStart("fetch_onerror:"+label)
done(ERR_CONNECTION)
profilerStop()}
xhr.ontimeout=function(){profilerStart("fetch_ontimeout:"+label)
done(ERR_TIMEOUT)
profilerStop()}
if(void 0!==body)if("object"===typeof body){xhr.setRequestHeader("Content-Type","application/json")
body=JSON.stringify(body)}else body=String(body)
if(fetch_delay||fetch_delay_rand)setTimeout(xhr.send.bind(xhr,body),fetch_delay+round(random()*fetch_delay_rand))
else xhr.send(body)}

},{"assert":undefined}],27:[function(require,module,exports){
"use strict"
exports.filewatchMessageHandler=filewatchMessageHandler
exports.filewatchOn=filewatchOn
exports.filewatchStartup=filewatchStartup
exports.filewatchTriggerChange=filewatchTriggerChange
var assert=require("assert")
var _locate_asset=require("./locate_asset")
var locateAssetDisableHashing=_locate_asset.locateAssetDisableHashing
var by_ext={}
var by_match=[]
function filewatchOn(ext_or_search,cb){if("."===ext_or_search[0]){assert(!by_ext[ext_or_search])
by_ext[ext_or_search]=cb}else by_match.push([ext_or_search,cb])}var message_cb
function filewatchMessageHandler(cb){message_cb=cb}function onFileChange(filename){console.log("FileWatch change: "+filename)
locateAssetDisableHashing()
var ext_idx=filename.lastIndexOf(".")
var did_reload=false
if(-1!==ext_idx){var ext=filename.slice(ext_idx)
if(by_ext[ext])if(false!==by_ext[ext](filename))did_reload=true}for(var ii=0;ii<by_match.length;++ii)if(filename.match(by_match[ii][0]))if(false!==by_match[ii][1](filename))did_reload=true
if(message_cb&&did_reload)message_cb("Reloading: "+filename)}function filewatchTriggerChange(filename){onFileChange(filename)}function filewatchStartup(client){client.onMsg("filewatch",onFileChange)}

},{"./locate_asset":42,"assert":undefined}],28:[function(require,module,exports){
"use strict"
exports.EPSILON=exports.ALIGN=void 0
exports.fontCreate=fontCreate
exports.fontRotate=fontRotate
exports.fontSetDefaultSize=fontSetDefaultSize
exports.fontSetReplacementChars=fontSetReplacementChars
exports.fontStyle=fontStyle
exports.fontStyleAlpha=fontStyleAlpha
exports.fontStyleBold=fontStyleBold
exports.fontStyleColored=fontStyleColored
exports.fontStyleHash=fontStyleHash
exports.fontStyleOutlined=fontStyleOutlined
exports.fontTick=fontTick
exports.glov_font_default_style=exports.font_shaders=void 0
exports.intColorFromVec4Color=intColorFromVec4Color
exports.vec4ColorFromIntColor=vec4ColorFromIntColor
exports.style=fontStyle
exports.styleColored=fontStyleColored
exports.styleAlpha=fontStyleAlpha
exports.create=fontCreate
var ALIGN={HLEFT:0,HCENTER:1,HRIGHT:2,HMASK:3,VTOP:0,VCENTER:4,VBOTTOM:8,VMASK:12,HFIT:16,HWRAP:32,HCENTERFIT:17,HRIGHTFIT:18,HVCENTER:5,HVCENTERFIT:21}
exports.ALIGN=ALIGN
var EPSILON=1e-10
exports.EPSILON=EPSILON
var assert=require("assert")
var camera2d=require("./camera2d.js")
var _require=require("./camera2d.js"),transformX=_require.transformX,transformY=_require.transformY
var engine=require("./engine.js")
var geom=require("./geom.js")
var _require2=require("./localization.js"),getStringFromLocalizable=_require2.getStringFromLocalizable
var cos=Math.cos,sin=Math.sin,max=Math.max,min=Math.min,round=Math.round
var _require3=require("./shaders.js"),shaderCreate=_require3.shaderCreate,shadersPrelink=_require3.shadersPrelink
var sprites=require("./sprites.js")
var BLEND_ALPHA=sprites.BLEND_ALPHA,BLEND_PREMULALPHA=sprites.BLEND_PREMULALPHA,spriteChainedStart=sprites.spriteChainedStart,spriteChainedStop=sprites.spriteChainedStop,spriteDataAlloc=sprites.spriteDataAlloc
var _require4=require("./textures.js"),textureLoad=_require4.textureLoad
var _require5=require("../common/util.js"),clamp=_require5.clamp
var _require6=require("../common/vmath.js"),v3scale=_require6.v3scale,v3set=_require6.v3set,vec4=_require6.vec4,v4copy=_require6.v4copy,v4scale=_require6.v4scale
var ALIGN_NEEDS_WIDTH=ALIGN.HMASK|ALIGN.HFIT
function GlovFontStyle(){this.color_vec4=new Float32Array([1,1,1,1])}GlovFontStyle.prototype.outline_width=0
GlovFontStyle.prototype.outline_color=0
GlovFontStyle.prototype.glow_xoffs=0
GlovFontStyle.prototype.glow_yoffs=0
GlovFontStyle.prototype.glow_inner=0
GlovFontStyle.prototype.glow_outer=0
GlovFontStyle.prototype.glow_color=0
GlovFontStyle.prototype.color=4294967295
GlovFontStyle.prototype.hash=0
var font_shaders={}
exports.font_shaders=font_shaders
function intColorFromVec4Color(v){return(255*v[0]|0)<<24|(255*v[1]|0)<<16|(255*v[2]|0)<<8|255*v[3]|0}function vec4ColorFromIntColor(v,c){v[0]=(c>>24&255)/255
v[1]=(c>>16&255)/255
v[2]=(c>>8&255)/255
v[3]=(255&c)/255
return v}function vec4ColorFromIntColorPreMultiplied(v,c){var a=v[3]=(255&c)/255
v[0]=(c>>24&255)*(a*=1/255)
v[1]=(c>>16&255)*a
v[2]=(c>>8&255)*a}var glov_font_default_style=new GlovFontStyle
exports.glov_font_default_style=glov_font_default_style
function fontStyle(font_style,fields){var ret=new GlovFontStyle
var color_vec4=ret.color_vec4
if(font_style)for(var f in font_style)ret[f]=font_style[f]
for(var _f in fields)ret[_f]=fields[_f]
ret.color_vec4=color_vec4
vec4ColorFromIntColor(ret.color_vec4,ret.color)
ret.hash=0
return ret}function fontStyleColored(font_style,color){return fontStyle(font_style,{color:color})}function fontStyleOutlined(font_style,outline_width,outline_color){return fontStyle(font_style,{outline_width:outline_width,outline_color:outline_color=outline_color||(font_style||glov_font_default_style).color})}function fontStyleBold(font_style,outline_width){var outline_color=(font_style||glov_font_default_style).color
if(font_style.outline_width){var glow_w=outline_width+font_style.outline_width
return fontStyle(font_style,{outline_width:outline_width,outline_color:outline_color,glow_xoffs:0,glow_yoffs:0,glow_color:font_style.outline_color,glow_inner:glow_w-.25,glow_outer:glow_w+.25})}else return fontStyle(font_style,{outline_width:outline_width,outline_color:outline_color})}function colorAlpha(color,alpha){return 4294967040&color|(alpha=clamp(round((255&color)*alpha),0,255))}function fontStyleAlpha(font_style,alpha){return fontStyle(font_style,{color:colorAlpha((font_style||glov_font_default_style).color,alpha),outline_color:colorAlpha((font_style||glov_font_default_style).outline_color,alpha),glow_color:colorAlpha((font_style||glov_font_default_style).glow_color,alpha)})}function fontStyleHash(style){if(!style.hash)style.hash=style.color+1007*style.outline_width+3*style.outline_color+10007*style.glow_xoffs+100007*style.glow_yoffs+1000007*style.glow_inner+10000007*style.glow_outer+7*style.glow_color
return style.hash}var tech_params=null
var tech_params_dirty=false
var tech_params_cache=[]
var tech_params_cache_idx=0
var tech_params_pool=[]
var tech_params_pool_idx=0
var temp_color=vec4()
var geom_stats
var dsp={}
function techParamsAlloc(){if(tech_params_pool_idx===tech_params_pool.length)tech_params_pool.push({param0:vec4(),outline_color:vec4(),glow_color:vec4(),glow_params:vec4()})
tech_params=tech_params_pool[tech_params_pool_idx++]}function fontStartup(){if(tech_params)return
geom_stats=geom.stats
techParamsAlloc()}function techParamsSet(param,value){var tpv=tech_params[param]
if(!tech_params_dirty)if(tpv[0]!==value[0]||tpv[1]!==value[1]||tpv[2]!==value[2]||tpv[3]!==value[3]){var old_tech_params=tech_params
techParamsAlloc()
v4copy(tech_params.param0,old_tech_params.param0)
v4copy(tech_params.outline_color,old_tech_params.outline_color)
v4copy(tech_params.glow_color,old_tech_params.glow_color)
v4copy(tech_params.glow_params,old_tech_params.glow_params)
geom_stats.font_params++
tech_params_dirty=true
tpv=tech_params[param]}else return
if(tech_params_dirty){tpv[0]=value[0]
tpv[1]=value[1]
tpv[2]=value[2]
tpv[3]=value[3]}}var SHADER_KEYS=["param0","outline_color","glow_color","glow_params"]
function sameTP(as){for(var jj=0;jj<4;++jj){var key=SHADER_KEYS[jj]
var v1=tech_params[key]
var v2=as[key]
for(var ii=0;ii<4;++ii)if(v1[ii]!==v2[ii])return false}return true}function techParamsGet(){if(!tech_params_dirty)return tech_params
tech_params_dirty=false
for(var ii=0;ii<tech_params_cache.length;++ii)if(sameTP(tech_params_cache[ii])){if(tech_params===tech_params_pool[tech_params_pool_idx-1])tech_params_pool_idx--
tech_params=tech_params_cache[ii]
if(tech_params_cache_idx===ii)tech_params_cache_idx=(tech_params_cache_idx+1)%4;--geom_stats.font_params
return tech_params}tech_params_cache[tech_params_cache_idx]=tech_params
tech_params_cache_idx=(tech_params_cache_idx+1)%4
return tech_params}function GlovFont(font_info,texture_name){assert(0!==font_info.font_size)
this.texture=textureLoad({url:"img/"+texture_name+".png",filter_min:font_info.noFilter?gl.NEAREST:gl.LINEAR,filter_mag:font_info.noFilter?gl.NEAREST:gl.LINEAR,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})
this.textures=[this.texture]
this.integral=Boolean(font_info.noFilter)
this.hard_cutoff=this.integral
this.font_info=font_info
this.font_size=font_info.font_size
this.inv_font_size=1/font_info.font_size
this.shader=font_shaders.font_aa
this.tex_w=font_info.imageW
this.tex_h=font_info.imageH
for(var ii=0;ii<font_info.char_infos.length;++ii){var char_info=font_info.char_infos[ii]
char_info.scale=1/(char_info.sc||1)
char_info.w=char_info.w||0}this.char_infos=[]
for(var _ii=0;_ii<font_info.char_infos.length;++_ii){var _char_info=font_info.char_infos[_ii];(this.char_infos[_char_info.c]=_char_info).xpad=_char_info.xpad||0
_char_info.yoffs=_char_info.yoffs||0
_char_info.w_pad_scale=(_char_info.w+_char_info.xpad)*_char_info.scale}this.replacement_character=this.infoFromChar(65533)
if(!this.replacement_character)this.replacement_character=this.infoFromChar(63)
this.whitespace_character=this.infoFromChar(13)
this.default_style=new GlovFontStyle
this.applied_style=new GlovFontStyle
fontStartup()}GlovFont.prototype.drawSizedColor=function(style,x,y,z,size,color,text){return this.drawSized(fontStyleColored(style,color),x,y,z,size,text)}
GlovFont.prototype.drawSized=function(style,x,y,z,size,text){dsp.style=style
dsp.x=x
dsp.y=y
dsp.z=z
dsp.xsc=size*this.inv_font_size
dsp.ysc=size*this.inv_font_size
dsp.text=text
return this.drawScaled()}
GlovFont.prototype.drawSizedAligned=function(style,x,y,z,size,align,w,h,text){profilerStart("drawSizedAligned")
text=getStringFromLocalizable(text)
if(align&ALIGN.HWRAP){var drawn_height=this.drawSizedAlignedWrapped(style,x,y,z,0,size,align&~ALIGN.HWRAP,w,h,text)
profilerStop("drawSizedAligned")
return drawn_height}var x_size=size
var y_size=size
if(align&ALIGN_NEEDS_WIDTH){var width=this.getStringWidth(style,x_size,text)
if(align&ALIGN.HFIT&&width>w+EPSILON){var scale=w/width
x_size*=scale
width=w
if(scale<.5){if((align&ALIGN.VMASK)!==ALIGN.VCENTER&&(align&ALIGN.VMASK)!==ALIGN.VBOTTOM)y+=.5*(y_size-y_size*scale*2)
y_size*=2*scale}}switch(align&ALIGN.HMASK){case ALIGN.HCENTER:x+=.5*(w-width)
if(this.integral)x=round(x)
break
case ALIGN.HRIGHT:x+=w-width}}switch(align&ALIGN.VMASK){case ALIGN.VCENTER:y+=.5*(h-y_size)
if(this.integral)y=round(y)
break
case ALIGN.VBOTTOM:y+=h-y_size}var xsc=x_size*this.inv_font_size
var ysc=y_size*this.inv_font_size
dsp.style=style
dsp.x=x
dsp.y=y
dsp.z=z
dsp.xsc=xsc
dsp.ysc=ysc
dsp.text=text
var drawn_width=this.drawScaled()
profilerStop("drawSizedAligned")
return drawn_width}
var tile_state=0
var chained_outside=false
GlovFont.prototype.drawSizedAlignedWrapped=function(style,x,y,z,indent,size,align,w,h,text){text=getStringFromLocalizable(text)
assert(w>0)
assert("string"!==typeof h)
var lines=[]
var line_xoffs=[]
lines.length=this.wrapLines(style,w,indent,size,text,align,function(xoffs,linenum,line){line_xoffs[linenum]=xoffs
lines[linenum]=line})
var yoffs=0
var height=size*lines.length
var valign=align&ALIGN.VMASK
switch(valign){case ALIGN.VCENTER:yoffs=(h-height)/2
if(this.integral)yoffs|=0
break
case ALIGN.VBOTTOM:yoffs=h-height}align&=~ALIGN.VMASK
chained_outside=true
tile_state=0
spriteChainedStart()
for(var ii=0;ii<lines.length;++ii){var line=lines[ii]
if(line&&line.trim())this.drawSizedAligned(style,x+line_xoffs[ii],y+yoffs,z,size,align,w-line_xoffs[ii],0,line)
yoffs+=size}chained_outside=false
spriteChainedStop()
return valign===ALIGN.VBOTTOM?height:yoffs}
GlovFont.prototype.drawSizedColorWrapped=function(style,x,y,z,w,indent,size,color,text){return this.drawScaledWrapped(fontStyleColored(style,color),x,y,z,w,indent,size*this.inv_font_size,size*this.inv_font_size,text)}
GlovFont.prototype.drawSizedWrapped=function(style,x,y,z,w,indent,size,text){return this.drawScaledWrapped(style,x,y,z,w,indent,size*this.inv_font_size,size*this.inv_font_size,text)}
var default_size=24
function fontSetDefaultSize(h){default_size=h}var font_rot=0
var font_rot_cos=0
var font_rot_sin=0
var font_rot_origin_x=0
var font_rot_origin_y=0
function fontRotate(rot,rot_origin_x,rot_origin_y){font_rot_cos=cos(font_rot=rot)
font_rot_sin=sin(rot)
font_rot_origin_x=transformX(rot_origin_x)
font_rot_origin_y=transformY(rot_origin_y)}GlovFont.prototype.draw=function(param){var style=param.style,color=param.color,alpha=param.alpha,x=param.x,y=param.y,z=param.z,size=param.size,w=param.w,h=param.h,align=param.align,text=param.text,indent=param.indent,rot=param.rot
if(color)style=fontStyleColored(style,color)
if(void 0!==alpha)style=fontStyleAlpha(style,alpha)
indent=indent||0
size=size||default_size
z=z||Z.UI
if(rot)fontRotate(rot,x,y)
var ret
if(align)if(align&ALIGN.HWRAP)ret=this.drawSizedAlignedWrapped(style,x,y,z,indent,size,align&~ALIGN.HWRAP,w,h,text)
else ret=this.drawSizedAligned(style,x,y,z,size,align,w||0,h||0,text)
else ret=this.drawSized(style,x,y,z,size,text)
if(rot)fontRotate(0)
return ret}
GlovFont.prototype.wrapLines=function(style,w,indent,size,text,align,line_cb){assert("number"!==typeof style)
this.applyStyle(style)
return this.wrapLinesScaled(w,indent,size*this.inv_font_size,text,align,line_cb)}
GlovFont.prototype.numLines=function(style,w,indent,size,text){return this.wrapLines(style,w,indent,size,text,0)}
GlovFont.prototype.dims=function(style,w,indent,size,text){var max_x1=0
function lineCallback(ignored1,ignored2,line,x1){max_x1=max(max_x1,x1)}var numlines=this.wrapLines(style,w,indent,size,text,0,lineCallback)
return{w:max_x1,h:numlines*size,numlines:numlines}}
var unicode_replacement_chars
GlovFont.prototype.infoFromChar=function(c){var ret=this.char_infos[c]
if(ret)return ret
if(c>=9&&c<=13)return this.whitespace_character
if(unicode_replacement_chars){var ascii=unicode_replacement_chars[c]
if(ascii)if(ret=this.char_infos[ascii])return ret}return this.replacement_character}
GlovFont.prototype.getCharacterWidth=function(style,x_size,c){assert.equal(typeof c,"number")
this.applyStyle(style)
var char_info=this.infoFromChar(c)
var xsc=x_size*this.inv_font_size
var x_advance=this.calcXAdvance(xsc)
if(char_info)return char_info.w_pad_scale*xsc+x_advance
return 0}
GlovFont.prototype.getStringWidth=function(style,x_size,text){text=getStringFromLocalizable(text)
this.applyStyle(style)
var ret=0
var xsc=x_size*this.inv_font_size
var x_advance=this.calcXAdvance(xsc)
for(var ii=0;ii<text.length;++ii){var c=text.charCodeAt(ii)
var char_info=this.infoFromChar(c)
if(char_info)ret+=char_info.w_pad_scale*xsc+x_advance}return ret}
GlovFont.prototype.getSpaceSize=function(xsc){var space_info=this.infoFromChar(32)
return(space_info?(space_info.w+space_info.xpad)*space_info.scale:this.font_size)*xsc}
function endsWord(char_code){return 32===char_code||0===char_code||10===char_code||9===char_code}GlovFont.prototype.wrapLinesScaled=function(w,indent,xsc,text,align,line_cb){text=getStringFromLocalizable(text)
assert("function"!==typeof align)
var len=text.length
var max_word_w=w-indent+EPSILON
var hard_wrap_mode_fit=align&ALIGN.HFIT
var x_advance=this.calcXAdvance(xsc)
var space_size=this.getSpaceSize(xsc)+x_advance
var idx=0
var line_start=0
var line_x0=0
var line_x1=0
var line_end=-1
var word_start=0
var word_x0=0
var word_w=0
var word_slice=-1
var word_slice_w=0
var linenum=0
function flushLine(){if(-1!==line_end&&line_cb)line_cb(line_x0,linenum,text.slice(line_start,line_end),line_x1)
linenum++
line_start=word_start
line_end=line_x1=-1
word_x0=line_x0=indent}do{var c=idx<len?text.charCodeAt(idx)||65533:0
if(endsWord(c)){if(word_start!==idx){var need_line_flush=false
if(word_x0+word_w<=w+EPSILON);else if(word_w>max_word_w&&!hard_wrap_mode_fit){need_line_flush=true
if(-1===word_slice){if(-1!==line_end)flushLine()
idx=line_start+1
word_w=max_word_w}else{idx=word_slice
word_w=word_slice_w}}else if(-1!==line_end||indent<0&&line_x0!==indent)flushLine()
word_x0=line_x1=word_x0+word_w
word_w=0
word_start=line_end=idx
word_slice=-1
if(need_line_flush)flushLine()
continue}else if(c){word_start=idx+1
word_x0+=space_size
if(10===c)flushLine()}}else{var char_info=this.infoFromChar(c)
if(char_info){var char_w=char_info.w_pad_scale*xsc+x_advance
if(word_x0+(word_w+=char_w)<=w+EPSILON){word_slice=idx+1
word_slice_w=word_w}}}++idx}while(idx<=len)
if(-1!==line_end){line_x1=word_x0
flushLine()}else if(word_x0!==line_x1){line_x1=word_x0
if(line_cb)line_cb(line_x0,linenum,"",line_x1)}return linenum}
GlovFont.prototype.drawScaledWrapped=function(style,x,y,z,w,indent,xsc,ysc,text){var _this=this
if(null===text||void 0===text)text="(null)"
assert(w>0)
this.applyStyle(style)
this.last_width=0
dsp.style=style
dsp.z=z
dsp.xsc=xsc
dsp.ysc=ysc
return this.wrapLinesScaled(w,indent,xsc,text,0,function(xoffs,linenum,line,x1){dsp.x=x+xoffs
dsp.y=y+_this.font_size*ysc*linenum
dsp.text=line
_this.drawScaled()
_this.last_width=max(_this.last_width,x1)})*this.font_size*ysc}
GlovFont.prototype.calcXAdvance=function(xsc){var font_texel_scale=this.font_size/32
var x_advance=round(xsc*font_texel_scale*max(this.applied_style.outline_width-2,0))
return x_advance=max(x_advance,xsc*font_texel_scale*max(this.applied_style.glow_outer-this.applied_style.glow_xoffs-3,0))}
var temp_vec4_param0=vec4()
var temp_vec4_glow_params=vec4()
var padding4=vec4()
var padding_in_font_space=vec4()
GlovFont.prototype.drawScaled=function(){var style=dsp.style,_x=dsp.x,y=dsp.y,z=dsp.z,xsc=dsp.xsc,ysc=dsp.ysc,text=dsp.text
profilerStart("drawScaled")
text=getStringFromLocalizable(text)
var x=_x
assert(isFinite(x))
assert(isFinite(y))
assert(isFinite(z))
var font_info=this.font_info
y+=(font_info.y_offset||0)*ysc
var texs=this.textures
if(null===text||void 0===text)text="(null)"
var len=text.length
if(0===xsc||0===ysc){profilerStop("drawScaled")
return 0}geom_stats.font_calls++
this.applyStyle(style)
var blend_mode=engine.defines.NOPREMUL?BLEND_ALPHA:BLEND_PREMULALPHA
var avg_scale_font=.5*(xsc+ysc)
var avg_scale_combined=.5*(xsc*camera2d.data[4]+ysc*camera2d.data[5])
var x_advance=this.calcXAdvance(xsc)
var font_texel_scale=this.font_size/32
if(!chained_outside)tile_state=0
var applied_style=this.applied_style
var delta_per_source_pixel=.5/font_info.spread
var delta_per_dest_pixel=delta_per_source_pixel/avg_scale_combined
var value=v3set(temp_vec4_param0,1/delta_per_dest_pixel,-.5/delta_per_dest_pixel+.5,min(0,-.5/delta_per_dest_pixel+.5+applied_style.outline_width*font_texel_scale*avg_scale_combined))
var padding1=max(0,applied_style.outline_width*font_texel_scale*avg_scale_font)
var outer_scaled=applied_style.glow_outer*font_texel_scale
var glow_xoffs=applied_style.glow_xoffs*font_texel_scale*xsc
var glow_yoffs=applied_style.glow_yoffs*font_texel_scale*ysc
padding4[0]=max(outer_scaled*xsc-glow_xoffs,padding1)
padding4[2]=max(outer_scaled*xsc+glow_xoffs,padding1)
padding4[1]=max(outer_scaled*ysc-glow_yoffs,padding1)
padding4[3]=max(outer_scaled*ysc+glow_yoffs,padding1)
if(this.hard_cutoff){value[0]*=512
value[1]=512*value[1]-255.5
value[2]=512*value[2]-255.5}techParamsSet("param0",value)
var value2=temp_vec4_glow_params
if(applied_style.glow_outer){value2[2]=1/((applied_style.glow_outer-applied_style.glow_inner)*delta_per_source_pixel*font_texel_scale)
value2[3]=min(0,-(.5-applied_style.glow_outer*delta_per_source_pixel*font_texel_scale)/((applied_style.glow_outer-applied_style.glow_inner)*delta_per_source_pixel*font_texel_scale))}else value2[2]=value2[3]=0
v4scale(padding_in_font_space,padding4,1/avg_scale_font)
for(var ii=0;ii<4;++ii)if(padding_in_font_space[ii]>font_info.spread){var sc=font_info.spread/padding_in_font_space[ii]
padding4[ii]*=sc
padding_in_font_space[ii]*=sc}var z_advance=applied_style.glow_xoffs<0?-1e-4:0
if(!z_advance){if(!chained_outside)spriteChainedStart()}else if(chained_outside)spriteChainedStop()
var has_glow_offs=applied_style.glow_xoffs||applied_style.glow_yoffs
if(!has_glow_offs){value2[0]=value2[1]=0
techParamsSet("glow_params",value2)
techParamsGet()}var rel_x_scale=xsc/avg_scale_font
var rel_y_scale=ysc/avg_scale_font
var sort_y=transformY(y)
var color=applied_style.color_vec4
var shader=this.shader
var turx
var tury
var tllx
var tlly
for(var i=0;i<len;i++){var c=text.charCodeAt(i)
if(9===c){var tabsize=xsc*this.font_size*4
x=(1+((x-_x)/tabsize|0))*tabsize+_x}else{var char_info=this.infoFromChar(c)
if(char_info){var char_scale=char_info.scale
var xsc2=xsc*char_scale
if(char_info.w){var ysc2=ysc*char_scale
var pad_scale=1/char_scale
var tile_width=this.tex_w
var tile_height=this.tex_h
if(has_glow_offs&&char_scale!==tile_state){value2[0]=-applied_style.glow_xoffs*font_texel_scale*pad_scale/tile_width
value2[1]=-applied_style.glow_yoffs*font_texel_scale*pad_scale/tile_height
techParamsSet("glow_params",value2)
if(!z_advance){spriteChainedStop()
spriteChainedStart()}techParamsGet()
tile_state=char_scale}var u0=(char_info.x0-padding_in_font_space[0]*pad_scale)/tile_width
var u1=(char_info.x0+char_info.w+padding_in_font_space[2]*pad_scale)/tile_width
var v0=(char_info.y0-padding_in_font_space[1]*pad_scale)/tile_height
var v1=(char_info.y0+char_info.h+padding_in_font_space[3]*pad_scale)/tile_height
var w=char_info.w*xsc2+(padding4[0]+padding4[2])*rel_x_scale
var h=char_info.h*ysc2+(padding4[1]+padding4[3])*rel_y_scale
var xx=x-rel_x_scale*padding4[0]
var yy=y-rel_y_scale*padding4[1]+char_info.yoffs*ysc2
var y1=yy+h
var x1=xx+w
var zz=z+z_advance*i
var tulx=transformX(xx)
var tuly=transformY(yy)
var tlrx=transformX(x1)
var tlry=transformY(y1)
if(font_rot){var tw=tlrx-tulx
var th=tlry-tuly
var relxoffs=tulx-font_rot_origin_x
var relyoffs=tuly-font_rot_origin_y
var cosw=font_rot_cos*tw
var sinw=font_rot_sin*tw
var sinh=font_rot_sin*th
var cosh=font_rot_cos*th
tllx=(tulx=font_rot_origin_x+relxoffs*font_rot_cos-relyoffs*font_rot_sin)-sinh
tlly=(tuly=font_rot_origin_y+relxoffs*font_rot_sin+relyoffs*font_rot_cos)+cosh
tlrx=(turx=tulx+cosw)-sinh
tlry=(tury=tuly+sinw)+cosh}else{turx=tlrx
tury=tuly
tllx=tulx
tlly=tlry}var elem=spriteDataAlloc(texs,shader,tech_params,blend_mode)
var data=elem.data
data[0]=tulx
data[1]=tuly
data[2]=color[0]
data[3]=color[1]
data[4]=color[2]
data[5]=color[3]
data[6]=u0
data[7]=v0
data[8]=tllx
data[9]=tlly
data[10]=color[0]
data[11]=color[1]
data[12]=color[2]
data[13]=color[3]
data[14]=u0
data[15]=v1
data[16]=tlrx
data[17]=tlry
data[18]=color[0]
data[19]=color[1]
data[20]=color[2]
data[21]=color[3]
data[22]=u1
data[23]=v1
data[24]=turx
data[25]=tury
data[26]=color[0]
data[27]=color[1]
data[28]=color[2]
data[29]=color[3]
data[30]=u1
data[31]=v0
elem.x=tulx
elem.y=sort_y
elem.queue(zz)}x+=(char_info.w+char_info.xpad)*xsc2+x_advance}}}if(!z_advance){if(!chained_outside)spriteChainedStop()}else if(chained_outside)spriteChainedStart()
profilerStop("drawScaled")
return x-_x}
GlovFont.prototype.determineShader=function(){var outline=this.applied_style.outline_width&&255&this.applied_style.outline_color
var glow=this.applied_style.glow_outer>0&&255&this.applied_style.glow_color
if(outline)if(glow)this.shader=font_shaders.font_aa_outline_glow
else this.shader=font_shaders.font_aa_outline
else if(glow)this.shader=font_shaders.font_aa_glow
else this.shader=font_shaders.font_aa}
GlovFont.prototype.applyStyle=function(style){if(!style)style=this.default_style
if(engine.defines.NOPREMUL){vec4ColorFromIntColor(temp_color,style.outline_color)
techParamsSet("outline_color",temp_color)
vec4ColorFromIntColor(temp_color,style.glow_color)
techParamsSet("glow_color",temp_color)}else{vec4ColorFromIntColorPreMultiplied(temp_color,style.outline_color)
techParamsSet("outline_color",temp_color)
vec4ColorFromIntColorPreMultiplied(temp_color,style.glow_color)
techParamsSet("glow_color",temp_color)}this.applied_style.outline_width=style.outline_width
this.applied_style.outline_color=style.outline_color
this.applied_style.glow_xoffs=style.glow_xoffs
this.applied_style.glow_yoffs=style.glow_yoffs
this.applied_style.glow_inner=style.glow_inner
this.applied_style.glow_outer=style.glow_outer
this.applied_style.glow_color=style.glow_color
this.applied_style.color=style.color
if(engine.defines.NOPREMUL)v4copy(this.applied_style.color_vec4,style.color_vec4)
else{var alpha=this.applied_style.color_vec4[3]=style.color_vec4[3]
v3scale(this.applied_style.color_vec4,style.color_vec4,alpha)}this.determineShader()}
GlovFont.prototype.ALIGN=ALIGN
GlovFont.prototype.style=fontStyle
GlovFont.prototype.styleAlpha=fontStyleAlpha
GlovFont.prototype.styleColored=fontStyleColored
function fontShadersInit(){if(font_shaders.font_aa)return
font_shaders.font_aa=shaderCreate("shaders/font_aa.fp")
font_shaders.font_aa_glow=shaderCreate("shaders/font_aa_glow.fp")
font_shaders.font_aa_outline=shaderCreate("shaders/font_aa_outline.fp")
font_shaders.font_aa_outline_glow=shaderCreate("shaders/font_aa_outline_glow.fp")
shadersPrelink(sprites.sprite_vshader,font_shaders.font_aa)
shadersPrelink(sprites.sprite_vshader,font_shaders.font_aa_glow)
shadersPrelink(sprites.sprite_vshader,font_shaders.font_aa_outline)
shadersPrelink(sprites.sprite_vshader,font_shaders.font_aa_outline_glow)}function fontCreate(font_info,texture_name){fontShadersInit()
return new GlovFont(font_info,texture_name)}function fontTick(){tech_params_cache_idx=0
tech_params_cache.length=0
tech_params_pool_idx=0
techParamsAlloc()}function fontSetReplacementChars(replacement_chars){unicode_replacement_chars=replacement_chars}

},{"../common/util.js":96,"../common/vmath.js":98,"./camera2d.js":15,"./engine.js":21,"./geom.js":30,"./localization.js":41,"./shaders.js":61,"./sprites.js":68,"./textures.js":70,"assert":undefined}],29:[function(require,module,exports){
"use strict"
exports.copyCanvasToClipboard=copyCanvasToClipboard
exports.framebufferCapture=framebufferCapture
exports.framebufferEnd=framebufferEnd
exports.framebufferEndOfFrame=framebufferEndOfFrame
exports.framebufferSkipRelease=framebufferSkipRelease
exports.framebufferStart=framebufferStart
exports.framebufferTopOfFrame=framebufferTopOfFrame
exports.framebufferUpdateCanvasForCapture=framebufferUpdateCanvasForCapture
exports.temporaryTextureClaim=temporaryTextureClaim
var assert=require("assert")
var _require=require("../common/util"),nop=_require.nop
var _require2=require("./browser.js"),is_ios=_require2.is_ios
var _require3=require("./cmds.js"),cmd_parse=_require3.cmd_parse
var _require4=require("./effects.js"),applyCopy=_require4.applyCopy
var engine=require("./engine.js")
var renderWidth=engine.renderWidth,renderHeight=engine.renderHeight
var perf=require("./perf.js")
var settings=require("./settings.js")
var _require5=require("./textures.js"),TEXTURE_FORMAT=_require5.TEXTURE_FORMAT,textureCreateForCapture=_require5.textureCreateForCapture,textureCreateForDepthCapture=_require5.textureCreateForDepthCapture
var last_num_passes=0
var num_passes=0
var temporary_textures={}
var temporary_depthbuffers={}
var temporary_depthtextures={}
var reset_fbos=false
function resetFBOs(){reset_fbos=true}var skip_release=false
function framebufferSkipRelease(){skip_release=true}var last_temp_idx=0
function getTemporaryTexture(w,h,possibly_fbo){var key=w+"_"+h
var is_fbo=possibly_fbo&&settings.use_fbos
if(is_fbo)key+="_fbo"
var temp=temporary_textures[key]
if(!temp)temp=temporary_textures[key]={list:[],idx:0}
if(temp.idx>=temp.list.length){var _tex=textureCreateForCapture("temp_"+key+"_"+ ++last_temp_idx)
if(is_fbo){_tex.allocFBO(w,h)
assert(_tex.fbo)}temp.list.push(_tex)}var tex=temp.list[temp.idx++]
if(is_fbo)assert(tex.fbo)
return tex}function bindTemporaryDepthbuffer(w,h){var key=w+"_"+h
var temp=temporary_depthbuffers[key]
if(!temp)temp=temporary_depthbuffers[key]={list:[],idx:0}
if(temp.idx>=temp.list.length){var _depth_buffer=gl.createRenderbuffer()
gl.bindRenderbuffer(gl.RENDERBUFFER,_depth_buffer)
var _attachment
if(settings.fbo_depth16){gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h)
_attachment=gl.DEPTH_ATTACHMENT}else{gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_STENCIL,w,h)
_attachment=gl.DEPTH_STENCIL_ATTACHMENT}gl.bindRenderbuffer(gl.RENDERBUFFER,null)
temp.list.push({depth_buffer:_depth_buffer,attachment:_attachment})}var _temp$list$temp$idx=temp.list[temp.idx++],depth_buffer=_temp$list$temp$idx.depth_buffer,attachment=_temp$list$temp$idx.attachment
gl.framebufferRenderbuffer(gl.FRAMEBUFFER,attachment,gl.RENDERBUFFER,depth_buffer)}function bindTemporaryDepthbufferTexture(w,h){var key=w+"_"+h
var temp=temporary_depthtextures[key]
if(!temp)temp=temporary_depthtextures[key]={list:[],idx:0}
if(temp.idx>=temp.list.length){var _tex2=textureCreateForDepthCapture("temp_"+key+"_"+ ++last_temp_idx,settings.fbo_depth16?TEXTURE_FORMAT.DEPTH16:TEXTURE_FORMAT.DEPTH24)
_tex2.allocDepth(w,h)
var _attachment2=settings.fbo_depth16?gl.DEPTH_ATTACHMENT:gl.DEPTH_STENCIL_ATTACHMENT
temp.list.push({tex:_tex2,attachment:_attachment2})}var _temp$list$temp$idx2=temp.list[temp.idx++],tex=_temp$list$temp$idx2.tex,attachment=_temp$list$temp$idx2.attachment
gl.framebufferTexture2D(gl.FRAMEBUFFER,attachment,gl.TEXTURE_2D,tex.handle,0)
return tex}function temporaryTextureClaim(tex){for(var key in temporary_textures){var temp=temporary_textures[key]
var idx=temp.list.indexOf(tex)
if(-1!==idx){temp.list.splice(idx,1)
if(temp.idx>idx)--temp.idx
return}}assert(false)}function framebufferCaptureStart(tex,w,h,possibly_fbo){assert.equal(engine.viewport[0],0)
assert.equal(engine.viewport[1],0)
if(!w){w=renderWidth()
h=renderHeight()}if(!tex)tex=getTemporaryTexture(w,h,possibly_fbo)
tex.captureStart(w,h)
return tex}function framebufferCapture(tex,w,h,filter_linear,wrap){(tex=framebufferCaptureStart(tex,w,h,false)).captureEnd(filter_linear,wrap)
return tex}var cur_tex
var cur_depth
function framebufferStart(opts){assert(!cur_tex)
assert(!cur_depth)
var width=opts.width,height=opts.height,viewport=opts.viewport,final=opts.final,clear=opts.clear,need_depth=opts.need_depth,clear_all=opts.clear_all,clear_color=opts.clear_color,force_tex=opts.force_tex
if(!width){width=renderWidth()
height=renderHeight()}++num_passes
cur_depth=null
if(force_tex){assert(viewport);(cur_tex=force_tex).captureStart()}else if(!final){cur_tex=framebufferCaptureStart(null,width,height,true)
if(settings.use_fbos){assert(cur_tex.fbo)
if(need_depth)if("texture"===need_depth)cur_depth=bindTemporaryDepthbufferTexture(width,height)
else bindTemporaryDepthbuffer(width,height)}}if(clear_color)gl.clearColor(clear_color[0],clear_color[1],clear_color[2],clear_color[3])
if(clear&&clear_all){gl.disable(gl.SCISSOR_TEST)
gl.clear(gl.COLOR_BUFFER_BIT|(need_depth?gl.DEPTH_BUFFER_BIT:0))}var need_scissor
if(viewport){engine.setViewport(viewport)
need_scissor=viewport[0]||viewport[1]||viewport[2]!==engine.width||viewport[3]!==engine.height
if(clear_all)need_scissor=false}else{engine.setViewport([0,0,width,height])
need_scissor=width!==engine.width}if(need_scissor){gl.enable(gl.SCISSOR_TEST)
if(viewport)gl.scissor(viewport[0],viewport[1],viewport[2],viewport[3])
else gl.scissor(0,0,width,height)}else gl.disable(gl.SCISSOR_TEST)
if(clear&&!clear_all)gl.clear(gl.COLOR_BUFFER_BIT|(need_depth?gl.DEPTH_BUFFER_BIT:0))}function framebufferEnd(opts){assert(cur_tex)
var _opts=opts=opts||{},filter_linear=_opts.filter_linear,wrap=_opts.wrap,need_depth=_opts.need_depth
assert.equal(Boolean(cur_depth),"texture"===need_depth)
cur_tex.captureEnd(filter_linear,wrap)
var ret
if(cur_depth)ret=[cur_tex,cur_depth]
else ret=cur_tex
cur_depth=cur_tex=null
return ret}function framebufferTopOfFrame(){cur_depth=cur_tex=null}function framebufferEndOfFrame(){assert(!cur_tex)
last_num_passes=num_passes
num_passes=0
skip_release=skip_release&&!reset_fbos
for(var key in temporary_textures){var temp=temporary_textures[key]
if(reset_fbos)temp.idx=0
if(!skip_release)while(temp.list.length>temp.idx)temp.list.pop().destroy()
if(!temp.list.length)delete temporary_textures[key]
else temp.idx=0}for(var _key in temporary_depthbuffers){var _temp=temporary_depthbuffers[_key]
if(reset_fbos)_temp.idx=0
if(!skip_release)while(_temp.list.length>_temp.idx){var depth_buffer=_temp.list.pop().depth_buffer
gl.deleteRenderbuffer(depth_buffer)}if(!_temp.list.length)delete temporary_depthbuffers[_key]
else _temp.idx=0}for(var _key2 in temporary_depthtextures){var _temp2=temporary_depthtextures[_key2]
if(reset_fbos)_temp2.idx=0
if(!skip_release)while(_temp2.list.length>_temp2.idx)_temp2.list.pop().tex.destroy()
if(!_temp2.list.length)delete temporary_depthtextures[_key2]
else _temp2.idx=0}skip_release=reset_fbos=false}function framebufferUpdateCanvasForCapture(){if(cur_tex&&settings.use_fbos){assert(cur_tex.fbo)
var saved_tex=cur_tex
var saved_viewport=engine.viewport.slice(0)
framebufferEnd()
applyCopy({source:saved_tex,final:true,viewport:saved_viewport})
framebufferStart({force_tex:saved_tex,viewport:saved_viewport})
return saved_tex}else return{width:engine.viewport[2],height:engine.viewport[3]}}var clipboard_copy_supported=true
function clipboardGetPermission(next){var _navigator$permission
if(!(null!=(_navigator$permission=navigator.permissions)&&_navigator$permission.query))return void next()
var didnext=false
function onceNext(result){if(didnext)return
didnext=true
if(result&&result.state&&"denied"===result.state){clipboard_copy_supported=false
next("ERR_CLIPBOARD_ACCESS_DENIED")}else next()}try{navigator.permissions.query({name:"clipboard-write"}).then(onceNext,onceNext)}catch(e){onceNext()}}clipboardGetPermission(nop)
function copyCanvasToClipboard(){if(false===clipboard_copy_supported)return
function onError(err){console.error("Error copying to clipboard:",err)
clipboard_copy_supported=false}engine.postRender(function(){var dims=framebufferUpdateCanvasForCapture()
var canvas=engine.canvas
if(dims.width!==canvas.width){(canvas=document.createElement("canvas")).width=dims.width
canvas.height=dims.height
canvas.getContext("2d").drawImage(engine.canvas,0,engine.canvas.height-dims.height,dims.width,dims.height,0,0,dims.width,dims.height)}if(!canvas.toBlob)return void onError("ERR_UNSUPPORTED")
canvas.toBlob(function(blob){clipboardGetPermission(function(perm_err){if(perm_err)return void onError(perm_err)
try{var maybe_promise=navigator.clipboard.write([new ClipboardItem({"image/png":blob})])
if(maybe_promise&&maybe_promise.catch)maybe_promise.catch(onError)}catch(err){onError(err)}})},"image/png")})}settings.register({show_passes:{label:"Show Postprocessing Passes",default_value:0,type:cmd_parse.TYPE_INT,range:[0,1]},use_fbos:{label:"Use Framebuffer Objects for postprocessing",default_value:is_ios?1:0,type:cmd_parse.TYPE_INT,range:[0,1],ver:1},fbo_depth16:{label:"Use 16-bit depth buffers for offscreen rendering",default_value:0,type:cmd_parse.TYPE_INT,range:[0,1],on_change:resetFBOs},fbo_rgba:{label:"Use RGBA color buffers for offscreen rendering",default_value:0,type:cmd_parse.TYPE_INT,range:[0,1],on_change:resetFBOs}})
reset_fbos=false
perf.addMetric({name:"passes",show_stat:"show_passes",labels:{"passes: ":function passes(){return last_num_passes.toString()}}})

},{"../common/util":96,"./browser.js":13,"./cmds.js":17,"./effects.js":20,"./engine.js":21,"./perf.js":51,"./settings.js":59,"./textures.js":70,"assert":undefined}],30:[function(require,module,exports){
"use strict"
exports.TRIANGLE_FAN=exports.TRIANGLES=exports.QUADS=void 0
exports.geomCreate=geomCreate
exports.geomCreateIndices=geomCreateIndices
exports.geomCreateQuads=geomCreateQuads
exports.geomResetState=geomResetState
exports.geomStartup=geomStartup
exports.stats=void 0
var assert=require("assert")
var _require=require("./cmds.js"),cmd_parse=_require.cmd_parse
var engine=require("./engine.js")
var perf=require("./perf.js")
var settings=require("./settings.js")
var _require2=require("./shaders.js"),MAX_SEMANTIC=_require2.MAX_SEMANTIC
var ceil=Math.ceil,max=Math.max,min=Math.min
var TRIANGLES=4
exports.TRIANGLES=TRIANGLES
var TRIANGLE_FAN=6
exports.TRIANGLE_FAN=TRIANGLE_FAN
var QUADS=7
exports.QUADS=QUADS
var MAX_VERT_COUNT=65532
settings.register({show_render_stats:{default_value:0,type:cmd_parse.TYPE_INT,range:[0,1]}})
var stats={draw_calls:0,draw_calls_geom:0,draw_calls_sprite:0,draw_calls_dyn:0,tris:0,verts:0,sprites:0,dyn:0,sprite_sort_elems:0,sprite_sort_cmps:0,font_calls:0,font_params:0}
exports.stats=stats
var last_stats={}
var perf_labels={}
var _loop=function _loop(key){perf_labels[key+": "]=function(){return String(last_stats[key])}}
for(var key in stats)_loop(key)
perf.addMetric({name:"render_stats",show_stat:"show_render_stats",show_all:true,labels:perf_labels})
var gl_byte_size={5120:1,5121:1,5122:2,5123:2,5126:4}
var bound_geom
var bound_array_buf=null
var bound_index_buf=null
var quad_index_buf
var quad_index_buf_len=0
function deleteBuffer(handle){if(!handle)return
if(bound_array_buf===handle){gl.bindBuffer(gl.ARRAY_BUFFER,null)
bound_array_buf=null}if(bound_index_buf===handle){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)
bound_index_buf=null}gl.deleteBuffer(handle)}var attrib_enabled=0
function enableVertexAttribArray(bits){if(bits===attrib_enabled)return
var disable_mask=attrib_enabled&~bits
var enable_mask=~attrib_enabled&bits
attrib_enabled=bits
if(disable_mask){var n=0
do{if(1&disable_mask)gl.disableVertexAttribArray(n)
n++
disable_mask>>=1}while(disable_mask)}if(enable_mask){var _n=0
do{if(1&enable_mask)gl.enableVertexAttribArray(_n)
_n++
enable_mask>>=1}while(enable_mask)}}function getQuadIndexBuf(quad_count){assert(quad_count<=MAX_VERT_COUNT/4)
if(6*quad_count>quad_index_buf_len){if(!quad_index_buf)quad_index_buf=gl.createBuffer()
else engine.perf_state.gpu_mem.geom-=2*quad_index_buf_len
quad_index_buf_len=min(max(ceil(1.5*quad_index_buf_len),6*quad_count),6*MAX_VERT_COUNT/4)
if(bound_index_buf!==quad_index_buf){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,quad_index_buf)
bound_index_buf=quad_index_buf}var arr=new Uint16Array(quad_index_buf_len)
var vidx=0
for(var ii=0;ii<quad_index_buf_len;){arr[ii++]=vidx+1
arr[ii++]=vidx+3
arr[ii++]=vidx++
arr[ii++]=vidx++
arr[ii++]=vidx++
arr[ii++]=vidx++}gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,arr,gl.STATIC_DRAW)
engine.perf_state.gpu_mem.geom+=2*quad_index_buf_len}return quad_index_buf}function geomCreateIndices(idxs){var ret={ibo:gl.createBuffer(),ibo_size:idxs.length}
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ret.ibo)
bound_index_buf=ret.ibo
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idxs,gl.STATIC_DRAW)
engine.perf_state.gpu_mem.geom+=2*idxs.length
return ret}function formatInfo(format){if(!format.info){var stride=0
var elem_count=0
var used_attribs=0
var common_byte_size=0
for(var ii=0;ii<format.length;++ii){var fmt=format[ii]
var sem=fmt[0]
var gltype=fmt[1]
var count=fmt[2]
used_attribs|=1<<sem
var byte_size=gl_byte_size[gltype]
assert(byte_size)
assert(!common_byte_size||byte_size===common_byte_size)
common_byte_size=byte_size
fmt[3]=fmt[3]||false
stride+=count*(fmt[4]=byte_size)
elem_count+=count}format.info={stride:stride,elem_count:elem_count,used_attribs:used_attribs,common_byte_size:common_byte_size}}return format.info}function Geom(format,verts,idxs,mode){this.mode=mode||TRIANGLES
this.format=format
var info=this.format_info=formatInfo(format)
this.stride=info.stride
this.used_attribs=info.used_attribs
this.vert_count=verts.length/this.format_info.elem_count
this.vert_gpu_mem=verts.length*this.format_info.common_byte_size
if(verts.length){this.vbo=gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo)
bound_array_buf=this.vbo
gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW)
engine.perf_state.gpu_mem.geom+=this.vert_gpu_mem}this.orig_mode=mode
if(idxs)if(idxs.ibo){this.ibo=idxs.ibo
this.ibo_owned=false
this.ibo_size=idxs.ibo_size}else if(idxs.length){this.ibo=gl.createBuffer()
this.ibo_owned=true
this.ibo_size=idxs.length
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibo)
bound_index_buf=this.ibo
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idxs,gl.STATIC_DRAW)
engine.perf_state.gpu_mem.geom+=2*idxs.length}else{this.ibo=null
this.ibo_owned=true
this.ibo_size=0}else if(mode===QUADS){assert.equal(this.vert_count%4,0)
var quad_count=this.vert_count/4
this.ibo=getQuadIndexBuf(quad_count)
this.ibo_owned=false
this.ibo_size=6*quad_count
this.mode=TRIANGLES}else if(mode===TRIANGLE_FAN)this.mode=TRIANGLE_FAN
else{this.ibo=null
this.ibo_owned=false}this.updateTriCount()}function trianglesFromMode(mode,eff_vert_count){if(mode===TRIANGLES)return eff_vert_count/3
else if(mode===TRIANGLE_FAN)return eff_vert_count-2
else{assert(!eff_vert_count)
return 0}}Geom.prototype.updateTriCount=function(){var eff_vert_count=this.ibo?this.ibo_size:this.vert_count
this.tri_count=trianglesFromMode(this.mode,eff_vert_count)}
Geom.prototype.updateIndex=function(idxs,num_idxs){assert.equal(this.ibo_owned,true)
if(num_idxs>this.ibo_size){if(bound_geom===this)bound_geom=null
engine.perf_state.gpu_mem.geom-=2*this.ibo_size
deleteBuffer(this.ibo)
this.ibo_size=idxs.length
this.ibo=gl.createBuffer()
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibo)
bound_index_buf=this.ibo
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idxs,gl.DYNAMIC_DRAW)
engine.perf_state.gpu_mem.geom+=2*idxs.length}else{if(bound_index_buf!==this.ibo){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibo)
bound_index_buf=this.ibo}gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER,0,idxs.subarray(0,num_idxs))}this.updateTriCount()}
Geom.prototype.updateSub=function(offset,verts){if(bound_array_buf!==this.vbo){gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo)
bound_array_buf=this.vbo}gl.bufferSubData(gl.ARRAY_BUFFER,offset,verts)}
Geom.prototype.update=function(verts,num_verts){if(num_verts>this.vert_count){if(bound_geom===this)bound_geom=null
engine.perf_state.gpu_mem.geom-=this.vert_gpu_mem
deleteBuffer(this.vbo)
this.vert_count=verts.length/this.format_info.elem_count
this.vert_gpu_mem=verts.length*this.format_info.common_byte_size
this.vbo=gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo)
bound_array_buf=this.vbo
gl.bufferData(gl.ARRAY_BUFFER,verts,gl.DYNAMIC_DRAW)
engine.perf_state.gpu_mem.geom+=this.vert_gpu_mem}else{if(bound_array_buf!==this.vbo){gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo)
bound_array_buf=this.vbo}gl.bufferSubData(gl.ARRAY_BUFFER,0,verts.subarray(0,num_verts*this.format_info.elem_count))}if(this.orig_mode===QUADS){assert.equal(this.ibo_owned,false)
var quad_count=num_verts/4
this.ibo=getQuadIndexBuf(quad_count)
this.ibo_size=6*quad_count}this.updateTriCount()}
Geom.prototype.dispose=function(){if(this.ibo_owned)deleteBuffer(this.ibo)
this.ibo=null
deleteBuffer(this.vbo)
this.vbo=null
engine.perf_state.gpu_mem.geom-=this.vert_gpu_mem
this.vert_gpu_mem=0}
var bound_attribs=function(){var r=[]
for(var ii=0;ii<16;++ii)r.push({vbo:null,offset:0})
return r}()
function geomResetState(){bound_index_buf=bound_geom=null
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)
bound_array_buf=null
gl.bindBuffer(gl.ARRAY_BUFFER,null)
for(var ii=0;ii<MAX_SEMANTIC;++ii)gl.disableVertexAttribArray(ii)
for(var _ii=attrib_enabled=0;_ii<bound_attribs.length;++_ii)bound_attribs[_ii].vbo=null
stats.draw_calls=stats.draw_calls_geom+stats.draw_calls_sprite
for(var _key in stats){last_stats[_key]=stats[_key]
stats[_key]=0}}Geom.prototype.bind=function(){if(bound_geom!==this){var vbo=(bound_geom=this).vbo
var offset=0
for(var ii=0;ii<this.format.length;++ii){var fmt=this.format[ii]
var count=fmt[2]
var byte_size=fmt[4]
var sem=fmt[0]
if(bound_attribs[sem].vbo===vbo);else{if(bound_array_buf!==vbo){gl.bindBuffer(gl.ARRAY_BUFFER,vbo)
bound_array_buf=vbo}var gltype=fmt[1]
var normalized=fmt[3]
gl.vertexAttribPointer(sem,count,gltype,normalized,this.stride,offset)
bound_attribs[sem].vbo=bound_array_buf}offset+=count*byte_size}enableVertexAttribArray(this.used_attribs)}if(this.ibo&&bound_index_buf!==this.ibo){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibo)
bound_index_buf=this.ibo}}
Geom.prototype.draw=function(){this.bind();++stats.draw_calls_geom
stats.tris+=this.tri_count
stats.verts+=this.vert_count
if(this.ibo)gl.drawElements(this.mode,this.ibo_size,gl.UNSIGNED_SHORT,0)
else gl.drawArrays(this.mode,0,this.vert_count)}
Geom.prototype.drawSub=function(start,tri_count){assert.equal(this.mode,TRIANGLES)
this.bind();++stats.draw_calls_geom
if(this.ibo){stats.tris+=tri_count
stats.verts+=2*tri_count
gl.drawElements(this.mode,3*tri_count,gl.UNSIGNED_SHORT,2*start)}else gl.drawArrays(this.mode,start,3*tri_count)}
function GeomMultiQuads(format,verts){var ec=formatInfo(format).elem_count
var vert_count=verts.length/ec
this.geoms=[]
for(var idx=0;idx<vert_count;idx+=MAX_VERT_COUNT){var num_sub_verts=min(vert_count-idx,MAX_VERT_COUNT)
var sub_data=new Uint8Array(verts.buffer,idx*ec,num_sub_verts*ec)
this.geoms.push(new Geom(format,sub_data,null,QUADS))}}GeomMultiQuads.prototype.draw=function(){for(var ii=0;ii<this.geoms.length;++ii)this.geoms[ii].draw()}
GeomMultiQuads.prototype.drawSub=function(start,tri_count){for(var ii=0;ii<this.geoms.length&&tri_count;++ii){var geom=this.geoms[ii]
var num_quads=geom.vert_count/4
if(start<6*num_quads){var these=min(tri_count,2*(num_quads-start/6))
geom.drawSub(start,these)
tri_count-=these
start=0}else start-=6*num_quads}}
GeomMultiQuads.prototype.dispose=function(){for(var ii=0;ii<this.geoms.length;++ii)this.geoms[ii].dispose()
this.geoms=null}
function geomCreate(format,verts,idxs,mode){return new Geom(format,verts,idxs,mode)}function geomCreateQuads(format,verts,fixed_size){var format_info=formatInfo(format)
assert(fixed_size||verts instanceof Uint8Array)
if(verts.length/format_info.elem_count>MAX_VERT_COUNT)return new GeomMultiQuads(format,verts)
return new Geom(format,verts,null,QUADS)}function geomStartup(){}exports.createIndices=geomCreateIndices
exports.create=geomCreate
exports.createQuads=geomCreateQuads

},{"./cmds.js":17,"./engine.js":21,"./perf.js":51,"./settings.js":59,"./shaders.js":61,"assert":undefined}],31:[function(require,module,exports){
"use strict"
exports.decode=decode
var charCache=new Array(128)
var charFromCodePt=String.fromCodePoint||String.fromCharCode
var result=[]
function decode(array){var codePt
var byte1
var buffLen=array.length
for(var i=result.length=0;i<buffLen;){if((byte1=array[i++])<=127)codePt=byte1
else if(byte1<=223)codePt=(31&byte1)<<6|63&array[i++]
else if(byte1<=239)codePt=(15&byte1)<<12|(63&array[i++])<<6|63&array[i++]
else if(String.fromCodePoint)codePt=(7&byte1)<<18|(63&array[i++])<<12|(63&array[i++])<<6|63&array[i++]
else{codePt=63
i+=3}result.push(charCache[codePt]||(charCache[codePt]=charFromCodePt(codePt)))}return result.join("")}

},{}],32:[function(require,module,exports){
"use strict"
exports.ATTRIBUTE_TYPE_TO_COMPONENTS=exports.ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE=exports.ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY=void 0
exports.getAccessorTypeFromSize=getAccessorTypeFromSize
var TYPES=["SCALAR","VEC2","VEC3","VEC4"]
function getAccessorTypeFromSize(size){return TYPES[size-1]||TYPES[0]}var ATTRIBUTE_TYPE_TO_COMPONENTS={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16}
exports.ATTRIBUTE_TYPE_TO_COMPONENTS=ATTRIBUTE_TYPE_TO_COMPONENTS
var ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
exports.ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE=ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE
var ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array}
exports.ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY=ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY

},{}],33:[function(require,module,exports){
"use strict"
var assert=require("assert")
var _require=require("./unpack-glb-buffers.js"),unpackGLBBuffers=_require.unpackGLBBuffers
var _require2=require("./unpack-binary-json.js"),unpackBinaryJson=_require2.unpackBinaryJson
function padTo4Bytes(byteLength){return byteLength+3&-4}var decode_utf8=require("./decode-utf8.js")
var _require3=require("./gltf-type-utils.js"),ATTRIBUTE_TYPE_TO_COMPONENTS=_require3.ATTRIBUTE_TYPE_TO_COMPONENTS,ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE=_require3.ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE,ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY=_require3.ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY
var MAGIC_glTF=1735152710
var GLB_FILE_HEADER_SIZE=12
var GLB_CHUNK_HEADER_SIZE=8
var GLB_CHUNK_TYPE_JSON=1313821514
var GLB_CHUNK_TYPE_BIN=5130562
var LE=true
var BE=false
function GLBParser(){this.binaryByteOffset=null
this.packedJson=null
this.json=null}function parseBinary(self){var dataView=new DataView(self.glbArrayBuffer)
var magic1=dataView.getUint32(0,BE)
var version=dataView.getUint32(4,LE)
var fileLength=dataView.getUint32(8,LE)
var valid=magic1===MAGIC_glTF
if(!valid)console.warn("Invalid GLB magic string")
assert(2===version,"Invalid GLB version "+version+". Only .glb v2 supported")
assert(fileLength>20)
var jsonChunkLength=dataView.getUint32(12,LE)
var jsonChunkFormat=dataView.getUint32(16,LE)
assert(valid=jsonChunkFormat===GLB_CHUNK_TYPE_JSON||0===jsonChunkFormat,"JSON chunk format "+jsonChunkFormat)
var jsonChunkOffset=GLB_FILE_HEADER_SIZE+GLB_CHUNK_HEADER_SIZE
var jsonChunk=new Uint8Array(self.glbArrayBuffer,jsonChunkOffset,jsonChunkLength)
var jsonText=decode_utf8.decode(jsonChunk)
self.json=JSON.parse(jsonText)
var binaryChunkStart=jsonChunkOffset+padTo4Bytes(jsonChunkLength)
self.binaryByteOffset=binaryChunkStart+GLB_CHUNK_HEADER_SIZE
var binChunkFormat=dataView.getUint32(binaryChunkStart+4,LE)
assert(valid=binChunkFormat===GLB_CHUNK_TYPE_BIN||1===binChunkFormat,"BIN chunk format "+binChunkFormat)
return{arrayBuffer:self.glbArrayBuffer,binaryByteOffset:self.binaryByteOffset,json:self.json}}function parseInternal(self){var result=parseBinary(self)
self.packedJson=result.json
self.unpackedBuffers=unpackGLBBuffers(self.glbArrayBuffer,self.json,self.binaryByteOffset)
self.json=unpackBinaryJson(self.json,self.unpackedBuffers)}GLBParser.prototype.parseSync=function(arrayBuffer){this.glbArrayBuffer=arrayBuffer
if(null===this.json&&null===this.binaryByteOffset)parseInternal(this)
return this}
GLBParser.prototype.parse=function(arrayBuffer){return this.parseSync(arrayBuffer)}
GLBParser.prototype.getApplicationData=function(key){return this.json[key]}
GLBParser.prototype.getJSON=function(){return this.json}
GLBParser.prototype.getArrayBuffer=function(){return this.glbArrayBuffer}
GLBParser.prototype.getBinaryByteOffset=function(){return this.binaryByteOffset}
GLBParser.prototype.getBufferView=function(glTFBufferView){var byteOffset=(glTFBufferView.byteOffset||0)+this.binaryByteOffset
return new Uint8Array(this.glbArrayBuffer,byteOffset,glTFBufferView.byteLength)}
GLBParser.prototype.getBuffer=function(glTFAccessor){var ArrayType=ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY[glTFAccessor.componentType]
var components=ATTRIBUTE_TYPE_TO_COMPONENTS[glTFAccessor.type]
var bytesPerComponent=ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE[glTFAccessor.componentType]
var length=glTFAccessor.count*components
var byteLength=glTFAccessor.count*components*bytesPerComponent
var glTFBufferView=this.json.bufferViews[glTFAccessor.bufferView]
assert(byteLength>=0&&glTFAccessor.byteOffset+byteLength<=glTFBufferView.byteLength)
var byteOffset=glTFBufferView.byteOffset+this.binaryByteOffset+glTFAccessor.byteOffset
return new ArrayType(this.glbArrayBuffer,byteOffset,length)}
GLBParser.prototype.getImageData=function(glTFImage){return{typedArray:this.getBufferView(glTFImage.bufferView),mimeType:glTFImage.mimeType||"image/jpeg"}}
GLBParser.prototype.getImage=function(glTFImage){var arrayBufferView=this.getBufferView(glTFImage.bufferView)
var mimeType=glTFImage.mimeType||"image/jpeg"
var blob=new Blob([arrayBufferView],{type:mimeType})
var imageUrl=(window.URL||window.webkitURL).createObjectURL(blob)
var img=new Image
img.src=imageUrl
return img};(module.exports=GLBParser).parse=function(data){return(new GLBParser).parse(data)}

},{"./decode-utf8.js":31,"./gltf-type-utils.js":32,"./unpack-binary-json.js":34,"./unpack-glb-buffers.js":35,"assert":undefined}],34:[function(require,module,exports){
"use strict"
exports.unpackBinaryJson=unpackBinaryJson
function parseJSONPointer(value){if("string"===typeof value){if(0===value.indexOf("##/"))return value.slice(1)
var matches=value.match(/#\/([a-z]+)\/([0-9]+)/)
if(matches){var index=parseInt(matches[2],10)
return[matches[1],index]}if(matches=value.match(/\$\$\$([0-9]+)/))return["accessors",parseInt(matches[1],10)]}return null}function decodeJSONPointer(object,buffers){var pointer=parseJSONPointer(object)
if(pointer){var field=pointer[0]
var index=pointer[1]
var buffer=buffers[field]&&buffers[field][index]
if(buffer)return buffer
console.error("Invalid JSON pointer "+object+": #/"+field+"/"+index)}return null}function unpackJsonArraysRecursive(json,topJson,buffers,options){if(void 0===options)options={}
var object=json
var buffer=decodeJSONPointer(object,buffers)
if(buffer)return buffer
if(Array.isArray(object))return object.map(function(element){return unpackJsonArraysRecursive(element,topJson,buffers,options)})
if(null!==object&&"object"===typeof object){var newObject={}
for(var key in object)newObject[key]=unpackJsonArraysRecursive(object[key],topJson,buffers,options)
return newObject}return object}function unpackBinaryJson(json,buffers,options){if(void 0===options)options={}
return unpackJsonArraysRecursive(json,json,buffers,options)}

},{}],35:[function(require,module,exports){
"use strict"
exports.unpackGLBBuffers=unpackGLBBuffers
var assert=require("assert")
var _require=require("./gltf-type-utils.js"),ATTRIBUTE_TYPE_TO_COMPONENTS=_require.ATTRIBUTE_TYPE_TO_COMPONENTS,ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE=_require.ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE,ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY=_require.ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY
function getArrayBufferAtOffset(arrayBuffer,byteOffset){var length=arrayBuffer.byteLength-byteOffset
var binaryBuffer=new ArrayBuffer(length)
var sourceArray=new Uint8Array(arrayBuffer)
var binaryArray=new Uint8Array(binaryBuffer)
for(var i=0;i<length;i++)binaryArray[i]=sourceArray[byteOffset+i]
return binaryBuffer}function getArrayTypeAndLength(accessor,bufferView){var ArrayType=ATTRIBUTE_COMPONENT_TYPE_TO_ARRAY[accessor.componentType]
var components=ATTRIBUTE_TYPE_TO_COMPONENTS[accessor.type]
var bytesPerComponent=ATTRIBUTE_COMPONENT_TYPE_TO_BYTE_SIZE[accessor.componentType]
var length=accessor.count*components
var byteLength=accessor.count*components*bytesPerComponent
assert(byteLength>=0&&byteLength<=bufferView.byteLength)
return{ArrayType:ArrayType,length:length,byteLength:byteLength}}function unpackAccessors(arrayBuffer,bufferViews,json){var accessors=json.accessors||[]
var accessorBuffers=[]
for(var i=0;i<accessors.length;++i){var accessor=accessors[i]
assert(accessor)
var bufferView=bufferViews[accessor.bufferView]
if(bufferView){var _getArrayTypeAndLengt=getArrayTypeAndLength(accessor,bufferView),ArrayType=_getArrayTypeAndLengt.ArrayType,length=_getArrayTypeAndLengt.length
var array=new ArrayType(arrayBuffer,bufferView.byteOffset,length)
array.accessor=accessor
accessorBuffers.push(array)}}return accessorBuffers}function unpackImages(arrayBuffer,bufferViews,json){var images=json.images||[]
var imageBuffers=[]
for(var i=0;i<images.length;++i){var image=images[i]
assert(image)
if(void 0===image.bufferView){imageBuffers.push(null)
continue}var bufferView=bufferViews[image.bufferView]
assert(bufferView)
var array=new Uint8Array(arrayBuffer,bufferView.byteOffset,bufferView.byteLength)
array.imate=image
imageBuffers.push(array)}return imageBuffers}function unpackGLBBuffers(arrayBuffer,json,binaryByteOffset){if(binaryByteOffset)arrayBuffer=getArrayBufferAtOffset(arrayBuffer,binaryByteOffset)
var bufferViews=json.bufferViews||[]
for(var i=0;i<bufferViews.length;++i){var bufferView=bufferViews[i]
assert(bufferView.byteLength>=0)}return{accessors:unpackAccessors(arrayBuffer,bufferViews,json),images:unpackImages(arrayBuffer,bufferViews,json)}}

},{"./gltf-type-utils.js":32,"assert":undefined}],36:[function(require,module,exports){
"use strict"
exports.handle=handle
exports.on=on
exports.topOfFrame=topOfFrame
var assert=require("assert")
var cbs={}
function topOfFrame(){cbs={}}function on(type,code_or_pos,cb){var list=cbs[type]=cbs[type]||[]
if("number"===typeof code_or_pos)list[code_or_pos]=cb
else list.push([code_or_pos,cb])}function handle(type,event){var list=cbs[type]
if(!list)return
switch(type){case"keydown":case"keyup":if(list[event.keyCode])list[event.keyCode](type,event)
break
case"mouseup":case"mousedown":var x=event.pageX
var y=event.pageY
var button=event.button||0
for(var ii=0;ii<list.length;++ii){var elem=list[ii]
var pos=elem[0]
if(x>=pos.x&&x<pos.x+pos.w&&y>=pos.y&&y<pos.y+pos.h&&(pos.button<0||pos.button===button)){elem[1](type,event)
break}}break
default:assert(false)}}

},{"assert":undefined}],37:[function(require,module,exports){
"use strict"
exports.click=exports.PAD=exports.KEYS=void 0
exports.debugGetMouseMoveX=debugGetMouseMoveX
exports.drag=drag
exports.dragDrop=dragDrop
exports.dragOver=dragOver
exports.eatAllInput=eatAllInput
exports.eatAllKeyboardInput=eatAllKeyboardInput
exports.endFrame=endFrame
exports.fakeTouchEvent=fakeTouchEvent
exports.handleTouches=handleTouches
exports.inputAllowAllEvents=inputAllowAllEvents
exports.inputDrag=exports.inputClick=void 0
exports.inputEatenMouse=inputEatenMouse
exports.inputLastTime=inputLastTime
exports.inputPadMode=inputPadMode
exports.inputSetEventFilter=inputSetEventFilter
exports.inputTouchMode=inputTouchMode
exports.keyDown=keyDown
exports.keyDownEdge=keyDownEdge
exports.keyUpEdge=keyUpEdge
exports.longPress=longPress
exports.mouseButtonHadEdge=mouseButtonHadEdge
exports.mouseButtonHadUpEdge=mouseButtonHadUpEdge
exports.mouseConsumeClicks=mouseConsumeClicks
exports.mouseDomPos=mouseDomPos
exports.mouseDownAnywhere=mouseDownAnywhere
exports.mouseDownEdge=mouseDownEdge
exports.mouseDownMidClick=mouseDownMidClick
exports.mouseDownOverBounds=mouseDownOverBounds
exports.mouseMoved=mouseMoved
exports.mouseOver=mouseOver
exports.mouseOverCaptured=mouseOverCaptured
exports.mousePos=mousePos
exports.mousePosIsTouch=mousePosIsTouch
exports.mouseUpEdge=mouseUpEdge
exports.mouseWheel=mouseWheel
exports.numTouches=numTouches
exports.padButtonDown=padButtonDown
exports.padButtonDownEdge=padButtonDownEdge
exports.padButtonUpEdge=padButtonUpEdge
exports.padGetAxes=padGetAxes
exports.pad_mode=void 0
exports.pointerLockEnter=pointerLockEnter
exports.pointerLockExit=pointerLockExit
exports.pointerLockJustEntered=pointerLockJustEntered
exports.pointerLocked=pointerLocked
exports.startup=startup
exports.tickInput=tickInput
exports.tickInputInactive=tickInputInactive
exports.touch_mode=void 0
var _input_constants2=require("./input_constants")
var assert=require("assert")
var UP_EDGE=0
var UP=0
var DOWN=1
var DOWN_EDGE=2
var TOUCH_AS_MOUSE=true
var map_analog_to_dpad=true
var mouse_log=false
var click=mouseUpEdge
exports.click=click
var inputClick=mouseUpEdge
exports.inputClick=inputClick
var inputDrag=drag
exports.inputDrag=inputDrag
var _require=require("../common/util.js"),deprecate=_require.deprecate
deprecate(exports,"mouseDown","mouseDownAnywhere, mouseDownMidClick, mouseDownOverBounds")
var _input_constants=require("./input_constants")
var ANY=_input_constants.ANY
var POINTERLOCK=_input_constants.POINTERLOCK
for(var _input_constants2_key in _input_constants2)if("default"!==_input_constants2_key)exports[_input_constants2_key]=_input_constants2[_input_constants2_key]
var KEYS={BACKSPACE:8,TAB:9,ENTER:13,RETURN:13,SHIFT:16,CTRL:17,ALT:18,ESC:27,ESCAPE:27,SPACE:32,PAGEUP:33,PAGEDOWN:34,END:35,HOME:36,LEFT:37,UP:38,RIGHT:39,DOWN:40,INS:45,DEL:46,0:48,1:49,2:50,3:51,4:52,5:53,6:54,7:55,8:56,9:57,A:65,B:66,C:67,D:68,E:69,F:70,G:71,H:72,I:73,J:74,K:75,L:76,M:77,N:78,O:79,P:80,Q:81,R:82,S:83,T:84,U:85,V:86,W:87,X:88,Y:89,Z:90,NUMPAD0:96,NUMPAD1:97,NUMPAD2:98,NUMPAD3:99,NUMPAD4:100,NUMPAD5:101,NUMPAD6:102,NUMPAD7:103,NUMPAD8:104,NUMPAD9:105,NUMPAD_MULTIPLY:106,NUMPAD_ADD:107,NUMPAD_SUBTRACT:109,NUMPAD_DECIMAL_POINT:110,NUMPAD_DIVIDE:111,F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123,EQUALS:187,COMMA:188,MINUS:189,PERIOD:190,SLASH:191,TILDE:192}
exports.KEYS=KEYS
if("function"===typeof Proxy)exports.KEYS=KEYS=new Proxy(KEYS,{get:function get(target,prop){var ret=target[prop]
assert(ret)
return ret}})
var PAD={A:0,SELECT:0,B:1,CANCEL:1,X:2,Y:3,LB:4,LEFT_BUMPER:4,RB:5,RIGHT_BUMPER:5,LT:6,LEFT_TRIGGER:6,RT:7,RIGHT_TRIGGER:7,BACK:8,START:9,LEFT_STICK:10,RIGHT_STICK:11,UP:12,DOWN:13,LEFT:14,RIGHT:15,ANALOG_UP:20,ANALOG_LEFT:21,ANALOG_DOWN:22,ANALOG_RIGHT:23,LSTICK_UP:20,LSTICK_LEFT:21,LSTICK_DOWN:22,LSTICK_RIGHT:23,RSTICK_UP:24,RSTICK_LEFT:25,RSTICK_DOWN:26,RSTICK_RIGHT:27}
exports.PAD=PAD
var _require2=require("./browser.js"),is_firefox=_require2.is_firefox,is_mac_osx=_require2.is_mac_osx
var camera2d=require("./camera2d.js")
var _require3=require("./cmds.js"),cmd_parse=_require3.cmd_parse
var engine=require("./engine.js")
var _require4=require("./engine.js"),renderNeeded=_require4.renderNeeded
var in_event=require("./in_event.js")
var local_storage=require("./local_storage.js")
var abs=Math.abs,max=Math.max,min=Math.min,sqrt=Math.sqrt
var _require5=require("./normalize_mousewheel.js"),normalizeWheel=_require5.normalizeWheel
var pointer_lock=require("./pointer_lock.js")
var settings=require("./settings.js")
var _require6=require("./sound.js"),soundResume=_require6.soundResume
var _require7=require("./spot.js"),spotMouseoverHook=_require7.spotMouseoverHook
var _require8=require("../common/util.js"),empty=_require8.empty
var _require9=require("../common/vmath.js"),vec2=_require9.vec2,v2add=_require9.v2add,v2copy=_require9.v2copy,v2lengthSq=_require9.v2lengthSq,v2set=_require9.v2set,v2scale=_require9.v2scale,v2sub=_require9.v2sub
var pad_to_touch
var canvas
var key_state_new={}
var pad_states=[]
var gamepad_data=[]
var mouse_pos=vec2()
var last_mouse_pos=vec2()
var mouse_pos_is_touch=false
var mouse_over_captured=false
var mouse_down=[]
var wheel_events=[]
var movement_questionable_frames=0
var MOVEMENT_QUESTIONABLE_FRAMES=2
var input_eaten_kb=false
var input_eaten_mouse=false
var touches={}
var no_active_touches=true
var touch_mode=local_storage.getJSON("touch_mode",false)
var pad_mode=!(exports.touch_mode=touch_mode)&&local_storage.getJSON("pad_mode",false)
exports.pad_mode=pad_mode
cmd_parse.registerValue("mouse_log",{type:cmd_parse.TYPE_INT,range:[0,1],get:function get(){return mouse_log},set:function set(v){return mouse_log=v}})
function inputTouchMode(){return touch_mode}function inputPadMode(){return pad_mode}function inputEatenMouse(){return input_eaten_mouse}function eventTimestamp(event){if(event&&event.timeStamp){if(event.timeStamp<1e12!==engine.hrtime<1e12)return engine.hrtime
return event.timeStamp}return engine.hrtime}function TouchData(pos,touch,button,event){this.delta=vec2()
this.total=0
this.cur_pos=pos.slice(0)
this.start_pos=pos.slice(0)
this.touch=touch
this.button=button
this.start_time=Date.now()
this.dispatched=false
this.dispatched_drag=false
this.dispatched_drag_over=false
this.was_double_click=false
this.up_edge=0
this.down_edge=0
this.state=DOWN
this.down_time=0
this.origin_time=eventTimestamp(event)}TouchData.prototype.down=function(event,is_edge){if(is_edge)this.down_edge++
this.state=DOWN
this.origin_time=eventTimestamp(event)}
var MIN_EVENT_TIME_DELTA=.01
function timeDelta(event,origin_time){var et=eventTimestamp(event)
return max(et-origin_time,MIN_EVENT_TIME_DELTA)}function KeyData(){this.down_edge=0
this.origin_time=0
this.down_time=0
this.up_edge=0
this.state=UP}KeyData.prototype.keyUp=function(event){++this.up_edge
this.down_time+=timeDelta(event,this.origin_time)
this.state=UP}
function setMouseToMid(){v2set(mouse_pos,.5*engine.width/camera2d.domToCanvasRatio(),.5*engine.height/camera2d.domToCanvasRatio())}function pointerLocked(){return pointer_lock.isLocked()}var pointerlock_touch_id="m"+POINTERLOCK
var pointerlock_frame=-1
function pointerLockEnter(when){pointer_lock.enter(when)}function onPointerLockEnter(){if(touch_mode)return
pointerlock_frame=engine.frame_index
var touch_data=touches[pointerlock_touch_id]
setMouseToMid()
if(touch_data){v2copy(touch_data.start_pos,mouse_pos)
touch_data.state=DOWN
touch_data.origin_time=engine.hrtime}else touch_data=touches[pointerlock_touch_id]=new TouchData(mouse_pos,false,POINTERLOCK,null)
movement_questionable_frames=MOVEMENT_QUESTIONABLE_FRAMES}function pointerLockJustEntered(num_frames){return engine.frame_index<=pointerlock_frame+(num_frames||1)}function pointerLockExit(){var touch_data=touches[pointerlock_touch_id]
if(touch_data){v2copy(touch_data.cur_pos,mouse_pos)
touch_data.state=UP}pointer_lock.exit()
movement_questionable_frames=MOVEMENT_QUESTIONABLE_FRAMES}var last_event
var skip={isTrusted:1,sourceCapabilities:1,path:1,currentTarget:1,view:1}
function eventlog(event){if(event===last_event)return
var pairs=[]
for(var k in last_event=event){var v=event[k]
if(!v||"function"===typeof v||k.toUpperCase()===k||skip[k])continue
pairs.push(k+":"+(v.id||v))}console.log(engine.frame_index+" "+event.type+" "+(pointerLocked()?"ptrlck":"unlckd")+" "+pairs.join(","))}var allow_all_events=false
function inputAllowAllEvents(allow){allow_all_events=allow}function isInputElement(target){return target&&("INPUT"===target.tagName||"TEXTAREA"===target.tagName||"LABEL"===target.tagName||"VIDEO"===target.tagName)}function letWheelEventThrough(event){return allow_all_events||isInputElement(event.target)}var event_filter=function event_filter(){return false}
function inputSetEventFilter(filter){event_filter=filter}function letEventThrough(event){if(!event.target||allow_all_events||event.glov_do_not_cancel)return true
return isInputElement(event.target)||String(event.target.className).includes("noglov")||event_filter(event)}function ignored(event){if(!letEventThrough(event)){event.preventDefault()
event.stopPropagation()}}var ctrl_checked=false
var unload_protected=false
function beforeUnload(e){if(unload_protected&&ctrl_checked){pointerLockExit()
e.preventDefault()
e.returnValue="Are you sure you want to quit?"}else engine.releaseCanvas()}function protectUnload(enable){unload_protected=enable}var last_input_time=0
function inputLastTime(){return last_input_time}function onUserInput(){soundResume()
last_input_time=Date.now()
renderNeeded()}function releaseAllKeysDown(evt){for(var code in key_state_new){var ks=key_state_new[code]
if(ks.state===DOWN)ks.keyUp(evt)}}function onKeyUp(event){renderNeeded()
protectUnload(event.ctrlKey)
var code=event.keyCode
if(!letEventThrough(event)){event.stopPropagation()
event.preventDefault()}if(code===KEYS.ESC&&pointerLocked())pointerLockExit()
var ks=key_state_new[code]
if(ks&&ks.state===DOWN)if(is_mac_osx&&"Meta"===event.key)releaseAllKeysDown(event)
else ks.keyUp(event)
in_event.handle("keyup",event)}function onKeyDown(event){protectUnload(event.ctrlKey)
var code=event.keyCode
if(!(letEventThrough(event)||code>=KEYS.F5&&code<=KEYS.F12||code===KEYS.I&&(event.altKey&&event.metaKey||event.ctrlKey&&event.shiftKey)||code===KEYS.R&&event.ctrlKey||(code===KEYS.LEFT||code===KEYS.RIGHT)&&event.altKey)){event.stopPropagation()
event.preventDefault()}onUserInput()
var ks=key_state_new[code]
if(!ks)ks=key_state_new[code]=new KeyData
if(ks.state!==DOWN){++ks.down_edge
ks.state=DOWN
ks.origin_time=eventTimestamp(event)
in_event.handle("keydown",event)}}var mouse_move_x=0
function debugGetMouseMoveX(){var ret=mouse_move_x
mouse_move_x=0
return ret}var mouse_moved=false
var mouse_button_had_edge=false
var mouse_button_had_up_edge=false
var temp_delta=vec2()
var last_abs_move=0
var last_abs_move_time=0
var last_move_x=0
var last_move_y=0
function onMouseMove(event,no_stop){renderNeeded()
if(!letEventThrough(event)&&!no_stop&&3!==event.button){event.preventDefault()
event.stopPropagation()
if(touch_mode){local_storage.setJSON("touch_mode",false)
exports.touch_mode=touch_mode=false}if(pad_mode){local_storage.setJSON("pad_mode",false)
exports.pad_mode=pad_mode=false}}mouse_moved=true
mouse_pos[0]=event.pageX
mouse_pos[1]=event.pageY
mouse_pos_is_touch=false
var movement_x=event.movementX||event.mozMovementX||event.webkitMovementX||0
var movement_y=event.movementY||event.mozMovementY||event.webkitMovementY||0
mouse_move_x+=movement_x
var any_movement=false
if(pointerLocked()){setMouseToMid()
if(movement_x||movement_y){var ts=event.timeStamp||Date.now()
var abs_x=abs(movement_x)
var abs_y=abs(movement_y)
var abs_move=abs_x+abs_y
if(abs_move>200&&(abs_move>3*last_abs_move||ts-last_abs_move_time>1e3))console.log("Ignoring mousemove with sudden large delta: "+movement_x+","+movement_y)
else if(is_firefox&&movement_x===last_move_x&&movement_y===last_move_y&&abs_x<2&&abs_y<2);else{v2set(temp_delta,movement_x||0,movement_y||0)
any_movement=true}last_abs_move=abs_move
last_abs_move_time=ts
last_move_x=movement_x
last_move_y=movement_y}}else{v2sub(temp_delta,mouse_pos,last_mouse_pos)
if(temp_delta[0]||temp_delta[1])any_movement=true
v2copy(last_mouse_pos,mouse_pos)}if(any_movement&&movement_questionable_frames&&v2lengthSq(temp_delta)>1e4)any_movement=false
if(any_movement)for(var button=POINTERLOCK;button<mouse_down.length;++button)if(mouse_down[button]||button===POINTERLOCK&&pointerLocked()){var touch_data=touches["m"+button]
if(touch_data){v2add(touch_data.delta,touch_data.delta,temp_delta)
touch_data.total+=abs(temp_delta[0])+abs(temp_delta[1])
v2copy(touch_data.cur_pos,mouse_pos)}}}function onMouseDown(event){if(mouse_log)eventlog(event)
onMouseMove(event)
onUserInput()
var no_click=letEventThrough(event)
var button=event.button
mouse_down[button]=true
var touch_id="m"+button
if(touches[touch_id])v2copy(touches[touch_id].start_pos,mouse_pos)
else touches[touch_id]=new TouchData(mouse_pos,false,button,event)
touches[touch_id].down(event,!no_click)
if(!no_click)in_event.handle("mousedown",event)
mouse_button_had_edge=true
if(window.focus)window.focus()}var last_up_edges=[{timestamp:0,pos:vec2()},{timestamp:0,pos:vec2()}]
function registerMouseUpEdge(touch_data,timestamp){touch_data.up_edge++
var t=last_up_edges[0]
last_up_edges[0]=last_up_edges[1]
last_up_edges[1]=t
v2copy(t.pos,touch_data.cur_pos)
t.timestamp=timestamp}function onMouseUp(event){if(mouse_log)eventlog(event)
onMouseMove(event)
var no_click=letEventThrough(event)
var button=event.button
if(mouse_down[button]){var touch_data=touches["m"+button]
if(touch_data){v2copy(touch_data.cur_pos,mouse_pos)
if(!no_click)registerMouseUpEdge(touch_data,eventTimestamp(event))
touch_data.state=UP
touch_data.down_time+=timeDelta(event,touch_data.origin_time)}delete mouse_down[button]}mouse_button_had_up_edge=mouse_button_had_edge=true
if(!no_click)in_event.handle("mouseup",event)}function onWheel(event){renderNeeded()
var saved=mouse_moved
onMouseMove(event,true)
mouse_moved=saved
var normalized=normalizeWheel(event)
wheel_events.push({pos:[event.pageX,event.pageY],delta:-normalized.pixel_y/100,dispatched:false})
if(!letWheelEventThrough(event)){event.stopPropagation()
event.preventDefault()}}var touch_pos=vec2()
var released_touch_id=0
function onTouchChange(event){onUserInput()
if(!touch_mode){local_storage.set("touch_mode",true)
exports.touch_mode=touch_mode=true}if(pad_mode){local_storage.set("pad_mode",false)
exports.pad_mode=pad_mode=false}if(false!==event.cancelable)event.preventDefault()
var ct=event.touches
var seen={}
var new_count=ct.length
var old_count=0
var first_valid_touch
for(var ii=0;ii<ct.length;++ii){var touch=ct[ii]
try{if(!isFinite(touch.pageX)||!isFinite(touch.pageY)){--new_count
continue}}catch(e){--new_count
continue}if(!first_valid_touch)first_valid_touch=touch
var last_touch=touches[touch.identifier]
v2set(touch_pos,touch.pageX,touch.pageY)
if(!last_touch){(last_touch=touches[touch.identifier]=new TouchData(touch_pos,true,0,event)).down(event,true)
mouse_button_had_edge=true
in_event.handle("mousedown",touch)}else{++old_count
v2sub(temp_delta,touch_pos,last_touch.cur_pos)
v2add(last_touch.delta,last_touch.delta,temp_delta)
last_touch.total+=abs(temp_delta[0])+abs(temp_delta[1])
v2copy(last_touch.cur_pos,touch_pos)}seen[touch.identifier]=true
if(TOUCH_AS_MOUSE&&1===new_count){v2copy(mouse_pos,touch_pos)
mouse_pos_is_touch=true}}var released_touch
var released_ids=[]
for(var id in touches)if(!seen[id]){var _touch=touches[id]
if(_touch.touch&&_touch.state===DOWN){++old_count
released_touch=_touch
released_ids.push(id)
in_event.handle("mouseup",{pageX:_touch.cur_pos[0],pageY:_touch.cur_pos[1]})
registerMouseUpEdge(_touch,eventTimestamp(event))
mouse_button_had_up_edge=mouse_button_had_edge=true
_touch.state=UP
_touch.down_time+=timeDelta(event,_touch.origin_time)
_touch.release=true}}for(var _ii=0;_ii<released_ids.length;++_ii){var _id=released_ids[_ii]
var _touch2=touches[_id]
var new_id="r"+ ++released_touch_id
delete touches[_id]
touches[new_id]=_touch2}if(TOUCH_AS_MOUSE)if(1===old_count&&0===new_count){delete mouse_down[0]
v2copy(mouse_pos,released_touch.cur_pos)
mouse_pos_is_touch=true}else if(1===new_count){if(!old_count)mouse_down[0]=true
v2set(mouse_pos,first_valid_touch.pageX,first_valid_touch.pageY)
mouse_pos_is_touch=true}else if(new_count>1)delete mouse_down[0]}function onBlurOrFocus(evt){renderNeeded()
protectUnload(false)
releaseAllKeysDown(evt)}var ANALOG_MAP={}
function genAnalogMap(){if(map_analog_to_dpad){ANALOG_MAP[PAD.LEFT]=[PAD.LSTICK_LEFT,PAD.RSTICK_LEFT]
ANALOG_MAP[PAD.RIGHT]=[PAD.LSTICK_RIGHT,PAD.RSTICK_RIGHT]
ANALOG_MAP[PAD.UP]=[PAD.LSTICK_UP,PAD.RSTICK_UP]
ANALOG_MAP[PAD.DOWN]=[PAD.LSTICK_DOWN,PAD.RSTICK_DOWN]}}var passive_param=false
function handleTouches(elem){elem.addEventListener("touchstart",onTouchChange,passive_param)
elem.addEventListener("touchmove",onTouchChange,passive_param)
elem.addEventListener("touchend",onTouchChange,passive_param)
elem.addEventListener("touchcancel",onTouchChange,passive_param)}function startup(_canvas,params){canvas=_canvas
pointer_lock.startup(canvas,onPointerLockEnter)
if(void 0!==params.map_analog_to_dpad)map_analog_to_dpad=params.map_analog_to_dpad
pad_to_touch=params.pad_to_touch
genAnalogMap()
try{var opts=Object.defineProperty({},"passive",{get:function get(){passive_param={passive:false}
return false}})
window.addEventListener("test",null,opts)
window.removeEventListener("test",null,opts)}catch(e){passive_param=false}window.addEventListener("keydown",onKeyDown,false)
window.addEventListener("keyup",onKeyUp,false)
window.addEventListener("click",ignored,false)
window.addEventListener("contextmenu",ignored,false)
window.addEventListener("mousemove",onMouseMove,false)
window.addEventListener("mousedown",onMouseDown,false)
window.addEventListener("mouseup",onMouseUp,false)
if(window.WheelEvent)window.addEventListener("wheel",onWheel,passive_param)
else{window.addEventListener("DOMMouseScroll",onWheel,false)
window.addEventListener("mousewheel",onWheel,false)}window.addEventListener("blur",onBlurOrFocus,false)
window.addEventListener("focus",onBlurOrFocus,false)
handleTouches(canvas)
window.addEventListener("beforeunload",beforeUnload,false)}var DEADZONE=.26
var DEADZONE_SQ=DEADZONE*DEADZONE
var NUM_STICKS=2
var PAD_THRESHOLD=.35
function getGamepadData(idx){var gpd=gamepad_data[idx]
if(!gpd){gpd=gamepad_data[idx]={id:idx,timestamp:0,sticks:new Array(NUM_STICKS)}
for(var ii=0;ii<NUM_STICKS;++ii)gpd.sticks[ii]=vec2()
pad_states[idx]={}}return gpd}function updatePadState(gpd,ps,b,padcode){if(b&&!ps[padcode]){ps[padcode]=DOWN_EDGE
onUserInput()
if(touch_mode){local_storage.set("touch_mode",false)
exports.touch_mode=touch_mode=false}if(!pad_mode){local_storage.setJSON("pad_mode",true)
exports.pad_mode=pad_mode=true}if(padcode===pad_to_touch){var touch_id="g"+gpd.id
if(touches[touch_id]){setMouseToMid()
v2copy(touches[touch_id].start_pos,mouse_pos)}else touches[touch_id]=new TouchData(mouse_pos,false,0,null)
touches[touch_id].down(null,true)}}else if(!b&&ps[padcode]){ps[padcode]=UP_EDGE
if(padcode===pad_to_touch){var _touch_id="g"+gpd.id
var touch_data=touches[_touch_id]
if(touch_data){setMouseToMid()
v2copy(touch_data.cur_pos,mouse_pos)
registerMouseUpEdge(touch_data,engine.hrtime)
touch_data.state=UP
touch_data.down_time+=max(engine.hrtime-touch_data.origin_time,MIN_EVENT_TIME_DELTA)}}}}function gamepadUpdate(){var gamepads
try{gamepads=navigator.gamepads||navigator.webkitGamepads||navigator.getGamepads&&navigator.getGamepads()||navigator.webkitGetGamepads&&navigator.webkitGetGamepads()}catch(e){}if(gamepads){var numGamePads=gamepads.length
for(var ii=0;ii<numGamePads;ii++){var gamepad=gamepads[ii]
if(!gamepad)continue
var gpd=getGamepadData(ii)
var ps=pad_states[ii]
if(gpd.timestamp<gamepad.timestamp){var buttons=gamepad.buttons
gpd.timestamp=gamepad.timestamp
var numButtons=buttons.length
for(var n=0;n<numButtons;n++){var value=buttons[n]
if("object"===typeof value)value=value.value
updatePadState(gpd,ps,value=value>.5,n)}}var axes=gamepad.axes
if(axes.length>=2*NUM_STICKS){for(var _n=0;_n<NUM_STICKS;++_n){var pair=gpd.sticks[_n]
v2set(pair,axes[2*_n],-axes[2*_n+1])
var magnitude=v2lengthSq(pair)
if(magnitude>DEADZONE_SQ){magnitude=sqrt(magnitude)
v2scale(pair,pair,1/magnitude)
magnitude=min(magnitude,1)
v2scale(pair,pair,magnitude=(magnitude-DEADZONE)/(1-DEADZONE))}else v2set(pair,0,0)
if(_n<=1&&void 0!==pad_to_touch){var touch_data=touches["g"+gpd.id]
if(touch_data){v2scale(temp_delta,pair,engine.frame_dt)
v2add(touch_data.delta,touch_data.delta,temp_delta)
touch_data.total+=abs(temp_delta[0])+abs(temp_delta[1])
setMouseToMid()
v2copy(touch_data.cur_pos,mouse_pos)}}}updatePadState(gpd,ps,gpd.sticks[0][0]<-PAD_THRESHOLD,PAD.LSTICK_LEFT)
updatePadState(gpd,ps,gpd.sticks[0][0]>PAD_THRESHOLD,PAD.LSTICK_RIGHT)
updatePadState(gpd,ps,gpd.sticks[0][1]<-PAD_THRESHOLD,PAD.LSTICK_DOWN)
updatePadState(gpd,ps,gpd.sticks[0][1]>PAD_THRESHOLD,PAD.LSTICK_UP)
updatePadState(gpd,ps,gpd.sticks[1][0]<-PAD_THRESHOLD,PAD.RSTICK_LEFT)
updatePadState(gpd,ps,gpd.sticks[1][0]>PAD_THRESHOLD,PAD.RSTICK_RIGHT)
updatePadState(gpd,ps,gpd.sticks[1][1]<-PAD_THRESHOLD,PAD.RSTICK_DOWN)
updatePadState(gpd,ps,gpd.sticks[1][1]>PAD_THRESHOLD,PAD.RSTICK_UP)}}}}function fakeTouchEvent(is_down){var touch_id="faketouch"
var touch_data=touches[touch_id]
if(touch_data&&!is_down){setMouseToMid()
v2copy(touch_data.cur_pos,mouse_pos)
registerMouseUpEdge(touch_data,engine.hrtime)
touch_data.state=UP
touch_data.down_time+=max(engine.hrtime-touch_data.origin_time,MIN_EVENT_TIME_DELTA)}else if(!touch_data&&is_down){setMouseToMid()
touches[touch_id]=new TouchData(mouse_pos,false,0,null)}}function tickInput(){if(movement_questionable_frames)--movement_questionable_frames
var hrtime=engine.hrtime
for(var code in key_state_new){var ks=key_state_new[code]
if(ks.state===DOWN){ks.down_time+=max(hrtime-ks.origin_time,MIN_EVENT_TIME_DELTA)
ks.origin_time=hrtime}}for(var touch_id in touches){var touch_data=touches[touch_id]
if(touch_data.state===DOWN){touch_data.down_time+=max(hrtime-touch_data.origin_time,MIN_EVENT_TIME_DELTA)
touch_data.origin_time=hrtime}}mouse_over_captured=false
gamepadUpdate()
in_event.topOfFrame()
ctrl_checked=false
if(touches[pointerlock_touch_id]&&!pointerLocked())pointerLockExit()
no_active_touches=empty(touches)}function endFrameTickMap(map){Object.keys(map).forEach(function(keycode){switch(map[keycode]){case DOWN_EDGE:map[keycode]=DOWN
break
case UP_EDGE:delete map[keycode]}})}function endFrame(skip_mouse){for(var code in key_state_new){var ks=key_state_new[code]
if(ks.state===UP){key_state_new[code]=null
delete key_state_new[code]}else{ks.up_edge=0
ks.down_edge=0
ks.down_time=0}}pad_states.forEach(endFrameTickMap)
if(!skip_mouse){for(var touch_id in touches){var touch_data=touches[touch_id]
if(touch_data.state===UP){touches[touch_id]=null
delete touches[touch_id]}else{touch_data.delta[0]=touch_data.delta[1]=0
touch_data.dispatched=false
touch_data.dispatched_drag=false
touch_data.dispatched_drag_over=false
if(touch_data.drag_payload_frame===engine.frame_index-2)touch_data.drag_payload=null
touch_data.up_edge=0
touch_data.down_edge=0
touch_data.down_time=0}}wheel_events.length=0
mouse_button_had_up_edge=mouse_button_had_edge=mouse_moved=input_eaten_mouse=false}input_eaten_kb=false}function tickInputInactive(){in_event.topOfFrame()
ctrl_checked=false
endFrame()}function eatAllInput(skip_mouse){endFrame(skip_mouse)
if(!skip_mouse)input_eaten_mouse=mouse_over_captured=true
input_eaten_kb=true}function eatAllKeyboardInput(){eatAllInput(true)}function mousePos(dst){dst=dst||vec2()
camera2d.domToVirtual(dst,mouse_pos)
return dst}function mouseDomPos(){return mouse_pos}function mouseMoved(){return mouse_moved}function mouseButtonHadEdge(){return mouse_button_had_edge}function mouseButtonHadUpEdge(){return mouse_button_had_up_edge}var full_screen_pos_param={}
function mousePosParamUnique(param){var pos_param=(param=param||full_screen_pos_param).mouse_pos_param
if(!pos_param)pos_param=param.mouse_pos_param={}
pos_param.x=void 0===param.x?camera2d.x0Real():param.x
pos_param.y=void 0===param.y?camera2d.y0Real():param.y
pos_param.w=void 0===param.w?camera2d.wReal():param.w
pos_param.h=void 0===param.h?camera2d.hReal():param.h
pos_param.button=void 0===param.button?ANY:param.button
return pos_param}var pos_param_temp={}
function mousePosParam(param){pos_param_temp.x=void 0===(param=param||{}).x?camera2d.x0Real():param.x
pos_param_temp.y=void 0===param.y?camera2d.y0Real():param.y
pos_param_temp.w=void 0===param.w?camera2d.wReal():param.w
pos_param_temp.h=void 0===param.h?camera2d.hReal():param.h
pos_param_temp.button=void 0===param.button?ANY:param.button
return pos_param_temp}var check_pos=vec2()
function checkPos(pos,param){if(!camera2d.domToVirtual(check_pos,pos))return false
return check_pos[0]>=param.x&&(Infinity===param.w||check_pos[0]<param.x+param.w)&&check_pos[1]>=param.y&&(Infinity===param.h||check_pos[1]<param.y+param.h)}function wasDoubleClick(pos_param){if(engine.hrtime-last_up_edges[0].timestamp>settings.double_click_time)return false
return checkPos(last_up_edges[0].pos,pos_param)}function mouseWheel(param){if(input_eaten_mouse||!wheel_events.length)return 0
var pos_param=mousePosParam(param=param||{})
var ret=0
for(var ii=0;ii<wheel_events.length;++ii){var data=wheel_events[ii]
if(data.dispatched)continue
if(checkPos(data.pos,pos_param)){ret+=data.delta
data.dispatched=true}}return ret}function mouseOverCaptured(){mouse_over_captured=true}function mouseOver(param){profilerStart("mouseOver")
var pos_param=mousePosParamUnique(param=param||{})
spotMouseoverHook(pos_param,param)
if(mouse_over_captured||pointerLocked()&&!param.allow_pointerlock){profilerStop("mouseOver")
return false}if(!param.peek&&!param.peek_touch)for(var id in touches){var touch=touches[id]
if(checkPos(touch.cur_pos,pos_param)){if(touch.down_edge)touch.down_edge=0
if(touch.up_edge)touch.up_edge=0
if(!param||!param.drag_target)touch.dispatched=true}}var ret=false
if(checkPos(mouse_pos,pos_param)){if(!param.peek&&!param.peek_over)mouse_over_captured=true
ret=true}profilerStop("mouseOver")
return ret}function mouseDownAnywhere(button){if(input_eaten_mouse)return false
if(void 0===button)button=ANY
for(var touch_id in touches){var touch_data=touches[touch_id]
if(touch_data.state!==DOWN||!(button===ANY||button===touch_data.button))continue
return true}return false}function mouseDownMidClick(param){if(input_eaten_mouse||no_active_touches)return false
var pos_param=mousePosParam(param=param||{})
var button=pos_param.button
var max_click_dist=param.max_dist||50
for(var touch_id in touches){var touch_data=touches[touch_id]
if(touch_data.state!==DOWN||!(button===ANY||button===touch_data.button)||touch_data.total>max_click_dist)continue
if(checkPos(touch_data.cur_pos,pos_param))return true}return false}function mouseDownOverBounds(param){if(input_eaten_mouse||no_active_touches)return false
var pos_param=mousePosParam(param=param||{})
var button=pos_param.button
for(var touch_id in touches){var touch_data=touches[touch_id]
if(touch_data.state!==DOWN||!(button===ANY||button===touch_data.button))continue
if(checkPos(touch_data.cur_pos,pos_param))return true}return false}function mousePosIsTouch(){return mouse_pos_is_touch}function numTouches(){return Object.keys(touches).length}function keyDown(keycode){if(keycode===KEYS.CTRL)ctrl_checked=true
if(input_eaten_kb)return 0
var ks=key_state_new[keycode]
if(!ks)return 0
if(ks.state===DOWN)assert(ks.down_time)
return ks.down_time}function keyDownEdge(keycode,opts){if(input_eaten_kb)return 0
if(opts&&opts.in_event_cb)in_event.on("keydown",keycode,opts.in_event_cb)
var ks=key_state_new[keycode]
if(!ks)return 0
var r=ks.down_edge
ks.down_edge=0
return r}function keyUpEdge(keycode,opts){if(input_eaten_kb)return 0
if(opts&&opts.in_event_cb)in_event.on("keyup",keycode,opts.in_event_cb)
var ks=key_state_new[keycode]
if(!ks)return 0
var r=ks.up_edge
ks.up_edge=0
return r}function padGetAxes(out,stickindex,padindex){assert(stickindex>=0&&stickindex<NUM_STICKS)
if(void 0===padindex){var sub=vec2()
v2set(out,0,0)
for(var ii=0;ii<gamepad_data.length;++ii){padGetAxes(sub,stickindex,ii)
v2add(out,out,sub)}return}var sticks=getGamepadData(padindex).sticks
v2copy(out,sticks[stickindex])}function padButtonDownInternal(gpd,ps,padcode){if(ps[padcode])return engine.frame_dt
return 0}function padButtonDownEdgeInternal(gpd,ps,padcode){if(ps[padcode]===DOWN_EDGE){ps[padcode]=DOWN
return 1}return 0}function padButtonUpEdgeInternal(gpd,ps,padcode){if(ps[padcode]===UP_EDGE){delete ps[padcode]
return 1}return 0}function padButtonShared(fn,padcode,padindex){assert(void 0!==padcode)
var r=0
if(void 0===padindex){for(var ii=0;ii<pad_states.length;++ii)r+=padButtonShared(fn,padcode,ii)
return r}if(input_eaten_mouse)return 0
var gpd=gamepad_data[padindex]
if(!gpd)return 0
var ps=pad_states[padindex]
var am=ANALOG_MAP[padcode]
if(am)for(var _ii2=0;_ii2<am.length;++_ii2)r+=fn(gpd,ps,am[_ii2])||0
return r+=fn(gpd,ps,padcode)}function padButtonDown(padcode,padindex){return padButtonShared(padButtonDownInternal,padcode,padindex)}function padButtonDownEdge(padcode,padindex){return padButtonShared(padButtonDownEdgeInternal,padcode,padindex)}function padButtonUpEdge(padcode,padindex){return padButtonShared(padButtonUpEdgeInternal,padcode,padindex)}var start_pos=vec2()
var cur_pos=vec2()
var delta=vec2()
function mouseUpEdge(param){param=param||{}
if(input_eaten_mouse||!param.in_event_cb&&no_active_touches)return null
var pos_param=mousePosParam(param)
var button=pos_param.button
var max_click_dist=param.max_dist||50
var click_invalid=false
for(var touch_id in touches){var touch_data=touches[touch_id]
if(touch_data.total>max_click_dist){click_invalid=true
continue}if(touch_data.long_press_dispatched){click_invalid=true
continue}if(!touch_data.up_edge)continue
if(!(button===ANY||button===touch_data.button))continue
if(checkPos(touch_data.cur_pos,pos_param)){if(!param.peek)touch_data.up_edge=0
return{button:touch_data.button,pos:check_pos.slice(0),start_time:touch_data.start_time,was_double_click:wasDoubleClick(pos_param)}}}if(param.in_event_cb&&!mouse_over_captured&&!click_invalid){if(!param.phys)param.phys={}
param.phys.button="number"===typeof param.in_event_button?param.in_event_button:button
camera2d.virtualToDomPosParam(param.phys,pos_param)
in_event.on("mouseup",param.phys,param.in_event_cb)}return null}function mouseDownEdge(param){param=param||{}
if(input_eaten_mouse||!param.in_event_cb&&no_active_touches)return null
var pos_param=mousePosParam(param)
var button=pos_param.button
for(var touch_id in touches){var touch_data=touches[touch_id]
if(!touch_data.down_edge||!(button===ANY||button===touch_data.button))continue
if(checkPos(touch_data.cur_pos,pos_param)){if(!param.peek)touch_data.down_edge=0
return{button:touch_data.button,pos:check_pos.slice(0),start_time:touch_data.start_time}}}if(param.in_event_cb&&!mouse_over_captured){if(!param.phys)param.phys={}
param.phys.button=button
camera2d.virtualToDomPosParam(param.phys,pos_param)
in_event.on("mousedown",param.phys,param.in_event_cb)}return null}function mouseConsumeClicks(param){if(no_active_touches)return
var pos_param=mousePosParam(param=param||{})
var button=pos_param.button
for(var touch_id in touches){var touch_data=touches[touch_id]
if(!(button===ANY||button===touch_data.button)||touch_data.dispatched_drag)continue
if(checkPos(touch_data.start_pos,pos_param)){touch_data.down_edge=0
touch_data.start_pos[0]=touch_data.start_pos[1]=Infinity
touch_data.total=Infinity}}}function drag(param){if(input_eaten_mouse||no_active_touches)return null
var bounds_is_finite=void 0!==(param=param||{}).w&&isFinite(param.w)
var pos_param=mousePosParam(param)
var button=pos_param.button
var min_dist=param.min_dist||0
for(var touch_id in touches){var touch_data=touches[touch_id]
if(!(button===ANY||button===touch_data.button)||touch_data.dispatched_drag||touch_id===param.not_touch_id)continue
if(checkPos(touch_data.start_pos,pos_param)){if(pointerLocked()&&bounds_is_finite)continue
camera2d.domDeltaToVirtual(delta,[touch_data.total/2,touch_data.total/2])
var total=delta[0]+delta[1]
if(total<min_dist)continue
if(!param.peek)touch_data.dispatched_drag=true
var is_down_edge=touch_data.down_edge
if(param.eat_clicks)touch_data.down_edge=touch_data.up_edge=0
if(param.payload){touch_data.drag_payload=param.payload
touch_data.drag_payload_frame=engine.frame_index}camera2d.domToVirtual(start_pos,touch_data.start_pos)
camera2d.domToVirtual(cur_pos,touch_data.cur_pos)
camera2d.domDeltaToVirtual(delta,touch_data.delta)
return{cur_pos:cur_pos,start_pos:start_pos,delta:delta,total:total,button:touch_data.button,touch:touch_data.touch,start_time:touch_data.start_time,is_down_edge:is_down_edge,down_time:touch_data.down_time,touch_id:touch_id,dropped:touch_data.up_edge}}}return null}function longPress(param){if(input_eaten_mouse||no_active_touches)return null
var pos_param=mousePosParam(param=param||{})
var button=pos_param.button
var max_dist=param.long_press_max_dist||50
var min_time=param.min_time||500
for(var touch_id in touches){var touch_data=touches[touch_id]
if(!(button===ANY||button===touch_data.button)||touch_data.long_press_dispatched)continue
if(checkPos(touch_data.start_pos,pos_param)){camera2d.domDeltaToVirtual(delta,[touch_data.total/2,touch_data.total/2])
var total=delta[0]+delta[1]
if(total>max_dist)continue
if(Date.now()-touch_data.start_time<min_time)continue
if(!param.peek)touch_data.long_press_dispatched=true
var is_down_edge=touch_data.down_edge
if(param.eat_clicks)touch_data.down_edge=touch_data.up_edge=0
camera2d.domToVirtual(start_pos,touch_data.start_pos)
camera2d.domToVirtual(cur_pos,touch_data.cur_pos)
camera2d.domDeltaToVirtual(delta,touch_data.delta)
return{long_press:true,cur_pos:cur_pos,start_pos:start_pos,delta:delta,total:total,button:touch_data.button,touch:touch_data.touch,start_time:touch_data.start_time,is_down_edge:is_down_edge,down_time:touch_data.down_time}}}return null}function dragDrop(param){if(input_eaten_mouse||no_active_touches)return null
var pos_param=mousePosParam(param=param||{})
var button=pos_param.button
for(var touch_id in touches){var touch_data=touches[touch_id]
if(!(button===ANY||button===touch_data.button)||touch_data.dispatched||!touch_data.drag_payload)continue
if(!touch_data.up_edge)continue
if(checkPos(touch_data.cur_pos,pos_param)){if(!param.peek){touch_data.dispatched_drag_over=true
touch_data.dispatched_drag=true
touch_data.dispatched=true}return{drag_payload:touch_data.drag_payload}}}return null}function dragOver(param){if(input_eaten_mouse||no_active_touches)return null
var pos_param=mousePosParam(param=param||{})
var button=pos_param.button
for(var touch_id in touches){var touch_data=touches[touch_id]
if(!(button===ANY||button===touch_data.button)||touch_data.dispatched_drag_over||!touch_data.drag_payload)continue
if(touch_data.state!==DOWN)continue
if(checkPos(touch_data.cur_pos,pos_param)){if(!param.peek)touch_data.dispatched_drag_over=true
camera2d.domToVirtual(cur_pos,touch_data.cur_pos)
return{cur_pos:cur_pos,drag_payload:touch_data.drag_payload}}}return null}

},{"../common/util.js":96,"../common/vmath.js":98,"./browser.js":13,"./camera2d.js":15,"./cmds.js":17,"./engine.js":21,"./in_event.js":36,"./input_constants":38,"./local_storage.js":40,"./normalize_mousewheel.js":49,"./pointer_lock.js":53,"./settings.js":59,"./sound.js":65,"./spot.js":66,"assert":undefined}],38:[function(require,module,exports){
"use strict"
exports.POINTERLOCK=exports.BUTTON_RIGHT=exports.BUTTON_POINTERLOCK=exports.BUTTON_MIDDLE=exports.BUTTON_LEFT=exports.BUTTON_ANY=exports.ANY=void 0
var BUTTON_LEFT=0
exports.BUTTON_LEFT=BUTTON_LEFT
var BUTTON_MIDDLE=1
exports.BUTTON_MIDDLE=BUTTON_MIDDLE
var BUTTON_RIGHT=2
exports.BUTTON_RIGHT=BUTTON_RIGHT
var BUTTON_ANY=-2
exports.BUTTON_ANY=BUTTON_ANY
var BUTTON_POINTERLOCK=-1
exports.BUTTON_POINTERLOCK=BUTTON_POINTERLOCK
var ANY=BUTTON_ANY
exports.ANY=ANY
var POINTERLOCK=BUTTON_POINTERLOCK
exports.POINTERLOCK=POINTERLOCK

},{}],39:[function(require,module,exports){
"use strict"
exports.link=link
exports.linkGetDefaultStyle=linkGetDefaultStyle
exports.linkObscureRect=linkObscureRect
exports.linkSetDefaultStyle=linkSetDefaultStyle
exports.linkText=linkText
exports.linkTick=linkTick
var assert=require("assert")
var verify=require("../common/verify")
var engine=require("./engine.js")
var _require=require("./font.js"),fontStyle=_require.fontStyle
var camera2d=require("./camera2d.js")
var in_event=require("./in_event.js")
var input=require("./input.js")
var abs=Math.abs
var _require2=require("./ui.js"),playUISound=_require2.playUISound,uiGetDOMElem=_require2.uiGetDOMElem
var ui=require("./ui.js")
var _require3=require("./uistyle.js"),uiStyleCurrent=_require3.uiStyleCurrent
var settings=require("./settings.js")
var _require4=require("./spot.js"),SPOT_DEFAULT_BUTTON=_require4.SPOT_DEFAULT_BUTTON,spot=_require4.spot,spotFocusSteal=_require4.spotFocusSteal,spotKey=_require4.spotKey
var max=Math.max,min=Math.min
var style_link_default=fontStyle(null,{color:1346437119,outline_width:1,outline_color:32})
var style_link_hover_default=fontStyle(null,{color:65535,outline_width:1,outline_color:32})
function linkGetDefaultStyle(){return style_link_default}function linkSetDefaultStyle(style_link,style_link_hover){style_link_default=style_link
style_link_hover_default=style_link_hover}var link_blocks=[]
function linkObscureRect(box){if(!box.dom_pos)box.dom_pos={}
camera2d.virtualToDomPosParam(box.dom_pos,box)
link_blocks.push(box.dom_pos)}var STRICT_CHECKING=true
function overlaps(x0,x1,x,w){if(STRICT_CHECKING)return x<x1&&x+w>x0
else return x<=x0&&x+w>=x1}function linkClipRect(rect){if(!rect.dom_pos)rect.dom_pos={}
camera2d.virtualToDomPosParam(rect.dom_pos,rect)
var dom_pos=rect.dom_pos
var ox0=dom_pos.x
var ox1=ox0+dom_pos.w
var oy0=dom_pos.y
var oy1=oy0+dom_pos.h
var x0=ox0
var x1=ox1
var y0=oy0
var y1=oy1
for(var ii=0;ii<link_blocks.length;++ii){var check=link_blocks[ii]
if(overlaps(x0,x1,check.x,check.w)){if(check.y<=y0)y0=max(y0,check.y+check.h)
if(check.y+check.h>=y1)y1=min(y1,check.y)}if(overlaps(y0,y1,check.y,check.h)){if(check.x<=x0)x0=max(x0,check.x+check.w)
if(check.x+check.w>=x1)x1=min(x1,check.x)}}if(x1<=x0||y1<=y0)return false
if(x0!==ox0||x1!==ox1){var ow=dom_pos.w
var offs=(x0-ox0)/ow
var wscale=(x1-x0)/ow
rect.x+=offs*rect.w
rect.w*=wscale}if(y0!==oy0||y1!==oy1){var oh=dom_pos.h
var _offs=(y0-oy0)/oh
var hscale=(y1-y0)/oh
rect.y+=_offs*rect.h
rect.h*=hscale}return true}var state_cache={}
var good_url=/https?:\/\//
function preventFocus(evt){evt.preventDefault()
if(evt.relatedTarget)evt.relatedTarget.focus()
else evt.currentTarget.blur()}function link(param){var x=param.x,y=param.y,w=param.w,h=param.h,url=param.url,internal=param.internal,allow_modal=param.allow_modal
if(!url.match(good_url))url=document.location.protocol+"//"+url
var key=spotKey(param)
var state=state_cache[key]
if(!state)state=state_cache[key]={clicked:false}
verify(state.frame!==engine.frame_index)
state.frame=engine.frame_index
var rect={x:x,y:y,w:w,h:h}
if(camera2d.clipTestRect(rect)&&linkClipRect(rect)&&!(settings.shader_debug||settings.show_profiler)){var elem=uiGetDOMElem(state.elem,allow_modal)
if(elem!==state.elem)if(state.elem=elem){elem.textContent=""
var a_elem=document.createElement("a")
a_elem.setAttribute("draggable",false)
a_elem.textContent=" "
a_elem.className="glovui_link noglov"
a_elem.setAttribute("target","_blank")
a_elem.setAttribute("href",url)
a_elem.setAttribute("tabindex","-1")
a_elem.addEventListener("focus",preventFocus)
state.url=url
if(internal){var down_x
var down_y
input.handleTouches(a_elem)
a_elem.onmousedown=function(ev){down_x=ev.pageX
down_y=ev.pageY}
a_elem.onclick=function(ev){ev.preventDefault()
if(down_x)if(abs(ev.pageX-down_x)+abs(ev.pageY-down_y)>50)return
state.clicked=true
in_event.handle("mouseup",ev)}}elem.appendChild(a_elem)
state.a_elem=a_elem}if(elem){if(url!==state.url){state.a_elem.setAttribute("href",url)
state.url=url}var pos=camera2d.htmlPos(rect.x,rect.y)
elem.style.left=pos[0]+"%"
elem.style.top=pos[1]+"%"
var size=camera2d.htmlSize(rect.w,rect.h)
elem.style.width=size[0]+"%"
elem.style.height=size[1]+"%"}}var clicked=state.clicked
state.clicked=false
return clicked}function linkText(param){var style_link=param.style_link,style_link_hover=param.style_link_hover,x=param.x,y=param.y,z=param.z,style=param.style,font_size=param.font_size,text=param.text,url=param.url,internal=param.internal
text=text||url
z=z||Z.UI
style=style||uiStyleCurrent()
font_size=font_size||style.text_height
var w=ui.font.getStringWidth(style_link||style_link_default,font_size,text)
var h=font_size
param.w=w
param.h=h
param.def=SPOT_DEFAULT_BUTTON
delete param.url
var spot_ret=spot(param)
param.url=url
var style_use=spot_ret.focused?style_link_hover||style_link_hover_default:style_link||style_link_default
ui.font.drawSized(style_use,x,y,z,font_size,text)
var underline_w=1
ui.drawLine(x,y+h-underline_w,x+w,y+h-underline_w,z-.5,underline_w,1,style_use.color_vec4)
var clicked=link(param)
if(clicked){var sound_button=void 0===param.sound_button?param.def.sound_button:param.sound_button
if(sound_button)playUISound(sound_button)
spotFocusSteal(param)}if(spot_ret.ret&&!internal){var key=spotKey(param)
var state=state_cache[key]
assert(state)
assert(state.a_elem)
state.a_elem.click()}return clicked||spot_ret.ret}function linkTick(){for(var key in state_cache)if(state_cache[key].frame!==engine.frame_index-1)delete state_cache[key]
link_blocks.length=0}

},{"../common/verify":97,"./camera2d.js":15,"./engine.js":21,"./font.js":28,"./in_event.js":36,"./input.js":37,"./settings.js":59,"./spot.js":66,"./ui.js":72,"./uistyle.js":73,"assert":undefined}],40:[function(require,module,exports){
"use strict"
exports.getStoragePrefix=getStoragePrefix
exports.localStorageClearAll=localStorageClearAll
exports.localStorageExportAll=localStorageExportAll
exports.localStorageGet=localStorageGet
exports.localStorageGetJSON=localStorageGetJSON
exports.localStorageImportAll=localStorageImportAll
exports.localStorageSet=localStorageSet
exports.localStorageSetJSON=localStorageSetJSON
exports.setStoragePrefix=setStoragePrefix
var assert=require("assert")
var storage_prefix="demo"
var is_set=false
function setStoragePrefix(prefix){if(is_set)return
is_set=true
storage_prefix=prefix}function getStoragePrefix(){assert(is_set)
return storage_prefix}var lsd=function(){try{localStorage.setItem("test","test")
localStorage.removeItem("test")
return localStorage}catch(e){return null}}()
var lsd_overlay={}
function localStorageGet(key){assert(is_set)
var ret=lsd_overlay[key=storage_prefix+"_"+key]||lsd&&lsd.getItem(key)
if("undefined"===ret)ret=void 0
else if(null===ret)ret=void 0
return ret}function localStorageSet(key,value){assert(is_set)
key=storage_prefix+"_"+key
if(void 0===value||null===value){if(lsd)lsd.removeItem(key)
delete lsd_overlay[key]}else{var str=String(value)
lsd_overlay[key]=str
try{if(lsd)lsd.setItem(key,str)}catch(e){}}}function localStorageSetJSON(key,value){localStorageSet(key,JSON.stringify(value))}function localStorageGetJSON(key,def){var value=localStorageGet(key)
if(void 0===value)return def
try{return JSON.parse(value)}catch(e){}return def}function localStorageClearAll(key_prefix){var prefix=new RegExp("^"+storage_prefix+"_"+(key_prefix||""),"u")
if(lsd){var keys_to_remove=[]
for(var i=0;i<lsd.length;i++){var _key=lsd.key(i)
assert(_key)
if(_key.match(prefix))keys_to_remove.push(_key)}for(var _i=0;_i<keys_to_remove.length;_i++)lsd.removeItem(keys_to_remove[_i])}for(var _key2 in lsd_overlay)if(_key2.match(prefix))delete lsd_overlay[_key2]}function localStorageExportAll(filter_prefix){var obj={}
var prefix=new RegExp("^"+storage_prefix+"_("+(filter_prefix||"")+".*)")
if(lsd)for(var i=0;i<lsd.length;i++){var _key3=lsd.key(i)
assert(_key3)
var m=_key3.match(prefix)
if(m){var v=lsd.getItem(_key3)
if(v&&"undefined"!==v)obj[m[1]]=v}}for(var _key4 in lsd_overlay){var _m=_key4.match(prefix)
if(_m)obj[_m[1]]=lsd_overlay[_key4]}return obj}function localStorageImportAll(serialized){localStorageClearAll()
for(var _key5 in serialized)localStorageSet(_key5,serialized[_key5])}exports.get=localStorageGet
exports.set=localStorageSet
exports.setJSON=localStorageSetJSON
exports.getJSON=localStorageGetJSON
exports.clearAll=localStorageClearAll

},{"assert":undefined}],41:[function(require,module,exports){
"use strict"
exports.getStringFromLocalizable=getStringFromLocalizable
exports.getStringIfLocalizable=getStringIfLocalizable
function getStringFromLocalizable(s){return s&&s.toLocalString?s.toLocalString():s}function getStringIfLocalizable(s){return s&&s.toLocalString?s.toLocalString():s}

},{}],42:[function(require,module,exports){
"use strict"
exports.locateAsset=locateAsset
exports.locateAssetAddHostMapping=locateAssetAddHostMapping
exports.locateAssetDisableHashing=locateAssetDisableHashing
exports.locateAssetSetProxyPath=locateAssetSetProxyPath
exports.unlocatePaths=unlocatePaths
var asset_mappings="undefined"===typeof window?{}:window.glov_asset_mappings
var asset_dir=asset_mappings&&asset_mappings.asset_dir||""
var lsd=function(){if("undefined"===typeof window)return{}
try{localStorage.setItem("test","test")
localStorage.removeItem("test")
return localStorage}catch(e){return{}}}()
var DISABLED_KEY="asset_hashing_disabled_until"
if(Number(lsd[DISABLED_KEY])>Date.now()){console.log("Disabling asset mappings due to auto-reload.")
asset_mappings={}}var proxy_path=""
function locateAssetSetProxyPath(proxy_path_in){proxy_path=proxy_path_in}var host_mappings=[]
function locateAssetAddHostMapping(src,dest){host_mappings.push([src,dest])}function locateAsset(name){if(!asset_mappings)return name
var m=asset_mappings[name]
if(!m){if(name.includes("://"))for(var ii=0;ii<host_mappings.length;++ii){var pair=host_mappings[ii]
if(name.startsWith(pair[0]))name=pair[1]+name.slice(pair[0].length)}else if(proxy_path)return""+proxy_path+name
return name}var ret=asset_dir+"/"+m
var idx=name.lastIndexOf(".")
if(-1!==idx)ret+=name.slice(idx)
if(proxy_path)ret=""+proxy_path+ret
return ret}function locateAssetDisableHashing(){asset_mappings={}
lsd[DISABLED_KEY]=String(Date.now()+5e3)}function unlocatePaths(s){var reverse_lookup=Object.create(null)
for(var key in asset_mappings)reverse_lookup[asset_mappings[key]]=key
return String(s).replace(new RegExp(asset_dir+"/([a-zA-Z0-9]+)\\.\\w+","g"),function(match,hash){return reverse_lookup[hash]||match})}

},{}],43:[function(require,module,exports){
"use strict"
exports.markdownAuto=markdownAuto
exports.markdownDims=markdownDims
exports.markdownDraw=markdownDraw
exports.markdownIsAllWhitespace=markdownIsAllWhitespace
exports.markdownLabel=markdownLabel
exports.markdownLayoutInvalidate=markdownLayoutInvalidate
exports.markdownPrep=markdownPrep
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var assert=require("assert")
var _glovCommonUtil=require("../common/util")
var has=_glovCommonUtil.has
var verify=require("../common/verify")
var _glovCommonVmath=require("../common/vmath")
var unit_vec=_glovCommonVmath.unit_vec
var vec4=_glovCommonVmath.vec4
var _engine=require("./engine")
var engine=_engine
var _font=require("./font")
var ALIGN=_font.ALIGN
var EPSILON=_font.EPSILON
var fontStyleAlpha=_font.fontStyleAlpha
var fontStyleBold=_font.fontStyleBold
var fontStyleHash=_font.fontStyleHash
var _input=require("./input")
var mousePos=_input.mousePos
var _localization=require("./localization")
var getStringFromLocalizable=_localization.getStringFromLocalizable
var _markdown_parse=require("./markdown_parse")
var mdParse=_markdown_parse.mdParse
var mdParseSetValidRenderables=_markdown_parse.mdParseSetValidRenderables
var _markdown_renderables=require("./markdown_renderables")
var markdownLayoutFit=_markdown_renderables.markdownLayoutFit
var markdown_default_font_styles=_markdown_renderables.markdown_default_font_styles
var markdown_default_renderables=_markdown_renderables.markdown_default_renderables
var _spot=require("./spot")
var SPOT_DEFAULT_LABEL=_spot.SPOT_DEFAULT_LABEL
var spot=_spot.spot
var spotPadMode=_spot.spotPadMode
var _sprites=require("./sprites")
var spriteClipPause=_sprites.spriteClipPause
var spriteClipResume=_sprites.spriteClipResume
var spriteClipped=_sprites.spriteClipped
var spriteClippedViewport=_sprites.spriteClippedViewport
var _ui=require("./ui")
var drawElipse=_ui.drawElipse
var drawRect2=_ui.drawRect2
var getUIElemData=_ui.getUIElemData
var uiFontStyleNormal=_ui.uiFontStyleNormal
var uiGetFont=_ui.uiGetFont
var uiTextHeight=_ui.uiTextHeight
var ceil=Math.ceil,floor=Math.floor,max=Math.max,min=Math.min,round=Math.round
function markdownLayoutInvalidate(param){if(param.cache){var state=param
if(state.cache.layout)delete state.cache.layout}}var MDBlockParagraph=function(){function MDBlockParagraph(content,param){this.content=void 0
this.content=mdASTToBlock(content,param)}MDBlockParagraph.prototype.layout=function layout(param){var ret=[]
for(var ii=0;ii<this.content.length;++ii)ret.push(this.content[ii].layout(param))
if(param.align&ALIGN.HWRAP){if(param.cursor.x!==param.cursor.line_x0){param.cursor.line_x0=param.cursor.x=param.indent
param.cursor.y+=param.line_height}param.cursor.y+=ceil(.5*param.line_height)}else param.cursor.x+=ceil(.25*param.text_height)
return Array.prototype.concat.apply([],ret)}
return MDBlockParagraph}()
function createParagraph(content,param){return new MDBlockParagraph(content,param)}var MDBlockBold=function(){function MDBlockBold(content,param){this.content=void 0
this.content=mdASTToBlock(content,param)}MDBlockBold.prototype.layout=function layout(param){var old_style=param.font_style
var key=param.font_style_idx+".bold"
var font_styles=param.font_styles
var bold_style=font_styles[key]
if(!bold_style){var base_style=font_styles[param.font_style_idx]||markdown_default_font_styles[param.font_style_idx]||font_styles.def
bold_style=font_styles[key]=fontStyleBold(base_style,.5)}param.font_style=bold_style
var ret=[]
for(var ii=0;ii<this.content.length;++ii)ret.push(this.content[ii].layout(param))
param.font_style=old_style
return Array.prototype.concat.apply([],ret)}
return MDBlockBold}()
function createBold(content,param){return new MDBlockBold(content,param)}var debug_color=vec4(0,0,0,.5)
var NO_HALIGN=ALIGN.VTOP|ALIGN.VCENTER|ALIGN.VBOTTOM|ALIGN.HFIT
var MDDrawBlockText=function(){function MDDrawBlockText(dims){this.alpha_font_style_cache=void 0
this.alpha_font_style_cache_value=void 0
this.dims=dims}MDDrawBlockText.prototype.draw=function draw(param){profilerStart("MDDrawBlockText::draw")
var lp=this.dims
var style=lp.font_style
if(1!==param.alpha){if(this.alpha_font_style_cache_value!==param.alpha){this.alpha_font_style_cache_value=param.alpha
this.alpha_font_style_cache=fontStyleAlpha(style,param.alpha)}style=this.alpha_font_style_cache}lp.font.drawSizedAligned(style,param.x+lp.x,param.y+lp.y,param.z,lp.h,lp.align&NO_HALIGN,lp.w,lp.h,lp.text)
profilerStop()}
return MDDrawBlockText}()
var MDBlockText=function(){function MDBlockText(content,param){this.content=content}MDBlockText.prototype.layout=function layout(param){var cursor=param.cursor,line_height=param.line_height,text_height=param.text_height
var ret=[]
var text=this.content
if(!(param.align&ALIGN.HWRAP))text=text.replace(/\n/g," ")
if(param.align&ALIGN.HWRAP){var line_x0=cursor.x
var inset=cursor.x
var w=param.w-inset
var indent=param.indent-inset
var yoffs=(line_height-text_height)/2
if(param.font.integral)yoffs=round(yoffs)
param.font.wrapLines(param.font_style,w,indent,text_height,text,param.align,function(x0,linenum,line,x1){if(linenum>0){cursor.y+=line_height
cursor.line_x0=param.indent
cursor.line_y1=cursor.y}var layout_param={font:param.font,font_style:param.font_style,x:line_x0+x0,y:cursor.y+yoffs,h:text_height,w:min(x1,w)-x0,align:param.align,text:line}
cursor.line_y1=max(cursor.line_y1,cursor.y+line_height)
ret.push(new MDDrawBlockText(layout_param))})
if(ret.length){var tail=ret[ret.length-1]
cursor.x=tail.dims.x+tail.dims.w}else cursor.x+=param.font.getStringWidth(param.font_style,text_height,text)}else{var str_w=param.font.getStringWidth(param.font_style,text_height,text)
var layout_param={x:-1,y:-1,font:param.font,font_style:param.font_style,h:text_height,w:str_w,align:param.align,text:text}
markdownLayoutFit(param,layout_param)
ret.push(new MDDrawBlockText(layout_param))}return ret}
return MDBlockText}()
function createText(content,param){return new MDBlockText(content,param)}function createRenderable(content,param){var custom=param.custom||{}
var renderables=param.renderables||markdown_default_renderables
var type=content.type
var data
if(has(custom,type)){var parameterized=custom[type]
type=parameterized.type
data=parameterized.data}assert(has(renderables,type))
var block=renderables[type](content,data)
if(block)return block
return createText(content.orig_text,param)}var block_factories={paragraph:createParagraph,text:createText,strong:createBold,em:createBold,renderable:createRenderable}
function mdASTToBlock(tree,param){var blocks=[]
var skip=0
for(var ii=0;ii<tree.length;++ii){if(skip){--skip
continue}var elem=tree[ii]
if("text"===elem.type){var next_elem=void 0
while((next_elem=tree[ii+skip+1])&&"text"===next_elem.type){elem.content+=next_elem.content;++skip}}var factory=block_factories[elem.type]
blocks.push(factory(elem.content,param))}return blocks}function markdownParse(param){var cache=param.cache
if(cache.parsed)return
profilerStart("markdownParse")
var valid_renderables=(param.renderables?param.renderables:markdown_default_renderables)||{}
if(param.custom){valid_renderables=_extends({},valid_renderables)
for(var key in param.custom)valid_renderables[key]=true}mdParseSetValidRenderables(valid_renderables)
var tree=mdParse(getStringFromLocalizable(param.text))
var blocks=cache.parsed=mdASTToBlock(tree,param)
cache.parsed=blocks
profilerStop("markdownParse")}function markdownIsAllWhitespace(param){var valid_renderables=(param.renderables?param.renderables:markdown_default_renderables)||{}
mdParseSetValidRenderables(valid_renderables)
function treeContainsNonWhitespace(tree){for(var ii=0;ii<tree.length;++ii){var node=tree[ii]
if("text"===node.type){if(node.content.trim())return true}else if("paragraph"===node.type||"em"===node.type||"strong"===node.type){if(treeContainsNonWhitespace(node.content))return true}else if("renderable"===node.type)return true
else verify.unreachable(node)}return false}return!treeContainsNonWhitespace(mdParse(getStringFromLocalizable(param.text)))}function cmpDimsY(a,b){var d=a.dims.y-b.dims.y
if(0!==d)return d
if(0!==(d=a.dims.x-b.dims.x))return d
return 0}function markdownLayout(param){var cache=param.cache
if(cache.layout)return
profilerStart("markdownLayout")
var font_style=param.font_style||uiFontStyleNormal()
var font_styles
if(param.font_styles)if(param.font_styles.def)font_styles=param.font_styles
else font_styles=_extends({def:font_style},param.font_styles)
else font_styles={def:font_style}
var text_height=param.text_height||uiTextHeight()
var line_height=param.line_height||text_height
var calc_param={w:param.w||0,h:param.h||0,text_height:text_height,line_height:line_height,indent:param.indent||0,align:param.align||0,font:param.font||uiGetFont(),font_style:font_style,font_styles:font_styles,font_style_idx:param.font_style_idx||"def",cursor:{line_x0:0,line_y1:0,x:0,y:0}}
var blocks=cache.parsed
assert(blocks)
var draw_blocks=[]
var maxx=0
var miny=Infinity
var maxy=0
for(var ii=0;ii<blocks.length;++ii){var arr=blocks[ii].layout(calc_param)
for(var jj=0;jj<arr.length;++jj){var block=arr[jj]
var _dims=block.dims
maxx=max(maxx,_dims.x+_dims.w)
maxy=max(maxy,_dims.y+_dims.h)
miny=min(miny,_dims.y)
draw_blocks.push(block)}}var bottom_pad=max(0,calc_param.cursor.line_y1-maxy)
if(calc_param.align&(ALIGN.HRIGHT|ALIGN.HCENTER)&&draw_blocks.length){var row_h_est=calc_param.line_height/2
var row_start_idx=0
var last_dims=draw_blocks[0].dims
for(var _ii=1;_ii<draw_blocks.length+1;++_ii){var is_last=_ii===draw_blocks.length
var do_wrap=is_last
if(!is_last){var _dims2=draw_blocks[_ii].dims
if(_dims2.y+_dims2.h/2>last_dims.y+last_dims.h/2+row_h_est&&_dims2.x<last_dims.x+last_dims.w/2)do_wrap=true}if(do_wrap){var xoffs=calc_param.w-(last_dims.x+last_dims.w)
if(calc_param.align&ALIGN.HCENTER){xoffs*=.5
if(calc_param.font.integral)xoffs=round(xoffs)}if(xoffs>0)for(var _jj=row_start_idx;_jj<_ii;++_jj)draw_blocks[_jj].dims.x+=xoffs
row_start_idx=_ii}if(!is_last)last_dims=draw_blocks[_ii].dims}}if(calc_param.align&ALIGN.HFIT&&maxx>calc_param.w+EPSILON){var xscale=calc_param.w/maxx
for(var _ii2=0;_ii2<draw_blocks.length;++_ii2){var _block2=draw_blocks[_ii2]
var x0=_block2.dims.x
var x1=x0+_block2.dims.w
_block2.dims.x=x0*xscale
_block2.dims.w=(x1-x0)*xscale}}if(draw_blocks.length&&calc_param.align&(ALIGN.VCENTER|ALIGN.VBOTTOM))if(verify(calc_param.h)){var yoffs=calc_param.h-maxy
if(calc_param.align&ALIGN.VCENTER){yoffs-=miny
yoffs*=.5
if(calc_param.font.integral)yoffs=round(yoffs)}for(var _ii3=0;_ii3<draw_blocks.length;++_ii3)draw_blocks[_ii3].dims.y+=yoffs}var max_block_h=maxy=maxx=0
for(var _ii4=0;_ii4<draw_blocks.length;++_ii4){var _block4=draw_blocks[_ii4]
maxx=max(maxx,_block4.dims.x+_block4.dims.w)
maxy=max(maxy,_block4.dims.y+_block4.dims.h)
max_block_h=max(max_block_h,_block4.dims.h)}maxy+=bottom_pad
draw_blocks.sort(cmpDimsY)
cache.layout={blocks:draw_blocks,dims:{w:maxx,h:maxy},max_block_h:max_block_h}
profilerStop("markdownLayout")}function markdownPrep(param){markdownParse(param)
markdownLayout(param)}function markdownDims(param){var layout=param.cache.layout
assert(layout)
return layout.dims}function bsearch(blocks,y){var start=0
var end=blocks.length-1
while(start<end){var mid=floor((start+end)/2)
if(blocks[mid].dims.y<=y)start=mid+1
else end=mid}return end}function markdownDraw(param){profilerStart("markdownDraw")
var layout=param.cache.layout
assert(layout)
var x=param.x,y=param.y,alpha=param.alpha
if(void 0===alpha)alpha=1
var draw_param={x:x,y:y,z:param.z||Z.UI,alpha:alpha}
var viewport=param.viewport
if(!viewport&&spriteClipped())viewport=spriteClippedViewport()
var blocks=layout.blocks,max_block_h=layout.max_block_h
var idx0=0
var idx1=blocks.length-1
if(viewport){idx0=bsearch(blocks,viewport.y-y-max_block_h)
idx1=bsearch(blocks,viewport.y+viewport.h-y)}var mouse_pos
if(engine.defines.MD)mouse_pos=mousePos()
for(var ii=idx0;ii<=idx1;++ii){var block=blocks[ii]
var _dims3=block.dims
if(!viewport||x+_dims3.x+_dims3.w>=viewport.x&&x+_dims3.x<viewport.x+viewport.w&&y+_dims3.y+_dims3.h>=viewport.y&&y+_dims3.y<viewport.y+viewport.h){block.draw(draw_param)
if(engine.defines.MD){var rect={x:draw_param.x+_dims3.x,y:draw_param.y+_dims3.y,z:Z.TOOLTIP,w:_dims3.w,h:_dims3.h,color:debug_color}
if(mouse_pos[0]>=rect.x&&mouse_pos[0]<=rect.x+rect.w&&mouse_pos[1]>=rect.y&&mouse_pos[1]<=rect.y+rect.h){var clip_pause=spriteClipped()
if(clip_pause)spriteClipPause()
drawRect2(rect)
if(clip_pause)spriteClipResume()}}}}profilerStop("markdownDraw")}function isAutoDrawParam(param){return!param.no_draw}function mdcAlloc(){return{}}function markdownAuto(param){profilerStart("markdownAuto")
var state=param
assert(!param.custom||state.cache)
var auto_cache=!state.cache
if(auto_cache){profilerStart("auto_cache")
var text=param.text=getStringFromLocalizable(param.text)
var cache_key=["mdc",param.w||0,param.h||0,param.text_height||uiTextHeight(),param.line_height||param.text_height||uiTextHeight(),param.indent||0,param.align||0,param.font_style?fontStyleHash(param.font_style):0].join(":")
state.cache=getUIElemData(cache_key,{key:text},mdcAlloc)
profilerStop()}var param2=param
markdownPrep(param2)
var dims=markdownDims(param2)
if(isAutoDrawParam(param2))markdownDraw(param2)
if(auto_cache)delete param.cache
profilerStop("markdownAuto")
return dims}function markdownLabel(param){var tooltip=param.tooltip
var dims=markdownAuto(param)
if(tooltip){var align=param.align,x=param.x,y=param.y,z=param.z,tooltip_above=param.tooltip_above,tooltip_right=param.tooltip_right
z=z||Z.UI
align=align||0
var w=param.w||dims.w
var h=param.h||dims.h
if(spot({x:x,y:y,w:w,h:h,tooltip:tooltip,tooltip_width:param.tooltip_width,tooltip_above:tooltip_above,tooltip_right:Boolean(tooltip_right||align&ALIGN.HRIGHT),tooltip_center:Boolean(align&ALIGN.HCENTER),def:SPOT_DEFAULT_LABEL}).focused&&spotPadMode())drawElipse(x-.25*w,y-.25*h,x+1.25*w,y+1.25*h,z-.001,.5,unit_vec)}return dims}

},{"../common/util":96,"../common/verify":97,"../common/vmath":98,"./engine":21,"./font":28,"./input":37,"./localization":41,"./markdown_parse":44,"./markdown_renderables":45,"./spot":66,"./sprites":68,"./ui":72,"assert":undefined}],44:[function(require,module,exports){
"use strict"
exports.mdEscape=mdEscape
exports.mdParse=mdParse
exports.mdParseSetValidRenderables=mdParseSetValidRenderables
var SimpleMarkdown=require("./simple-markdown")
var _glovCommonUtil=require("../common/util")
var has=_glovCommonUtil.has
var renderable_regex=/^\[([^\s\]=]+)(=?[^\s\]]*)( [^\]]+)?\](?!\()/
var renderable_param_regex=/ ([^=]+)(?:=(?:"([^"]+)"|(\S+)))?/g
var valid_renderables={}
function mdParseSetValidRenderables(set){valid_renderables=set}var renderable_rule={order:SimpleMarkdown.defaultRules.link.order-.5,match:function match(source){var capture=renderable_regex.exec(source)
if(capture){var type=capture[1]
if(capture[2].startsWith("="))capture[2]=capture[2].slice(1)
else if(!type.startsWith("/"))return null
if(has(valid_renderables,type))return capture}return null},parse:function parse(capture,_parse,state){var param
if(capture[3]){param={}
capture[3].replace(renderable_param_regex,function(ignored){for(var _len=arguments.length,matches=new Array(_len>1?_len-1:0),_key=1;_key<_len;_key++)matches[_key-1]=arguments[_key]
var key=matches[0],val_quoted=matches[1],val_basic=matches[2]
var v=void 0!==val_quoted?val_quoted:void 0!==val_basic?val_basic:true
if("string"===typeof v){var num=Number(v)
if(isFinite(num))v=num}param[key]=v
return""})}return{content:{type:capture[1],key:capture[2],param:param,orig_text:capture[0]}}}}
var rules={renderable:renderable_rule};["paragraph","escape","em","strong","text"].forEach(function(key){return rules[key]=SimpleMarkdown.defaultRules[key]})
var reBuiltParser=SimpleMarkdown.parserFor(rules)
function mdParse(source){return reBuiltParser(source+"\n\n",{inline:false})}function mdEscape(text){return text.replace(/([\\[*_])/g,"\\$1")}

},{"../common/util":96,"./simple-markdown":62}],45:[function(require,module,exports){
"use strict"
exports.markdownImageRegister=markdownImageRegister
exports.markdownImageRegisterSpriteSheet=markdownImageRegisterSpriteSheet
exports.markdownLayoutFit=markdownLayoutFit
exports.markdownRenderableAddDefault=markdownRenderableAddDefault
exports.markdownSetColorStyle=markdownSetColorStyle
exports.markdownSetColorStyles=markdownSetColorStyles
exports.markdown_default_renderables=exports.markdown_default_font_styles=void 0
var markdown_default_renderables={}
exports.markdown_default_renderables=markdown_default_renderables
var markdown_default_font_styles={}
exports.markdown_default_font_styles=markdown_default_font_styles
var assert=require("assert")
var verify=require("../common/verify")
var _glovCommonVmath=require("../common/vmath")
var unit_vec=_glovCommonVmath.unit_vec
var vec4=_glovCommonVmath.vec4
var _font=require("./font")
var ALIGN=_font.ALIGN
var EPSILON=_font.EPSILON
var fontStyleColored=_font.fontStyleColored
var _ui=require("./ui")
var ui_sprites=_ui.sprites
var floor=Math.floor,max=Math.max
function markdownRenderableAddDefault(key,renderable){markdown_default_renderables[key]=renderable}function markdownSetColorStyle(idx,style){markdown_default_font_styles[idx]=style}function markdownSetColorStyles(styles){for(var ii=0;ii<styles.length;++ii)markdown_default_font_styles[ii]=styles[ii]}var default_palette=[255,4280295679,553591039,539033599,4294967295]
markdownSetColorStyles(default_palette.map(function(c){return fontStyleColored(null,c)}))
function markdownLayoutFit(param,dims){var cursor=param.cursor,line_height=param.line_height
if(cursor.x+dims.w>param.w+EPSILON&&cursor.x!==cursor.line_x0&&param.align&ALIGN.HWRAP){cursor.x=cursor.line_x0=param.indent
cursor.y+=line_height
cursor.line_y1=cursor.y}if(cursor.x+dims.w>param.w+EPSILON&&param.align&ALIGN.HWRAP)dims.w=param.w-cursor.line_x0
dims.x=cursor.x
if(dims.h!==line_height){dims.y=cursor.y+(line_height-dims.h)/2
if(param.font.integral)dims.y=floor(dims.y)
cursor.line_y1=max(cursor.line_y1,cursor.y+line_height,dims.y+dims.h)}else{dims.y=cursor.y
cursor.line_y1=max(cursor.line_y1,cursor.y+line_height)}cursor.x+=dims.w
return true}var allowed_images=Object.create(null)
function markdownImageRegister(img_name,param){assert(param.sprite)
assert(!allowed_images[img_name]||param.override)
allowed_images[img_name]=param}function markdownImageRegisterSpriteSheet(spritesheet){var sprite=spritesheet.sprite
for(var key in spritesheet.tiles)markdownImageRegister(key,{sprite:sprite,frame:spritesheet.tiles[key]})}function getImageData(key){return allowed_images[key]||{sprite:ui_sprites.white}}var MDRImg=function(){function MDRImg(content){this.key=void 0
this.scale=void 0
this.aspect=void 0
this.dims=void 0
this.x=void 0
this.y=void 0
this.w=void 0
this.h=void 0
this.alpha_color_cache=void 0
this.alpha_color_cache_value=void 0
this.key=content.key
this.dims=this
var scale=content.param&&content.param.scale
this.scale=scale&&"number"===typeof scale?scale:1
var aspect=content.param&&content.param.aspect
this.aspect=aspect&&"number"===typeof aspect?aspect:0}var _proto=MDRImg.prototype
_proto.layout=function layout(param){var line_height=param.line_height
var h=this.h=line_height*this.scale
var img_data=getImageData(this.key)
var sprite=img_data.sprite,frame=img_data.frame
var aspect=1
if("number"===typeof frame&&sprite.uidata){if(sprite.uidata.aspect)aspect=sprite.uidata.aspect[frame]}else if(sprite.isLazyLoad()){verify(this.aspect)
aspect=this.aspect||1}else if(this.aspect)aspect=this.aspect
else{var tex=sprite.texs[0]
aspect=tex.width/tex.height
if(sprite.uvs)aspect*=(sprite.uvs[2]-sprite.uvs[0])/(sprite.uvs[3]-sprite.uvs[1])}this.w=h*aspect
markdownLayoutFit(param,this)
return[this]}
_proto.draw=function draw(param){profilerStart("MDRImg::draw")
var x=this.x+param.x
var y=this.y+param.y
var img_data=getImageData(this.key)
var color=img_data.color
if(1!==param.alpha){if(param.alpha!==this.alpha_color_cache_value){this.alpha_color_cache_value=param.alpha
color=color||unit_vec
this.alpha_color_cache=vec4(color[0],color[1],color[2],color[3]*param.alpha)}color=this.alpha_color_cache}img_data.sprite.draw({x:x,y:y,z:param.z,w:this.w,h:this.h,frame:img_data.frame,color:color})
profilerStop()}
return MDRImg}()
function createMDRImg(content){return new MDRImg(content)}markdownRenderableAddDefault("img",createMDRImg)
var MDRColorStart=function(){function MDRColorStart(content){this.key=void 0
this.key=content.key}MDRColorStart.prototype.layout=function layout(param){var font_styles=param.font_styles,font_style_idx=param.font_style_idx,font_style_stack=param.font_style_stack
if(!font_style_stack)font_style_stack=param.font_style_stack=[]
font_style_stack.push(font_style_idx)
if(font_style_idx===this.key);else{var new_style=font_styles[this.key]||markdown_default_font_styles[this.key]
if(new_style){param.font_style_idx=this.key
param.font_style=new_style}}return[]}
return MDRColorStart}()
markdownRenderableAddDefault("c",function(content){return new MDRColorStart(content)})
var MDRColorEnd=function(){function MDRColorEnd(){}MDRColorEnd.prototype.layout=function layout(param){var font_styles=param.font_styles,font_style_idx=param.font_style_idx,font_style_stack=param.font_style_stack
if(!font_style_stack||!font_style_stack.length);else{var key=font_style_stack.pop()
if(font_style_idx===key);else{var new_style=font_styles[key]||markdown_default_font_styles[key]
if(new_style){param.font_style_idx=key
param.font_style=new_style}}}return[]}
return MDRColorEnd}()
markdownRenderableAddDefault("/c",function(content){return new MDRColorEnd})

},{"../common/verify":97,"../common/vmath":98,"./font":28,"./ui":72,"assert":undefined}],46:[function(require,module,exports){
"use strict"
exports.m43identity=m43identity
exports.m43mul=m43mul
exports.mat43=mat43
function mat43(){var r=new Float32Array(12)
r[0]=r[4]=r[8]=1
return r}function m43identity(out){out[0]=1
out[1]=0
out[2]=0
out[3]=0
out[4]=1
out[5]=0
out[6]=0
out[7]=0
out[8]=1
out[9]=0
out[10]=0
out[11]=0}function m43mul(out,a,b){var a0=a[0]
var a1=a[1]
var a2=a[2]
var a3=a[3]
var a4=a[4]
var a5=a[5]
var a6=a[6]
var a7=a[7]
var a8=a[8]
var a9=a[9]
var a10=a[10]
var a11=a[11]
var b0=b[0]
var b1=b[1]
var b2=b[2]
var b3=b[3]
var b4=b[4]
var b5=b[5]
var b6=b[6]
var b7=b[7]
var b8=b[8]
out[0]=b0*a0+b3*a1+b6*a2
out[1]=b1*a0+b4*a1+b7*a2
out[2]=b2*a0+b5*a1+b8*a2
out[3]=b0*a3+b3*a4+b6*a5
out[4]=b1*a3+b4*a4+b7*a5
out[5]=b2*a3+b5*a4+b8*a5
out[6]=b0*a6+b3*a7+b6*a8
out[7]=b1*a6+b4*a7+b7*a8
out[8]=b2*a6+b5*a7+b8*a8
out[9]=b0*a9+b3*a10+b6*a11+b[9]
out[10]=b1*a9+b4*a10+b7*a11+b[10]
out[11]=b2*a9+b5*a10+b8*a11+b[11]
return out}

},{}],47:[function(require,module,exports){
"use strict"
exports.load_count=exports.default_vshader=exports.default_fshader=void 0
exports.modelLoad=modelLoad
exports.modelLoadCount=modelLoadCount
exports.modelStartup=modelStartup
exports.models=void 0
var assert=require("assert")
var geom=require("./geom.js")
var glb_parser=require("./glb/parser.js")
var _require=require("./glb/gltf-type-utils.js"),ATTRIBUTE_TYPE_TO_COMPONENTS=_require.ATTRIBUTE_TYPE_TO_COMPONENTS
var renderer=require("./engine.js")
var _require2=require("./locate_asset.js"),locateAsset=_require2.locateAsset
var _require3=require("./fetch.js"),fetch=_require3.fetch
var _require4=require("./shaders.js"),SEMANTIC=_require4.SEMANTIC,shaderCreate=_require4.shaderCreate,shadersBind=_require4.shadersBind,shadersPrelink=_require4.shadersPrelink
var _require5=require("./textures.js"),textureBind=_require5.textureBind,textureLoad=_require5.textureLoad
var _require6=require("../common/vmath.js"),vec4=_require6.vec4
var _require7=require("./webfs.js"),webFSGetFile=_require7.webFSGetFile
var load_count=0
exports.load_count=load_count
function modelLoadCount(){return load_count}var models={}
exports.models=models
var default_vshader
exports.default_vshader=default_vshader
var default_fshader
exports.default_fshader=default_fshader
function initShaders(){exports.default_vshader=default_vshader=shaderCreate("shaders/default.vp")
exports.default_fshader=default_fshader=shaderCreate("shaders/default.fp")
shadersPrelink(default_vshader,default_fshader)}function Model(url){var idx=(this.url=url).lastIndexOf("/")
if(-1!==idx)this.base_url=url.slice(0,idx+1)
else this.base_url=""}Model.prototype.load=function(){var _this=this
exports.load_count=++load_count
fetch({url:locateAsset(this.url),response_type:"arraybuffer"},function(err,array_buffer){exports.load_count=--load_count
if(err)window.onerror("Model loading error","models.js",0,0,err)
else try{_this.parse(array_buffer)}catch(e){window.onerror("Model loading error","models.js",0,0,e)}})}
var skip_attr={TANGENT:true}
Model.prototype.parse=function(glb_data){var glb=glb_parser.parse(glb_data)
if(!glb)return
var glb_json=glb.getJSON()
var objs=[]
for(var ii=0;ii<glb_json.meshes.length;++ii){var mesh=glb_json.meshes[ii]
for(var jj=0;jj<mesh.primitives.length;++jj){var primitives=mesh.primitives[jj]
var material=glb_json.materials[primitives.material]
var texture=null
if(material){var bct=(material.pbrMetallicRoughness||{}).baseColorTexture||{}
var texture_def=glb_json.textures&&glb_json.textures[bct.index]||{}
var sampler_def=glb_json.samplers&&glb_json.samplers[texture_def.sampler]||{}
var image=glb_json.images&&glb_json.images[texture_def.source]||{}
if(image.uri){var params={url:""+this.base_url+image.uri,filter_mag:sampler_def.magFilter,filter_min:sampler_def.minFilter,wrap_s:sampler_def.wrapS,wrap_t:sampler_def.wrapT}
texture=textureLoad(params)}}var format=[]
var buffers=[]
var bidx=[]
var total_size=0
var vert_count=0
for(var attr in primitives.attributes){if(skip_attr[attr])continue
assert(void 0!==SEMANTIC[attr])
var _accessor=glb_json.accessors[primitives.attributes[attr]]
assert.equal(_accessor.componentType,5126)
var geom_format=gl.FLOAT
var geom_count=ATTRIBUTE_TYPE_TO_COMPONENTS[_accessor.type]
assert(geom_count)
var my_vert_count=_accessor.count
if(!vert_count)vert_count=my_vert_count
else assert.equal(vert_count,my_vert_count)
format.push([SEMANTIC[attr],geom_format,geom_count])
var buffer=glb.getBuffer(_accessor)
buffers.push(buffer)
bidx.push(0)
total_size+=buffer.length}var verts=new Float32Array(total_size)
var idx=0
for(var vert=0;vert<vert_count;++vert)for(var _attr=0;_attr<format.length;++_attr)for(var kk=0;kk<format[_attr][2];++kk)verts[idx++]=buffers[_attr][bidx[_attr]++]
var accessor=glb_json.accessors[primitives.indices]
assert(accessor)
assert.equal(accessor.type,"SCALAR")
var idxs=glb.getBuffer(accessor)
if(5125===accessor.componentType){assert(vert_count<65535)
idxs=new Uint16Array(idxs)}else assert.equal(accessor.componentType,5123)
objs.push({geom:geom.create(format,verts,idxs,primitives.mode),texture:texture})}}this.data={objs:objs}}
var default_shader_params={color:vec4(1,1,1,1)}
Model.prototype.draw=function(param){var mat=param.mat,vshader=param.vshader,fshader=param.fshader,shader_params=param.shader_params
assert(mat)
renderer.updateMatrices(mat)
shadersBind(vshader||default_vshader,fshader||default_fshader,shader_params||default_shader_params)
var objs=this.data.objs
for(var ii=0;ii<objs.length;++ii){var obj=objs[ii]
if(obj.texture)textureBind(0,obj.texture)
obj.geom.draw()}}
Model.prototype.drawGeom=function(){var objs=this.data.objs
for(var ii=0;ii<objs.length;++ii)objs[ii].geom.draw()}
function modelLoad(url){if(models[url])return models[url]
var model=models[url]=new Model(url)
model.data=models.box.data
model.load()
return model}function modelStartup(){initShaders();(models.box=new Model("box")).parse(webFSGetFile("models/box_textured_embed.glb").buffer)}exports.load=modelLoad

},{"../common/vmath.js":98,"./engine.js":21,"./fetch.js":26,"./geom.js":30,"./glb/gltf-type-utils.js":32,"./glb/parser.js":33,"./locate_asset.js":42,"./shaders.js":61,"./textures.js":70,"./webfs.js":76,"assert":undefined}],48:[function(require,module,exports){
"use strict"
exports.buildString=buildString
exports.init=init
exports.isChunkedSendFileData=isChunkedSendFileData
exports.netClient=netClient
exports.netClientId=netClientId
exports.netDisconnected=netDisconnected
exports.netDisconnectedRaw=netDisconnectedRaw
exports.netForceDisconnect=netForceDisconnect
exports.netPostInit=netPostInit
exports.netSubs=netSubs
exports.netUserId=netUserId
var _glovCommonUtilJs=require("../common/util.js")
var callEach=_glovCommonUtilJs.callEach
exports.netBuildString=buildString
exports.netInit=init
var _require=require("./filewatch.js"),filewatchStartup=_require.filewatchStartup
var _require2=require("../common/packet.js"),packetEnableDebug=_require2.packetEnableDebug
var subscription_manager=require("./subscription_manager.js")
var wsclient=require("./wsclient.js")
var WSClient=wsclient.WSClient
var client
var subs
var post_net_init=[]
function netPostInit(cb){if(post_net_init)post_net_init.push(cb)
else cb()}function init(params){if((params=params||{}).ver)wsclient.CURRENT_VERSION=params.ver
if(String(document.location).match(/^https?:\/\/localhost/))if(!params.no_packet_debug){console.log("PacketDebug: ON")
packetEnableDebug(true)}client=new WSClient(params.path,params.client_app);(subs=subscription_manager.create(client,params.cmd_parse)).auto_create_user=Boolean(params.auto_create_user)
subs.no_auto_login=Boolean(params.no_auto_login)
subs.allow_anon=Boolean(params.allow_anon)
window.subs=subs
exports.subs=subs
exports.client=client
callEach(post_net_init,post_net_init=null)
filewatchStartup(client)
if(params.engine){params.engine.addTickFunc(function(dt){client.checkDisconnect()
subs.tick(dt)})
params.engine.onLoadMetrics(function(obj){subs.onceConnected(function(){client.send("load_metrics",obj)})})}}var build_timestamp_string=new Date(Number("1730509975354")).toISOString().replace("T"," ").slice(5,-8)
function buildString(){return wsclient.CURRENT_VERSION?wsclient.CURRENT_VERSION+" ("+build_timestamp_string+")":build_timestamp_string}function netDisconnectedRaw(){return!client||!client.connected||client.disconnected||!client.socket||1!==client.socket.readyState}function netDisconnected(){return netDisconnectedRaw()||subs.logging_in}function netForceDisconnect(){var _client$socket
if(subs)subs.was_logged_in=false
null==client||(null==(_client$socket=client.socket)||(null==_client$socket.close||_client$socket.close()))}function netClient(){return client}function netClientId(){return client.id}function netUserId(){return subs.getUserId()}function netSubs(){return subs}function isChunkedSendFileData(data){return!data.err}

},{"../common/packet.js":90,"../common/util.js":96,"./filewatch.js":27,"./subscription_manager.js":69,"./wsclient.js":78}],49:[function(require,module,exports){
"use strict"
exports.normalizeWheel=normalizeWheel
var PIXEL_STEP=10
var LINE_HEIGHT=40
var PAGE_HEIGHT=800
function normalizeWheel(event){var spin_x=0
var spin_y=0
var pixel_x=0
var pixel_y=0
if(event.detail)spin_y=event.detail
if(event.wheelDelta)spin_y=-event.wheelDelta/120
if(event.wheelDeltaY)spin_y=-event.wheelDeltaY/120
if(event.wheelDeltaX)spin_x=-event.wheelDeltaX/120
if("axis"in event&&event.axis===event.HORIZONTAL_AXIS){spin_x=spin_y
spin_y=0}pixel_x=spin_x*PIXEL_STEP
pixel_y=spin_y*PIXEL_STEP
if("number"===typeof event.deltaY)pixel_y=event.deltaY
if("number"===typeof event.deltaX)pixel_x=event.deltaX
if((pixel_x||pixel_y)&&event.deltaMode)if(1===event.deltaMode){pixel_x*=LINE_HEIGHT
pixel_y*=LINE_HEIGHT}else{pixel_x*=PAGE_HEIGHT
pixel_y*=PAGE_HEIGHT}if(pixel_x&&!spin_x)spin_x=pixel_x<1?-1:1
if(pixel_y&&!spin_y)spin_y=pixel_y<1?-1:1
return{spin_x:spin_x,spin_y:spin_y,pixel_x:pixel_x,pixel_y:pixel_y}}

},{}],50:[function(require,module,exports){
"use strict"
exports.create=create
exports.preloadParticleData=preloadParticleData
var assert=require("assert")
var _require=require("../common/vmath.js"),vec2=_require.vec2,v2copy=_require.v2copy,v2lerp=_require.v2lerp,v2mul=_require.v2mul,vec3=_require.vec3,vec4=_require.vec4,v3add=_require.v3add,v4copy=_require.v4copy,v4lerp=_require.v4lerp,v4mul=_require.v4mul
var sprites=require("./sprites.js")
var _require2=require("./textures.js"),textureLoad=_require2.textureLoad
var blend_map={alpha:sprites.BLEND_ALPHA,additive:sprites.BLEND_ADDITIVE}
function preloadParticleData(particle_data){for(var key in particle_data.defs){var def=particle_data.defs[key]
for(var part_name in def.particles){var part_def=def.particles[part_name]
textureLoad({url:"img/"+part_def.texture+".png"})}}}function normalizeValue(v){if(v instanceof Float32Array&&v.length>=2)return v
else if("number"===typeof v)return vec2(v,0)
else if(Array.isArray(v)||v instanceof Float32Array)return vec2(v[0]||0,v[1]||0)
else return assert(false)}function normalizeValueVec(vec,length){assert(length)
assert(Array.isArray(vec)||vec instanceof Float32Array)
var ret=new Array(length)
for(var ii=0;ii<length;++ii)ret[ii]=normalizeValue(vec[ii])
return ret}function normalizeParticle(def,particle_manager){if(!def.normalized){var norm=def.normalized={blend:blend_map[def.blend]||sprites.BLEND_ALPHA,texture:textureLoad({url:def.texture?"img/"+def.texture+".png":"img/glov/util_circle.png"}),color:normalizeValueVec(def.color||[1,1,1,1],4),color_track:null,size:normalizeValueVec(def.size||[1,1],2),size_track:null,accel:normalizeValueVec(def.accel||[0,0,0],3),rot:normalizeValue(def.rot||0),rot_vel:normalizeValue(def.rot||0),lifespan:normalizeValue(def.lifespan||1e3),kill_time_accel:normalizeValue(def.kill_time_accel||1)}
assert(norm.kill_time_accel[0]>=1)
if(def.color_track&&def.color_track.length){assert(def.color_track.length>1)
norm.color_track=[]
for(var ii=0;ii<def.color_track.length;++ii){var e=def.color_track[ii]
assert("number"===typeof e.t)
var arr=new Float32Array(5)
arr[0]=e.v[0]
arr[1]=e.v[1]
arr[2]=e.v[2]
arr[3]=e.v[3]
arr[4]=e.t
norm.color_track.push(arr)}}if(def.size_track&&def.size_track.length){assert(def.size_track.length>1)
norm.size_track=[]
for(var _ii=0;_ii<def.size_track.length;++_ii){var _e=def.size_track[_ii]
assert("number"===typeof _e.t)
var _arr=new Float32Array(3)
_arr[0]=_e.v[0]
_arr[1]=_e.v[1]
_arr[2]=_e.t
norm.size_track.push(_arr)}}}return def.normalized}function findParticle(particles,name){assert(void 0!==particles[name])
return particles[name]}function normalizeEmitter(def,part_map){if(!def.normalized){def.normalized={part_idx:findParticle(part_map,def.particle),pos:normalizeValueVec(def.pos||[0,0,0],3),vel:normalizeValueVec(def.vel||[0,0,0],3),emit_rate:normalizeValue(def.emit_rate||10),emit_time:normalizeValueVec(def.emit_time||[0,Infinity],2),emit_initial:normalizeValue(def.emit_initial||1)}
var min=def.normalized.emit_rate[0]
var max=def.normalized.emit_rate[0]+def.normalized.emit_rate[1]
def.normalized.emit_rate[0]=1e3/max
def.normalized.emit_rate[1]=1e3/min
assert(def.normalized.emit_rate[0]>1)}return def.normalized}function normalizeDef(def,particle_manager){if(!def.normalized){var norm=def.normalized={system_lifespan:normalizeValue(def.system_lifespan||Infinity),particles:[],emitters:[]}
var part_map={}
for(var key in def.particles){part_map[key]=norm.particles.length
norm.particles.push(normalizeParticle(def.particles[key],particle_manager))}for(var _key in def.emitters)norm.emitters.push(normalizeEmitter(def.emitters[_key],part_map))}return def.normalized}function instValue(v){return v[0]+Math.random()*v[1]}function instValueVec(v){var ret=new Float32Array(v.length)
for(var ii=0;ii<v.length;++ii)ret[ii]=instValue(v[ii])
return ret}var temp_color=vec4()
var temp_color2=vec4()
var temp_size=vec2()
var temp_size2=vec2()
var ParticleSystem=function(){function ParticleSystem(parent,def_in,pos){assert(3===pos.length)
this.parent=parent
this.def=normalizeDef(def_in,parent)
this.system_lifespan=instValue(this.def.system_lifespan)
assert(this.system_lifespan>0)
this.age=0
this.kill_hard=false
this.kill_soft=false
this.pos=vec3(pos[0],pos[1],pos[2])
this.part_sets=[]
for(var ii=0;ii<this.def.particles.length;++ii){var part_set={def:this.def.particles[ii],parts:[]}
this.part_sets.push(part_set)}this.emitters=[]
for(var _ii2=0;_ii2<this.def.emitters.length;++_ii2){var _def=this.def.emitters[_ii2]
var emitter={def:_def,emit_time:instValueVec(_def.emit_time),countdown:0,started:false,stopped:false}
this.emitters.push(emitter)}}var _proto=ParticleSystem.prototype
_proto.tickParticle=function tickParticle(part,dt){var def=part.def
part.age+=dt
var age_norm=part.age/part.lifespan
if(age_norm>=1)return true
var dts=dt/1e3
part.pos[0]+=part.vel[0]*dts
part.pos[1]+=part.vel[1]*dts
part.pos[2]+=part.vel[2]*dts
part.vel[0]+=part.accel[0]*dts
part.vel[1]+=part.accel[1]*dts
part.vel[2]+=part.accel[2]*dts
v4copy(temp_color,part.color,temp_color)
if(def.color_track)if(age_norm<def.color_track[0][4])v4mul(temp_color,temp_color,def.color_track[0])
else if(age_norm>=def.color_track[def.color_track.length-1][4])v4mul(temp_color,temp_color,def.color_track[def.color_track.length-1])
else for(var ii=0;ii<def.color_track.length-1;++ii)if(age_norm>=def.color_track[ii][4]&&age_norm<def.color_track[ii+1][4]){var weight=(age_norm-def.color_track[ii][4])/(def.color_track[ii+1][4]-def.color_track[ii][4])
v4lerp(temp_color2,weight,def.color_track[ii],def.color_track[ii+1])
v4mul(temp_color,temp_color,temp_color2)
break}v2copy(temp_size,part.size)
if(def.size_track)if(age_norm<def.size_track[0][2])v2mul(temp_size,temp_size,def.size_track[0])
else if(age_norm>=def.size_track[def.size_track.length-1][2])v2mul(temp_size,temp_size,def.size_track[def.size_track.length-1])
else for(var _ii3=0;_ii3<def.size_track.length-1;++_ii3)if(age_norm>=def.size_track[_ii3][2]&&age_norm<def.size_track[_ii3+1][2]){var _weight=(age_norm-def.size_track[_ii3][2])/(def.size_track[_ii3+1][2]-def.size_track[_ii3][2])
v2lerp(temp_size2,_weight,def.size_track[_ii3],def.size_track[_ii3+1])
v2mul(temp_size,temp_size,temp_size2)
break}var w=temp_size[0]
var h=temp_size[1]
var x=part.pos[0]-w/2
var y=part.pos[1]-h/2
var z=part.pos[2]
sprites.queueraw4color([def.texture],x,y,temp_color,0,0,x,y+h,temp_color,0,1,x+w,y+h,temp_color,1,1,x+w,y,temp_color,1,0,z,null,null,def.blend)
return false}
_proto.tickPartSet=function tickPartSet(dt_orig,part_set){var parts=part_set.parts
for(var ii=parts.length-1;ii>=0;--ii){var part=parts[ii]
var dt=this.kill_soft?dt_orig*part.kill_time_accel:dt_orig
if(this.tickParticle(part,dt)){parts[ii]=parts[parts.length-1]
parts.pop()}}}
_proto.emitParticle=function emitParticle(init_dt,emitter){var emitter_def=emitter.def
var part_set=this.part_sets[emitter_def.part_idx]
var def=part_set.def
var pos=instValueVec(emitter_def.pos,3)
v3add(pos,pos,this.pos)
var part={def:def,pos:pos,color:instValueVec(def.color,4),size:instValueVec(def.size,4),vel:instValueVec(emitter_def.vel,3),accel:instValueVec(def.accel,3),rot:instValue(def.rot),rot_vel:instValue(def.rot_vel),lifespan:instValue(def.lifespan),kill_time_accel:instValue(def.kill_time_accel),age:0}
if(!this.tickParticle(part,init_dt))part_set.parts.push(part)}
_proto.tickEmitter=function tickEmitter(dt,emitter){var def=emitter.def
if(!emitter.started&&this.age>=emitter.emit_time[0]){emitter.started=true
dt=this.age-emitter.emit_time[0]
var num=instValue(def.emit_initial)
for(var ii=0;ii<num;++ii)this.emitParticle(dt,emitter)
emitter.countdown=instValue(def.emit_rate)}if(emitter.started&&!emitter.stopped&&!this.kill_soft){var remaining_dt=dt
var emit_dt=dt
if(this.age>=emitter.emit_time[1]){emitter.stopped=true
emit_dt-=this.age-emitter.emit_time[1]}while(emit_dt>=emitter.countdown){emit_dt-=emitter.countdown
remaining_dt-=emitter.countdown
emitter.countdown=instValue(def.emit_rate)
this.emitParticle(remaining_dt,emitter)}emitter.countdown-=emit_dt}}
_proto.tick=function tick(dt){if(this.kill_hard)return true
for(var ii=this.part_sets.length-1;ii>=0;--ii)this.tickPartSet(dt,this.part_sets[ii])
this.age+=dt
for(var _ii4=0;_ii4<this.emitters.length;++_ii4)this.tickEmitter(dt,this.emitters[_ii4])
return this.age>=this.system_lifespan}
_proto.shift=function shift(delta){if(this.def.no_shift)return
this.pos[0]+=delta[0]
this.pos[1]+=delta[1]
this.pos[2]+=delta[2]
for(var ii=0;ii<this.part_sets.length;++ii){var parts=this.part_sets[ii].parts
for(var jj=0;jj<parts.length;++jj){var part=parts[jj]
part.pos[0]+=delta[0]
part.pos[1]+=delta[1]
part.pos[2]+=delta[2]}}}
return ParticleSystem}()
var ParticleManager=function(){function ParticleManager(){this.systems=[]}var _proto2=ParticleManager.prototype
_proto2.createSystem=function createSystem(def,pos){var system=new ParticleSystem(this,def,pos)
this.systems.push(system)
return system}
_proto2.tick=function tick(dt){for(var ii=this.systems.length-1;ii>=0;--ii)if(this.systems[ii].tick(dt)){this.systems[ii]=this.systems[this.systems.length-1]
this.systems.pop()}}
_proto2.killAll=function killAll(){this.systems=[]}
_proto2.shift=function shift(delta){for(var ii=0;ii<this.systems.length;++ii)this.systems[ii].shift(delta)}
return ParticleManager}()
function create(){return new ParticleManager}

},{"../common/vmath.js":98,"./sprites.js":68,"./textures.js":70,"assert":undefined}],51:[function(require,module,exports){
"use strict"
exports.addMetric=addMetric
exports.draw=draw
exports.friendlyBytes=friendlyBytes
exports.perfGraphOverride=perfGraphOverride
exports.perfSetAutoChannel=perfSetAutoChannel
exports.perf_mem_counters=void 0
var perf_mem_counters={}
exports.perf_mem_counters=perf_mem_counters
var engine=require("./engine.js")
var metrics=[]
function addMetric(metric,first){if(metric.show_graph){metric.num_lines=metric.colors.length
metric.history_size=metric.data.history.length/metric.num_lines}metric.num_labels=Object.keys(metric.labels).length
if(void 0===metric.interactable)metric.interactable=engine.DEBUG&&(metric.num_labels>1&&!metric.show_all||metric.show_graph)
if(first)metrics.splice(0,0,metric)
else metrics.push(metric)}var camera2d=require("./camera2d.js")
var _require=require("./cmds.js"),cmd_parse=_require.cmd_parse
var glov_font=require("./font.js")
var input=require("./input.js")
var max=Math.max
var _require2=require("./net.js"),netClient=_require2.netClient,netClientId=_require2.netClientId,netDisconnected=_require2.netDisconnected
var _require3=require("../common/perfcounters.js"),perfCounterHistory=_require3.perfCounterHistory
var _require4=require("./profiler_ui.js"),profilerUI=_require4.profilerUI
var settings=require("./settings.js")
var _require5=require("./sprites.js"),spriteChainedStart=_require5.spriteChainedStart,spriteChainedStop=_require5.spriteChainedStop
var ui=require("./ui.js")
var _require6=require("./ui.js"),uiTextHeight=_require6.uiTextHeight
var _require7=require("../common/vmath.js"),vec4=_require7.vec4,v3copy=_require7.v3copy
require("./perf_net.js")
var METRIC_PAD=2
var bg_default=vec4(0,0,0,.5)
var bg_mouse_over=vec4(0,0,0,.75)
var bg_fade=vec4()
settings.register({show_metrics:{default_value:1,type:cmd_parse.TYPE_INT,range:[0,1]},show_fps:{label:"Show FPS",default_value:engine.DEBUG?1:0,type:cmd_parse.TYPE_INT,enum_lookup:{OFF:0,ON:1,MSPF:2,CPU:3,GC:4}},fps_graph:{label:"FPS Graph",default_value:0,type:cmd_parse.TYPE_INT,range:[0,1]},fps_window:{label:"FPS Time Window (seconds)",default_value:1,type:cmd_parse.TYPE_FLOAT,range:[.001,120]},show_perf_counters:{default_value:0,type:cmd_parse.TYPE_INT,range:[0,1]},show_perf_memory:{default_value:0,type:cmd_parse.TYPE_INT,range:[0,1],access_run:["sysadmin"]},perf_provider:{default_value:"client",type:cmd_parse.TYPE_STRING,usage:"Set the perf provider for /show_perf_counters and /show_perf_memory\n  CLIENT : show client values\n  AUTO : automatically determine appropriate server\n  user.1234 : use server hosting a particular worker",access_run:["sysadmin"]}})
cmd_parse.register({cmd:"fps",help:"Toggles FPS display",func:function func(str,resp_func){if(settings.show_fps&&settings.show_metrics||"0"===str)settings.set("show_fps",0)
else{settings.set("show_fps",1)
settings.set("show_metrics",1)}resp_func()}})
var fps_style=glov_font.style({outline_width:2,outline_color:128,color:4294967295})
function friendlyUnit(table,value){var unit=0
while(unit<table.length-1&&value>=table[unit+1][0])unit++
if(0===unit)return value+" "+table[unit][1]
return(value/table[unit][0]).toFixed(2)+" "+table[unit][1]}var UNIT_BYTES=[[1,"bytes"],[1024,"KB"],[1048576,"MB"],[1073741824,"GB"]]
var UNIT_COUNT=[[1,""],[1e3,"k"],[1e6,"m"],[1e9,"g"]]
function friendlyBytes(bytes){return friendlyUnit(UNIT_BYTES,bytes)}function friendlyCount(count){return friendlyUnit(UNIT_COUNT,count)}function showMetric(y,metric){var font=engine.font
var pad=METRIC_PAD
var font_height=uiTextHeight()
var line_height=settings.render_scale_all<1?font_height/settings.render_scale_all:font_height
var METRIC_VALUE_WIDTH=line_height*(metric.width||2.5)
var x=camera2d.x1Real()-METRIC_VALUE_WIDTH-pad
var y0=y
y+=pad
var max_label_w=0
var max_labels=metric.show_all?Infinity:settings[metric.show_stat]
var drew_any=false
var alpha=1
for(var label in metric.labels){var value=metric.labels[label]()
if(value){var style=fps_style
if(value.alpha){alpha=value.alpha
value=value.value
style=glov_font.styleAlpha(fps_style,alpha)}var label_w=font.drawSizedAligned(style,x,y,Z.FPSMETER+3,line_height,glov_font.ALIGN.HRIGHT,0,0,label)
max_label_w=max(max_label_w,label_w)
font.drawSizedAligned(style,x,y,Z.FPSMETER+3,line_height,glov_font.ALIGN.HFIT,METRIC_VALUE_WIDTH,0,value)
y+=line_height
drew_any=true}if(!--max_labels)break}if(!drew_any)return y-pad
var bg=bg_default
var pos_param={x:(x-=max_label_w+METRIC_PAD)-pad,y:y0,w:METRIC_VALUE_WIDTH+max_label_w+METRIC_PAD+2*pad,h:(y+=pad)-y0}
if(metric.interactable){if(input.mouseUpEdge(pos_param))if(metric.num_labels>1&&settings[metric.show_stat]<=1)settings.set(metric.show_stat,metric.num_labels)
else if(metric.show_graph&&!settings[metric.show_graph])settings.set(metric.show_graph,1)
else{if(metric.show_graph)settings.set(metric.show_graph,0)
settings.set(metric.show_stat,1)}if(input.mouseOver(pos_param))bg=bg_mouse_over}if(1!==alpha){bg_fade[3]=bg[3]*alpha
bg=v3copy(bg_fade,bg)}ui.drawRect(pos_param.x,pos_param.y,pos_param.x+pos_param.w,y,Z.FPSMETER+2,bg)
return y}function showMetricGraph(y,metric){var small=engine.game_height<300
var LINE_WIDTH=small?1:3
var LINE_PAD=small?0:1
var LINE_HEIGHT=small?64:128
var NUM_LINES=metric.history_size-1
var w=(LINE_WIDTH+LINE_PAD)*NUM_LINES
var x=camera2d.x1Real()-w
var h=LINE_HEIGHT+2*LINE_PAD
var z=Z.FPSMETER
spriteChainedStart()
ui.drawRect(x,y-h,x+w,y,z++,bg_default)
x+=LINE_PAD
y-=LINE_PAD
var history_index=metric.data.index
var line_scale=LINE_HEIGHT/metric.line_scale_top
for(var ii=0;ii<NUM_LINES;ii++){var line_index=(ii+history_index+1)%metric.history_size*metric.num_lines
var data=metric.data.history
var bar_max=0
for(var jj=0;jj<metric.num_lines;jj++){var line_jj=data[line_index+jj]
var bar_min=void 0
if(metric.bars_stack){bar_min=bar_max
bar_max+=line_jj}else{var lesser=0
for(var kk=0;kk<metric.num_lines;kk++){if(kk===jj)continue
var line_kk=data[line_index+kk]
if((line_kk<line_jj||line_kk===line_jj&&kk<jj)&&line_kk>lesser)lesser=line_kk}bar_min=lesser
bar_max=line_jj}var color=metric.colors[jj]
ui.drawRect(x,y-bar_max*line_scale,x+LINE_WIDTH,y-bar_min*line_scale,z,color)}x+=LINE_WIDTH+LINE_PAD}z+=NUM_LINES
y-=LINE_HEIGHT+LINE_PAD
spriteChainedStop()
return y}function perfDefaultAutoChannel(){var client_id=netClientId()
if(client_id)return"client."+client_id
return null}var auto_channel_cb=perfDefaultAutoChannel
function perfSetAutoChannel(cb){auto_channel_cb=cb}var PERF_NET_CACHE_TIME=1e4
var PERF_NET_CACHE_TIME_MEM=2500
var perf_provider_data={last_update:-Infinity,data:null}
function updatePerfProvider(){var cache_time=PERF_NET_CACHE_TIME
var fields={}
if(settings.show_perf_counters)fields.counters=1
if(settings.show_perf_memory){fields.memory=1
cache_time=PERF_NET_CACHE_TIME_MEM}var provider=settings.perf_provider.toLowerCase()
if("client"===provider){var ret={source:"client"}
if(fields.counters)ret.counters=perfCounterHistory()
if(fields.memory)ret.memory=perf_mem_counters
return ret}if(perf_provider_data.in_flight||netDisconnected())return perf_provider_data.data
if(engine.frame_timestamp-perf_provider_data.last_update<cache_time)return perf_provider_data.data
var channel_id
if("auto"===provider)channel_id=auto_channel_cb()
else if(provider.match(/^[^.]+\.[^.]+$/))channel_id=provider
if(channel_id){perf_provider_data.in_flight=true
netClient().send("perf_fetch",{channel_id:channel_id,fields:fields},null,function(err,data){if(err)console.error("Error getting perf data: "+Object.keys(fields)+": "+err)
perf_provider_data.data=data
perf_provider_data.last_update=engine.frame_timestamp
perf_provider_data.in_flight=false})}return perf_provider_data.data}function perfMemObjToLines(out,obj,prefix){for(var key in obj){var v=obj[key]
if(v&&"object"===typeof v)perfMemObjToLines(out,v,""+prefix+key+".")
else{if("number"===typeof v)if(key.endsWith("bytes")||prefix.includes("data_size"))v=friendlyBytes(v)
else v=friendlyCount(v)
out.push(""+prefix+key+": "+v)}}}var graph_override=null
function perfGraphOverride(override){graph_override=override}function draw(){camera2d.push()
profilerUI()
camera2d.setAspectFixed(engine.game_width,engine.game_height)
if(settings.show_metrics){var y=camera2d.y0Real()
var y_graph=camera2d.y1Real()
if(graph_override){y_graph=showMetricGraph(y_graph,graph_override)
y_graph-=METRIC_PAD}for(var ii=0;ii<metrics.length;++ii){var metric=metrics[ii]
if(settings[metric.show_stat]){y=showMetric(y,metric)
y+=METRIC_PAD}if(!graph_override&&settings[metric.show_graph]){y_graph=showMetricGraph(y_graph,metric)
y_graph-=METRIC_PAD}}}if(settings.show_perf_counters||settings.show_perf_memory){var font=engine.font
var perf_data=updatePerfProvider()||{}
var _y=camera2d.y0Real()
var y0=_y
var font_height=uiTextHeight()
var line_height=settings.render_scale_all<1?font_height/settings.render_scale_all:font_height
var column_width=6*line_height
var x0=camera2d.x0Real()
var x=x0+2*column_width
var maxx=x+column_width
var z=Z.FPSMETER+1
var header_x=x0+column_width
if(perf_data.source){font.drawSized(fps_style,header_x,_y,z,line_height,"Source: "+perf_data.source)
_y+=line_height}if(perf_data.log){var w=.67*camera2d.wReal()
maxx=max(maxx,header_x+w)
_y+=font.drawSizedWrapped(fps_style,header_x,_y,z,w,20,line_height,perf_data.log)+4}if(perf_data.memory&&settings.show_perf_memory){var lines=[]
perfMemObjToLines(lines,perf_data.memory,"")
for(var _ii=0;_ii<lines.length;++_ii){font.drawSized(fps_style,x,_y,z,line_height,lines[_ii])
_y+=line_height}}if(perf_data.counters&&settings.show_perf_counters){var hist=perf_data.counters||[]
var by_key={}
for(var _ii2=0;_ii2<hist.length;++_ii2){var set=hist[_ii2]
for(var key in set){by_key[key]=by_key[key]||[]
by_key[key][_ii2]=set[key]}}var keys=Object.keys(by_key)
keys.sort()
for(var _ii3=0;_ii3<keys.length;++_ii3){var _key=keys[_ii3]
var data=by_key[_key]
font.drawSizedAligned(fps_style,x-2*column_width,_y,z,line_height,glov_font.ALIGN.HRIGHT|glov_font.ALIGN.HFIT,2*column_width,0,_key+": ")
for(var jj=0;jj<data.length;++jj)if(data[jj])font.drawSizedAligned(fps_style,x+column_width*jj,_y,z,line_height,glov_font.ALIGN.HFIT,column_width,0,data[jj]+" ")
maxx=max(maxx,x+column_width*data.length)
_y+=line_height}}ui.drawRect(x0,y0,maxx,_y,z-.1,bg_default)}camera2d.pop()
graph_override=null}

},{"../common/perfcounters.js":91,"../common/vmath.js":98,"./camera2d.js":15,"./cmds.js":17,"./engine.js":21,"./font.js":28,"./input.js":37,"./net.js":48,"./perf_net.js":52,"./profiler_ui.js":56,"./settings.js":59,"./sprites.js":68,"./ui.js":72}],52:[function(require,module,exports){
"use strict"
exports.registerPingProvider=registerPingProvider
var _glovCommonWscommon=require("../common/wscommon")
var wsstats=_glovCommonWscommon.wsstats
var wsstats_out=_glovCommonWscommon.wsstats_out
var _cmds=require("./cmds")
var cmd_parse=_cmds.cmd_parse
var _perf=require("./perf")
var perf=_perf
var _settings=require("./settings")
var settingsRegister=_settings.settingsRegister
var min=Math.min
settingsRegister({show_net:{default_value:0,type:cmd_parse.TYPE_INT,enum_lookup:{OFF:0,ON:2}}})
var last_wsstats={msgs:0,bytes:0,time:Date.now(),dm:0,db:0}
var last_wsstats_out={msgs:0,bytes:0,time:Date.now(),dm:0,db:0}
function bandwidth(stats,last){var now=Date.now()
if(now-last.time>1e3){last.dm=stats.msgs-last.msgs
last.db=stats.bytes-last.bytes
last.msgs=stats.msgs
last.bytes=stats.bytes
if(now-last.time>2e3)last.time=now
else last.time+=1e3}return(last.db/1024).toFixed(2)+" kb ("+last.dm+")"}perf.addMetric({name:"net",show_stat:"show_net",width:5,labels:{"down: ":bandwidth.bind(null,wsstats,last_wsstats),"up: ":bandwidth.bind(null,wsstats_out,last_wsstats_out)}})
var ping_providers=0
function registerPingProvider(fn){var _settingsRegister
var suffix=1===++ping_providers?"":""+ping_providers
settingsRegister(((_settingsRegister={})["show_ping"+suffix]={default_value:0,type:cmd_parse.TYPE_INT,range:[0,1]},_settingsRegister))
perf.addMetric({name:"ping"+suffix,show_stat:"show_ping"+suffix,labels:{"ping: ":function ping(){var pt=fn()
if(!pt||pt.fade<.001)return""
return{value:""+pt.ping.toFixed(1),alpha:min(1,3*pt.fade)}}}})}

},{"../common/wscommon":100,"./cmds":17,"./perf":51,"./settings":59}],53:[function(require,module,exports){
"use strict"
exports.enter=enter
exports.exit=exit
exports.isLocked=isLocked
exports.startup=startup
var _require=require("../common/util.js"),eatPossiblePromise=_require.eatPossiblePromise
var user_want_locked=false
var elem
var on_ptr_lock
function isLocked(){return user_want_locked}function pointerLog(msg){console.log("PointerLock: "+msg)}function exit(){pointerLog("Lock exit requested")
user_want_locked=false
eatPossiblePromise(document.exitPointerLock())}function enter(when){user_want_locked=true
on_ptr_lock()
pointerLog("Trying pointer lock in response to "+when)
eatPossiblePromise(elem.requestPointerLock())}function onPointerLockChange(){if(document.pointerLockElement||document.mozPointerLockElement||document.webkitPointerLockElement){pointerLog("Lock successful")
if(!user_want_locked){pointerLog("User canceled lock")
eatPossiblePromise(document.exitPointerLock())}}else if(user_want_locked){pointerLog("Lock lost")
user_want_locked=false}}function onPointerLockError(e){pointerLog("Error")
user_want_locked=false}function startup(_elem,_on_ptr_lock){on_ptr_lock=_on_ptr_lock;(elem=_elem).requestPointerLock=elem.requestPointerLock||elem.mozRequestPointerLock||elem.webkitRequestPointerLock||function(){}
document.exitPointerLock=document.exitPointerLock||document.mozExitPointerLock||document.webkitExitPointerLock||function(){}
document.addEventListener("pointerlockchange",onPointerLockChange,false)
document.addEventListener("mozpointerlockchange",onPointerLockChange,false)
document.addEventListener("webkitpointerlockchange",onPointerLockChange,false)
document.addEventListener("pointerlockerror",onPointerLockError,false)
document.addEventListener("mozpointerlockerror",onPointerLockError,false)
document.addEventListener("webkitpointerlockerror",onPointerLockError,false)}

},{"../common/util.js":96}],54:[function(require,module,exports){
"use strict"
var typedarrays=[Int8Array,Uint8Array,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array]
if(!Uint8Array.prototype.slice)typedarrays.forEach(function(ArrayType){Object.defineProperty(ArrayType.prototype,"slice",{value:function value(begin,end){if(void 0===end)end=this.length
if(end<0)end=this.length-end
if((begin=begin||0)>=this.length)begin=this.length-1
if(end>this.length)end=this.length
if(end<begin)end=begin
var len=end-begin
var ret=new ArrayType(len)
for(var ii=0;ii<len;++ii)ret[ii]=this[begin+ii]
return ret}})})
function cmpDefault(a,b){return a-b}var replacements={join:function join(delim){return Array.prototype.join.call(this,delim)},fill:function fill(value,begin,end){if(void 0===end)end=this.length
for(var ii=begin||0;ii<end;++ii)this[ii]=value
return this},sort:function sort(cmp){Array.prototype.sort.call(this,cmp||cmpDefault)}}
var _loop=function _loop(key){if(!Uint8Array.prototype[key])typedarrays.forEach(function(ArrayType){Object.defineProperty(ArrayType.prototype,key,{value:replacements[key]})})}
for(var key in replacements)_loop(key)
if(!String.prototype.endsWith){Object.defineProperty(String.prototype,"endsWith",{value:function value(test){return this.slice(-test.length)===test}})
Object.defineProperty(String.prototype,"startsWith",{value:function value(test){return this.slice(0,test.length)===test}})}if(!String.prototype.includes)Object.defineProperty(String.prototype,"includes",{value:function value(search,start){return-1!==this.indexOf(search,start)},configurable:true})
if(!Array.prototype.includes)Object.defineProperty(Array.prototype,"includes",{value:function value(search,start){for(var ii=start=void 0===start?0:start<0?this.length+start:start;ii<this.length;++ii)if(this[ii]===search)return true
return false}})
if(!Object.values)Object.values=function values(obj){return Object.keys(obj).map(function(k){return obj[k]})}
if(!Object.entries)Object.entries=function entries(obj){var keys=Object.keys(obj)
var ret=new Array(keys.length)
for(var ii=keys.length-1;ii>=0;--ii)ret[ii]=[keys[ii],obj[keys[ii]]]
return ret}
if(!Object.assign)Object.assign=function assign(target,source1){for(var argindex=1;argindex<arguments.length;++argindex){var source=arguments[argindex]
for(var _key in source)target[_key]=source[_key]}return target}
if(!Math.sign)Math.sign=function sign(a){return a<0?-1:a>0?1:0}
if("undefined"!==typeof window){if(!window.Intl)window.Intl={}
if(!window.Intl.NumberFormat){window.Intl.NumberFormat=function(){}
window.Intl.NumberFormat.prototype.format=function(v){return String(v)}}if(!window.Intl.DateTimeFormat){window.Intl.DateTimeFormat=function(){}
window.Intl.DateTimeFormat.prototype.format=function(v){return String(v)}}}

},{}],55:[function(require,module,exports){
"use strict"
exports.MEM_DEPTH_DEFAULT=exports.HIST_TOT=exports.HIST_SIZE=exports.HIST_COMPONENTS=exports.HAS_MEMSIZE=void 0
exports.profilerAvgMem=profilerAvgMem
exports.profilerAvgTime=profilerAvgTime
exports.profilerChildCallCount=profilerChildCallCount
exports.profilerDump=profilerDump
exports.profilerExport=profilerExport
exports.profilerFrameStart=profilerFrameStart
exports.profilerGarbageEstimate=profilerGarbageEstimate
exports.profilerHistoryIndex=profilerHistoryIndex
exports.profilerImport=profilerImport
exports.profilerMaxMem=profilerMaxMem
exports.profilerMeasureBloat=profilerMeasureBloat
exports.profilerMemDepthGet=profilerMemDepthGet
exports.profilerMemDepthSet=profilerMemDepthSet
exports.profilerNodeRoot=profilerNodeRoot
exports.profilerNodeTick=profilerNodeTick
exports.profilerPause=profilerPause
exports.profilerPaused=profilerPaused
exports.profilerWalkTree=profilerWalkTree
exports.profilerWarning=profilerWarning
var HAS_MEMSIZE=Boolean(window.performance&&performance.memory&&performance.memory.usedJSHeapSize)
exports.HAS_MEMSIZE=HAS_MEMSIZE
var HIST_SIZE=128
exports.HIST_SIZE=HIST_SIZE
var HIST_COMPONENTS=3
exports.HIST_COMPONENTS=HIST_COMPONENTS
var HIST_TOT=HIST_SIZE*HIST_COMPONENTS
exports.HIST_TOT=HIST_TOT
var MEM_DEPTH_DEFAULT=2
exports.MEM_DEPTH_DEFAULT=MEM_DEPTH_DEFAULT
var assert=require("assert")
var engine=require("./engine.js")
var floor=Math.floor,max=Math.max,min=Math.min,round=Math.round
var _require=require("./local_storage.js"),localStorageGetJSON=_require.localStorageGetJSON,localStorageSetJSON=_require.localStorageSetJSON
var profiler_open_keys=localStorageGetJSON("profiler_open_keys",{})
var last_id=0
function ProfilerEntry(parent,name){this.parent=parent
this.depth=parent?parent.depth+1:0
this.next=null
this.child=null
this.name=name
this.count=0
this.time=0
this.dmem=0
this.start_time=0
this.start_mem=0
this.history=new Float32Array(HIST_TOT)
this.id=++last_id
this.show_children=!(parent&&parent.parent)||profiler_open_keys[this.getKey()]||false
this.color_override=null}ProfilerEntry.prototype.isEmpty=function(){for(var ii=0;ii<HIST_TOT;ii+=HIST_COMPONENTS)if(this.history[ii])return false
return true}
ProfilerEntry.prototype.toJSON=function(){var next=this.next,child=this.child
while(next&&next.isEmpty())next=next.next
while(child&&child.isEmpty())child=child.next
var ret={i:this.name,h:Array.prototype.slice.call(this.history)}
if(next)ret.n=next
if(child)ret.c=child
return ret}
function profilerEntryFromJSON(parent,obj){var ret=new ProfilerEntry(parent,obj.i)
assert.equal(obj.h.length,ret.history.length)
for(var ii=0;ii<obj.h.length;++ii)ret.history[ii]=obj.h[ii]
if(obj.n)ret.next=profilerEntryFromJSON(parent,obj.n)
if(obj.c)ret.child=profilerEntryFromJSON(ret,obj.c)
return ret}ProfilerEntry.prototype.getKey=function(){if(!this.parent)return""
else return this.parent.getKey()+"."+this.name}
ProfilerEntry.prototype.toggleShowChildren=function(){this.show_children=!this.show_children
if(this.show_children)profiler_open_keys[this.getKey()]=1
else delete profiler_open_keys[this.getKey()]
localStorageSetJSON("profiler_open_keys",profiler_open_keys)}
var root=new ProfilerEntry(null,"root")
var node_out_of_tick=new ProfilerEntry(root,"GPU/idle")
root.child=node_out_of_tick
var node_tick=new ProfilerEntry(root,"tick")
node_out_of_tick.next=node_tick
var current=root
var last_child=null
var history_index=0
var paused=false
var mem_depth=MEM_DEPTH_DEFAULT
function memSizeChrome(){return performance.memory.usedJSHeapSize}function memSizeNop(){return 0}var memSize=HAS_MEMSIZE?memSizeChrome:memSizeNop
var mem_is_high_res=10
function profilerChildCallCount(node,with_mem,do_average){var walk=node.child
var count=0
while(walk){if(do_average){var total=0
var sum_count=0
for(var ii=0;ii<HIST_TOT;ii+=HIST_COMPONENTS)if(!with_mem||walk.history[ii+2]){sum_count++
total+=walk.history[ii]}if(sum_count)count+=round(total/sum_count)}else if(!with_mem||walk.history[history_index+2])count+=walk.history[history_index]
count+=profilerChildCallCount(walk,with_mem,do_average)
walk=walk.next}return count}var WARN_CALLS_COUNT=1e3
function profilerWarning(){var total_calls=profilerChildCallCount(root,false,true)
if(total_calls>WARN_CALLS_COUNT)return"Warning: Too many per-frame profilerStart() calls ("+total_calls+" > "+WARN_CALLS_COUNT+")"
else if(!HAS_MEMSIZE)return"To access memory profiling, run in Chrome"
else if(mem_depth>1&&mem_is_high_res<10)return"For precise memory profiling, launch Chrome with --enable-precise-memory-info"
return""}function profilerNodeRoot(){return root}function profilerNodeTick(){return node_tick}function profilerHistoryIndex(){return history_index}var garbage_accum=[0,0]
var garbage_count=[0,0,0]
function profilerFrameStart(){root.count=1
var now=performance.now()
root.time=now-root.start_time
root.start_time=now
if(mem_depth>0){var memnow=memSize()
root.dmem=memnow-root.start_mem
root.start_mem=memnow}node_out_of_tick.count=1
node_out_of_tick.time=root.time
node_out_of_tick.dmem=root.dmem
for(var _walk=root.child;_walk;_walk=_walk.next){if(_walk===node_out_of_tick)continue
node_out_of_tick.time-=_walk.time
node_out_of_tick.dmem-=_walk.dmem
if(mem_depth>1)if(_walk.count)if(_walk.dmem)mem_is_high_res++
else mem_is_high_res-=5}var pos=0
var neg=0
for(var _walk2=root.child;_walk2;_walk2=_walk2.next)if(_walk2.dmem<0)neg-=_walk2.dmem
else pos+=_walk2.dmem
if(pos>neg){garbage_accum[0]+=pos
garbage_count[0]++}else{garbage_accum[1]+=neg
garbage_count[1]++}if(current!==root){console.error("Profiler starting new frame but some section was not stopped",current&&current.name)
current=root}if(!paused)history_index=(history_index+HIST_COMPONENTS)%HIST_TOT
var walk=root
while(walk){var recursing_down=true
if(!paused){walk.history[history_index]=walk.count
walk.history[history_index+1]=walk.time
walk.history[history_index+2]=walk.dmem}walk.count=0
walk.time=0
walk.dmem=0
do{if(recursing_down&&walk.child)walk=walk.child
else if(walk.next)walk=walk.next
else{recursing_down=false
if(walk=walk.parent)continue}break}while(true)}}function profilerStart(name){var instance
if(last_child&&last_child.name===name)instance=last_child
else if(last_child&&last_child.next&&last_child.next.name===name)instance=last_child.next
else{var last=null
for(instance=current.child;instance;instance=(last=instance).next)if(instance.name===name)break
if(!instance)if(!last){assert(!current.child)
instance=new ProfilerEntry(current,name)
current.child=instance}else if(last_child){(instance=new ProfilerEntry(current,name)).next=last_child.next
last_child.next=instance}else{instance=new ProfilerEntry(current,name)
last.next=instance}}assert(instance.parent===current);(current=instance).start_time=performance.now()
if(instance.depth<mem_depth)instance.start_mem=memSize()
last_child=null}function profilerStop(old_name){if(old_name)assert.equal(old_name,current.name)
current.time+=performance.now()-current.start_time
if(current.depth<mem_depth)current.dmem+=memSize()-current.start_mem
current.count++
current=(last_child=current).parent}function profilerStopStart(name){profilerStop(null)
profilerStart(name)}if(window.performance&&window.performance.now){window.profilerStart=profilerStart
window.profilerStop=profilerStop
window.profilerStopStart=profilerStopStart}function profilerPaused(){return paused}function profilerPause(new_value){paused=new_value}function profilerMemDepthGet(){return mem_depth}function profilerMemDepthSet(value){mem_depth=value}var bloat_inner={time:0,mem:0}
var bloat_outer={time:0,mem:0}
var bloat={inner:bloat_inner,outer:bloat_outer}
var MEASURE_KEY1="profilerMeasureBloat"
var MEASURE_KEY2="profilerMeasureBloat:child"
var MEASURE_HIST=10
function profilerMeasureBloat(){var mem_depth_saved=mem_depth
if(mem_depth>=2)mem_depth=Infinity
profilerStart(MEASURE_KEY1)
profilerStart(MEASURE_KEY2)
profilerStopStart(MEASURE_KEY2)
profilerStopStart(MEASURE_KEY2)
profilerStopStart(MEASURE_KEY2)
profilerStop(MEASURE_KEY2)
profilerStop(MEASURE_KEY1)
mem_depth=mem_depth_saved
var walk=null
for(walk=current.child;walk.name!==MEASURE_KEY1;walk=walk.next);var child=walk.child
assert.equal(child.name,MEASURE_KEY2)
bloat_inner.time=Infinity
bloat_inner.mem=0
bloat_outer.time=Infinity
var count_mem=bloat_outer.mem=0
var idx_start=(history_index-HIST_COMPONENTS*(MEASURE_HIST-1)+HIST_TOT)%HIST_TOT
for(var offs=0;offs<MEASURE_HIST;offs++){var idx=(idx_start+offs*HIST_COMPONENTS)%HIST_TOT
bloat_inner.time=min(bloat_inner.time,child.history[idx+1])
bloat_outer.time=min(bloat_outer.time,walk.history[idx+1])
if(child.history[idx+2]>0&&walk.history[idx+2]>0){bloat_inner.mem+=child.history[idx+2]
bloat_outer.mem+=walk.history[idx+2];++count_mem}}bloat_inner.time/=4
bloat_outer.time=max(0,bloat_outer.time-bloat_inner.time)/4
var avg_inner_mem=bloat_inner.mem/count_mem/4
bloat_outer.mem=count_mem?max(0,floor((bloat_outer.mem/count_mem-avg_inner_mem)/4)):0
bloat_inner.mem=count_mem?max(0,floor(avg_inner_mem)):0
return bloat}function profilerGarbageEstimate(){var ret
if(garbage_count[0]>garbage_count[1])ret=garbage_accum[0]/garbage_count[0]
else ret=garbage_accum[1]/garbage_count[1]
garbage_count[0]=garbage_count[1]=0
garbage_accum[0]=garbage_accum[1]=0
return ret}function profilerWalkTree(use_root,cb){var depth=0
var walk=use_root
while(walk){var recursing_down=true
if(walk!==use_root)if(!cb(walk,depth))recursing_down=false
do{if(recursing_down&&walk.child){depth++
walk=walk.child}else if(walk.next)walk=walk.next
else{depth--
recursing_down=false
if(walk=walk.parent)continue}break}while(true)}}function profilerAvgTime(entry){var sum=0
for(var ii=0;ii<HIST_TOT;ii+=HIST_COMPONENTS)if(entry.history[ii])sum+=entry.history[ii+1]
return sum/HIST_SIZE}function profilerMaxMem(entry){var dmem_max=0
for(var ii=0;ii<HIST_TOT;ii+=HIST_COMPONENTS)if(entry.history[ii])dmem_max=max(dmem_max,entry.history[ii+2])
return dmem_max}function profilerAvgMem(entry){var dmem_avg=0
var dmem_count=0
for(var ii=0;ii<HIST_TOT;ii+=HIST_COMPONENTS)if(entry.history[ii]){var dmem=entry.history[ii+2]
if(dmem>=0){dmem_avg+=dmem
dmem_count++}}if(dmem_count)dmem_avg/=dmem_count
return dmem_avg}function profilerExport(){var obj={history_index:history_index,root:root,mem_depth:HAS_MEMSIZE?mem_depth:0,device:{ua:window.navigator.userAgent,vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),webgl:engine.webgl2?2:1,width:engine.width,height:engine.height}}
var debug_info=gl.getExtension("WEBGL_debug_renderer_info")
if(debug_info){obj.device.renderer_unmasked=gl.getParameter(debug_info.UNMASKED_RENDERER_WEBGL)
obj.device.vendor_unmasked=gl.getParameter(debug_info.UNMASKED_VENDOR_WEBGL)}var str=JSON.stringify(obj)
return str=str.replace(/\d\.\d\d\d\d+/g,function(a){a=a[5]>"4"?a.slice(0,4)+(Number(a[4])+1):a.slice(0,5)
while("0"===a.slice(-1)||"."===a.slice(-1))a=a.slice(0,-1)
return a})}function profilerImport(text){var obj
try{obj=JSON.parse(text)}catch(e){}if(!obj)return null
obj.root=profilerEntryFromJSON(null,obj.root)
return obj}function profilerDump(){assert(current===root)
var lines=["","","# PROFILER RESULTS"]
var total_frame_time=profilerAvgTime(root)
profilerWalkTree(root,function(walk,depth){var time_sum=0
var count_sum=0
var time_max=0
var sum_count=0
var dmem_max=0
for(var ii=0;ii<HIST_TOT;ii+=HIST_COMPONENTS)if(walk.history[ii]){sum_count++
count_sum+=walk.history[ii]
time_sum+=walk.history[ii+1]
time_max=max(time_max,walk.history[ii+1])
dmem_max=max(dmem_max,walk.history[ii+2])}if(!count_sum)return true
var percent=time_sum/HIST_SIZE/total_frame_time
var ms=time_sum/sum_count
var count=(count_sum/sum_count).toFixed(0)
var buf=""
for(var _ii=1;_ii<depth;++_ii)buf+="* "
buf+=(100*percent).toFixed(0)+"% "+walk.name+" "
buf+=(1e3*ms).toFixed(0)+" ("+count+") max:"+(1e3*time_max).toFixed(0)
if(HAS_MEMSIZE)buf+=" dmem:"+dmem_max
lines.push(buf)
return true})
var warning=profilerWarning()
if(warning)lines.push("",warning)
lines.push("","")
console.log(lines.join("\n"))}window.profilerDump=profilerDump

},{"./engine.js":21,"./local_storage.js":40,"assert":undefined}],56:[function(require,module,exports){
"use strict"
exports.profilerUI=profilerUI
exports.profilerUIStartup=profilerUIStartup
var camera2d=require("./camera2d.js")
var _require=require("./cmds.js"),cmd_parse=_require.cmd_parse
var engine=require("./engine.js")
var _require2=require("./font.js"),style=_require2.style
var input=require("./input.js")
var floor=Math.floor,max=Math.max,min=Math.min,round=Math.round
var _require3=require("./net.js"),netClient=_require3.netClient,netDisconnected=_require3.netDisconnected
var ui=require("./ui.js")
var _require4=require("./ui.js"),uiTextHeight=_require4.uiTextHeight
var _require5=require("./perf.js"),perfGraphOverride=_require5.perfGraphOverride,friendlyBytes=_require5.friendlyBytes
var _require6=require("./profiler.js"),HIST_SIZE=_require6.HIST_SIZE,HIST_COMPONENTS=_require6.HIST_COMPONENTS,HIST_TOT=_require6.HIST_TOT,HAS_MEMSIZE=_require6.HAS_MEMSIZE,MEM_DEPTH_DEFAULT=_require6.MEM_DEPTH_DEFAULT,profilerAvgTime=_require6.profilerAvgTime,profilerChildCallCount=_require6.profilerChildCallCount,profilerImport=_require6.profilerImport,profilerExport=_require6.profilerExport,profilerHistoryIndex=_require6.profilerHistoryIndex,profilerAvgMem=_require6.profilerAvgMem,profilerMaxMem=_require6.profilerMaxMem,profilerMeasureBloat=_require6.profilerMeasureBloat,profilerMemDepthGet=_require6.profilerMemDepthGet,profilerMemDepthSet=_require6.profilerMemDepthSet,profilerNodeTick=_require6.profilerNodeTick,profilerNodeRoot=_require6.profilerNodeRoot,profilerPause=_require6.profilerPause,profilerPaused=_require6.profilerPaused,profilerWalkTree=_require6.profilerWalkTree,profilerWarning=_require6.profilerWarning
var settings=require("./settings.js")
var _require7=require("./sprites.js"),spriteChainedStart=_require7.spriteChainedStart,spriteChainedStop=_require7.spriteChainedStop
var _require8=require("../common/util.js"),lerp=_require8.lerp
var _require9=require("../common/vmath.js"),vec2=_require9.vec2,vec4=_require9.vec4
Z.PROFILER=Z.PROFILER||9950
var color_gpu=vec4(.5,.5,1,1)
var loaded_profile=null
var node_out_of_tick
var root
function useNewRoot(new_root){if(node_out_of_tick=(root=new_root).child)node_out_of_tick.color_override=color_gpu}function useSavedProfile(text){var obj=profilerImport(text)
if(!obj){ui.modalDialog({title:"Error loading profile",text:text||"No data",buttons:{Ok:null}})
return}useNewRoot(obj.root)
loaded_profile=obj}function useLiveProfile(){useNewRoot(profilerNodeRoot())
loaded_profile=null}function profilerToggle(data,resp_func){useLiveProfile()
if("1"===data)settings.set("show_profiler",1)
else if("0"===data){settings.set("show_profiler",0)
profilerMemDepthSet(MEM_DEPTH_DEFAULT)}else if(settings.show_profiler)if(profilerPaused())profilerPause(false)
else{settings.set("show_profiler",0)
profilerMemDepthSet(MEM_DEPTH_DEFAULT)}else{settings.set("show_profiler",1)
profilerPause(true)}if(resp_func)resp_func()}var access_show=engine.DEBUG?void 0:["hidden"]
cmd_parse.register({cmd:"profiler_toggle",help:"Show or toggle profiler visibility",access_show:access_show,func:profilerToggle})
var PROFILER_RELATIVE_LABELS=["% of user","% of parent","% of frame","% of mem"]
settings.register({show_profiler:{default_value:0,type:cmd_parse.TYPE_INT,range:[0,1],access_show:access_show},profiler_average:{default_value:1,type:cmd_parse.TYPE_INT,range:[0,2],access_show:["hidden"]},profiler_relative:{default_value:1,type:cmd_parse.TYPE_INT,range:[0,PROFILER_RELATIVE_LABELS.length-1],access_show:["hidden"]},profiler_interactable:{default_value:1,type:cmd_parse.TYPE_INT,range:[0,1],access_show:["hidden"]},profiler_graph:{default_value:0,type:cmd_parse.TYPE_INT,range:[0,1],access_show:["hidden"]},profiler_mem_depth:{default_value:MEM_DEPTH_DEFAULT,type:cmd_parse.TYPE_INT,range:[0,100],access_show:["hidden"]},profiler_hide_bloat:{default_value:1,type:cmd_parse.TYPE_INT,range:[0,1],access_show:access_show}})
var font
var y
var style_time_spike=style(null,{color:4286545919})
var style_number=style(null,{color:4294955263})
var style_percent=style(null,{color:4294955263})
var style_ms=style(null,{color:3506438143})
var style_mem=style(null,{color:3506426111})
var style_header=style(null,{color:4294967295,outline_width:.8,outline_color:4294967295})
var style_name=style(null,{color:4294967295,outline_width:1,outline_color:128})
var FONT_SIZE=22
var LINE_HEIGHT=24
var LINE_YOFFS=(LINE_HEIGHT-FONT_SIZE)/2
var font_number_scale
var font_size_number
var number_yoffs
var bar_w
var Z_BAR=Z.PROFILER
var Z_GRAPH=Z.PROFILER+1
var Z_TREE=Z.PROFILER+2
var Z_NAMES=Z.PROFILER+3
var Z_NUMBER=Z.PROFILER+4
var Z_MS=Z.PROFILER+5
var MS_W=58
var COUNT_W=56
var MSPAIR_W=MS_W+4+COUNT_W
var MEM_W=120
var COL_HEADERS=["Profiler","µs (count)","max","GC / Δmem"]
var COL_W=[400,MSPAIR_W,MS_W,MEM_W]
var COL_X=[]
var bar_x0
for(var ii=COL_X[0]=0;ii<COL_W.length;++ii)COL_X[ii+1]=COL_X[ii]+COL_W[ii]+4
var LINE_WIDTH_WITH_MEM=COL_X[COL_W.length]
var LINE_WIDTH_NO_MEM=COL_X[COL_W.length-1]
var color_hint=vec4(0,.25,0,.85)
var color_bar=vec4(0,0,0,.85)
var color_bar2=vec4(.2,.2,.2,.85)
var color_bar_header=vec4(.3,.3,.3,.85)
var color_bar_over=vec4(0,0,.5,.85)
var color_bar_over2=vec4(.2,.2,.7,.85)
var color_bar_parent=vec4(0,0,.3,.85)
var color_bar_parent2=vec4(.2,.2,.4,.85)
var color_timing=vec4(1,1,.5,1)
var color_bar_highlight=vec4(0,0,0,.5)
var GRAPH_FRAME_TIME=16
var GRAPH_MAX_MEM=4096
var total_frame_time
var total_frame_mem
var show_index_count
var show_index_time
var show_index_mem
var do_average
var history_index
var do_ui
var line_width
var show_mem
var mouseover_elem={}
var mouseover_main_elem
var mouseover_bar_idx
var dmem_max_value=0
var perf_graph={history_size:HIST_SIZE,num_lines:2,data:{history:new Float32Array(2*HIST_SIZE),index:0},line_scale_top:GRAPH_FRAME_TIME,bars_stack:true,colors:[vec4(.5,1,.5,1),color_gpu]}
var bloat
var mouseover_param={x:0,peek:true,h:LINE_HEIGHT}
function profilerShowEntryEarly(walk,depth){if(0===settings.profiler_relative&&walk===node_out_of_tick)return false
var count_sum=0
for(var _ii=0;_ii<HIST_TOT;_ii+=HIST_COMPONENTS)count_sum+=walk.history[_ii]
if(!count_sum)return true
mouseover_param.y=y
mouseover_param.w=line_width
if(input.mouseOver(mouseover_param)){mouseover_elem[(mouseover_main_elem=walk).id]=1
for(var parent=walk.parent;parent;parent=parent.parent)mouseover_elem[parent.id]=2}y+=LINE_HEIGHT
if(!walk.show_children)return false
return true}function hasActiveChildren(walk){if(!(walk=walk.child))return false
while(walk){for(var _ii2=0;_ii2<HIST_TOT;_ii2+=HIST_COMPONENTS)if(walk.history[_ii2])return true
walk=walk.next}return false}function childMemCallCount(node,idx){var walk=node.child
var count=0
while(walk){if(walk.history[idx+2])count+=walk.history[idx]
count+=childMemCallCount(walk,idx)
walk=walk.next}return count}function nodeMemValue(node,idx){var count=node.history[idx]
var dmem=node.history[idx+2]
if(show_mem&&settings.profiler_hide_bloat&&dmem>0)dmem=max(0,dmem-count*bloat.inner.mem-childMemCallCount(node,idx)*bloat.outer.mem)
return dmem}var click_param={x:0,h:LINE_HEIGHT}
function profilerShowEntry(walk,depth){if(0===settings.profiler_relative&&walk===node_out_of_tick)return false
var time_sum=0
var count_sum=0
var time_max=0
var sum_count=0
var dmem_min=Infinity
var dmem_max=-Infinity
var dmem_avg=0
var dmem_count=0
for(var _ii3=0;_ii3<HIST_TOT;_ii3+=HIST_COMPONENTS)if(walk.history[_ii3]){sum_count++
count_sum+=walk.history[_ii3]
time_sum+=walk.history[_ii3+1]
time_max=max(time_max,walk.history[_ii3+1])
var dmem=nodeMemValue(walk,_ii3)
dmem_max_value=max(dmem_max_value,dmem)
dmem_min=min(dmem_min,dmem)
dmem_max=max(dmem_max,dmem)
if(dmem>=0){dmem_avg+=dmem;++dmem_count}}if(!count_sum)return true
if(dmem_count)dmem_avg=round(dmem_avg/dmem_count)
var over=1===mouseover_elem[walk.id]
var parent_over=2===mouseover_elem[walk.id]
if(do_ui){click_param.y=y
click_param.w=line_width
var click=input.click(click_param)
if(click)if(1===click.button)walk.parent.toggleShowChildren()
else walk.toggleShowChildren()}profilerStart("bar graph")
spriteChainedStart()
var color_top=over?color_bar_over:parent_over?color_bar_parent:color_bar
var color_bot=over?color_bar_over2:parent_over?color_bar_parent2:color_bar2
if(!engine.defines.NORECTS)ui.drawRect4Color(0,y,line_width,y+LINE_HEIGHT,Z_BAR,color_top,color_top,color_bot,color_bot)
var x=bar_x0
var offs=1+settings.profiler_graph
var graph_max=settings.profiler_graph?GRAPH_MAX_MEM:GRAPH_FRAME_TIME
for(var _ii4=0;_ii4<HIST_SIZE;++_ii4){var value=walk.history[(history_index+(_ii4+1)*HIST_COMPONENTS)%HIST_TOT+offs]
if(value>0){var hv=value/graph_max
var h=min(hv*LINE_HEIGHT,LINE_HEIGHT)
if(hv<1){color_timing[0]=hv
color_timing[1]=1}else{color_timing[0]=1
color_timing[1]=max(0,2-hv)}var color=walk.color_override||color_timing
if(!engine.defines.NORECTS){var elem=ui.drawRect(x+_ii4*bar_w,y+LINE_HEIGHT-h,x+(_ii4+1)*bar_w,y+LINE_HEIGHT,Z_GRAPH,color)
elem.x=elem.y=0}}}spriteChainedStop()
profilerStop("bar graph")
y+=LINE_YOFFS
var prefix
if(hasActiveChildren(walk))if(!walk.show_children)prefix="▶"
else prefix="▼"
var percent=0
if(1===settings.profiler_relative){if(walk.parent)if(do_average)percent=time_sum/HIST_SIZE/profilerAvgTime(walk.parent)
else percent=walk.history[show_index_time]?walk.history[show_index_time]/walk.parent.history[show_index_time]:0}else if(3===settings.profiler_relative)if(2===do_average)percent=dmem_max/total_frame_mem
else if(do_average)percent=dmem_avg/total_frame_mem
else percent=walk.history[show_index_mem]/total_frame_mem
else if(do_average)percent=time_sum/HIST_SIZE/total_frame_time
else percent=walk.history[show_index_time]/total_frame_time
x=depth*FONT_SIZE
if(prefix)font.drawSized(null,x-16,y,Z_TREE,FONT_SIZE,prefix)
x+=2*FONT_SIZE
font.drawSizedAligned(style_percent,x,y+number_yoffs,Z_NUMBER,font_size_number,font.ALIGN.HRIGHT,0,0,(100*percent).toFixed(0)+"%")
font.drawSized(style_name,x+=4,y,Z_NAMES,FONT_SIZE,walk.name)
x=COL_X[1]
var ms=do_average?time_sum/sum_count:walk.history[show_index_time]
var count=do_average?(count_sum/sum_count).toFixed(0):walk.history[show_index_count]
font.drawSizedAligned(style_ms,x,y+number_yoffs,Z_MS,font_size_number,font.ALIGN.HRIGHT,MS_W,0,(1e3*ms).toFixed(0))
x+=MS_W+4
font.drawSizedAligned(style_number,x,y+number_yoffs,Z_NUMBER,font_size_number,font.ALIGN.HFIT,COUNT_W,0,"("+count+")")
x=COL_X[2]
var spike=.25*time_max>time_sum/sum_count&&time_max>500
font.drawSizedAligned(spike?style_time_spike:style_ms,x,y+number_yoffs,Z_MS,font_size_number,font.ALIGN.HRIGHT,COL_W[2],0,(1e3*time_max).toFixed(0))
if(show_mem){x=COL_X[3]
var mem_value=2===do_average?dmem_max:do_average?dmem_avg:nodeMemValue(walk,show_index_count)
if(dmem_min<0){font.drawSizedAligned(style_time_spike,x,y+number_yoffs,Z_MS,font_size_number,font.ALIGN.HLEFT|font.ALIGN.HFIT,MEM_W/2,0,""+friendlyBytes(-dmem_min))
font.drawSizedAligned(style_mem,x+MEM_W/2,y+number_yoffs,Z_MS,font_size_number,font.ALIGN.HRIGHT|font.ALIGN.HFIT,MEM_W/2,0,""+mem_value)}else font.drawSizedAligned(style_mem,x,y+number_yoffs,Z_MS,font_size_number,font.ALIGN.HRIGHT,MEM_W,0,""+mem_value)}y+=FONT_SIZE+LINE_YOFFS
if(!walk.show_children)return false
return true}function doZoomedGraph(){if(settings.profiler_graph){perf_graph.line_scale_top=GRAPH_MAX_MEM
if(!mouseover_main_elem)mouseover_main_elem=profilerNodeTick()}else if(!mouseover_main_elem||mouseover_main_elem===node_out_of_tick)perf_graph.line_scale_top=2*GRAPH_FRAME_TIME
else perf_graph.line_scale_top=GRAPH_FRAME_TIME
var offs=1+settings.profiler_graph
if(mouseover_main_elem){var elem=mouseover_main_elem
for(var _ii5=0;_ii5<HIST_SIZE;++_ii5){perf_graph.data.history[2*_ii5]=elem.history[_ii5*HIST_COMPONENTS+offs]
perf_graph.data.history[2*_ii5+1]=0}}else for(var _ii6=0;_ii6<HIST_SIZE;++_ii6){var idx=_ii6*HIST_COMPONENTS+offs
perf_graph.data.history[2*_ii6]=root.history[idx]-node_out_of_tick.history[idx]
perf_graph.data.history[2*_ii6+1]=node_out_of_tick.history[idx]}perf_graph.data.index=history_index/HIST_COMPONENTS
perfGraphOverride(perf_graph)}var BUTTON_W=140
var BUTTON_H=48
var BUTTON_FONT_HEIGHT=24
var mouse_pos=vec2()
var bloat_none={inner:{time:0,mem:0},outer:{time:0,mem:0}}
var button_overlay
var button_close
var button_paused
var button_relative
var button_average
var button_graph
var button_mem_dec
var button_mem_depth
var button_mem_inc
var button_max_fps
var button_save
var button_load
var last_line_width
function buttonInit(){var z=Z.PROFILER+10
button_overlay={x:line_width,y:y=0,z:z,w:BUTTON_W,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT}
button_close={x:line_width+BUTTON_W,y:y,z:z,w:BUTTON_H,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT,text:"X"}
button_paused={x:line_width,y:y+=BUTTON_H,z:z,w:BUTTON_W,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT}
button_relative={x:line_width,y:y+=BUTTON_H,z:z,w:BUTTON_W,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT}
button_average={x:line_width,y:y+=BUTTON_H,z:z,w:BUTTON_W,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT}
button_graph={x:line_width,y:y+=BUTTON_H,z:z,w:BUTTON_W,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT}
y+=BUTTON_H
button_mem_dec={x:line_width,y:y+=LINE_HEIGHT,z:z,w:BUTTON_W/3,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT,text:"-"}
button_mem_depth={x:line_width+BUTTON_W/3,y:y,z:z,w:BUTTON_W/3,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT}
button_mem_inc={x:line_width+2*BUTTON_W/3,y:y,z:z,w:BUTTON_W/3,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT,text:"+"}
button_max_fps={x:line_width,y:y+=BUTTON_H,z:z,w:BUTTON_W,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT}
y+=BUTTON_H
button_save={x:line_width,y:y+=LINE_HEIGHT,z:z,w:BUTTON_W/2,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT,text:"save"}
button_load={x:line_width+BUTTON_W/2,y:y,z:z,w:BUTTON_W/2,h:BUTTON_H,font_height:BUTTON_FONT_HEIGHT,text:"load"}}function profilerUIRun(){profilerStart("profilerUIRun")
profilerStart("top+buttons")
bloat=bloat_none
if(!loaded_profile&&settings.profiler_hide_bloat)bloat=profilerMeasureBloat()
if(engine.render_width){var scale=FONT_SIZE/uiTextHeight()
camera2d.set(0,0,scale*engine.render_width,scale*engine.render_height)
font_number_scale=1
bar_w=scale}else{camera2d.setScreen(true)
font_number_scale=.9
bar_w=2}bar_x0=COL_X[1]-HIST_SIZE*bar_w
number_yoffs=(FONT_SIZE-(font_size_number=FONT_SIZE*font_number_scale))/2
if(profilerMemDepthGet()!==settings.profiler_mem_depth)profilerMemDepthSet(settings.profiler_mem_depth)
if(loaded_profile){history_index=loaded_profile.history_index
show_mem=loaded_profile.mem_depth>0}else{history_index=profilerHistoryIndex()
show_mem=HAS_MEMSIZE}line_width=show_mem?LINE_WIDTH_WITH_MEM:LINE_WIDTH_NO_MEM
if(!button_overlay||line_width!==last_line_width){last_line_width=line_width
buttonInit()}var z=Z.PROFILER+10
y=0
var x=line_width
button_overlay.text=settings.profiler_interactable?"interactable":"overlay"
if(ui.buttonText(button_overlay))settings.set("profiler_interactable",1-settings.profiler_interactable)
if((do_ui=settings.profiler_interactable)&&ui.buttonText(button_close))settings.set("show_profiler",0)
y+=BUTTON_H
var text=loaded_profile?"loaded":profilerPaused()?"paused":"live"
if(do_ui){button_paused.text=text
if(ui.buttonText(button_paused))if(loaded_profile)useLiveProfile()
else profilerPause(!profilerPaused())}else font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,BUTTON_H,text)
y+=BUTTON_H
if(do_ui){button_relative.text=PROFILER_RELATIVE_LABELS[settings.profiler_relative]
if(ui.buttonText(button_relative))settings.set("profiler_relative",(settings.profiler_relative+1)%PROFILER_RELATIVE_LABELS.length)}else font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,BUTTON_H,PROFILER_RELATIVE_LABELS[settings.profiler_relative])
y+=BUTTON_H
text=2===settings.profiler_average?"max":settings.profiler_average?"average":"last frame"
if(do_ui){button_average.text=text
if(ui.buttonText(button_average)){var num_values=HAS_MEMSIZE?3:2
settings.set("profiler_average",(settings.profiler_average+1)%num_values)}}else font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,BUTTON_H,text)
y+=BUTTON_H
text=settings.profiler_graph?"graph: mem":"graph: CPU"
if(do_ui){button_graph.text=text
if(ui.buttonText(button_graph))settings.set("profiler_graph",1-settings.profiler_graph)}else font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,BUTTON_H,text)
y+=BUTTON_H
if(loaded_profile?true:HAS_MEMSIZE){var cur_depth=loaded_profile?loaded_profile.mem_depth:profilerMemDepthGet()
font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,LINE_HEIGHT,"Mem Depth")
y+=LINE_HEIGHT
text=""+(cur_depth||"OFF")
if(do_ui){button_mem_dec.disabled=loaded_profile||0===cur_depth
if(ui.buttonText(button_mem_dec)){profilerMemDepthSet(cur_depth-1)
settings.set("profiler_mem_depth",profilerMemDepthGet())}button_mem_depth.disabled=loaded_profile
button_mem_depth.text=text
if(ui.buttonText(button_mem_depth)){if(cur_depth===MEM_DEPTH_DEFAULT)profilerMemDepthSet(99)
else profilerMemDepthSet(MEM_DEPTH_DEFAULT)
settings.set("profiler_mem_depth",profilerMemDepthGet())}button_mem_inc.disabled=loaded_profile
if(ui.buttonText(button_mem_inc)){profilerMemDepthSet(cur_depth+1)
settings.set("profiler_mem_depth",profilerMemDepthGet())}}else font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,BUTTON_H,text)}else y+=LINE_HEIGHT
y+=BUTTON_H
text=1e3===settings.max_fps?"max CPU":0===settings.max_fps?"anim frame":"?"
if(do_ui){button_max_fps.text=text
if(ui.buttonText(button_max_fps))settings.set("max_fps",0===settings.max_fps?1e3:0)}else font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,BUTTON_H,text)
y+=BUTTON_H
var total_calls=profilerChildCallCount(root,false,settings.profiler_average)
font.drawSizedAligned(null,x,y,z,FONT_SIZE,font.ALIGN.HVCENTERFIT,BUTTON_W,LINE_HEIGHT,total_calls+" calls")
y+=LINE_HEIGHT
if(do_ui){button_save.disabled=loaded_profile
if(ui.buttonText(button_save)){var a=document.createElement("a")
a.href="data:application/json,"+encodeURIComponent(profilerExport())
a.setAttribute("download","profile.json")
a.click()}if(ui.buttonText(button_load)){var input_elem=document.createElement("input")
input_elem.setAttribute("type","file")
var reader=new FileReader
reader.onload=function(){if(2===reader.readyState)useSavedProfile(reader.error||reader.result)}
input_elem.onchange=function(){reader.readAsText(input_elem.files[0])}
input_elem.click()}y+=BUTTON_H}ui.drawRect(x,0,x+BUTTON_W,y,z-1,color_bar)
y=0
font.drawSizedAligned(style_header,COL_X[0],y,z,FONT_SIZE,font.ALIGN.HLEFT,COL_W[0],0,COL_HEADERS[0])
for(var _ii7=1;_ii7<COL_HEADERS.length-(show_mem?0:1);++_ii7)font.drawSizedAligned(style_header,COL_X[_ii7],y,z,FONT_SIZE,font.ALIGN.HCENTER,COL_W[_ii7],0,COL_HEADERS[_ii7])
ui.drawRect(0,y,line_width,y+LINE_HEIGHT,z-1,color_bar_header)
var y0=y+=LINE_HEIGHT
mouseover_main_elem=null
mouseover_bar_idx=-1
if(do_ui){mouseover_elem={}
profilerWalkTree(root,profilerShowEntryEarly)
if(mouseover_main_elem){if(loaded_profile||profilerPaused()){var xx=input.mousePos(mouse_pos)[0]-bar_x0
if((mouseover_bar_idx=floor(xx/bar_w))<0||mouseover_bar_idx>=HIST_SIZE)mouseover_bar_idx=-1}for(var _ii8=dmem_max_value=0;_ii8<HIST_TOT;_ii8+=HIST_COMPONENTS)if(mouseover_main_elem.history[_ii8])dmem_max_value=max(dmem_max_value,mouseover_main_elem.history[_ii8+2])}}if(dmem_max_value<.25*GRAPH_MAX_MEM||dmem_max_value>GRAPH_MAX_MEM)GRAPH_MAX_MEM=lerp(.1,GRAPH_MAX_MEM,dmem_max_value)
dmem_max_value=0
do_average=settings.profiler_average
show_index_count=history_index
if(-1!==mouseover_bar_idx){do_average=false
show_index_count=(show_index_count-(HIST_SIZE-mouseover_bar_idx-1)*HIST_COMPONENTS+HIST_TOT)%HIST_TOT}show_index_time=show_index_count+1
show_index_mem=show_index_count+2
if(do_average){if(0===settings.profiler_relative){total_frame_time=0
var walk=root.child
while(walk){if(walk!==node_out_of_tick)total_frame_time+=profilerAvgTime(walk)
walk=walk.next}total_frame_time=max(total_frame_time,.001)}else if(2===settings.profiler_relative)total_frame_time=profilerAvgTime(root)
else if(3===settings.profiler_relative)if(2===do_average)total_frame_mem=profilerMaxMem(root)
else total_frame_mem=profilerAvgMem(root)}else if(0===settings.profiler_relative){total_frame_time=0
var _walk=root.child
while(_walk){if(_walk!==node_out_of_tick)total_frame_time+=_walk.history[show_index_time]
_walk=_walk.next}total_frame_time=max(total_frame_time,.001)}else if(2===settings.profiler_relative)total_frame_time=root.history[show_index_time]
else if(3===settings.profiler_relative)if((total_frame_mem=root.history[show_index_mem])<0){var _walk2=root.child
total_frame_mem=0
while(_walk2){total_frame_mem+=max(0,_walk2.history[show_index_mem])
_walk2=_walk2.next}}profilerStopStart("interface")
y=y0
profilerWalkTree(root,profilerShowEntry)
var hint=!loaded_profile&&profilerWarning()
if(hint){font.drawSizedAligned(style_name,FONT_SIZE,y,Z_NAMES,FONT_SIZE,font.ALIGN.HVCENTERFIT,line_width-2*FONT_SIZE,1.5*LINE_HEIGHT,hint)
ui.drawRect(0,y,line_width,y+1.5*LINE_HEIGHT,Z_NAMES-.5,color_hint)}if(-1!==mouseover_bar_idx)ui.drawRect(bar_x0+mouseover_bar_idx*bar_w,y0,bar_x0+(mouseover_bar_idx+1)*bar_w,y,Z_GRAPH+.5,color_bar_highlight)
if(do_ui)input.mouseOver({x:0,y:0,w:line_width,h:y})
doZoomedGraph()
profilerStop()
profilerStop("profilerUIRun")}function profilerUIStartup(){font=ui.font
useLiveProfile()}function profilerUI(){if(engine.DEBUG&&input.keyUpEdge(input.KEYS.F7))profilerToggle()
if(settings.show_profiler)profilerUIRun()
if(engine.DEBUG||settings.show_profiler);}cmd_parse.register({cmd:"profile",help:"Captures a performance profile for developer investigation",prefix_usage_with_help:true,usage:"Optionally delays for DELAY seconds before capturing the profile.\nUsage: /profile [DELAY]",func:function func(str,resp_func){function doit(){var profile=profilerExport()
if(netDisconnected()){ui.provideUserString("Profiler Snapshot",profile)
resp_func()}else netClient().send("profile",profile,null,function(err,data){if(null!=data&&data.id){ui.provideUserString("Profile submitted","ID="+data.id)
resp_func(null,"Profile submitted with ID="+data.id)}else resp_func(err,data)})}if(Number(str))setTimeout(doit,1e3*Number(str))
else doit()}})

},{"../common/util.js":96,"../common/vmath.js":98,"./camera2d.js":15,"./cmds.js":17,"./engine.js":21,"./font.js":28,"./input.js":37,"./net.js":48,"./perf.js":51,"./profiler.js":55,"./settings.js":59,"./sprites.js":68,"./ui.js":72}],57:[function(require,module,exports){
"use strict"
exports.randFastCreate=randFastCreate
exports.randSimpleSpatial=randSimpleSpatial
function step2(seed){seed=seed>>>0||22329833666
seed^=seed<<13
seed^=seed>>>17
seed^=seed<<5
seed^=seed<<13
seed^=seed>>>17
return(seed^=seed<<5)>>>0}function RandSeed2(seed){this.seed=step2(seed)}RandSeed2.prototype.reseed=function(seed){this.seed=step2(seed)}
RandSeed2.prototype.step=function(){var seed=this.seed
seed^=seed<<13
seed^=seed>>>17
return(this.seed=(seed^=seed<<5)>>>0)-1}
RandSeed2.prototype.uint32=RandSeed2.prototype.step
RandSeed2.prototype.range=function(range){return this.step()*range*2.3283064376e-10|0}
RandSeed2.prototype.random=function(){return 2.3283064376e-10*this.step()}
RandSeed2.prototype.floatBetween=function(a,b){return a+(b-a)*this.random()}
function randFastCreate(seed){return new RandSeed2(seed)}var RND_A=134775813
var RND_B=1103515245
function randSimpleSpatial(seed,x,y,z){return(((x^(y+=10327*z))*RND_A^seed+x)*(RND_B*x<<16^RND_B*y-RND_A)>>>0)/4294967295}

},{}],58:[function(require,module,exports){
"use strict"
exports.scrollAreaCreate=scrollAreaCreate
exports.scrollAreaSetPixelScale=scrollAreaSetPixelScale
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var assert=require("assert")
var _glovCommonUtil=require("../common/util")
var clamp=_glovCommonUtil.clamp
var merge=_glovCommonUtil.merge
var _glovCommonVmath=require("../common/vmath")
var vec2=_glovCommonVmath.vec2
var vec4=_glovCommonVmath.vec4
var _camera2d=require("./camera2d")
var camera2d=_camera2d
var _engine=require("./engine")
var engine=_engine
var _engine2=require("./engine")
var renderNeeded=_engine2.renderNeeded
var _input=require("./input")
var input=_input
var _input2=require("./input")
var BUTTON_LEFT=_input2.BUTTON_LEFT
var KEYS=_input2.KEYS
var PAD=_input2.PAD
var _spot=require("./spot")
var SPOT_DEFAULT_BUTTON=_spot.SPOT_DEFAULT_BUTTON
var SPOT_STATE_DOWN=_spot.SPOT_STATE_DOWN
var SPOT_STATE_FOCUSED=_spot.SPOT_STATE_FOCUSED
var spot=_spot.spot
var spotPadMode=_spot.spotPadMode
var spotSubBegin=_spot.spotSubBegin
var spotSubEnd=_spot.spotSubEnd
var spotUnfocus=_spot.spotUnfocus
var _sprites=require("./sprites")
var spriteClipPop=_sprites.spriteClipPop
var spriteClipPush=_sprites.spriteClipPush
var _textures=require("./textures")
var textureDefaultIsNearest=_textures.textureDefaultIsNearest
var _ui=require("./ui")
var ui=_ui
var _ui2=require("./ui")
var uiTextHeight=_ui2.uiTextHeight
var abs=Math.abs,max=Math.max,min=Math.min,round=Math.round
var MAX_OVERSCROLL=50
var OVERSCROLL_DELAY_WHEEL=180
function darken(color,factor){return vec4(color[0]*factor,color[1]*factor,color[2]*factor,color[3])}var default_pixel_scale=1
function scrollAreaSetPixelScale(scale){default_pixel_scale=scale}var temp_pos=vec2()
var last_scroll_area_id=0
var ScrollAreaInternal=function(){function ScrollAreaInternal(params){this.id="sa:"+ ++last_scroll_area_id
this.x=0
this.y=0
this.z=Z.UI
this.w=10
this.h=10
this.rate_scroll_click=uiTextHeight()
this.pixel_scale=default_pixel_scale
this.top_pad=true
this.color=vec4(1,1,1,1)
this.background_color=vec4(.4,.4,.4,1)
this.auto_scroll=false
this.auto_hide=false
this.no_disable=false
this.focusable_elem=null
this.min_dist=void 0
this.disabled=false
this.rate_scroll_wheel=void 0
this.rollover_color=void 0
this.rollover_color_light=void 0
this.disabled_color=void 0
this.scroll_pos=0
this.overscroll=0
this.overscroll_delay=0
this.grabbed_pos=0
this.grabbed=false
this.consumed_click=false
this.drag_start=null
this.began=false
this.last_internal_h=0
this.last_frame=0
this.was_disabled=false
this.scrollbar_visible=false
this.last_max_value=0
this.ignore_this_fram_drag=false
this.applyParams(params=params||{})
this.rate_scroll_wheel=params.rate_scroll_wheel||2*this.rate_scroll_click
this.rollover_color=params.rollover_color||darken(this.color,.75)
this.rollover_color_light=params.rollover_color_light||darken(this.color,.95)
assert(this.rollover_color_light!==this.color)
this.disabled_color=params.disabled_color||this.rollover_color}var _proto=ScrollAreaInternal.prototype
_proto.applyParams=function applyParams(params){if(!params)return
merge(this,params)}
_proto.barWidth=function barWidth(){var pixel_scale=this.pixel_scale
return ui.sprites.scrollbar_top.uidata.total_w*pixel_scale}
_proto.isFocused=function isFocused(){assert(false,"deprecated?")
return false}
_proto.consumedClick=function consumedClick(){return this.consumed_click}
_proto.isVisible=function isVisible(){return this.scrollbar_visible}
_proto.begin=function begin(params){this.applyParams(params)
var x=this.x,y=this.y,w=this.w,h=this.h,z=this.z,id=this.id
this.began=true
spotSubBegin({x:x,y:y,w:w,h:h,key:id})
spriteClipPush(z+.05,x,y,w-this.barWidth(),h)
var camera_orig_x0=camera2d.x0()
var camera_orig_x1=camera2d.x1()
var camera_orig_y0=camera2d.y0()
var camera_orig_y1=camera2d.y1()
var camera_new_x0=-(x-camera_orig_x0)
var camera_new_y0=-(y-camera_orig_y0)+this.getScrollPos()
var camera_new_x1=camera_new_x0+camera_orig_x1-camera_orig_x0
var camera_new_y1=camera_new_y0+camera_orig_y1-camera_orig_y0
camera2d.push()
camera2d.set(camera_new_x0,camera_new_y0,camera_new_x1,camera_new_y1)
this.ignore_this_fram_drag=false}
_proto.getScrollPos=function getScrollPos(){return round(this.scroll_pos+this.overscroll)}
_proto.clampScrollPos=function clampScrollPos(){var clamped_pos=clamp(this.scroll_pos,0,this.last_max_value)
if(this.scroll_pos<0)this.overscroll=max(this.scroll_pos,-MAX_OVERSCROLL)
else if(this.scroll_pos>this.last_max_value)this.overscroll=min(this.scroll_pos-this.last_max_value,MAX_OVERSCROLL)
this.scroll_pos=clamped_pos}
_proto.keyboardScroll=function keyboardScroll(){if(this.was_disabled)return
var modified=false
var pad_shift=input.padButtonDown(PAD.RIGHT_TRIGGER)||input.padButtonDown(PAD.LEFT_TRIGGER)
var value=input.keyDownEdge(KEYS.PAGEDOWN)+(pad_shift?input.padButtonDownEdge(PAD.DOWN):0)
if(value){this.scroll_pos=min(this.scroll_pos+this.h,this.scroll_pos===this.last_max_value?Infinity:this.last_max_value)
modified=true}if(value=input.keyDownEdge(KEYS.PAGEUP)+(pad_shift?input.padButtonDownEdge(PAD.UP):0)){this.scroll_pos=max(this.scroll_pos-this.h,0===this.scroll_pos?-this.h:0)
modified=true}if(modified)this.clampScrollPos()}
_proto.end=function end(h){assert(h>=0)
h=max(h,1)
assert(this.began)
this.began=false
this.consumed_click=false
var focused_sub_elem=spotSubEnd()
camera2d.pop()
spriteClipPop()
if(focused_sub_elem&&spotPadMode())this.scrollIntoFocus(focused_sub_elem.y,focused_sub_elem.y+focused_sub_elem.h+1,this.h)
var maxvalue=max(h-this.h+1,0)
if(this.scroll_pos>maxvalue){var extra=this.scroll_pos-maxvalue
this.scroll_pos=max(0,maxvalue)
if(this.overscroll<0)this.overscroll=min(this.overscroll+extra,0)}var was_at_bottom=this.scroll_pos===this.last_max_value
if(this.auto_scroll&&(this.last_frame!==engine.getFrameIndex()-1||this.last_internal_h!==h&&was_at_bottom)){this.overscroll=max(0,this.scroll_pos+this.overscroll-maxvalue)
this.scroll_pos=maxvalue}this.last_internal_h=h
this.last_frame=engine.getFrameIndex()
if(this.overscroll){var dt=engine.getFrameDt()
if(dt>=this.overscroll_delay){this.overscroll_delay=0
this.overscroll*=max(1-.008*dt,0)
if(abs(this.overscroll)<.001)this.overscroll=0}else this.overscroll_delay-=dt
renderNeeded()}var auto_hide=this.auto_hide,pixel_scale=this.pixel_scale,rollover_color=this.rollover_color,rollover_color_light=this.rollover_color_light
var _ui$sprites=ui.sprites,scrollbar_top=_ui$sprites.scrollbar_top,scrollbar_bottom=_ui$sprites.scrollbar_bottom,scrollbar_trough=_ui$sprites.scrollbar_trough,scrollbar_handle=_ui$sprites.scrollbar_handle,scrollbar_handle_grabber=_ui$sprites.scrollbar_handle_grabber
var bar_w=scrollbar_top.uidata.total_w*pixel_scale
var button_h=min(scrollbar_top.uidata.total_h*pixel_scale,this.h/3)
var button_h_nopad=this.top_pad?button_h:0
var bar_x0=this.x+this.w-bar_w
var handle_h=this.h/h
handle_h=clamp(handle_h,0,1)
var handle_pos=this.h>=h?0:this.scroll_pos/(h-this.h)
handle_pos=clamp(handle_pos,0,1)
assert(isFinite(handle_pos))
var handle_pixel_h=handle_h*(this.h-2*button_h_nopad)
var handle_pixel_min_h=scrollbar_handle.uidata.total_h*pixel_scale
var trough_height=this.h-2*button_h
handle_pixel_h=max(handle_pixel_h,min(handle_pixel_min_h,.75*trough_height))
var handle_screenpos=this.y+button_h_nopad+handle_pos*(this.h-2*button_h_nopad-handle_pixel_h)
if(textureDefaultIsNearest())handle_screenpos=round(handle_screenpos)
var top_color=this.color
var bottom_color=this.color
var handle_color=this.color
var trough_color=this.color
var disabled=this.disabled
var auto_hidden=false
if(!this.h)auto_hidden=disabled=true
else if(1===handle_h){auto_hidden=true
if(this.no_disable)trough_color=top_color=bottom_color=handle_color=this.disabled_color
else disabled=true}var gained_focus=false
if(this.was_disabled=disabled){trough_color=top_color=bottom_color=handle_color=this.disabled_color
this.drag_start=null}else{var wheel_delta=input.mouseWheel({x:this.x,y:this.y,w:this.w,h:this.h})
if(wheel_delta){this.overscroll_delay=OVERSCROLL_DELAY_WHEEL
this.scroll_pos-=this.rate_scroll_wheel*wheel_delta
if(focused_sub_elem)spotUnfocus()}var handle_rect={x:bar_x0,y:handle_screenpos,w:bar_w,h:handle_pixel_h,button:0,spot_debug_ignore:true}
var down=input.mouseDownEdge(handle_rect)
if(down){this.grabbed_pos=down.pos[1]-handle_screenpos
this.grabbed=true
handle_color=rollover_color_light}if(this.grabbed)gained_focus=true
if(this.grabbed){var up=input.mouseUpEdge({button:0})
if(up){temp_pos[1]=up.pos[1]
this.consumed_click=true}else if(!input.mouseDownAnywhere(0)){this.grabbed=false
this.consumed_click=true}else input.mousePos(temp_pos)
if(this.grabbed){var delta=temp_pos[1]-(this.y+button_h_nopad)-this.grabbed_pos
var denom=this.h-2*button_h_nopad-handle_pixel_h
if(denom>0){this.scroll_pos=(h-this.h)*delta/denom
assert(isFinite(this.scroll_pos))}handle_color=rollover_color_light}}if(input.mouseOver(handle_rect))if(handle_color!==rollover_color_light)handle_color=rollover_color
var button_param_up={x:bar_x0,y:this.y,w:bar_w,h:button_h,button:BUTTON_LEFT,pad_focusable:false,disabled:this.grabbed,disabled_focusable:false,def:SPOT_DEFAULT_BUTTON}
var button_param_down=_extends({},button_param_up,{y:this.y+this.h-button_h})
var button_spot_ret=spot(button_param_up)
while(button_spot_ret.ret){--button_spot_ret.ret
gained_focus=true
this.scroll_pos-=this.rate_scroll_click
this.consumed_click=true}if(button_spot_ret.spot_state===SPOT_STATE_DOWN)top_color=rollover_color_light
else if(button_spot_ret.spot_state===SPOT_STATE_FOCUSED)top_color=rollover_color
button_spot_ret=spot(button_param_down)
while(button_spot_ret.ret){--button_spot_ret.ret
gained_focus=true
this.scroll_pos+=this.rate_scroll_click
this.consumed_click=true}if(button_spot_ret.spot_state===SPOT_STATE_DOWN)bottom_color=rollover_color_light
else if(button_spot_ret.spot_state===SPOT_STATE_FOCUSED)bottom_color=rollover_color
var bar_param={key:"bar_"+this.id,x:bar_x0,y:this.y,w:bar_w,h:this.h,button:BUTTON_LEFT,sound_rollover:null,pad_focusable:false,def:SPOT_DEFAULT_BUTTON}
var bar_spot_ret=spot(bar_param)
while(bar_spot_ret.ret){--bar_spot_ret.ret
this.consumed_click=gained_focus=true
if(bar_spot_ret.pos)if(bar_spot_ret.pos[1]>handle_screenpos+handle_pixel_h/2)this.scroll_pos+=this.h
else this.scroll_pos-=this.h}var drag=input.drag({x:this.x,y:this.y,w:this.w-bar_w,h:this.h,button:0,min_dist:this.min_dist})
if(drag&&!this.ignore_this_fram_drag){if(null===this.drag_start)this.drag_start=this.scroll_pos
this.scroll_pos=this.drag_start-drag.cur_pos[1]+drag.start_pos[1]
this.consumed_click=true}else this.drag_start=null
input.drag({x:this.x+this.w-bar_w,y:this.y,w:bar_w,h:this.h,button:0})}if(gained_focus&&this.focusable_elem)this.focusable_elem.focus()
this.last_max_value=maxvalue
this.clampScrollPos()
if(this.background_color)ui.drawRect(this.x,this.y,this.x+this.w,this.y+this.h,this.z,this.background_color)
if(disabled&&(auto_hide&&auto_hidden||!this.h)){this.scrollbar_visible=false
return}this.scrollbar_visible=true
scrollbar_top.draw({x:bar_x0,y:this.y,z:this.z+.2,w:bar_w,h:button_h,color:top_color})
scrollbar_bottom.draw({x:bar_x0,y:this.y+this.h-button_h,z:this.z+.2,w:bar_w,h:button_h,color:bottom_color})
var trough_draw_pad=button_h/2
var trough_draw_height=trough_height+2*trough_draw_pad
var trough_v0=-trough_draw_pad/pixel_scale/scrollbar_trough.uidata.total_h
var trough_v1=trough_v0+trough_draw_height/pixel_scale/scrollbar_trough.uidata.total_h
if(scrollbar_trough.texs[0].wrap_t===gl.REPEAT)scrollbar_trough.draw({x:bar_x0,y:this.y+trough_draw_pad,z:this.z+.1,w:bar_w,h:trough_draw_height,uvs:[scrollbar_trough.uvs[0],trough_v0,scrollbar_trough.uvs[2],trough_v1],color:trough_color})
else ui.drawVBox({x:bar_x0,y:this.y+trough_draw_pad,z:this.z+.1,w:bar_w,h:trough_draw_height},scrollbar_trough,trough_color)
ui.drawVBox({x:bar_x0,y:handle_screenpos,z:this.z+.3,w:bar_w,h:handle_pixel_h},scrollbar_handle,handle_color)
var grabber_h=scrollbar_handle_grabber.uidata.total_h*pixel_scale
scrollbar_handle_grabber.draw({x:bar_x0,y:handle_screenpos+(handle_pixel_h-grabber_h)/2,z:this.z+.4,w:bar_w,h:grabber_h,color:handle_color})}
_proto.scrollIntoFocus=function scrollIntoFocus(miny,maxy,h){var old_scroll_pos=this.scroll_pos
var changed=false
if((miny=max(miny,0))<this.scroll_pos){this.scroll_pos=miny
changed=true}if((maxy-=h)>this.scroll_pos){this.scroll_pos=maxy
changed=true}if(changed)this.overscroll=old_scroll_pos-this.scroll_pos
this.ignore_this_fram_drag=true}
_proto.scrollToEnd=function scrollToEnd(){this.scroll_pos=this.last_max_value}
_proto.resetScroll=function resetScroll(){this.scroll_pos=0
this.overscroll=0}
return ScrollAreaInternal}()
function scrollAreaCreate(params){return new ScrollAreaInternal(params)}

},{"../common/util":96,"../common/vmath":98,"./camera2d":15,"./engine":21,"./input":37,"./spot":66,"./sprites":68,"./textures":70,"./ui":72,"assert":undefined}],59:[function(require,module,exports){
"use strict"
exports.settingIsModified=settingIsModified
exports.settingsGet=settingsGet
exports.settingsPop=settingsPop
exports.settingsPush=settingsPush
exports.settingsRegister=settingsRegister
exports.settingsRunTimeDefault=settingsRunTimeDefault
exports.settingsSet=settingsSet
exports.settingsSetAsync=settingsSetAsync
var modified={}
exports.true=true
var change_cbs={}
exports.get=settingsGet
exports.set=settingsSet
exports.setAsync=settingsSetAsync
exports.runTimeDefault=settingsRunTimeDefault
exports.push=settingsPush
exports.pop=settingsPop
exports.register=settingsRegister
var assert=require("assert")
var _require=require("../common/util.js"),titleCase=_require.titleCase
var _require2=require("./cmds.js"),cmd_parse=_require2.cmd_parse
var engine=require("./engine.js")
function settingsGet(key){return exports[key]}function settingsSet(key,value){if(exports[key]!==value)cmd_parse.handle(null,key+" "+value,null)}function settingsSetAsync(key,value){engine.postTick({fn:settingsSet.bind(null,key,value)})}function settingsRunTimeDefault(key,new_default){assert(!change_cbs[key])
if(!modified[key])exports[key]=new_default}function settingIsModified(key){return modified[key]}var settings_stack=null
function settingsPush(pairs){assert(!settings_stack)
settings_stack={}
for(var key in pairs){settings_stack[key]=exports[key]
exports[key]=pairs[key]
var cb=change_cbs[key]
if(cb)cb(false)}}function settingsPop(){assert(settings_stack)
for(var key in settings_stack){exports[key]=settings_stack[key]
var cb=change_cbs[key]
if(cb)cb(false)}settings_stack=null}function settingsRegister(defs){Object.keys(defs).forEach(function(key){var def=defs[key]
exports[key]=def.default_value
if(def.on_change)change_cbs[key]=def.on_change
cmd_parse.registerValue(key,{type:def.type,label:def.label||titleCase(key.replace(/_/g," ")),range:def.range,get:function get(){return exports[key]},set:function set(v){modified[key]=true
exports[key]=v},store:false!==def.store,ver:def.ver,help:def.help,usage:def.usage,prefix_usage_with_help:def.prefix_usage_with_help,on_change:def.on_change,access_run:def.access_run,access_show:def.access_show,default_value:def.default_value,enum_lookup:def.enum_lookup,is_toggle:def.is_toggle})})}settingsRegister({max_fps:{label:"Maximum frame rate (FPS)",prefix_usage_with_help:true,usage:"Display current maximum: /max_fps\nSet maximum FPS limit: /max_fps 30\nSet automatic by browser: /max_fps 0 (may be unresponsive)\nSet unlimited: /max_fps 1000 (may be unresponsive)\nDefault: /max_fps 60",default_value:60,type:cmd_parse.TYPE_FLOAT,ver:2},use_animation_frame:{label:"Use requestAnimationFrame",help:"Use requestAnimationFrame for any max_fps values lower than this value.",prefix_usage_with_help:true,default_value:60,type:cmd_parse.TYPE_INT,range:[0,240]},render_scale:{label:"Render Scale (3D)",default_value:1,type:cmd_parse.TYPE_FLOAT,range:[.1,1]},render_scale_mode:{label:"Render Scale Mode",default_value:0,type:cmd_parse.TYPE_INT,enum_lookup:{LINEAR:0,NEAREST:1,CRT:2}},render_scale_all:{label:"Render Scale (All)",default_value:1,type:cmd_parse.TYPE_FLOAT,range:[.3333,4]},render_scale_clear:{label:"Render Scale Full Clear",default_value:1,type:cmd_parse.TYPE_INT,range:[0,1]},fov:{default_value:60,type:cmd_parse.TYPE_FLOAT,range:[1,100]},double_click_time:{default_value:500,type:cmd_parse.TYPE_INT,range:[0,2500]}})

},{"../common/util.js":96,"./cmds.js":17,"./engine.js":21,"assert":undefined}],60:[function(require,module,exports){
"use strict"
exports.shaderDebugUIStartup=shaderDebugUIStartup
var camera2d=require("./camera2d.js")
var _require=require("./cmds.js"),cmd_parse=_require.cmd_parse
var engine=require("./engine.js")
var _require2=require("./fetch.js"),fetch=_require2.fetch
var glov_font=require("./font.js")
var input=require("./input.js")
var min=Math.min
var _require3=require("./scroll_area.js"),scrollAreaCreate=_require3.scrollAreaCreate
var _require4=require("./shaders.js"),shadersGetDebug=_require4.shadersGetDebug
var settings=require("./settings.js")
var ui=require("./ui.js")
var _require5=require("./ui.js"),uiTextHeight=_require5.uiTextHeight
var _require6=require("../common/util.js"),errorString=_require6.errorString
var _require7=require("../common/vmath.js"),vec4=_require7.vec4
Z.SHADER_DEBUG=Z.SHADER_DEBUG||900
var SHADER_STATS_SERVER="http://localhost:3000/api/shaderstats"
var shader_stats_cache={}
function getShaderStats(text,stage,peek){if(shader_stats_cache[text])return shader_stats_cache[text].data
if(peek)return null
var cache=shader_stats_cache[text]={data:null}
fetch({url:SHADER_STATS_SERVER+"?stage="+stage+"&text="+encodeURIComponent(text),response_type:"json"},function(err,obj){if(err)cache.data={err:"Fetch error: "+errorString(err)}
else cache.data=obj})
return cache.data}var PAD=4
var style_title=glov_font.styleColored(null,2156986367)
var style=glov_font.styleColored(null,572662527)
var style_error=glov_font.styleColored(null,3710001919)
var color_line=vec4(.4,.4,.4,1)
var color_panel=vec4(1,1,1,1)
var color_invalid=vec4(.8,0,0,1)
var color_selected=vec4(.4,.6,1,1)
var scroll_area
var scroll_area_source
var selected_shader
function shaderDebugUITick(){var PANEL_PAD=ui.tooltip_pad
var x0=camera2d.x0()+PANEL_PAD
var y0=camera2d.y0()+PANEL_PAD
var z=Z.SHADER_DEBUG
var font=ui.font,title_font=ui.title_font
var font_height=uiTextHeight()
var w=20*font_height
var x=x0
var y=y0
var shaders=shadersGetDebug()
title_font.drawSizedAligned(style_title,x,y,z,font_height,font.ALIGN.HCENTERFIT,w,0,"Shaders ("+shaders.length+")")
if(!scroll_area){scroll_area=scrollAreaCreate({z:z,background_color:null,auto_hide:true})
scroll_area_source=scrollAreaCreate({z:z,background_color:null,auto_hide:true})}var sub_w=w-PAD-scroll_area.barWidth()
var score_w=.3*sub_w
var subscore_w=score_w/2
var button_w=sub_w-score_w-PAD
font.draw({x:x+button_w+PAD,y:y+.5*font_height,z:z,w:subscore_w-1,color:1077952767,size:.5*font_height,text:"Ops",align:font.ALIGN.HCENTERFIT})
font.draw({x:x+button_w+PAD+subscore_w+1,y:y+.5*font_height,z:z,w:subscore_w-1,color:1077952767,size:.5*font_height,text:"Bytes",align:font.ALIGN.HCENTERFIT})
y+=font_height+1
ui.drawLine(x0+.3*w,y,x0+.7*w,y,z,.5,true,color_line)
y+=PAD
var max_h=camera2d.y1()-PAD-y
var scroll_y_start=y
scroll_area.begin({x:x,y:y,w:w,h:max_h})
y=x=0
z=Z.UI
for(var ii=0;ii<shaders.length;++ii){var _shader=shaders[ii]
var filename=_shader.filename.replace("shaders/","")
if(_shader.defines_arr.length)filename+="("+_shader.defines_arr.join(",")+")"
if(ui.buttonText({text:filename,x:x,y:y,z:z,w:button_w,h:font_height,color:selected_shader===_shader?color_selected:_shader.valid?void 0:color_invalid,align:glov_font.ALIGN.HFIT}))if(selected_shader===_shader)selected_shader=void 0
else selected_shader=_shader
var _stats=getShaderStats(_shader.shader_source_text,_shader.type===gl.FRAGMENT_SHADER?"frag":"vert",false)
if(!_stats||_stats.err)font.draw({x:x+button_w+PAD,y:y,z:z,w:score_w,color:null!=_stats&&_stats.err?2147483903:2155905279,text:null!=_stats&&_stats.err?"ERR":"...",align:font.ALIGN.HCENTERFIT})
else{var _stats$spirv
var color=255
font.draw({x:x+button_w+PAD,y:y,z:z,w:subscore_w-1,color:color,text:""+(null==(_stats$spirv=_stats.spirv)?void 0:_stats$spirv.count_total),align:font.ALIGN.HCENTERFIT})
font.draw({x:x+button_w+PAD+subscore_w+1,y:y,z:z,w:subscore_w-1,color:color,text:_stats.bin_size.toLocaleString(),align:font.ALIGN.HCENTERFIT})}y+=font_height}scroll_area.end(y)
y=scroll_y_start+min(max_h,y)
z=Z.SHADER_DEBUG
var close_button_size=font_height
if(ui.buttonText({x:x0+w-close_button_size,y:y0,z:z+1,w:close_button_size,h:close_button_size,text:"X"}))settings.set("shader_debug",0)
ui.panel({x:x0-PANEL_PAD,y:y0-PANEL_PAD,z:z-1,w:w+2*PANEL_PAD,h:y-y0+2*PANEL_PAD,color:color_panel})
if(!selected_shader)return
var shader=selected_shader
x0+=w+2*PANEL_PAD
w=camera2d.x1()-PAD-x0
x=x0
y=y0
font.draw({x:x,y:y,z:z,w:w,style:style,text:shader.filename,align:font.ALIGN.HCENTERFIT})
y+=font_height+1
ui.drawLine(x0+.3*w,y,x0+.7*w,y,z,.5,true,color_line)
scroll_y_start=y+=PAD
scroll_area_source.begin({x:x,y:y,w:w,h:max_h})
sub_w=w-PAD-scroll_area_source.barWidth()
y=x=0
z=Z.UI
if(shader.error_text)y+=font.draw({x:x,y:y,z:z,w:sub_w,color:2147483903,style:style,text:shader.error_text,align:font.ALIGN.HWRAP})
function flatten(obj,path){for(var key in obj){if("text"===key||"spirv_raw"===key)continue
var value=obj[key]
var subpath=path?path+"."+key:key
if("object"===typeof value)flatten(value,subpath)
else{font.draw({x:x,y:y,z:z,w:sub_w,style:style,text:subpath+": "+value,align:font.ALIGN.HFIT})
y+=font_height}}}var stats=getShaderStats(shader.shader_source_text,shader.type===gl.FRAGMENT_SHADER?"frag":"vert")
if(!stats)y+=font.draw({x:x,y:y,z:z,w:w,style:style,text:"Loading shader stats...",align:font.ALIGN.HWRAP})
else if(stats.err)y+=font.draw({x:x,y:y,z:z,w:sub_w,style:style_error,text:String(stats.err),align:font.ALIGN.HWRAP})
else flatten(stats)
var source_height=.5*font_height
if(null!=stats&&stats.text){y+=PAD
ui.drawLine(x+.3*w,y,x+.7*w,y,z,.5,true,color_line)
y+=PAD/2
font.draw({x:x,y:y,z:z,w:w,style:style,text:"Analyzed Shader Source",align:font.ALIGN.HCENTERFIT})
y+=font_height+1
var _h=font.draw({x:x,y:y,z:z,w:w,size:source_height,style:style,text:stats.text,align:font.ALIGN.HWRAP})
if(input.click({x:x,y:y,w:w,h:_h}))ui.provideUserString("Analyzed shader source",stats.text)
y+=_h}if(null!=stats&&stats.spirv_raw){y+=PAD
ui.drawLine(x+.3*w,y,x+.7*w,y,z,.5,true,color_line)
y+=PAD/2
font.draw({x:x,y:y,z:z,w:w,style:style,text:"SPIR-V Disassembly",align:font.ALIGN.HCENTERFIT})
y+=font_height+1
var _h2=font.draw({x:x,y:y,z:z,w:w,size:source_height,style:style,text:stats.spirv_raw,align:font.ALIGN.HWRAP})
if(input.click({x:x,y:y,w:w,h:_h2}))ui.provideUserString("SPIR-V Disassembly",stats.spirv_raw)
y+=_h2}y+=PAD
ui.drawLine(x+.3*w,y,x+.7*w,y,z,.5,true,color_line)
y+=PAD/2
font.draw({x:x,y:y,z:z,w:w,style:style,text:"Actual WebGL Shader Source",align:font.ALIGN.HCENTERFIT})
y+=font_height+1
var h=font.draw({x:x,y:y,z:z,w:w,size:source_height,style:style,text:shader.shader_source_text,align:font.ALIGN.HWRAP})
if(input.click({x:x,y:y,w:w,h:h}))ui.provideUserString("Used WebGL shader source",shader.shader_source_text)
y+=h
scroll_area_source.end(y)
y=scroll_y_start+min(max_h,y)
z=Z.SHADER_DEBUG
ui.panel({x:x0-PANEL_PAD,y:y0-PANEL_PAD,z:z-1,w:w+2*PANEL_PAD,h:y-y0+2*PANEL_PAD,color:color_panel})}function shaderDebugUIStartup(){settings.register({shader_debug:{label:"Shader Debug",default_value:0,type:cmd_parse.TYPE_INT,range:[0,1],access_show:["sysadmin"],on_change:function on_change(){engine.removeTickFunc(shaderDebugUITick)
if(settings.shader_debug)engine.addTickFunc(shaderDebugUITick)}}})}

},{"../common/util.js":96,"../common/vmath.js":98,"./camera2d.js":15,"./cmds.js":17,"./engine.js":21,"./fetch.js":26,"./font.js":28,"./input.js":37,"./scroll_area.js":58,"./settings.js":59,"./shaders.js":61,"./ui.js":72}],61:[function(require,module,exports){
"use strict"
exports.SEMANTIC=exports.MAX_SEMANTIC=void 0
exports.addReservedDefine=addReservedDefine
exports.globals=void 0
exports.shaderCreate=shaderCreate
exports.shadersAddGlobal=shadersAddGlobal
exports.shadersBind=shadersBind
exports.shadersGetDebug=shadersGetDebug
exports.shadersHandleDefinesChanged=shadersHandleDefinesChanged
exports.shadersPrelink=shadersPrelink
exports.shadersRequirePrelink=shadersRequirePrelink
exports.shadersResetState=shadersResetState
exports.shadersSetGLErrorReportDetails=shadersSetGLErrorReportDetails
exports.shadersSetInternalDefines=shadersSetInternalDefines
exports.shadersStartup=shadersStartup
var MAX_SEMANTIC=5
exports.MAX_SEMANTIC=MAX_SEMANTIC
var SEMANTIC={ATTR0:0,POSITION:0,ATTR1:1,COLOR:1,COLOR_0:1,ATTR2:2,TEXCOORD:2,TEXCOORD_0:2,ATTR3:3,NORMAL:3,ATTR4:4,TEXCOORD_1:4}
exports.SEMANTIC=SEMANTIC
var assert=require("assert")
var engine=require("./engine.js")
var _require=require("./error_report.js"),errorReportClear=_require.errorReportClear,errorReportSetDetails=_require.errorReportSetDetails,errorReportSetDynamicDetails=_require.errorReportSetDynamicDetails,glovErrorReport=_require.glovErrorReport
var _require2=require("./filewatch.js"),filewatchOn=_require2.filewatchOn
var _require3=require("../common/util.js"),matchAll=_require3.matchAll,nop=_require3.nop
var _require4=require("./textures.js"),textureUnloadDynamic=_require4.textureUnloadDynamic
var _require5=require("./webfs.js"),webFSGetFile=_require5.webFSGetFile
var last_id=0
var bound_prog=null
var globals
exports.globals=globals
var globals_used
var global_defines
var error_fp
var error_fp_webgl2
var error_vp
var shaders=[]
var vp_attr_regex=/attribute [^ ]+ ([^ ;]+);/g
var uniform_regex=/uniform (?:(?:low|medium|high)p )?((?:(?:vec|mat)\d(?:x\d)?|float) [^ ;]+);/g
var sampler_regex=/uniform sampler(?:2D|Cube) ([^ ;]+);/g
var include_regex=/\n#include "([^"]+)"/g
var type_size={float:1,vec2:2,vec3:3,vec4:4,mat3:9,mat4:16}
function loadInclude(filename){return'\n// from include "'+filename+'":\n'+webFSGetFile(filename,"text")+"\n"}function shadersResetState(){for(var ii=0;ii<shaders.length;++ii){var shader=shaders[ii]
if(shader.programs)for(var fpid in shader.programs){var prog=shader.programs[fpid]
if(null===prog.uniforms)assert(prog.uniforms,"prog.uniforms=null, valid="+prog.valid+", fpid="+fpid+", vp="+shader.filename+", handle="+Boolean(prog.handle))
for(var jj=0;jj<prog.uniforms.length;++jj){var unif=prog.uniforms[jj]
for(var kk=0;kk<unif.size;++kk)unif.value[kk]=NaN}}}bound_prog=null
gl.useProgram(null)}function shadersSetGLErrorReportDetails(){var details={max_fragment_uniform_vectors:gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),max_varying_vectors:gl.getParameter(gl.MAX_VARYING_VECTORS),max_vertex_attribs:gl.getParameter(gl.MAX_VERTEX_ATTRIBS),max_vertex_uniform_vectors:gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),vendor:gl.getParameter(gl.VENDOR),renderer:gl.getParameter(gl.RENDERER),webgl:engine.webgl2?2:1}
var debug_info=gl.getExtension("WEBGL_debug_renderer_info")
if(debug_info){details.renderer_unmasked=gl.getParameter(debug_info.UNMASKED_RENDERER_WEBGL)
details.vendor_unmasked=gl.getParameter(debug_info.UNMASKED_VENDOR_WEBGL)}for(var key in details)errorReportSetDetails(key,details[key])}errorReportSetDynamicDetails("context_lost",function(){if(window.gl&&gl.isContextLost())return"1"
return""})
var report_timeout=null
var shader_errors
var shader_errors_any_fatal
var reported_shader_errors=false
function reportShaderError(non_fatal,err){function doReport(){report_timeout=null
var msg="Shader error(s):\n    "+shader_errors.join("\n    ")
shader_errors=null
if(!gl.isContextLost()){shadersSetGLErrorReportDetails()
reported_shader_errors=true
if(!shader_errors_any_fatal)glovErrorReport(false,msg,"shaders.js")
else assert(false,msg)}}if(!report_timeout){report_timeout=setTimeout(doReport,1e3)
shader_errors=[]
shader_errors_any_fatal=false}shader_errors_any_fatal=shader_errors_any_fatal||!non_fatal
shader_errors.push(err)}function parseIncludes(parent_name,text){var supplied_uniforms={}
text.replace(uniform_regex,function(str,key){supplied_uniforms[key]=true})
return text=text.replace(include_regex,function(str,filename){var include_path=parent_name.split("/")
include_path.pop()
include_path.push(filename)
var replacement=loadInclude(include_path=include_path.join("/"))
if(!replacement){console.error("Could not evaluate "+str)
return str}return replacement=replacement.replace(uniform_regex,function(str2,key){if(supplied_uniforms[key])return"// [removed "+key+"]"
supplied_uniforms[key]=true
return str2})})}var webgl2_header=["#version 300 es","#define WEBGL2"].join("\n")
var webgl2_header_fp=[webgl2_header,"#define varying in","out lowp vec4 fragColor;","#define gl_FragColor fragColor","#define texture2D texture","#define textureCube texture",""].join("\n")
var webgl2_header_vp=[webgl2_header,"#define varying out","#define attribute in",""].join("\n")
function Shader(params){var filename=params.filename,defines=params.defines,non_fatal=params.non_fatal
assert.equal(typeof filename,"string")
var type=filename.endsWith(".fp")?gl.FRAGMENT_SHADER:filename.endsWith(".vp")?gl.VERTEX_SHADER:0
assert(type)
this.type=type
this.filename=filename
this.non_fatal=non_fatal
this.defines_arr=defines||[]
this.defines=this.defines_arr.map(function(a){return"#define "+a+"\n"}).join("")
this.shader=gl.createShader(type)
this.id=++last_id
if(type===gl.VERTEX_SHADER)this.programs={}
shaders.push(this)
this.compile()}function shadersGetDebug(){return shaders}function cleanShaderError(error_text){if(error_text)error_text=error_text.replace(/\0/g,"").trim()
return error_text}Shader.prototype.compile=function(){var type=this.type,filename=this.filename
var header=""
var text=webFSGetFile(filename,"text")
if(engine.webgl2&&text.includes("#pragma WebGL2"))header=type===gl.VERTEX_SHADER?webgl2_header_vp:webgl2_header_fp
text=(text=parseIncludes(filename,text=""+header+global_defines+this.defines+text)).replace(/#pragma WebGL2?/g,"")
if(type===gl.VERTEX_SHADER){this.attributes=matchAll(text,vp_attr_regex)
this.attributes.forEach(function(v){return assert(void 0!==SEMANTIC[v])})}else{this.samplers=matchAll(text,sampler_regex)
var found=[]
this.samplers.forEach(function(v){var num=Number(v.slice(-1))
assert(!isNaN(num))
assert(!found[num])
found[num]=true})}this.uniforms=matchAll(text,uniform_regex)
this.uniforms.forEach(function(v){var type_name=v.split(" ")[0]
assert(type_size[type_name])})
this.shader_source_text=text
if(gl.isContextLost()){this.valid=false
var error_text=this.error_text="Context lost"
if(this.defines_arr.length)filename+="("+this.defines_arr.join(",")+")"
console[this.non_fatal?"warn":"error"]("Error compiling "+filename+": "+error_text)
return}gl.shaderSource(this.shader,text)
gl.compileShader(this.shader)
if(!gl.getShaderParameter(this.shader,gl.COMPILE_STATUS)){this.valid=false
var _error_text=this.error_text=cleanShaderError(gl.getShaderInfoLog(this.shader))
if(this.defines_arr.length)filename+="("+this.defines_arr.join(",")+")"
console[this.non_fatal?"warn":"error"]("Error compiling "+filename+": "+_error_text)
reportShaderError(this.non_fatal,filename+": "+_error_text)
console.log(text.split("\n").map(function(line,idx){return idx+1+": "+line}).join("\n"))}else{this.valid=true
if(this.error_text)delete this.error_text}}
function shaderCreate(filename){if("object"===typeof filename)return new Shader(filename)
return new Shader({filename:filename})}function uniformSetValue(unif){switch(unif.width){case 1:gl.uniform1fv(unif.location,unif.value)
break
case 2:gl.uniform2fv(unif.location,unif.value)
break
case 3:gl.uniform3fv(unif.location,unif.value)
break
case 4:gl.uniform4fv(unif.location,unif.value)
break
case 9:gl.uniformMatrix3fv(unif.location,false,unif.value)
break
case 16:gl.uniformMatrix4fv(unif.location,false,unif.value)}}var require_prelink=false
function shadersRequirePrelink(ensure){var old=require_prelink
require_prelink=ensure
return old}function link(vp,fp,on_error){assert(!require_prelink)
var prog=vp.programs[fp.id]={handle:gl.createProgram(),uniforms:[]}
var error_text
if(!prog.handle){error_text="gl.createProgram() returned "+prog.handle
prog.valid=false}else{gl.attachShader(prog.handle,vp.shader)
gl.attachShader(prog.handle,fp.shader)
for(var ii=0;ii<vp.attributes.length;++ii)gl.bindAttribLocation(prog.handle,SEMANTIC[vp.attributes[ii]],vp.attributes[ii])
gl.linkProgram(prog.handle)
prog.valid=gl.getProgramParameter(prog.handle,gl.LINK_STATUS)}if(!prog.valid){prog.uniforms=[]
error_text=error_text||cleanShaderError(gl.getProgramInfoLog(prog.handle))
var report=true
if(gl.isContextLost()){error_text="(Context lost) "+error_text
report=false}console.error("Shader link error: "+error_text)
if(on_error&&(!engine.DEBUG||on_error===nop))on_error(error_text)
else if(report)reportShaderError(false,"Shader link error ("+vp.filename+" & "+fp.filename+"): "+error_text)
return prog}gl.useProgram(prog.handle)
bound_prog=prog
var uniforms=vp.uniforms.slice(0)
for(var _ii=0;_ii<fp.uniforms.length;++_ii){var name=fp.uniforms[_ii]
if(-1===uniforms.indexOf(name))uniforms.push(name)}prog.uniforms=uniforms.map(function(v){var type=(v=v.split(" "))[0]
var name=v[1]
var count=1
var m=name.match(/([^[]+)\[(\d+)\]/)
if(m){name=m[1]
count=Number(m[2])}var location=gl.getUniformLocation(prog.handle,name)
if(null===location)return null
var width=type_size[type]
var size=width*count
var glob=globals[name]
globals_used[name]=true
var unif={name:name,size:size,width:width,count:count,value:new Float32Array(size),location:location,glob:glob}
uniformSetValue(unif)
return unif}).filter(function(v){return v})
assert(prog.uniforms)
for(var _ii2=0;_ii2<fp.samplers.length;++_ii2){var _name=fp.samplers[_ii2]
var num=Number(_name.slice(-1))
var location=gl.getUniformLocation(prog.handle,_name)
if(null!==location)gl.uniform1i(location,num)}return prog}function autoLink(vp,fp,on_error){var prog=vp.programs[fp.id]
if(!prog)prog=link(vp,fp,on_error)
if(!prog.valid){if(!(prog=link(vp,error_fp,nop)).valid&&error_fp_webgl2)prog=link(vp,error_fp_webgl2,nop)
if(!prog.valid)prog=link(error_vp,error_fp,nop)
vp.programs[fp.id]=prog}return prog}function shadersBind(vp,fp,params){var prog=vp.programs[fp.id]
if(!prog)prog=autoLink(vp,fp)
if(prog!==bound_prog){bound_prog=prog
gl.useProgram(prog.handle)}for(var ii=0;ii<prog.uniforms.length;++ii){var unif=prog.uniforms[ii]
var value=params[unif.name]||unif.glob
if(!value)continue
var diff=false
for(var jj=0;jj<unif.size;++jj)if(value[jj]!==unif.value[jj]){diff=true
break}if(diff){for(var _jj=0;_jj<unif.size;++_jj)unif.value[_jj]=value[_jj]
uniformSetValue(unif)}}}function shadersPrelink(vp,fp,params,on_error){if(void 0===params)params={}
var prog=autoLink(vp,fp,on_error)
if(prog.valid)shadersBind(vp,fp,params)
return prog.valid}var reserved={WEBGL2:1,GL_FRAGMENT_PRECISION_HIGH:1}
function addReservedDefine(key){reserved[key]=1}var internal_defines={}
function applyDefines(){global_defines=Object.keys(engine.defines).filter(function(v){return!reserved[v]}).concat(Object.keys(internal_defines)).map(function(v){return"#define "+v+"\n"}).join("")}function shaderReload(){shadersRequirePrelink(false)
if(shaders.length){if(reported_shader_errors){errorReportClear()
reported_shader_errors=false}gl.useProgram(null)
for(var ii=0;ii<shaders.length;++ii){var programs=shaders[ii].programs
if(programs){for(var id in programs)gl.deleteProgram(programs[id].handle)
shaders[ii].programs={}}}for(var _ii3=0;_ii3<shaders.length;++_ii3)shaders[_ii3].compile()
textureUnloadDynamic()}}function shadersHandleDefinesChanged(){applyDefines()
shaderReload()}function shadersSetInternalDefines(new_values){for(var key in new_values)if(new_values[key])internal_defines[key]=new_values[key]
else delete internal_defines[key]
shadersHandleDefinesChanged()}function onShaderChange(filename){shaderReload()}function shadersStartup(_globals){applyDefines()
exports.globals=globals=_globals
globals_used={}
error_fp=shaderCreate("shaders/error.fp")
if(engine.webgl2)error_fp_webgl2=shaderCreate("shaders/error_gl2.fp")
error_vp=shaderCreate("shaders/error.vp")
filewatchOn(".fp",onShaderChange)
filewatchOn(".vp",onShaderChange)
var valid=error_fp.valid&&error_vp.valid
if(valid){var prog=autoLink(error_vp,error_fp)
if(!prog||!prog.valid)valid=false}if(!valid)clearTimeout(report_timeout)
return valid}function shadersAddGlobal(key,vec){assert(!globals[key])
assert(!globals_used[key])
globals[key]=vec
for(var ii=0;ii<vec.length;++ii)assert(isFinite(vec[ii]))}exports.create=shaderCreate
exports.semantic=SEMANTIC
exports.addGlobal=shadersAddGlobal
exports.bind=shadersBind
exports.prelink=shadersPrelink

},{"../common/util.js":96,"./engine.js":21,"./error_report.js":24,"./filewatch.js":27,"./textures.js":70,"./webfs.js":76,"assert":undefined}],62:[function(require,module,exports){
"use strict"
var CR_NEWLINE_R=/\r\n?/g
var TAB_R=/\t/g
var FORMFEED_R=/\f/g
var preprocess=function preprocess(source){return source.replace(CR_NEWLINE_R,"\n").replace(FORMFEED_R,"").replace(TAB_R,"    ")}
var populateInitialState=function populateInitialState(givenState,defaultState){var state=givenState||{}
if(null!=defaultState)for(var prop in defaultState)if(Object.prototype.hasOwnProperty.call(defaultState,prop))state[prop]=defaultState[prop]
return state}
var parserFor=function parserFor(rules,defaultState){var ruleList=Object.keys(rules).filter(function(type){var rule=rules[type]
if(null==rule||null==rule.match)return false
var order=rule.order
if(("number"!==typeof order||!isFinite(order))&&"undefined"!==typeof console)console.warn("simple-markdown: Invalid order for rule `"+type+"`: "+String(order))
return true})
ruleList.sort(function(typeA,typeB){var ruleA=rules[typeA]
var ruleB=rules[typeB]
var orderA=ruleA.order
var orderB=ruleB.order
if(orderA!==orderB)return orderA-orderB
var secondaryOrderA=ruleA.quality?0:1
var secondaryOrderB=ruleB.quality?0:1
if(secondaryOrderA!==secondaryOrderB)return secondaryOrderA-secondaryOrderB
else if(typeA<typeB)return-1
else if(typeA>typeB)return 1
else return 0})
var latestState
var nestedParse=function nestedParse(source,state){var result=[]
latestState=state=state||latestState
while(source){var ruleType=null
var rule=null
var capture=null
var quality=NaN
var i=0
var currRuleType=ruleList[0]
var currRule=rules[currRuleType]
do{var currOrder=currRule.order
var prevCaptureStr=null==state.prevCapture?"":state.prevCapture[0]
var currCapture=currRule.match(source,state,prevCaptureStr)
if(currCapture){var currQuality=currRule.quality?currRule.quality(currCapture,state,prevCaptureStr):0
if(!(currQuality<=quality)){ruleType=currRuleType
rule=currRule
capture=currCapture
quality=currQuality}}currRuleType=ruleList[++i]
currRule=rules[currRuleType]}while(currRule&&(!capture||currRule.order===currOrder&&currRule.quality))
if(null==rule||null==capture)throw new Error("Could not find a matching rule for the below content. The rule with highest `order` should always match content provided to it. Check the definition of `match` for '"+ruleList[ruleList.length-1]+"'. It seems to not match the following source:\n"+source)
if(capture.index)throw new Error("`match` must return a capture starting at index 0 (the current parse index). Did you forget a ^ at the start of the RegExp?")
var parsed=rule.parse(capture,nestedParse,state)
if(Array.isArray(parsed))Array.prototype.push.apply(result,parsed)
else{if(null==parsed||"object"!==typeof parsed)throw new Error("parse() function returned invalid parse result: '"+parsed+"'")
if(null==parsed.type)parsed.type=ruleType
result.push(parsed)}state.prevCapture=capture
source=source.substring(state.prevCapture[0].length)}return result}
return function outerParse(source,state){if(!(latestState=populateInitialState(state,defaultState)).inline&&!latestState.disableAutoBlockNewlines)source+="\n\n"
latestState.prevCapture=null
return nestedParse(preprocess(source),latestState)}}
var inlineRegex=function inlineRegex(regex){var match=function match(source,state,prevCapture){if(state.inline)return regex.exec(source)
else return null}
match.regex=regex
return match}
var blockRegex=function blockRegex(regex){var match=function match(source,state){if(state.inline)return null
else return regex.exec(source)}
match.regex=regex
return match}
var anyScopeRegex=function anyScopeRegex(regex){var match=function match(source,state){return regex.exec(source)}
match.regex=regex
return match}
var UNESCAPE_URL_R=/\\([^0-9A-Za-z\s])/g
var unescapeUrl=function unescapeUrl(rawUrlString){return rawUrlString.replace(UNESCAPE_URL_R,"$1")}
var parseInline=function parseInline(parse,content,state){var isCurrentlyInline=state.inline||false
state.inline=true
var result=parse(content,state)
state.inline=isCurrentlyInline
return result}
var parseBlock=function parseBlock(parse,content,state){var isCurrentlyInline=state.inline||false
state.inline=false
var result=parse(content+"\n\n",state)
state.inline=isCurrentlyInline
return result}
var parseCaptureInline=function parseCaptureInline(capture,parse,state){return{content:parseInline(parse,capture[1],state)}}
var ignoreCapture=function ignoreCapture(){return{}}
var LIST_BULLET="(?:[*+-]|\\d+\\.)"
var LIST_ITEM_PREFIX="( *)("+LIST_BULLET+") +"
var LIST_ITEM_PREFIX_R=new RegExp("^"+LIST_ITEM_PREFIX)
var LIST_ITEM_R=new RegExp(LIST_ITEM_PREFIX+"[^\\n]*(?:\\n(?!\\1"+LIST_BULLET+" )[^\\n]*)*(\n|$)","gm")
var BLOCK_END_R=/\n{2,}$/
var INLINE_CODE_ESCAPE_BACKTICKS_R=/^ (?= *`)|(` *) $/g
var LIST_BLOCK_END_R=BLOCK_END_R
var LIST_ITEM_END_R=/ *\n+$/
var LIST_R=new RegExp("^( *)("+LIST_BULLET+") [\\s\\S]+?(?:\n{2,}(?! )(?!\\1"+LIST_BULLET+" )\\n*|\\s*\n*$)")
var LIST_LOOKBEHIND_R=/(?:^|\n)( *)$/
var TABLES=function(){var TABLE_ROW_SEPARATOR_TRIM=/^ *\| *| *\| *$/g
var TABLE_CELL_END_TRIM=/ *$/
var TABLE_RIGHT_ALIGN=/^ *-+: *$/
var TABLE_CENTER_ALIGN=/^ *:-+: *$/
var TABLE_LEFT_ALIGN=/^ *:-+ *$/
var parseTableAlignCapture=function parseTableAlignCapture(alignCapture){if(TABLE_RIGHT_ALIGN.test(alignCapture))return"right"
else if(TABLE_CENTER_ALIGN.test(alignCapture))return"center"
else if(TABLE_LEFT_ALIGN.test(alignCapture))return"left"
else return null}
var parseTableAlign=function parseTableAlign(source,parse,state,trimEndSeparators){if(trimEndSeparators)source=source.replace(TABLE_ROW_SEPARATOR_TRIM,"")
return source.trim().split("|").map(parseTableAlignCapture)}
var parseTableRow=function parseTableRow(source,parse,state,trimEndSeparators){var prevInTable=state.inTable
state.inTable=true
var tableRow=parse(source.trim(),state)
state.inTable=prevInTable
var cells=[[]]
tableRow.forEach(function(node,i){if("tableSeparator"===node.type){if(!trimEndSeparators||0!==i&&i!==tableRow.length-1)cells.push([])}else{if("text"===node.type&&(null==tableRow[i+1]||"tableSeparator"===tableRow[i+1].type))node.content=node.content.replace(TABLE_CELL_END_TRIM,"")
cells[cells.length-1].push(node)}})
return cells}
var parseTableCells=function parseTableCells(source,parse,state,trimEndSeparators){return source.trim().split("\n").map(function(rowText){return parseTableRow(rowText,parse,state,trimEndSeparators)})}
var parseTable=function parseTable(trimEndSeparators){return function(capture,parse,state){state.inline=true
var header=parseTableRow(capture[1],parse,state,trimEndSeparators)
var align=parseTableAlign(capture[2],parse,state,trimEndSeparators)
var cells=parseTableCells(capture[3],parse,state,trimEndSeparators)
state.inline=false
return{type:"table",header:header,align:align,cells:cells}}}
return{parseTable:parseTable(true),parseNpTable:parseTable(false),TABLE_REGEX:/^ *(\|.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/,NPTABLE_REGEX:/^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/}}()
var LINK_INSIDE="(?:\\[[^\\]]*\\]|[^\\[\\]]|\\](?=[^\\[]*\\]))*"
var LINK_HREF_AND_TITLE="\\s*<?((?:\\([^)]*\\)|[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['\"]([\\s\\S]*?)['\"])?\\s*"
var AUTOLINK_MAILTO_CHECK_R=/mailto:/i
var parseRef=function parseRef(capture,state,refNode){var ref=(capture[2]||capture[1]).replace(/\s+/g," ").toLowerCase()
if(state._defs&&state._defs[ref]){var def=state._defs[ref]
refNode.target=def.target
refNode.title=def.title}state._refs=state._refs||{}
state._refs[ref]=state._refs[ref]||[]
state._refs[ref].push(refNode)
return refNode}
var currOrder=0
var defaultRules={heading:{order:currOrder++,match:blockRegex(/^ *(#{1,6})([^\n]+?)#* *(?:\n *)+\n/),parse:function(_parse){function parse(_x,_x2,_x3){return _parse.apply(this,arguments)}parse.toString=function(){return _parse.toString()}
return parse}(function(capture,parse,state){return{level:capture[1].length,content:parseInline(parse,capture[2].trim(),state)}})},nptable:{order:currOrder++,match:blockRegex(TABLES.NPTABLE_REGEX),parse:TABLES.parseNpTable},lheading:{order:currOrder++,match:blockRegex(/^([^\n]+)\n *(=|-){3,} *(?:\n *)+\n/),parse:function(_parse2){function parse(_x4,_x5,_x6){return _parse2.apply(this,arguments)}parse.toString=function(){return _parse2.toString()}
return parse}(function(capture,parse,state){return{type:"heading",level:"="===capture[2]?1:2,content:parseInline(parse,capture[1],state)}})},hr:{order:currOrder++,match:blockRegex(/^( *[-*_]){3,} *(?:\n *)+\n/),parse:ignoreCapture},codeBlock:{order:currOrder++,match:blockRegex(/^(?:    [^\n]+\n*)+(?:\n *)+\n/),parse:function(_parse3){function parse(_x7,_x8,_x9){return _parse3.apply(this,arguments)}parse.toString=function(){return _parse3.toString()}
return parse}(function(capture,parse,state){return{lang:void 0,content:capture[0].replace(/^    /gm,"").replace(/\n+$/,"")}})},fence:{order:currOrder++,match:blockRegex(/^ *(`{3,}|~{3,}) *(?:(\S+) *)?\n([\s\S]+?)\n?\1 *(?:\n *)+\n/),parse:function(_parse4){function parse(_x10,_x11,_x12){return _parse4.apply(this,arguments)}parse.toString=function(){return _parse4.toString()}
return parse}(function(capture,parse,state){return{type:"codeBlock",lang:capture[2]||void 0,content:capture[3]}})},blockQuote:{order:currOrder++,match:blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+\n{2,}/),parse:function(_parse5){function parse(_x13,_x14,_x15){return _parse5.apply(this,arguments)}parse.toString=function(){return _parse5.toString()}
return parse}(function(capture,parse,state){return{content:parse(capture[0].replace(/^ *> ?/gm,""),state)}})},list:{order:currOrder++,match:function match(source,state){var prevCaptureStr=null==state.prevCapture?"":state.prevCapture[0]
var isStartOfLineCapture=LIST_LOOKBEHIND_R.exec(prevCaptureStr)
var isListBlock=state._list||!state.inline
if(isStartOfLineCapture&&isListBlock){source=isStartOfLineCapture[1]+source
return LIST_R.exec(source)}else return null},parse:function(_parse6){function parse(_x16,_x17,_x18){return _parse6.apply(this,arguments)}parse.toString=function(){return _parse6.toString()}
return parse}(function(capture,parse,state){var bullet=capture[2]
var ordered=bullet.length>1
var start=ordered?+bullet:void 0
var items=capture[0].replace(LIST_BLOCK_END_R,"\n").match(LIST_ITEM_R)
var lastItemWasAParagraph=false
return{ordered:ordered,start:start,items:items.map(function(item,i){var prefixCapture=LIST_ITEM_PREFIX_R.exec(item)
var space=prefixCapture?prefixCapture[0].length:0
var spaceRegex=new RegExp("^ {1,"+space+"}","gm")
var content=item.replace(spaceRegex,"").replace(LIST_ITEM_PREFIX_R,"")
var isLastItem=i===items.length-1
var thisItemIsAParagraph=-1!==content.indexOf("\n\n")||isLastItem&&lastItemWasAParagraph
lastItemWasAParagraph=thisItemIsAParagraph
var oldStateInline=state.inline
var oldStateList=state._list
state._list=true
var adjustedContent
if(thisItemIsAParagraph){state.inline=false
adjustedContent=content.replace(LIST_ITEM_END_R,"\n\n")}else{state.inline=true
adjustedContent=content.replace(LIST_ITEM_END_R,"")}var result=parse(adjustedContent,state)
state.inline=oldStateInline
state._list=oldStateList
return result})}})},def:{order:currOrder++,match:blockRegex(/^ *\[([^\]]+)\]: *<?([^\s>]*)>?(?: +["(]([^\n]+)[")])? *\n(?: *\n)*/),parse:function(_parse7){function parse(_x19,_x20,_x21){return _parse7.apply(this,arguments)}parse.toString=function(){return _parse7.toString()}
return parse}(function(capture,parse,state){var def=capture[1].replace(/\s+/g," ").toLowerCase()
var target=capture[2]
var title=capture[3]
if(state._refs&&state._refs[def])state._refs[def].forEach(function(refNode){refNode.target=target
refNode.title=title})
state._defs=state._defs||{}
state._defs[def]={target:target,title:title}
return{def:def,target:target,title:title}})},table:{order:currOrder++,match:blockRegex(TABLES.TABLE_REGEX),parse:TABLES.parseTable},newline:{order:currOrder++,match:blockRegex(/^(?:\n *)*\n/),parse:ignoreCapture},paragraph:{order:currOrder++,match:blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/),parse:parseCaptureInline},escape:{order:currOrder++,match:inlineRegex(/^\\([^0-9A-Za-z\s])/),parse:function(_parse8){function parse(_x22,_x23,_x24){return _parse8.apply(this,arguments)}parse.toString=function(){return _parse8.toString()}
return parse}(function(capture,parse,state){return{type:"text",content:capture[1]}})},tableSeparator:{order:currOrder++,match:function match(source,state){if(!state.inTable)return null
return/^ *\| */.exec(source)},parse:function parse(){return{type:"tableSeparator"}}},autolink:{order:currOrder++,match:inlineRegex(/^<([^: >]+:\/[^ >]+)>/),parse:function(_parse9){function parse(_x25,_x26,_x27){return _parse9.apply(this,arguments)}parse.toString=function(){return _parse9.toString()}
return parse}(function(capture,parse,state){return{type:"link",content:[{type:"text",content:capture[1]}],target:capture[1]}})},mailto:{order:currOrder++,match:inlineRegex(/^<([^ >]+@[^ >]+)>/),parse:function(_parse10){function parse(_x28,_x29,_x30){return _parse10.apply(this,arguments)}parse.toString=function(){return _parse10.toString()}
return parse}(function(capture,parse,state){var address=capture[1]
var target=capture[1]
if(!AUTOLINK_MAILTO_CHECK_R.test(target))target="mailto:"+target
return{type:"link",content:[{type:"text",content:address}],target:target}})},url:{order:currOrder++,match:inlineRegex(/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/),parse:function(_parse11){function parse(_x31,_x32,_x33){return _parse11.apply(this,arguments)}parse.toString=function(){return _parse11.toString()}
return parse}(function(capture,parse,state){return{type:"link",content:[{type:"text",content:capture[1]}],target:capture[1],title:void 0}})},link:{order:currOrder++,match:inlineRegex(new RegExp("^\\[("+LINK_INSIDE+")\\]\\("+LINK_HREF_AND_TITLE+"\\)")),parse:function(_parse12){function parse(_x34,_x35,_x36){return _parse12.apply(this,arguments)}parse.toString=function(){return _parse12.toString()}
return parse}(function(capture,parse,state){return{content:parse(capture[1],state),target:unescapeUrl(capture[2]),title:capture[3]}})},image:{order:currOrder++,match:inlineRegex(new RegExp("^!\\[("+LINK_INSIDE+")\\]\\("+LINK_HREF_AND_TITLE+"\\)")),parse:function(_parse13){function parse(_x37,_x38,_x39){return _parse13.apply(this,arguments)}parse.toString=function(){return _parse13.toString()}
return parse}(function(capture,parse,state){return{alt:capture[1],target:unescapeUrl(capture[2]),title:capture[3]}})},reflink:{order:currOrder++,match:inlineRegex(new RegExp("^\\[("+LINK_INSIDE+")\\]\\s*\\[([^\\]]*)\\]")),parse:function(_parse14){function parse(_x40,_x41,_x42){return _parse14.apply(this,arguments)}parse.toString=function(){return _parse14.toString()}
return parse}(function(capture,parse,state){return parseRef(capture,state,{type:"link",content:parse(capture[1],state)})})},refimage:{order:currOrder++,match:inlineRegex(new RegExp("^!\\[("+LINK_INSIDE+")\\]\\s*\\[([^\\]]*)\\]")),parse:function(_parse15){function parse(_x43,_x44,_x45){return _parse15.apply(this,arguments)}parse.toString=function(){return _parse15.toString()}
return parse}(function(capture,parse,state){return parseRef(capture,state,{type:"image",alt:capture[1]})})},em:{order:currOrder,match:inlineRegex(new RegExp("^\\b_((?:__|\\\\[\\s\\S]|[^\\\\_])+?)_\\b|^\\*(?=\\S)((?:\\*\\*|\\\\[\\s\\S]|\\s+(?:\\\\[\\s\\S]|[^\\s\\*\\\\]|\\*\\*)|[^\\s\\*\\\\])+?)\\*(?!\\*)")),quality:function quality(capture){return capture[0].length+.2},parse:function(_parse16){function parse(_x46,_x47,_x48){return _parse16.apply(this,arguments)}parse.toString=function(){return _parse16.toString()}
return parse}(function(capture,parse,state){return{content:parse(capture[2]||capture[1],state)}})},strong:{order:currOrder,match:inlineRegex(/^\*\*((?:\\[\s\S]|[^\\])+?)\*\*(?!\*)/),quality:function quality(capture){return capture[0].length+.1},parse:parseCaptureInline},u:{order:currOrder++,match:inlineRegex(/^__((?:\\[\s\S]|[^\\])+?)__(?!_)/),quality:function quality(capture){return capture[0].length},parse:parseCaptureInline},del:{order:currOrder++,match:inlineRegex(/^~~(?=\S)((?:\\[\s\S]|~(?!~)|[^\s~\\]|\s(?!~~))+?)~~/),parse:parseCaptureInline},inlineCode:{order:currOrder++,match:inlineRegex(/^(`+)([\s\S]*?[^`])\1(?!`)/),parse:function(_parse17){function parse(_x49,_x50,_x51){return _parse17.apply(this,arguments)}parse.toString=function(){return _parse17.toString()}
return parse}(function(capture,parse,state){return{content:capture[2].replace(INLINE_CODE_ESCAPE_BACKTICKS_R,"$1")}})},br:{order:currOrder++,match:anyScopeRegex(/^ {2,}\n/),parse:ignoreCapture},text:{order:currOrder++,match:anyScopeRegex(/^[\s\S]+?(?=[^0-9A-Za-z\s\u00c0-\uffff]|\n\n| {2,}\n|\w+:\S|$)/),parse:function(_parse18){function parse(_x52,_x53,_x54){return _parse18.apply(this,arguments)}parse.toString=function(){return _parse18.toString()}
return parse}(function(capture,parse,state){return{content:capture[0]}})}}
var SimpleMarkdown={defaultRules:defaultRules,parserFor:parserFor,inlineRegex:inlineRegex,blockRegex:blockRegex,anyScopeRegex:anyScopeRegex,parseInline:parseInline,parseBlock:parseBlock,preprocess:preprocess,unescapeUrl:unescapeUrl}
module.exports=SimpleMarkdown

},{}],63:[function(require,module,exports){
"use strict"
exports.slider=slider
exports.sliderIsDragging=sliderIsDragging
exports.sliderIsFocused=sliderIsFocused
exports.sliderSetDefaultShrink=sliderSetDefaultShrink
var _custom_nav
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var _assert=require("assert")
var assert=_assert
var round=Math.round,max=Math.max
var _glovCommonUtilJs=require("../common/util.js")
var clamp=_glovCommonUtilJs.clamp
var _glovCommonVmathJs=require("../common/vmath.js")
var vec4=_glovCommonVmathJs.vec4
var _inputJs=require("./input.js")
var input=_inputJs
var _spotJs=require("./spot.js")
var SPOT_DEFAULT_BUTTON=_spotJs.SPOT_DEFAULT_BUTTON
var SPOT_NAV_LEFT=_spotJs.SPOT_NAV_LEFT
var SPOT_NAV_RIGHT=_spotJs.SPOT_NAV_RIGHT
var spot=_spotJs.spot
var _uiJs=require("./ui.js")
var Z_MIN_INC=_uiJs.Z_MIN_INC
var drawHBox=_uiJs.drawHBox
var playUISound=_uiJs.playUISound
var uiButtonHeight=_uiJs.uiButtonHeight
var uiButtonWidth=_uiJs.uiButtonWidth
var _uiJs2=require("./ui.js")
var ui=_uiJs2
var SPOT_DEFAULT_SLIDER=_extends({},SPOT_DEFAULT_BUTTON,{sound_button:null,custom_nav:((_custom_nav={})[SPOT_NAV_RIGHT]=null,_custom_nav[SPOT_NAV_LEFT]=null,_custom_nav)})
var slider_default_vshrink=1
var slider_default_handle_shrink=1
var slider_default_inset=0
function sliderSetDefaultShrink(vshrink,handle_shrink,slider_inset){slider_default_vshrink=vshrink
slider_default_handle_shrink=handle_shrink
slider_default_inset=slider_inset||0}var color_slider_handle=vec4(1,1,1,1)
var color_slider_handle_grab=vec4(.5,.5,.5,1)
var color_slider_handle_over=vec4(.75,.75,.75,1)
var slider_dragging=false
var slider_focused=false
function sliderIsDragging(){return slider_dragging}function sliderIsFocused(){return slider_focused}function slider(value,param){assert("number"===typeof param.x)
assert("number"===typeof param.y)
assert(param.min<param.max)
param.z=param.z||Z.UI
param.w=param.w||uiButtonWidth()
param.h=param.h||uiButtonHeight()
param.max_dist=param.max_dist||Infinity
var vshrink=param.vshrink||slider_default_vshrink
var handle_shrink=param.handle_shrink||slider_default_handle_shrink
var disabled=param.disabled||false
var handle_h=param.h*handle_shrink
var handle_w=ui.sprites.slider_handle.uidata.wh[0]*handle_h
var pad_focusable=param.pad_focusable
slider_dragging=false
var shrinkdiff=handle_shrink-vshrink+slider_default_inset
drawHBox({x:param.x+param.h*shrinkdiff/2,y:param.y+param.h*(1-vshrink)/2,z:param.z,w:param.w-param.h*shrinkdiff,h:param.h*vshrink},ui.sprites.slider,param.color)
var xoffs=round(max(ui.sprites.slider.uidata.wh[0]*param.h*vshrink,handle_w)/2)
var draggable_width=param.w-2*xoffs
var drag=!disabled&&input.drag(param)
var grabbed=Boolean(drag)
param.def=SPOT_DEFAULT_SLIDER
if(grabbed)param.focus_steal=true
param.pad_focusable=pad_focusable
var spot_ret=spot(param)
slider_focused=spot_ret.focused
if(spot_ret.ret&&spot_ret.pos){grabbed=false
value=(spot_ret.pos[0]-(param.x+xoffs))/draggable_width
value=param.min+(param.max-param.min)*clamp(value,0,1)
playUISound("button_click")}else if(grabbed){value=(drag.cur_pos[0]-(param.x+xoffs))/draggable_width
value=param.min+(param.max-param.min)*clamp(value,0,1)
input.mouseOver()
slider_focused=slider_dragging=true}if(spot_ret.nav){playUISound("button_click")
var step=param.step||(param.max-param.min)/16
if(spot_ret.nav===SPOT_NAV_RIGHT)value=clamp(value+step,param.min,param.max)
else if(spot_ret.nav===SPOT_NAV_LEFT)value=clamp(value-step,param.min,param.max)}var value_for_handle=clamp(value,param.min,param.max)
var handle_x=param.x+xoffs+draggable_width*(value_for_handle-param.min)/(param.max-param.min)-handle_w/2
var handle_y=param.y+param.h/2-handle_h/2
var handle_color=color_slider_handle
if(grabbed)handle_color=color_slider_handle_grab
else if(spot_ret.focused)handle_color=color_slider_handle_over
ui.sprites.slider_handle.draw({x:handle_x,y:handle_y,z:param.z+Z_MIN_INC,w:handle_w,h:handle_h,color:handle_color,frame:0})
return value}

},{"../common/util.js":96,"../common/vmath.js":98,"./input.js":37,"./spot.js":66,"./ui.js":72,"assert":undefined}],64:[function(require,module,exports){
"use strict"
exports.SOCIAL_ONLINE=exports.SOCIAL_INVISIBLE=exports.SOCIAL_AFK=void 0
exports.friendAdd=friendAdd
exports.friendBlock=friendBlock
exports.friendIsBlocked=friendIsBlocked
exports.friendRemove=friendRemove
exports.friendUnblock=friendUnblock
exports.friendsGet=friendsGet
exports.getDefaultUserProfileImage=getDefaultUserProfileImage
exports.getExternalCurrentUserInfos=getExternalCurrentUserInfos
exports.getExternalFriendInfos=getExternalFriendInfos
exports.getExternalUserInfos=getExternalUserInfos
exports.getUserProfileImage=getUserProfileImage
exports.isFriend=isFriend
exports.registerExternalUserInfoProvider=registerExternalUserInfoProvider
exports.richPresenceSet=richPresenceSet
exports.setDefaultUserProfileImage=setDefaultUserProfileImage
exports.socialInit=socialInit
exports.socialPresenceStatusGet=socialPresenceStatusGet
exports.socialPresenceStatusSet=socialPresenceStatusSet
var assert=require("assert")
var _glovClientSettings=require("./settings")
var settings=_glovClientSettings
var _glovClientSettings2=require("./settings")
var settingsRegister=_glovClientSettings2.settingsRegister
var settingsSet=_glovClientSettings2.settingsSet
var _glovCommonEnums=require("../common/enums")
var PRESENCE_ACTIVE=_glovCommonEnums.PRESENCE_ACTIVE
var PRESENCE_INACTIVE=_glovCommonEnums.PRESENCE_INACTIVE
var PRESENCE_OFFLINE=_glovCommonEnums.PRESENCE_OFFLINE
var PRESENCE_OFFLINE_INACTIVE=_glovCommonEnums.PRESENCE_OFFLINE_INACTIVE
var _glovCommonFriends_data=require("../common/friends_data")
var FriendStatus=_glovCommonFriends_data.FriendStatus
var _glovCommonUtil=require("../common/util")
var deepEqual=_glovCommonUtil.deepEqual
var _abtest=require("./abtest")
var abTestGetMetricsAndPlatform=_abtest.abTestGetMetricsAndPlatform
var _cmds=require("./cmds")
var cmd_parse=_cmds.cmd_parse
var _input=require("./input")
var input=_input
var _net=require("./net")
var netDisconnected=_net.netDisconnected
var netSubs=_net.netSubs
var netUserId=_net.netUserId
var _sprites=require("./sprites")
var spriteCreate=_sprites.spriteCreate
var _textures=require("./textures")
var textureLoad=_textures.textureLoad
var IDLE_TIME=6e4
var friend_list=null
function friendsGet(){return null!=friend_list?friend_list:Object.create(null)}function isFriend(user_id){var value=null==friend_list?void 0:friend_list[user_id]
return(null==value?void 0:value.status)===FriendStatus.Added||(null==value?void 0:value.status)===FriendStatus.AddedAuto}function friendIsBlocked(user_id){var value=null==friend_list?void 0:friend_list[user_id]
return(null==value?void 0:value.status)===FriendStatus.Blocked}function makeFriendCmdRequest(cmd,user_id,cb){user_id=user_id.toLowerCase()
var requesting_user_id=netUserId()
if(netDisconnected())return void cb("ERR_DISCONNECTED")
if(!requesting_user_id)return void cb("ERR_NOT_LOGGED_IN")
var my_user_channel=netSubs().getMyUserChannel()
assert(my_user_channel)
my_user_channel.cmdParse(cmd+" "+user_id,function(err,resp){if(err)return void cb(err)
else if(requesting_user_id!==netUserId()||!friend_list)return void cb("Invalid data")
assert(resp)
if(resp.friend)friend_list[user_id]=resp.friend
else delete friend_list[user_id]
cb(null,resp.msg)})}function friendAdd(user_id,cb){makeFriendCmdRequest("friend_add",user_id,cb)}function friendRemove(user_id,cb){makeFriendCmdRequest("friend_remove",user_id,cb)}function friendBlock(user_id,cb){makeFriendCmdRequest("friend_block",user_id,cb)}function friendUnblock(user_id,cb){makeFriendCmdRequest("friend_unblock",user_id,cb)}var SOCIAL_ONLINE=1
exports.SOCIAL_ONLINE=SOCIAL_ONLINE
var SOCIAL_AFK=2
exports.SOCIAL_AFK=SOCIAL_AFK
var SOCIAL_INVISIBLE=3
exports.SOCIAL_INVISIBLE=SOCIAL_INVISIBLE
function socialPresenceStatusGet(){return settings.social_presence}function socialPresenceStatusSet(value){settingsSet("social_presence",value)}function onPresence(data){this.presence_data=data}function onUnSubscribe(){delete this.presence_data}var last_presence=null
var send_queued=false
function richPresenceSend(){if(!netSubs().loggedIn()||!last_presence||send_queued)return
send_queued=true
netSubs().onceConnected(function(){send_queued=false
if(!netSubs().loggedIn()||!last_presence)return
var pak=netSubs().getMyUserChannel().pak("presence_set")
pak.writeInt(last_presence.active)
pak.writeAnsiString(last_presence.state)
pak.writeJSON(last_presence.payload)
pak.writeAnsiString(abTestGetMetricsAndPlatform())
pak.send()})}function richPresenceSet(active_in,state,payload){var active
switch(socialPresenceStatusGet()){case SOCIAL_AFK:active=active_in===PRESENCE_ACTIVE?PRESENCE_INACTIVE:active_in
break
case SOCIAL_INVISIBLE:active=PRESENCE_OFFLINE
break
default:active=active_in}if(Date.now()-input.inputLastTime()>IDLE_TIME)if(active===PRESENCE_ACTIVE)active=PRESENCE_INACTIVE
else if(active===PRESENCE_OFFLINE)active=PRESENCE_OFFLINE_INACTIVE
payload=payload||null
if(!last_presence||active!==last_presence.active||state!==last_presence.state||!deepEqual(last_presence.payload,payload)){last_presence={active:active,state:state,payload:payload}
richPresenceSend()}}var external_current_users=Object.create(null)
var external_friends=Object.create(null)
function getExternalCurrentUserInfos(){return external_current_users}function getExternalFriendInfos(user_id){return external_friends[user_id]}function getExternalUserInfos(user_id){if(user_id===netUserId())return getExternalCurrentUserInfos()
else return getExternalFriendInfos(user_id)}function setExternalCurrentUser(provider,user_info){if(user_info)external_current_users[provider]=user_info
else delete external_current_users[provider]}function updateExternalFriendsOnServer(provider,to_add,to_remove){if(0===to_add.length&&0===to_remove.length||netDisconnected())return
var requesting_user_id=netUserId()
var my_user_channel=netSubs().getMyUserChannel()
assert(my_user_channel)
var pak=my_user_channel.pak("friend_auto_update")
pak.writeAnsiString(provider)
for(var ii=0;ii<to_add.length;++ii)pak.writeAnsiString(to_add[ii].external_id)
pak.writeAnsiString("")
for(var _ii=0;_ii<to_remove.length;++_ii)pak.writeAnsiString(to_remove[_ii])
pak.writeAnsiString("")
pak.send(function(err,resp){if(requesting_user_id!==netUserId()||!friend_list)return
else if(err)return
else if(!resp)return
var friends_external_to_user_ids=Object.create(null)
for(var user_id in resp){var friend=friend_list[user_id]=resp[user_id]
if(friend.ids){var external_id=friend.ids[provider]
friends_external_to_user_ids[external_id]=user_id}}to_add.forEach(function(provider_friend){var external_id=provider_friend.external_id
var user_id=friends_external_to_user_ids[external_id]
if(user_id){var external_friend_infos=external_friends[user_id]
if(!external_friend_infos)external_friend_infos=external_friends[user_id]=Object.create(null)
external_friend_infos[provider]=provider_friend}})})}function setExternalFriends(provider,provider_friends){var friends_external_to_user_ids=Object.create(null)
for(var user_id in friend_list){var _friend$ids
var external_id=null==(_friend$ids=friend_list[user_id].ids)?void 0:_friend$ids[provider]
if(external_id)friends_external_to_user_ids[external_id]=user_id}for(var _user_id in external_friends)delete external_friends[_user_id][provider]
var to_add=[]
provider_friends.forEach(function(provider_friend){var external_id=provider_friend.external_id
var user_id=friends_external_to_user_ids[external_id]
if(user_id){var external_friend_infos=external_friends[user_id]
if(!external_friend_infos)external_friend_infos=external_friends[user_id]=Object.create(null)
external_friend_infos[provider]=provider_friend
delete friends_external_to_user_ids[external_id]}else to_add.push(provider_friend)})
var to_remove=[]
for(var _external_id in friends_external_to_user_ids)to_remove.push(_external_id)
if(0!==to_add.length||0!==to_remove.length)updateExternalFriendsOnServer(provider,to_add,to_remove)}function requestExternalCurrentUser(provider,request_func){var requesting_user_id=netUserId()
request_func(function(err,user_info){if(requesting_user_id!==netUserId())return
else if(err||!user_info)return
setExternalCurrentUser(provider,user_info)})}function requestExternalFriends(provider,request_func){var requesting_user_id=netUserId()
request_func(function(err,friends){if(requesting_user_id!==netUserId()||!friend_list)return
else if(err||!friends)return
setExternalFriends(provider,friends)})}var profile_images={}
var default_profile_image
function getUserProfileImage(user_id){var image=profile_images[user_id]
if(image)return image
var url=null
var infos=getExternalUserInfos(user_id)
if(infos)for(var key in infos)if(infos[key]&&infos[key].profile_picture_url){url=infos[key].profile_picture_url
break}if(url){var tex=textureLoad({url:url,filter_min:gl.LINEAR_MIPMAP_LINEAR,filter_mag:gl.LINEAR,soft_error:true,auto_unload:function auto_unload(){return delete profile_images[user_id]}})
if(tex&&tex.loaded)return image=profile_images[user_id]={img:spriteCreate({tex:tex})}}return default_profile_image}function getDefaultUserProfileImage(){return default_profile_image}function setDefaultUserProfileImage(image){default_profile_image=image}var external_user_info_providers={}
function registerExternalUserInfoProvider(provider,get_current_user,get_friends){if(get_current_user||get_friends){assert(!friend_list)
assert(!netSubs().loggedIn())
external_user_info_providers[provider]={get_current_user:get_current_user,get_friends:get_friends}}else delete external_user_info_providers[provider]}function socialInit(){netSubs().on("login",function(){var user_channel=netSubs().getMyUserChannel()
var user_id=netUserId()
richPresenceSend()
friend_list=null
if(netDisconnected())return
assert(user_channel)
user_channel.pak("friend_list").send(function(err,resp){if(err||user_id!==netUserId())return
assert(resp)
friend_list=resp
for(var provider in external_user_info_providers){var _ref=external_user_info_providers[provider],get_current_user=_ref.get_current_user,get_friends=_ref.get_friends
if(get_current_user)requestExternalCurrentUser(provider,get_current_user)
if(get_friends)requestExternalFriends(provider,get_friends)}})})
netSubs().on("logout",function(){friend_list=null
external_current_users=Object.create(null)
external_friends=Object.create(null)})
netSubs().onChannelMsg("user","presence",onPresence)
netSubs().onChannelEvent("user","unsubscribe",onUnSubscribe)
cmd_parse.register({cmd:"friend_add",help:"Add a friend",func:friendAdd})
cmd_parse.register({cmd:"friend_remove",help:"Remove a friend",func:friendRemove})
cmd_parse.register({cmd:"friend_block",help:"Block someone from seeing your rich presence, also removes from your friends list",func:friendBlock})
cmd_parse.register({cmd:"friend_unblock",help:"Reset a user to allow seeing your rich presence again",func:friendUnblock})
cmd_parse.register({cmd:"friend_list",help:"List all friends",func:function func(str,resp_func){if(!friend_list)return void resp_func("Friends list not loaded")
resp_func(null,Object.keys(friend_list).filter(isFriend).join(",")||"You have no friends")}})
cmd_parse.register({cmd:"friend_block_list",help:"List all blocked users",func:function func(str,resp_func){if(!friend_list)return void resp_func("Friends list not loaded")
resp_func(null,Object.keys(friend_list).filter(friendIsBlocked).join(",")||"You have no blocked users")}})
settingsRegister({social_presence:{default_value:SOCIAL_ONLINE,type:cmd_parse.TYPE_INT,range:[SOCIAL_ONLINE,SOCIAL_INVISIBLE],access_show:["hidden"]}})
cmd_parse.registerValue("invisible",{type:cmd_parse.TYPE_INT,help:"Hide rich presence information from other users",label:"Invisible",range:[0,1],get:function get(){return settings.social_presence===SOCIAL_INVISIBLE?1:0},set:function set(v){return socialPresenceStatusSet(v?SOCIAL_INVISIBLE:SOCIAL_ONLINE)}})
cmd_parse.registerValue("afk",{type:cmd_parse.TYPE_INT,help:"Appear as idle to other users",label:"AFK",range:[0,1],get:function get(){return settings.social_presence===SOCIAL_AFK?1:0},set:function set(v){return socialPresenceStatusSet(v?SOCIAL_AFK:SOCIAL_ONLINE)}})}

},{"../common/enums":86,"../common/friends_data":88,"../common/util":96,"./abtest":10,"./cmds":17,"./input":37,"./net":48,"./settings":59,"./sprites":68,"./textures":70,"assert":undefined}],65:[function(require,module,exports){
"use strict"
exports.FADE_OUT=exports.FADE_IN=exports.FADE_DEFAULT=exports.FADE=void 0
exports.fadesCount=fadesCount
exports.isPlaceholderSound=isPlaceholderSound
exports.soundFindForReplacement=soundFindForReplacement
exports.soundLoad=soundLoad
exports.soundLoading=soundLoading
exports.soundMusicPause=soundMusicPause
exports.soundMusicResume=soundMusicResume
exports.soundOnLoadFail=soundOnLoadFail
exports.soundPause=soundPause
exports.soundPlay=soundPlay
exports.soundPlayMusic=soundPlayMusic
exports.soundPlayStreaming=soundPlayStreaming
exports.soundReplaceFromDataURL=soundReplaceFromDataURL
exports.soundResume=soundResume
exports.soundResumed=soundResumed
exports.soundStartup=soundStartup
exports.soundTick=soundTick
var FADE_DEFAULT=0
exports.FADE_DEFAULT=FADE_DEFAULT
var FADE_OUT=1
exports.FADE_OUT=FADE_OUT
var FADE_IN=2
exports.FADE_IN=FADE_IN
var FADE=FADE_OUT+FADE_IN
exports.FADE=FADE
var assert=require("assert")
var _glovCommonUtil=require("../common/util")
var callEach=_glovCommonUtil.callEach
var defaults=_glovCommonUtil.defaults
var ridx=_glovCommonUtil.ridx
var _browser=require("./browser")
var is_firefox=_browser.is_firefox
var is_itch_app=_browser.is_itch_app
var _cmds=require("./cmds")
var cmd_parse=_cmds.cmd_parse
var _engine=require("./engine")
var onEnterBackground=_engine.onEnterBackground
var onExitBackground=_engine.onExitBackground
var _filewatch=require("./filewatch")
var filewatchOn=_filewatch.filewatchOn
var _locate_asset=require("./locate_asset")
var locateAsset=_locate_asset.locateAsset
var _settings=require("./settings")
var settings=_settings
var _settings2=require("./settings")
var settingsRegister=_settings2.settingsRegister
var _textures=require("./textures")
var textureCname=_textures.textureCname
var _urlhash=require("./urlhash")
var urlhash=_urlhash
var _require=require("@jimbly/howler/src/howler.core.js"),Howl=_require.Howl,Howler=_require.Howler
var abs=Math.abs,floor=Math.floor,max=Math.max,min=Math.min,random=Math.random
var DEFAULT_FADE_RATE=.001
function isPlaceholderSound(sound){return sound.is_placeholder}var sounds={}
var active_sfx_as_music=[]
var num_loading=0
var default_params={ext_list:["ogg","mp3"],fade_rate:DEFAULT_FADE_RATE,fade_music_in_bg:true}
var sound_params
var last_played={}
var frame_timestamp=0
var fades=[]
var music
function fadesCount(){return fades.length}var volume_override=1
var volume_override_target=1
var volume_music_override=1
var volume_music_override_target=1
settingsRegister({volume:{default_value:1,type:cmd_parse.TYPE_FLOAT,range:[0,1]},volume_music:{default_value:1,type:cmd_parse.TYPE_FLOAT,range:[0,1]},volume_sound:{default_value:1,type:cmd_parse.TYPE_FLOAT,range:[0,1]}})
function musicVolume(){return settings.volume*settings.volume_music}function soundVolume(){return settings.volume*settings.volume_sound}var sounds_load_failed={}
var sounds_loading={}
var on_load_fail
function soundOnLoadFail(cb){on_load_fail=cb}function soundFindForReplacement(filename){if(sounds[filename])return filename
for(var key in sounds)if(textureCname(key)===filename)return key
return null}function soundReplaceFromDataURL(key,dataurl){var existing=sounds[key]
assert(existing)
var opts=existing.glov_load_opts
var loop=opts.loop
var sound=new Howl({src:dataurl,html5:false,loop:Boolean(loop),volume:0,onload:function onload(){sound.glov_load_opts=opts
sounds[key]=sound},onloaderror:function onloaderror(id,err,extra){console.error("Error loading sound "+key+": "+err)}})}function soundLoad(soundid,opts,cb){if((opts=opts||{}).streaming&&(is_firefox||is_itch_app))opts.streaming=false
var _opts=opts,streaming=_opts.streaming,loop=_opts.loop
if(Array.isArray(soundid)){assert(!cb)
for(var ii=0;ii<soundid.length;++ii)soundLoad(soundid[ii],opts)
return}var key="string"===typeof soundid?soundid:soundid.file
if(sounds[key]){if(cb)cb()
return}if(sounds_loading[key]){if(cb)sounds_loading[key].push(cb)
return}var cbs=[]
if(cb)cbs.push(cb)
sounds_loading[key]=cbs
delete sounds_load_failed[key]
var soundname=key
var m=soundname.match(/^((?:[\0-\t\x0B\f\x0E-\u2027\u202A-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)\.(mp3|ogg|wav|webm)$/)
var preferred_ext
if(m){soundname=m[1]
preferred_ext=m[2]}var src="sounds/"+soundname
var srcs=[]
if(preferred_ext)srcs.push(src+"."+preferred_ext)
for(var _ii=0;_ii<sound_params.ext_list.length;++_ii){var ext=sound_params.ext_list[_ii]
if(ext!==preferred_ext)srcs.push(src+"."+ext)}srcs=srcs.map(function(filename){if(opts.for_reload)filename=filename+"?rl="+Date.now()
else filename=locateAsset(filename)
return filename=""+urlhash.getURLBase()+filename})
function tryLoad(idx){if(idx===srcs.length){console.error("Error loading sound "+soundname+": All fallbacks exhausted, giving up")
if(on_load_fail)on_load_fail(soundname)
sounds_load_failed[key]=opts
callEach(cbs,delete sounds_loading[key],"Error loading sound")
return}if(!streaming)++num_loading
var once=false
var sound=new Howl({src:srcs.slice(idx),html5:Boolean(streaming),loop:Boolean(loop),volume:0,onload:function onload(){if(!once){if(!streaming)--num_loading
once=true
sound.glov_load_opts=opts
sounds[key]=sound
callEach(cbs,delete sounds_loading[key],null)}},onloaderror:function onloaderror(id,err,extra){if(idx===srcs.length-1)console.error("Error loading sound "+srcs[idx]+": "+err)
else console.log("Error loading sound "+srcs[idx]+": "+err+", trying fallback...")
if(!once){if(!streaming)--num_loading
once=true
tryLoad(idx+1)}}})}tryLoad(0)}function soundReload(filename){var name_match=filename.match(/^sounds\/([^.]+)\.\w+$/)
var sound_name=name_match&&name_match[1]
if(!sound_name)return
var existing_sound=sounds[sound_name]
var failed_sound_opts=sounds_load_failed[sound_name]
if(!existing_sound&&!failed_sound_opts){console.log("Reload triggered for non-existent sound: "+filename)
return}var opts
if(existing_sound){(opts=existing_sound.glov_load_opts).for_reload=true
delete sounds[sound_name]}else{assert(failed_sound_opts)
opts=failed_sound_opts
delete sounds_load_failed[sound_name]}soundLoad(sound_name,opts)}function soundPause(){soundTick(volume_override=volume_override_target=0)}function soundResume(){volume_override_target=1
Howler.manualUnlock()}function soundMusicPause(){volume_music_override_target=0}var skip_one_music_blend=false
function soundMusicResume(){volume_music_override_target=1
skip_one_music_blend=true}function soundFadeMusicInBackground(){var music_tick_timer=null
var last_time
function musicForceTick(){var now=Date.now()
soundTick(now-last_time)
last_time=now
music_tick_timer=setTimeout(musicForceTick,100)}onEnterBackground(function(){soundMusicPause()
last_time=Date.now()
if(!music_tick_timer)music_tick_timer=setTimeout(musicForceTick,100)})
onExitBackground(function(){soundMusicResume()
if(music_tick_timer){clearTimeout(music_tick_timer)
music_tick_timer=null}})}function soundStartup(params){sound_params=defaults(params||{},default_params)
music=[]
for(var ii=0;ii<2;++ii)music.push({sound:null,id:0,current_volume:0,target_volume:0,sys_volume:0,need_play:false})
filewatchOn(".mp3",soundReload)
filewatchOn(".ogg",soundReload)
filewatchOn(".wav",soundReload)
filewatchOn(".webm",soundReload)
if(sound_params.fade_music_in_bg)soundFadeMusicInBackground()}function soundResumed(){return!Howler.noAudio&&Howler.safeToPlay}function blendOverride(dt,override,target){var delta=.001*dt
if(override<target)override=min(override+delta,target)
else override=max(override-delta,target)
return override}function soundTick(dt){frame_timestamp+=dt
if(volume_override!==volume_override_target)volume_override=blendOverride(dt,volume_override,volume_override_target)
if(volume_music_override!==volume_music_override_target)if(skip_one_music_blend)skip_one_music_blend=false
else volume_music_override=blendOverride(dt,volume_music_override,volume_music_override_target)
if(!soundResumed())return
for(var i=0;i<active_sfx_as_music.length;++i){var _active_sfx_as_music$=active_sfx_as_music[i],_sound=_active_sfx_as_music$.sound,play_volume=_active_sfx_as_music$.play_volume,set_volume_when_played=_active_sfx_as_music$.set_volume_when_played
if(!_sound.playing())ridx(active_sfx_as_music,i)
else if(set_volume_when_played!==musicVolume()){_sound.volume(play_volume)
active_sfx_as_music[i].set_volume_when_played=musicVolume()}}var max_fade=dt*sound_params.fade_rate
for(var ii=0;ii<music.length;++ii){var mus=music[ii]
if(!mus.sound)continue
var target=settings.volume*settings.volume_music===0?0:mus.target_volume
if(mus.current_volume!==target){var delta=target-mus.current_volume
var fade_amt=min(abs(delta),max_fade)
if(delta<0)mus.current_volume=max(target,mus.current_volume-fade_amt)
else mus.current_volume=min(target,mus.current_volume+fade_amt)
if(!mus.target_volume&&!mus.current_volume){if(!mus.need_play)mus.sound.stop(mus.id)
mus.sound=null}}if(mus.sound){var sys_volume=mus.current_volume*musicVolume()*volume_override*volume_music_override
if(mus.need_play){mus.need_play=false
mus.id=mus.sound.play()
mus.sys_volume=-1}if(mus.sys_volume!==sys_volume){mus.sound.volume(sys_volume,mus.id)
mus.sys_volume=sys_volume}}}for(var _ii2=fades.length-1;_ii2>=0;--_ii2){var _fade=fades[_ii2]
var _delta=_fade.target_volume-_fade.volume
var _fade_amt=min(abs(_delta),_fade.time?dt/_fade.time:max_fade)
if(_delta<0)_fade.volume=max(_fade.target_volume,_fade.volume-_fade_amt)
else _fade.volume=min(_fade.target_volume,_fade.volume+_fade_amt)
_fade.sound.volume(_fade.volume)
if(_fade.volume===_fade.target_volume){ridx(fades,_ii2)
if(!_fade.volume)_fade.sound.stop()}}}function soundPlay(soundid,volume,as_music){volume=volume||1
if(settings.volume*(as_music?settings.volume_music:settings.volume_sound)===0)return null
if(!soundResumed())return null
if(Array.isArray(soundid))soundid=soundid[floor(random()*soundid.length)]
if("object"===typeof soundid){volume*=soundid.volume||1
soundid=soundid.file}var sound=sounds[soundid]
if(!sound)return null
var last_played_time=last_played[soundid]||-9e9
if(frame_timestamp-last_played_time<45)return null
var settingsVolume=as_music?musicVolume:soundVolume
var id=sound.play(void 0,volume*settingsVolume()*volume_override)
last_played[soundid]=frame_timestamp
var played_sound={name:soundid,volume_current:volume,stop:sound.stop.bind(sound,id),playing:sound.playing.bind(sound,id),location:function location(){var v=sound.seek(id)
if("number"!==typeof v)return 0
return v},duration:sound.duration.bind(sound,id),volume:function volume(vol){played_sound.volume_current=vol
sound.volume(vol*settingsVolume()*volume_override,id)},fade:function fade(target_volume,time){var new_fade={sound:played_sound,volume:played_sound.volume_current,target_volume:target_volume,id:id,time:time,settingsVolume:settingsVolume}
for(var ii=0;ii<fades.length;++ii)if(fades[ii].id===id){fades[ii]=new_fade
return}fades.push(new_fade)}}
if(as_music)active_sfx_as_music.push({sound:played_sound,play_volume:volume,set_volume_when_played:musicVolume()})
return played_sound}function soundPlayStreaming(soundname,volume,as_music,on_played_sound){if(settings.volume*(as_music?settings.volume_music:settings.volume_sound)===0)return null
if(Array.isArray(soundname))soundname=soundname[floor(random()*soundname.length)]
var played_sound={name:soundname,is_placeholder:true}
soundLoad(soundname,{streaming:true,loop:false},function(err){if(!err){played_sound=soundPlay(soundname,volume,as_music)
if(on_played_sound)on_played_sound(played_sound)}})
return played_sound}function soundPlayMusic(soundname,volume,transition){if(settings.volume*settings.volume_music===0)return
if(void 0===volume)volume=1
transition=transition||FADE_DEFAULT
soundLoad(soundname,{streaming:true,loop:true},function(err){var sound=null
if(err);else{sound=sounds[soundname]
assert(sound)
if(music[0].sound===sound){music[0].target_volume=volume
if(!transition)if(!volume){sound.stop(music[0].id)
music[0].sound=null}else{var sys_volume=music[0].sys_volume=volume*musicVolume()*volume_override*volume_music_override
sound.volume(sys_volume,music[0].id)
if(!sound.playing())sound.play(void 0,sys_volume)}return}}if(music[0].current_volume)if(transition&FADE_OUT){var temp=music[1]
music[1]=music[0]
music[0]=temp
music[1].target_volume=0}if(music[0].sound)music[0].sound.stop(music[0].id)
if(music[0].sound=sound){music[0].target_volume=volume
var start_vol=transition&FADE_IN?0:volume
music[0].current_volume=start_vol
if(soundResumed()){var _sys_volume=start_vol*musicVolume()*volume_override*volume_music_override
music[0].id=sound.play(void 0,_sys_volume)
music[0].sys_volume=_sys_volume
music[0].need_play=false}else music[0].need_play=true}else music[0].target_volume=music[0].current_volume=0})}function soundLoading(){return num_loading}

},{"../common/util":96,"./browser":13,"./cmds":17,"./engine":21,"./filewatch":27,"./locate_asset":42,"./settings":59,"./textures":70,"./urlhash":74,"@jimbly/howler/src/howler.core.js":undefined,"assert":undefined}],66:[function(require,module,exports){
"use strict"
exports.SPOT_STATE_REGULAR=exports.SPOT_STATE_FOCUSED=exports.SPOT_STATE_DOWN=exports.SPOT_STATE_DISABLED=exports.SPOT_NAV_UP=exports.SPOT_NAV_RIGHT=exports.SPOT_NAV_PREV=exports.SPOT_NAV_NONE=exports.SPOT_NAV_NEXT=exports.SPOT_NAV_LEFT=exports.SPOT_NAV_DOWN=exports.SPOT_NAVTYPE_SIMPLE=exports.SPOT_NAVTYPE_EXTENDED=exports.SPOT_DEFAULT_LABEL=exports.SPOT_DEFAULT_BUTTON_DRAW_ONLY=exports.SPOT_DEFAULT_BUTTON_DISABLED=exports.SPOT_DEFAULT_BUTTON=exports.SPOT_DEFAULT=void 0
exports.spot=spot
exports.spotAsyncActivateButton=spotAsyncActivateButton
exports.spotEndInput=spotEndInput
exports.spotEndOfFrame=spotEndOfFrame
exports.spotFocusCheck=spotFocusCheck
exports.spotFocusSteal=spotFocusSteal
exports.spotGet=spotGet
exports.spotGetCurrentFocusKey=spotGetCurrentFocusKey
exports.spotKey=spotKey
exports.spotMouseoverHook=spotMouseoverHook
exports.spotPadMode=spotPadMode
exports.spotPadSuppressed=spotPadSuppressed
exports.spotSetNavtype=spotSetNavtype
exports.spotSetPadMode=spotSetPadMode
exports.spotSubBegin=spotSubBegin
exports.spotSubEnd=spotSubEnd
exports.spotSubPop=spotSubPop
exports.spotSubPush=spotSubPush
exports.spotSuppressKBNav=spotSuppressKBNav
exports.spotSuppressPad=spotSuppressPad
exports.spotTopOfFrame=spotTopOfFrame
exports.spotUnfocus=spotUnfocus
exports.spotlog=spotlog
var _spot_nav_keys_base,_spot_nav_keys_simple,_spot_nav_keys_extend
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var _input_constants=require("./input_constants")
var BUTTON_ANY=_input_constants.BUTTON_ANY
var SPOT_NAVTYPE_SIMPLE=0
exports.SPOT_NAVTYPE_SIMPLE=SPOT_NAVTYPE_SIMPLE
var SPOT_NAVTYPE_EXTENDED=1
exports.SPOT_NAVTYPE_EXTENDED=SPOT_NAVTYPE_EXTENDED
var SPOT_NAV_NONE=0
exports.SPOT_NAV_NONE=SPOT_NAV_NONE
var SPOT_NAV_LEFT=1
exports.SPOT_NAV_LEFT=SPOT_NAV_LEFT
var SPOT_NAV_UP=2
exports.SPOT_NAV_UP=SPOT_NAV_UP
var SPOT_NAV_RIGHT=3
exports.SPOT_NAV_RIGHT=SPOT_NAV_RIGHT
var SPOT_NAV_DOWN=4
exports.SPOT_NAV_DOWN=SPOT_NAV_DOWN
var SPOT_NAV_NEXT=5
exports.SPOT_NAV_NEXT=SPOT_NAV_NEXT
var SPOT_NAV_PREV=6
exports.SPOT_NAV_PREV=SPOT_NAV_PREV
var SPOT_NAV_MAX=7
var SPOT_STATE_REGULAR=1
exports.SPOT_STATE_REGULAR=SPOT_STATE_REGULAR
var SPOT_STATE_DOWN=2
exports.SPOT_STATE_DOWN=SPOT_STATE_DOWN
var SPOT_STATE_FOCUSED=3
exports.SPOT_STATE_FOCUSED=SPOT_STATE_FOCUSED
var SPOT_STATE_DISABLED=4
exports.SPOT_STATE_DISABLED=SPOT_STATE_DISABLED
var SPOT_DEFAULT={key:void 0,disabled:false,in_event_cb:null,drag_target:false,drag_over:false,button:BUTTON_ANY,is_button:false,button_long_press:false,pad_focusable:true,spatial_focus:true,auto_focus:false,long_press_focuses:true,sound_button:"button_click",sound_rollover:"rollover",touch_focuses:false,disabled_focusable:true,hotkey:null,hotkeys:null,hotpad:null,focus_steal:false,sticky_focus:false,custom_nav:null}
var SPOT_DEFAULT_BUTTON=_extends({},exports.SPOT_DEFAULT=SPOT_DEFAULT,{is_button:true})
exports.SPOT_DEFAULT_BUTTON=SPOT_DEFAULT_BUTTON
var SPOT_DEFAULT_BUTTON_DISABLED=_extends({},SPOT_DEFAULT,{disabled:true,sound_rollover:null})
exports.SPOT_DEFAULT_BUTTON_DISABLED=SPOT_DEFAULT_BUTTON_DISABLED
var SPOT_DEFAULT_BUTTON_DRAW_ONLY=_extends({},SPOT_DEFAULT,{pad_focusable:false})
exports.SPOT_DEFAULT_BUTTON_DRAW_ONLY=SPOT_DEFAULT_BUTTON_DRAW_ONLY
var SPOT_DEFAULT_LABEL=_extends({},SPOT_DEFAULT,{sound_rollover:null,touch_focuses:true})
exports.SPOT_DEFAULT_LABEL=SPOT_DEFAULT_LABEL
var assert=require("assert")
var abs=Math.abs,max=Math.max
var verify=require("../common/verify")
var _camera2dJs=require("./camera2d.js")
var camera2d=_camera2dJs
var _engineJs=require("./engine.js")
var engine=_engineJs
var _fontJs=require("./font.js")
var fontStyle=_fontJs.fontStyle
var _inputJs=require("./input.js")
var KEYS=_inputJs.KEYS
var PAD=_inputJs.PAD
var dragDrop=_inputJs.dragDrop
var dragOver=_inputJs.dragOver
var inputClick=_inputJs.inputClick
var inputEatenMouse=_inputJs.inputEatenMouse
var inputTouchMode=_inputJs.inputTouchMode
var keyDown=_inputJs.keyDown
var keyDownEdge=_inputJs.keyDownEdge
var longPress=_inputJs.longPress
var mouseButtonHadEdge=_inputJs.mouseButtonHadEdge
var mouseDomPos=_inputJs.mouseDomPos
var mouseDownAnywhere=_inputJs.mouseDownAnywhere
var mouseDownEdge=_inputJs.mouseDownEdge
var mouseDownMidClick=_inputJs.mouseDownMidClick
var mouseMoved=_inputJs.mouseMoved
var mouseOver=_inputJs.mouseOver
var mousePosIsTouch=_inputJs.mousePosIsTouch
var padButtonDownEdge=_inputJs.padButtonDownEdge
var _link=require("./link")
var link=_link.link
var _settingsJs=require("./settings.js")
var settings=_settingsJs
var _uiJs=require("./ui.js")
var ui=_uiJs
var _uiJs2=require("./ui.js")
var drawLine=_uiJs2.drawLine
var drawRect=_uiJs2.drawRect
var drawTooltipBox=_uiJs2.drawTooltipBox
var playUISound=_uiJs2.playUISound
var checkHooks=ui.internal.checkHooks
var focus_sub_rect=null
var focus_sub_rect_elem=null
var sub_stack=[]
var focus_key=null
var focus_is_sticky=false
var focus_key_nonsticky=null
var focus_pos={x:0,y:0,w:0,h:0}
var last_frame_spots=[]
var frame_spots=[]
var focus_next=[]
var focus_next_via=[]
var frame_autofocus_spots={}
var last_frame_autofocus_spots={}
var pad_mode=false
var suppress_pad=false
var async_activate_key=null
function isSubRect(area){return area.is_sub_rect}function spotPadMode(){return pad_mode}function spotSetPadMode(new_mode){pad_mode=new_mode}function spotlog(){}function spotGet(key,last_frame){var frames=last_frame?last_frame_spots:frame_spots
var key_computed_spot=null
for(var ii=0;ii<frames.length;++ii){if(key===frames[ii].key)return frames[ii]
if(key===frames[ii].key_computed)key_computed_spot=frames[ii]}return key_computed_spot}function spotKey(param){if(param.key_computed)if(!engine.defines.SPOT_DEBUG)return param.key_computed
profilerStart("spotKey")
var key=param.key||(focus_sub_rect?focus_sub_rect.key_computed:"")+"_"+param.x+"_"+param.y
if(param.key_computed)assert.equal(param.key_computed,key)
else param.key_computed=key
profilerStop("spotKey")
return param.key_computed}function spotFocusSet(param,from_mouseover,force,log){if(from_mouseover&&(!mouseMoved()||mousePosIsTouch()))return false
var def=param.def||SPOT_DEFAULT
var sound_rollover=void 0===param.sound_rollover?def.sound_rollover:param.sound_rollover
var key=param.key_computed||spotKey(param)
var use_nonsticky=focus_is_sticky&&!force&&from_mouseover&&key!==focus_key
var key_prev=use_nonsticky?focus_key_nonsticky:focus_key
if((sound_rollover||!from_mouseover)&&key_prev!==key)playUISound(sound_rollover||SPOT_DEFAULT.sound_rollover)
if(key_prev!==key||pad_mode!==!from_mouseover)spotlog("spotFocusSet",key,log,from_mouseover?"":"pad_mode",use_nonsticky?"nonsticky":"")
pad_mode=!from_mouseover
if(use_nonsticky)focus_key_nonsticky=key
else{focus_key=key
var sticky_focus=void 0===param.sticky_focus?def.sticky_focus:param.sticky_focus
focus_is_sticky=sticky_focus
focus_key_nonsticky=null}assert(param.dom_pos)
return true}function spotUnfocus(){spotlog("spotUnfocus")
focus_key_nonsticky=focus_key=null
pad_mode=focus_is_sticky=false}var spot_nav_keys_base=((_spot_nav_keys_base={})[SPOT_NAV_LEFT]={pads:[PAD.LEFT]},_spot_nav_keys_base[SPOT_NAV_UP]={pads:[PAD.UP]},_spot_nav_keys_base[SPOT_NAV_RIGHT]={pads:[PAD.RIGHT]},_spot_nav_keys_base[SPOT_NAV_DOWN]={pads:[PAD.DOWN]},_spot_nav_keys_base[SPOT_NAV_PREV]={shift_keys:[KEYS.TAB],pads:[PAD.LEFT_BUMPER]},_spot_nav_keys_base[SPOT_NAV_NEXT]={pads:[PAD.RIGHT_BUMPER],unshift_keys:[KEYS.TAB]},_spot_nav_keys_base)
var spot_nav_keys_simple=((_spot_nav_keys_simple={})[SPOT_NAV_LEFT]={keys:[KEYS.LEFT],pads:spot_nav_keys_base[SPOT_NAV_LEFT].pads},_spot_nav_keys_simple[SPOT_NAV_UP]={keys:[KEYS.UP],pads:spot_nav_keys_base[SPOT_NAV_UP].pads},_spot_nav_keys_simple[SPOT_NAV_RIGHT]={keys:[KEYS.RIGHT],pads:spot_nav_keys_base[SPOT_NAV_RIGHT].pads},_spot_nav_keys_simple[SPOT_NAV_DOWN]={keys:[KEYS.DOWN],pads:spot_nav_keys_base[SPOT_NAV_DOWN].pads},_spot_nav_keys_simple[SPOT_NAV_PREV]=spot_nav_keys_base[SPOT_NAV_PREV],_spot_nav_keys_simple[SPOT_NAV_NEXT]=spot_nav_keys_base[SPOT_NAV_NEXT],_spot_nav_keys_simple)
var spot_nav_keys_extended=((_spot_nav_keys_extend={})[SPOT_NAV_LEFT]={keys:spot_nav_keys_simple[SPOT_NAV_LEFT].keys.concat([KEYS.A,KEYS.NUMPAD4]),pads:spot_nav_keys_simple[SPOT_NAV_LEFT].pads},_spot_nav_keys_extend[SPOT_NAV_UP]={keys:spot_nav_keys_simple[SPOT_NAV_UP].keys.concat([KEYS.W,KEYS.NUMPAD8]),pads:spot_nav_keys_simple[SPOT_NAV_UP].pads},_spot_nav_keys_extend[SPOT_NAV_RIGHT]={keys:spot_nav_keys_simple[SPOT_NAV_RIGHT].keys.concat([KEYS.D,KEYS.NUMPAD6]),pads:spot_nav_keys_simple[SPOT_NAV_RIGHT].pads},_spot_nav_keys_extend[SPOT_NAV_DOWN]={keys:spot_nav_keys_simple[SPOT_NAV_DOWN].keys.concat([KEYS.S,KEYS.NUMPAD5,KEYS.NUMPAD2]),pads:spot_nav_keys_simple[SPOT_NAV_DOWN].pads},_spot_nav_keys_extend[SPOT_NAV_PREV]=spot_nav_keys_base[SPOT_NAV_PREV],_spot_nav_keys_extend[SPOT_NAV_NEXT]=spot_nav_keys_base[SPOT_NAV_NEXT],_spot_nav_keys_extend)
function keyDownShifted(key){return keyDown(KEYS.SHIFT)&&keyDownEdge(key)}function keyDownUnshifted(key){return!keyDown(KEYS.SHIFT)&&keyDownEdge(key)}function compileSpotNavKeysEntry(entry){var fns=[]
if(entry.keys)for(var ii=0;ii<entry.keys.length;++ii)fns.push(keyDownEdge.bind(null,entry.keys[ii]))
if(entry.pads)for(var _ii=0;_ii<entry.pads.length;++_ii)fns.push(padButtonDownEdge.bind(null,entry.pads[_ii]))
if(entry.shift_keys)for(var _ii2=0;_ii2<entry.shift_keys.length;++_ii2)fns.push(keyDownShifted.bind(null,entry.shift_keys[_ii2]))
if(entry.unshift_keys)for(var _ii3=0;_ii3<entry.unshift_keys.length;++_ii3)fns.push(keyDownUnshifted.bind(null,entry.unshift_keys[_ii3]))
return function(){for(var _ii4=0;_ii4<fns.length;++_ii4)if(fns[_ii4]())return true
return false}}function compileSpotNavKeys(keys){var _ref
return(_ref={})[SPOT_NAV_LEFT]=compileSpotNavKeysEntry(keys[SPOT_NAV_LEFT]),_ref[SPOT_NAV_UP]=compileSpotNavKeysEntry(keys[SPOT_NAV_UP]),_ref[SPOT_NAV_RIGHT]=compileSpotNavKeysEntry(keys[SPOT_NAV_RIGHT]),_ref[SPOT_NAV_DOWN]=compileSpotNavKeysEntry(keys[SPOT_NAV_DOWN]),_ref[SPOT_NAV_PREV]=compileSpotNavKeysEntry(keys[SPOT_NAV_PREV]),_ref[SPOT_NAV_NEXT]=compileSpotNavKeysEntry(keys[SPOT_NAV_NEXT]),_ref}var compiled_nav_base=compileSpotNavKeys(spot_nav_keys_base)
var compiled_nav_simple=compileSpotNavKeys(spot_nav_keys_simple)
var compiled_nav_extended=compileSpotNavKeys(spot_nav_keys_extended)
var spot_nav_type
var spot_nav_keys
function spotSetNavtype(type){spot_nav_keys=(spot_nav_type=type)===SPOT_NAVTYPE_SIMPLE?compiled_nav_simple:compiled_nav_extended}spotSetNavtype(SPOT_NAVTYPE_EXTENDED)
function resetNavKeys(){spot_nav_keys=spot_nav_type===SPOT_NAVTYPE_SIMPLE?compiled_nav_simple:compiled_nav_extended}var suppress_kb_nav_this_frame=false
function spotSuppressKBNav(left_right,up_down){suppress_kb_nav_this_frame=true
assert(left_right)
var active=spot_nav_type===SPOT_NAVTYPE_SIMPLE?compiled_nav_simple:compiled_nav_extended
if(up_down){var _spot_nav_keys
spot_nav_keys=((_spot_nav_keys={})[SPOT_NAV_LEFT]=compiled_nav_base[SPOT_NAV_LEFT],_spot_nav_keys[SPOT_NAV_UP]=compiled_nav_base[SPOT_NAV_UP],_spot_nav_keys[SPOT_NAV_RIGHT]=compiled_nav_base[SPOT_NAV_RIGHT],_spot_nav_keys[SPOT_NAV_DOWN]=compiled_nav_base[SPOT_NAV_DOWN],_spot_nav_keys[SPOT_NAV_PREV]=active[SPOT_NAV_PREV],_spot_nav_keys[SPOT_NAV_NEXT]=active[SPOT_NAV_NEXT],_spot_nav_keys)}else{var _spot_nav_keys2
spot_nav_keys=((_spot_nav_keys2={})[SPOT_NAV_LEFT]=compiled_nav_base[SPOT_NAV_LEFT],_spot_nav_keys2[SPOT_NAV_UP]=compiled_nav_simple[SPOT_NAV_UP],_spot_nav_keys2[SPOT_NAV_RIGHT]=compiled_nav_base[SPOT_NAV_RIGHT],_spot_nav_keys2[SPOT_NAV_DOWN]=compiled_nav_simple[SPOT_NAV_DOWN],_spot_nav_keys2[SPOT_NAV_PREV]=active[SPOT_NAV_PREV],_spot_nav_keys2[SPOT_NAV_NEXT]=active[SPOT_NAV_NEXT],_spot_nav_keys2)}}var TARGET_QUAD=0
var TARGET_HALF=1
var TARGET_ALL=2
function findBestTargetInternal(nav,dom_pos,targets,precision,filter){var start_w2=dom_pos.w/2
var start_h2=dom_pos.h/2
var start_x=dom_pos.x+start_w2
var start_y=dom_pos.y+start_h2
var start_left=dom_pos.x
var start_right=dom_pos.x+dom_pos.w
var start_top=dom_pos.y
var start_bottom=dom_pos.y+dom_pos.h
var best=null
var bestd
for(var ii=0;ii<targets.length;++ii){var _param=targets[ii]
if(!filter(_param))continue
var target=_param.dom_pos
var d=void 0
if(precision===TARGET_QUAD){var quadrant=void 0
var target_right=target.x+target.w
var target_bottom=target.y+target.h
var left_dx=start_left-target_right
var right_dx=target.x-start_right
var top_dy=start_top-target_bottom
var bottom_dy=target.y-start_bottom
if(left_dx>=-start_w2&&target_bottom>start_top-left_dx&&target.y<start_bottom+left_dx){quadrant=SPOT_NAV_LEFT
d=left_dx+max(target.y-start_y,start_y-target_bottom,0)}else if(right_dx>=-start_w2&&target_bottom>start_top-right_dx&&target.y<start_bottom+right_dx){quadrant=SPOT_NAV_RIGHT
d=right_dx+max(target.y-start_y,start_y-target_bottom,0)}else if(top_dy>=-start_h2&&target_right>=start_left-top_dy&&target.x<=start_right+top_dy){quadrant=SPOT_NAV_UP
d=top_dy+max(target.x-start_x,start_x-target_right,0)}else if(bottom_dy>=-start_h2&&target_right>=start_left-bottom_dy&&target.x<=start_right+bottom_dy){quadrant=SPOT_NAV_DOWN
d=bottom_dy+max(target.x-start_x,start_x-target_right,0)}if(void 0===quadrant){var dx=target.x+target.w/2-start_x
var dy=target.y+target.h/2-start_y
d=abs(dx)+abs(dy)
if(abs(dx)>abs(dy))if(dx>0)quadrant=SPOT_NAV_RIGHT
else quadrant=SPOT_NAV_LEFT
else if(dy>0)quadrant=SPOT_NAV_DOWN
else quadrant=SPOT_NAV_UP}if(quadrant!==nav)continue}else{var _dx=target.x+target.w/2-start_x
var _dy=target.y+target.h/2-start_y
d=abs(_dx)+abs(_dy)
if(precision===TARGET_HALF)if(_dx<=0&&nav===SPOT_NAV_RIGHT||_dx>=0&&nav===SPOT_NAV_LEFT||_dy<=0&&nav===SPOT_NAV_DOWN||_dy>=0&&nav===SPOT_NAV_UP)continue}if(!best||d<bestd){best=_param
bestd=d}}return best}var EPSILON=1e-5
var debug_style
function spotDebugList(show_all,list){if(!debug_style)debug_style=fontStyle(null,{color:255,outline_color:4294967244,outline_width:2})
for(var ii=0;ii<list.length;++ii){var area=list[ii]
var pos=area.dom_pos
var color=void 0
if(isSubRect(area)){if(show_all)ui.font.drawSizedAligned(debug_style,pos.x,pos.y,Z.DEBUG,8,ui.font.ALIGN.HVCENTERFIT,pos.w,pos.h,area.key_computed||"unknown")
continue}if(area.spot_debug_ignore)continue
if(area.only_mouseover)color=[1,.5,0,.5]
else{var def=area.def||SPOT_DEFAULT
if(!(void 0===area.pad_focusable?def.pad_focusable:area.pad_focusable))continue
if(!(void 0===area.spatial_focus?def.spatial_focus:area.spatial_focus))continue
for(var jj=0;jj<list.length;++jj){if(ii===jj)continue
var other=list[jj]
if(isSubRect(other))continue
if(other.sub_rect!==area.sub_rect)continue
var other_def=other.def||SPOT_DEFAULT
var other_pad_focusable=void 0===other.pad_focusable?other_def.pad_focusable:other.pad_focusable
if(other.only_mouseover||!other_pad_focusable)continue
if(!(void 0===other.spatial_focus?other_def.spatial_focus:other.spatial_focus))continue
var other_pos=other.dom_pos
if(pos.x<other_pos.x+other_pos.w-EPSILON&&pos.x+pos.w>other_pos.x+EPSILON&&pos.y<other_pos.y+other_pos.h-EPSILON&&pos.y+pos.h>other_pos.y+EPSILON)color=[1,0,0,.5]}}if(!show_all&&!color)continue
drawRect(pos.x,pos.y,pos.x+pos.w,pos.y+pos.h,Z.DEBUG,color||[1,1,0,.5])
ui.font.drawSizedAligned(debug_style,pos.x,pos.y,Z.DEBUG,8,ui.font.ALIGN.HVCENTERFIT,pos.w,pos.h,area.key_computed||"unknown")}}function spotDebug(){camera2d.push()
camera2d.setDOMMapped()
var show_all=keyDown(KEYS.SHIFT)
spotDebugList(show_all,frame_spots)
if(pad_mode||show_all)for(var ii=SPOT_NAV_LEFT;ii<=SPOT_NAV_DOWN;++ii){var next_spot=focus_next[ii]
if(next_spot){var pos=focus_pos
var next=next_spot.dom_pos
var via=focus_next_via[ii]
if(via){pos=via.dom_pos
drawLine(pos.x+pos.w/2,pos.y+pos.h/2,next.x+next.w/2,next.y+next.h/2,Z.DEBUG,1,.95,[1,.5,0,1])
pos=focus_pos
next=via.dom_pos}drawLine(pos.x+pos.w/2,pos.y+pos.h/2,next.x+next.w/2,next.y+next.h/2,Z.DEBUG,1,.95,[1,1,0,1])}}camera2d.pop()}var filter_sub_rect
var filter_not
function filterMatchesSubrect(param){return param!==filter_not&&param.sub_rect===filter_sub_rect}function overlaps(r1,r2){return r1.x+r1.w>r2.x&&r1.x<r2.x+r2.w&&r1.y+r1.h>r2.y&&r1.y<r2.y+r2.h}function contains(outer,inner){return inner.x>=outer.x&&inner.x+inner.w<=outer.x+outer.w&&inner.y>=outer.y&&inner.y+inner.h<=outer.y+outer.h}function filterInSubrectView(param){if(param.sub_rect!==filter_sub_rect)return false
return overlaps(param.dom_pos,filter_sub_rect.dom_pos)}function filterMatchesSubrectOrInVisibleChild(param){if(param===filter_not)return false
if(param.sub_rect===filter_sub_rect)return true
if(param.sub_rect&&param.sub_rect.sub_rect===filter_sub_rect)return overlaps(param.dom_pos,param.sub_rect.dom_pos)
return false}var SUBRECT_FILTERS=[filterInSubrectView,filterMatchesSubrect]
function findBestWithinSubrect(nav,dom_pos,pad_focusable_list,best,precision_max){filter_sub_rect=best
for(var jj=0;jj<SUBRECT_FILTERS.length;++jj){var filter=SUBRECT_FILTERS[jj]
for(var precision=0;precision<=precision_max;++precision){var best_inside=findBestTargetInternal(nav,dom_pos,pad_focusable_list,precision,filter)
if(best_inside){assert(!isSubRect(best_inside))
return best_inside}}}return null}function findBestTargetFromSubRect(start_sub_rect,nav,dom_pos,pad_focusable_list,precision){filter_sub_rect=start_sub_rect
var best=findBestTargetInternal(nav,dom_pos,pad_focusable_list,precision,filterMatchesSubrectOrInVisibleChild)
if(best)if(isSubRect(best))if(!(best=findBestWithinSubrect(nav,dom_pos,pad_focusable_list,focus_next_via[nav]=best,precision)))focus_next_via[nav]=void 0
return best}function spotCalcNavTargets(){for(var ii=1;ii<SPOT_NAV_MAX;++ii){focus_next[ii]=void 0
focus_next_via[ii]=void 0}var start
var pad_focusable_list=[]
var prev
var first_non_sub_rect
for(var _ii5=0;_ii5<frame_spots.length;++_ii5){var _param2=frame_spots[_ii5]
if(isSubRect(_param2)){if(!_param2.is_empty_sub_rect)pad_focusable_list.push(_param2)}else if(_param2.key_computed===focus_key){if(!focus_next[SPOT_NAV_PREV]&&prev)focus_next[SPOT_NAV_PREV]=prev
start=_param2}else{var def=_param2.def||SPOT_DEFAULT
if(void 0===_param2.pad_focusable?def.pad_focusable:_param2.pad_focusable){if(!first_non_sub_rect)first_non_sub_rect=_param2
prev=_param2
if(!focus_next[SPOT_NAV_NEXT]&&start)focus_next[SPOT_NAV_NEXT]=_param2
if(void 0===_param2.spatial_focus?def.spatial_focus:_param2.spatial_focus)pad_focusable_list.push(_param2)}}}if(!focus_next[SPOT_NAV_PREV]&&prev)focus_next[SPOT_NAV_PREV]=prev
if(!focus_next[SPOT_NAV_NEXT])focus_next[SPOT_NAV_NEXT]=first_non_sub_rect
var precision_max
var start_sub_rect
if(start){start_sub_rect=start.sub_rect
focus_pos.x=start.dom_pos.x
focus_pos.y=start.dom_pos.y
focus_pos.w=start.dom_pos.w
focus_pos.h=start.dom_pos.h
precision_max=TARGET_HALF}else{start_sub_rect=null
for(var _ii6=0;_ii6<frame_spots.length;++_ii6){var _param3=frame_spots[_ii6]
if(isSubRect(_param3))if(contains(_param3.dom_pos,focus_pos))start_sub_rect=_param3}if(start_sub_rect)precision_max=TARGET_HALF
else precision_max=TARGET_ALL}for(var nav=1;nav<=SPOT_NAV_DOWN;++nav)for(var precision=0;precision<=precision_max;++precision){filter_not=null
var best=findBestTargetFromSubRect(start_sub_rect,nav,focus_pos,pad_focusable_list,precision)
if(best){focus_next[nav]=best
break}if(start_sub_rect)if(best=findBestTargetFromSubRect((filter_not=start_sub_rect).sub_rect,nav,focus_pos,pad_focusable_list,precision)){focus_next[nav]=best
break}}if(start){var _def=start.def||SPOT_DEFAULT
var custom_nav=void 0===start.custom_nav?_def.custom_nav:start.custom_nav
if(custom_nav){var by_key
for(var key_string in custom_nav){var key=Number(key_string)
var target=custom_nav[key]
if(null===target||void 0===target)focus_next[key]=target
else{if(!by_key){by_key={}
for(var _ii7=0;_ii7<frame_spots.length;++_ii7){var _param4=frame_spots[_ii7]
if(!isSubRect(_param4))by_key[_param4.key_computed]=_param4}}if(by_key[target])focus_next[key]=by_key[target]}}}}}function spotTopOfFrame(){if(mouseMoved()){var pos=mouseDomPos()
focus_pos.x=pos[0]
focus_pos.y=pos[1]
focus_pos.w=0
focus_pos.h=0}if(mouseDownEdge({peek:true}))pad_mode=false
sub_stack.length=0
focus_sub_rect=null}function spotSuppressPad(){suppress_pad=true
if(pad_mode&&focus_key&&!focus_is_sticky){spotUnfocus()
pad_mode=true}}function spotPadSuppressed(){return suppress_pad}function spotEndOfFrame(){spotCalcNavTargets()
last_frame_autofocus_spots=frame_autofocus_spots
suppress_pad=false
last_frame_spots=frame_spots
frame_spots=[]
frame_autofocus_spots={}
async_activate_key=null
if(!suppress_kb_nav_this_frame)resetNavKeys()
suppress_kb_nav_this_frame=false}function frameSpotsPush(param){assert(param.dom_pos)
verify(isFinite(param.dom_pos.x))
verify(isFinite(param.dom_pos.y))
verify(isFinite(param.dom_pos.w))
verify(isFinite(param.dom_pos.h))
param.sub_rect=focus_sub_rect
frame_spots.push(param)
if(focus_sub_rect)focus_sub_rect.is_empty_sub_rect=false}function spotEntirelyObscured(param){var pos=param.dom_pos
for(var ii=0;ii<frame_spots.length;++ii){var other=frame_spots[ii]
if(isSubRect(other))continue
if(other.sub_rect!==focus_sub_rect)continue
var other_pos=other.dom_pos
if(other_pos.x<=pos.x&&other_pos.x+other_pos.w>=pos.x+pos.w&&other_pos.y<=pos.y&&other_pos.y+other_pos.h>=pos.y+pos.h)return true}return false}function spotSubPush(){sub_stack.push([focus_sub_rect,focus_sub_rect_elem])
focus_sub_rect=null}function spotSubPop(){var _verify=verify(sub_stack.pop())
focus_sub_rect=_verify[0]
focus_sub_rect_elem=_verify[1]}function spotSubBegin(param_in){assert(param_in.key)
if(focus_sub_rect)assert(!focus_sub_rect,"Recursive spot, parent:"+focus_sub_rect.key+", self:"+param_in.key+", same="+(param_in===focus_sub_rect))
spotKey(param_in)
var sub_rect=param_in
sub_rect.is_sub_rect=true
if(!sub_rect.dom_pos)sub_rect.dom_pos={}
camera2d.virtualToDomPosParam(sub_rect.dom_pos,sub_rect)
if(!spotEntirelyObscured(sub_rect))frameSpotsPush(sub_rect);(focus_sub_rect=sub_rect).is_empty_sub_rect=true
focus_sub_rect_elem=null}function spotSubEnd(){assert(focus_sub_rect)
focus_sub_rect=null
return focus_sub_rect_elem}function spotMouseoverHook(pos_param_in,param){if(inputEatenMouse()||param.peek)return
if(param.key_computed)return
var pos_param=pos_param_in
if(!pos_param.dom_pos)pos_param.dom_pos={}
camera2d.virtualToDomPosParam(pos_param.dom_pos,pos_param)
if(!spotEntirelyObscured(pos_param)){var area=pos_param
area.only_mouseover=true
area.pad_focusable=false
if(engine.defines.SPOT_DEBUG)area.spot_debug_ignore=param.eat_clicks||param.spot_debug_ignore
frameSpotsPush(area)}}function keyCheck(nav_dir){if(suppress_pad)return false
return spot_nav_keys[nav_dir]()}function spotFocusCheckNavButtonsFocused(param){for(var ii=1;ii<SPOT_NAV_MAX;++ii){var elem=focus_next[ii]
if(void 0!==elem&&keyCheck(ii))if(elem)spotFocusSet(elem,false,false,"nav_focused")
else param.out.nav=ii}}function spotFocusCheckNavButtonsUnfocused(param){for(var ii=1;ii<SPOT_NAV_MAX;++ii){var elem=focus_next[ii]
if(elem&&elem.key_computed===param.key_computed&&keyCheck(ii))spotFocusSet(elem,false,false,"nav_unfocused")}}function spotFocusSetSilent(param){var key=spotKey(param)
var def=param.def||SPOT_DEFAULT
focus_key=key
var sticky_focus=void 0===param.sticky_focus?def.sticky_focus:param.sticky_focus
focus_is_sticky=sticky_focus
focus_key_nonsticky=null}function spotGetCurrentFocusKey(){return[focus_key,focus_is_sticky,focus_key_nonsticky].join(";")}function spotFocusSteal(param){spotlog("spotFocusSteal",spotKey(param),false)
pad_mode=true
spotFocusSetSilent(param)}function spotParamAddOut(param){if(!param.out)param.out={}}function spotParamAddPosCache(param){assert(param.key_computed)
if(!param.dom_pos)param.dom_pos={}}function spotParamIsSpotInternal(param){}function spotFocusCheck(param){spotParamAddOut(param)
var out=param.out
out.focused=false
out.kb_focused=false
out.allow_focus=false
var key=spotKey(param)
var def=param.def||SPOT_DEFAULT
if(void 0===param.disabled?def.disabled:param.disabled)if(!(void 0===param.disabled_focusable?def.disabled_focusable:param.disabled_focusable))return out
if(void 0===param.focus_steal?def.focus_steal:param.focus_steal)spotFocusSetSilent(param)
if(focus_key===key)spotFocusCheckNavButtonsFocused(param)
else spotFocusCheckNavButtonsUnfocused(param)
var focused=focus_key===key||focus_key_nonsticky===key
if(inputEatenMouse()){if(focus_key===key){spotUnfocus()
focused=false}if(focus_key_nonsticky===key){focus_key_nonsticky=null
focused=false}}else{out.allow_focus=true
spotParamAddPosCache(param)
camera2d.virtualToDomPosParam(param.dom_pos,param)
var auto_focus=void 0===param.auto_focus?def.auto_focus:param.auto_focus
if(!spotEntirelyObscured(param)||focused&&focus_is_sticky){frameSpotsPush(param)
if(auto_focus)if(!focused&&!last_frame_autofocus_spots[key]&&pad_mode){spotlog("auto_focus",key)
spotFocusSetSilent(param)
focused=true}}if(auto_focus)frame_autofocus_spots[key]=param
if(focus_sub_rect&&focus_key===key)focus_sub_rect_elem=param}out.kb_focused=focus_key===key
out.focused=focused
return out}function spotEndInput(){if(engine.defines.SPOT_DEBUG)spotDebug()}function spotAsyncActivateButton(key){async_activate_key=key}var last_signal={key:"",timestamp:0}
function spotSignalRet(param){var out=param.out
var key=param.key_computed
assert(key)
out.double_click=key===last_signal.key&&engine.frame_timestamp-last_signal.timestamp<settings.double_click_time
last_signal.key=key
last_signal.timestamp=engine.frame_timestamp
out.ret++}function spot(param){profilerStart("spot")
var def=param.def||SPOT_DEFAULT
var disabled=void 0===param.disabled?def.disabled:param.disabled
var is_button=void 0===param.is_button?def.is_button:param.is_button
var button_long_press=void 0===param.button_long_press?def.button_long_press:param.button_long_press
var in_event_cb=void 0===param.in_event_cb?def.in_event_cb:param.in_event_cb
var drag_target=void 0===param.drag_target?def.drag_target:param.drag_target
var drag_over=void 0===param.drag_over?def.drag_over:param.drag_over
var touch_focuses=void 0===param.touch_focuses?def.touch_focuses:param.touch_focuses
var focus_steal=void 0===param.focus_steal?def.focus_steal:param.focus_steal
var custom_nav=void 0===param.custom_nav?def.custom_nav:param.custom_nav
spotParamAddOut(param)
var out=param.out
out.focused=false
out.ret=0
if(button_long_press)out.long_press=false
if(drag_target)out.drag_drop=null
if(custom_nav)out.nav=SPOT_NAV_NONE
var state=SPOT_STATE_REGULAR
var _spotFocusCheck=spotFocusCheck(param),focused=_spotFocusCheck.focused,allow_focus=_spotFocusCheck.allow_focus,kb_focused=_spotFocusCheck.kb_focused
spotParamIsSpotInternal(param)
if(disabled)state=SPOT_STATE_DISABLED
else{var button_click
var long_press_ret
if(drag_target&&(out.drag_drop=dragDrop(param))){spotFocusSet(param,true,true,"drag_drop")
spotSignalRet(param)
focused=true}else if(button_long_press&&(long_press_ret=longPress(param))||is_button&&(button_click=inputClick(param))){if(long_press_ret){out.long_press=long_press_ret.long_press
out.button=long_press_ret.button
out.pos=void 0}else{assert(button_click)
out.button=button_click.button
out.pos=button_click.pos}if(mousePosIsTouch())if(touch_focuses)if(!focused){spotFocusSet(param,false,false,"touch_focus")
focused=true}else{spotSignalRet(param)
spotUnfocus()
focused=false}else{spotSignalRet(param)
spotUnfocus()
focused=false}else{spotSignalRet(param)
spotFocusSet(param,true,true,"click")
focused=true}}else if(!is_button&&touch_focuses&&mousePosIsTouch()&&inputClick(param)){spotFocusSet(param,false,false,"touch_focus")
focused=true}else if(drag_target&&dragOver(param)){spotFocusSet(param,true,false,"drag_over")
focused=true
if(mouseDownAnywhere())state=SPOT_STATE_DOWN}else if(drag_over&&dragOver(param));}if(allow_focus&&inputTouchMode())if((void 0===param.long_press_focuses?def.long_press_focuses:param.long_press_focuses)&&longPress(param)){spotFocusSet(param,false,false,"long_press")
focused=true}var is_mouseover=mouseOver(param)
if(focused&&!focus_steal&&!is_mouseover)if(mouseButtonHadEdge()){focused=false
spotUnfocus()}else if(mouseMoved()){focused=false
if(focus_key===param.key_computed)spotUnfocus()
else if(focus_key_nonsticky===param.key_computed)focus_key_nonsticky=null}if(is_mouseover)if(allow_focus)if(spotFocusSet(param,true,false,"mouseover"))focused=true
if(is_button&&is_mouseover&&mouseDownMidClick(param))if(!disabled)state=SPOT_STATE_DOWN
var button_activate=false
if(focused){if(state===SPOT_STATE_REGULAR)state=SPOT_STATE_FOCUSED
if(is_button&&!disabled&&kb_focused&&!suppress_pad){var key_opts=in_event_cb?{in_event_cb:in_event_cb}:null
if(keyDownEdge(KEYS.SPACE,key_opts)||keyDownEdge(KEYS.RETURN,key_opts)||padButtonDownEdge(PAD.A))button_activate=true}}if(!disabled){var hotkey=void 0===param.hotkey?def.hotkey:param.hotkey
var hotkeys=void 0===param.hotkeys?def.hotkeys:param.hotkeys
var hotpad=void 0===param.hotpad?def.hotpad:param.hotpad
if(hotkey||hotkeys){var _key_opts=in_event_cb?{in_event_cb:in_event_cb}:null
if(hotkey&&keyDownEdge(hotkey,_key_opts))button_activate=true
if(hotkeys)for(var ii=0;ii<hotkeys.length;++ii)if(keyDownEdge(hotkeys[ii],_key_opts))button_activate=true}if(hotpad)if(padButtonDownEdge(hotpad))button_activate=true
if(async_activate_key===param.key_computed)button_activate=true}if(param.url){if(void 0===param.internal)param.internal=true
if(link(param))button_activate=true}if(button_activate){spotSignalRet(param)
out.button=0
out.pos=null}out.focused=focused
if(out.ret){state=SPOT_STATE_DOWN
var sound_button=void 0===param.sound_button?def.sound_button:param.sound_button
if(sound_button)playUISound(sound_button)}if(out.focused&&param.tooltip)drawTooltipBox(param)
checkHooks(param,Boolean(out.ret))
out.spot_state=state
profilerStop("spot")
return out}

},{"../common/verify":97,"./camera2d.js":15,"./engine.js":21,"./font.js":28,"./input.js":37,"./input_constants":38,"./link":39,"./settings.js":59,"./ui.js":72,"assert":undefined}],67:[function(require,module,exports){
"use strict"
exports.spriteSetGet=spriteSetGet
var assert=require("assert")
var sprite_sets={stone:{button:{atlas:"stone"},button_rollover:{atlas:"stone"},button_down:{atlas:"stone"},button_disabled:{atlas:"stone"}},pixely:{color_set_shades:[.8,1,1],slider_params:[1,1,.3],button:{atlas:"pixely"},button_rollover:{atlas:"pixely"},button_down:{atlas:"pixely"},button_disabled:{atlas:"pixely"},panel:{atlas:"pixely"},menu_entry:{atlas:"pixely"},menu_selected:{atlas:"pixely"},menu_down:{atlas:"pixely"},menu_header:{atlas:"pixely"},slider:{atlas:"pixely"},slider_handle:{atlas:"pixely"},checked:{atlas:"pixely"},unchecked:{atlas:"pixely"},scrollbar_bottom:{atlas:"pixely"},scrollbar_trough:{atlas:"pixely"},scrollbar_top:{atlas:"pixely"},scrollbar_handle_grabber:{atlas:"pixely"},scrollbar_handle:{atlas:"pixely"},progress_bar:{atlas:"pixely"},progress_bar_trough:{atlas:"pixely"},collapsagories:{atlas:"pixely"},collapsagories_rollover:{atlas:"pixely"},collapsagories_shadow_down:{atlas:"pixely"}}}
function spriteSetGet(key){assert(sprite_sets[key])
return sprite_sets[key]}

},{"assert":undefined}],68:[function(require,module,exports){
"use strict"
exports.BlendMode=exports.BLEND_PREMULALPHA=exports.BLEND_ALPHA=exports.BLEND_ADDITIVE=void 0
exports.blendModeReset=blendModeReset
exports.blendModeSet=blendModeSet
exports.buildRects=buildRects
exports.clipCoordsScissor=clipCoordsScissor
exports.queueSpriteData=queueSpriteData
exports.scissorPop=scissorPop
exports.scissorPush=scissorPush
exports.scissorPushIntersection=scissorPushIntersection
exports.spriteChainedStart=spriteChainedStart
exports.spriteChainedStop=spriteChainedStop
exports.spriteClip=spriteClip
exports.spriteClipPause=spriteClipPause
exports.spriteClipPop=spriteClipPop
exports.spriteClipPush=spriteClipPush
exports.spriteClipResume=spriteClipResume
exports.spriteClipped=spriteClipped
exports.spriteClippedViewport=spriteClippedViewport
exports.spriteCreate=spriteCreate
exports.spriteDataAlloc=spriteDataAlloc
exports.spriteDraw=spriteDraw
exports.spriteDrawPartial=spriteDrawPartial
exports.spriteDrawReset=spriteDrawReset
exports.spriteFlippedUVsApplyHFlip=spriteFlippedUVsApplyHFlip
exports.spriteFlippedUVsRestore=spriteFlippedUVsRestore
exports.spriteQueueFn=spriteQueueFn
exports.spriteQueuePop=spriteQueuePop
exports.spriteQueuePush=spriteQueuePush
exports.spriteQueueRaw=spriteQueueRaw
exports.spriteQueueRaw4=spriteQueueRaw4
exports.spriteQueueRaw4Color=spriteQueueRaw4Color
exports.spriteQueueRaw4ColorBuffer=spriteQueueRaw4ColorBuffer
exports.spriteQueueSprite=spriteQueueSprite
exports.spriteResetTopOfFrame=spriteResetTopOfFrame
exports.spriteStartup=spriteStartup
exports.sprite_vshader=exports.sprite_fshader=void 0
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}exports.createSprite=spriteCreate
exports.create=spriteCreate
exports.queueraw4color=spriteQueueRaw4Color
exports.queueraw4colorBuffer=spriteQueueRaw4ColorBuffer
exports.queueraw4=spriteQueueRaw4
exports.queueraw=spriteQueueRaw
exports.queuesprite=spriteQueueSprite
var BlendMode={BLEND_ALPHA:0,BLEND_ADDITIVE:1,BLEND_PREMULALPHA:2}
exports.BlendMode=BlendMode
var BLEND_ALPHA=0
exports.BLEND_ALPHA=BLEND_ALPHA
var BLEND_ADDITIVE=1
exports.BLEND_ADDITIVE=BLEND_ADDITIVE
var BLEND_PREMULALPHA=2
exports.BLEND_PREMULALPHA=BLEND_PREMULALPHA
var assert=require("assert")
var camera2d=require("./camera2d.js")
var _require=require("./dyn_geom.js"),dynGeomQueueSprite=_require.dynGeomQueueSprite
var engine=require("./engine.js")
var geom=require("./geom.js")
var cos=Math.cos,max=Math.max,min=Math.min,round=Math.round,sin=Math.sin
var _require2=require("./textures.js"),textureCmpArray=_require2.textureCmpArray,textureBindArray=_require2.textureBindArray,textureLoad=_require2.textureLoad,textureFilterKey=_require2.textureFilterKey
var _require3=require("./shaders.js"),SEMANTIC=_require3.SEMANTIC,shaderCreate=_require3.shaderCreate,shadersBind=_require3.shadersBind,shadersPrelink=_require3.shadersPrelink
var _require4=require("../common/util.js"),deprecate=_require4.deprecate,nextHighestPowerOfTwo=_require4.nextHighestPowerOfTwo
var _require5=require("../common/vmath.js"),vec2=_require5.vec2,vec4=_require5.vec4,v2set=_require5.v2set,v4set=_require5.v4set
deprecate(exports,"clip","spriteClip")
deprecate(exports,"clipped","spriteClipped")
deprecate(exports,"clipPush","spriteClipPush")
deprecate(exports,"clipPop","spriteClipPop")
deprecate(exports,"clipPause","spriteClipPause")
deprecate(exports,"clipResume","spriteClipResume")
deprecate(exports,"queuefn","spriteQueueFn")
deprecate(exports,"draw","spriteDraw")
deprecate(exports,"drawPartial","spriteDrawPartial")
var sprite_vshader
exports.sprite_vshader=sprite_vshader
var sprite_fshader
exports.sprite_fshader=sprite_fshader
var sprite_dual_fshader
var clip_space=vec4()
var sprite_shader_params={clip_space:clip_space}
var last_uid=0
var geom_stats
var sprite_queue=[]
var sprite_freelist=[]
var sprite_queue_stack=[]
function spriteQueuePush(new_list){assert(sprite_queue_stack.length<10)
sprite_queue_stack.push(sprite_queue)
sprite_queue=new_list||[]}function spriteQueuePop(for_pause){assert(sprite_queue_stack.length)
assert(for_pause||!sprite_queue.length)
sprite_queue=sprite_queue_stack.pop()}function SpriteData(){this.data=new Float32Array(32)
this.texs=null
this.shader=null
this.shader_params=null
this.x=0
this.y=0
this.z=0
this.blend=0
this.uid=0
this.chained=false
this.next=null}SpriteData.prototype.queue=function(z){++geom_stats.sprites
if(!this.chained){this.z=z
this.uid=++last_uid
sprite_queue.push(this)}}
var is_chained=false
var chained_prev=null
function spriteChainedStart(){is_chained=true
chained_prev=null}function spriteChainedStop(){is_chained=false
chained_prev=null}function spriteDataAlloc(texs,shader,shader_params,blend){var ret
if(sprite_freelist.length)ret=sprite_freelist.pop()
else ret=new SpriteData
ret.texs=texs
if(is_chained&&chained_prev){ret.chained=true
chained_prev.next=ret}else{ret.chained=false
ret.shader=shader||null
if(shader_params){shader_params.clip_space=sprite_shader_params.clip_space
ret.shader_params=shader_params}else ret.shader_params=null
ret.blend=blend||0}if(is_chained)chained_prev=ret
return ret}function cmpSprite(a,b){++geom_stats.sprite_sort_cmps
if(a.z!==b.z)return a.z-b.z
if(a.blend===BLEND_ADDITIVE&&b.blend===BLEND_ADDITIVE)return 0
if(a.y!==b.y)return a.y-b.y
if(a.x!==b.x)return a.x-b.x
return a.uid-b.uid}function spriteQueueFn(z,fn){assert(isFinite(z))
sprite_queue.push({fn:fn,x:0,y:0,z:z,uid:++last_uid})}function spriteQueueRaw4Color(texs,x0,y0,c0,u0,v0,x1,y1,c1,u1,v1,x2,y2,c2,u2,v2,x3,y3,c3,u3,v3,z,shader,shader_params,blend){assert(isFinite(z))
var elem=spriteDataAlloc(texs,shader,shader_params,blend)
var data=elem.data
data[0]=(x0-camera2d.data[0])*camera2d.data[4]
data[1]=(y0-camera2d.data[1])*camera2d.data[5]
data[2]=c0[0]
data[3]=c0[1]
data[4]=c0[2]
data[5]=c0[3]
data[6]=u0
data[7]=v0
data[8]=(x1-camera2d.data[0])*camera2d.data[4]
data[9]=(y1-camera2d.data[1])*camera2d.data[5]
data[10]=c1[0]
data[11]=c1[1]
data[12]=c1[2]
data[13]=c1[3]
data[14]=u1
data[15]=v1
data[16]=(x2-camera2d.data[0])*camera2d.data[4]
data[17]=(y2-camera2d.data[1])*camera2d.data[5]
data[18]=c2[0]
data[19]=c2[1]
data[20]=c2[2]
data[21]=c2[3]
data[22]=u2
data[23]=v2
data[24]=(x3-camera2d.data[0])*camera2d.data[4]
data[25]=(y3-camera2d.data[1])*camera2d.data[5]
data[26]=c3[0]
data[27]=c3[1]
data[28]=c3[2]
data[29]=c3[3]
data[30]=u3
data[31]=v3
elem.x=data[0]
elem.y=data[1]
elem.queue(z)
return elem}function spriteQueueRaw4(texs,x0,y0,x1,y1,x2,y2,x3,y3,z,u0,v0,u1,v1,color,shader,shader_params,blend){return spriteQueueRaw4Color(texs,x0,y0,color,u0,v0,x1,y1,color,u0,v1,x2,y2,color,u1,v1,x3,y3,color,u1,v0,z,shader,shader_params,blend)}function queueSpriteData(elem,z){assert(isFinite(z))
var data=elem.data
data[0]=(data[0]-camera2d.data[0])*camera2d.data[4]
data[1]=(data[1]-camera2d.data[1])*camera2d.data[5]
data[8]=(data[8]-camera2d.data[0])*camera2d.data[4]
data[9]=(data[9]-camera2d.data[1])*camera2d.data[5]
data[16]=(data[16]-camera2d.data[0])*camera2d.data[4]
data[17]=(data[17]-camera2d.data[1])*camera2d.data[5]
data[24]=(data[24]-camera2d.data[0])*camera2d.data[4]
data[25]=(data[25]-camera2d.data[1])*camera2d.data[5]
elem.x=data[0]
elem.y=data[1]
elem.queue(z)
return elem}function spriteQueueRaw4ColorBuffer(texs,buf,z,shader,shader_params,blend){assert(isFinite(z))
var elem=spriteDataAlloc(texs,shader,shader_params,blend)
var data=elem.data
for(var ii=0;ii<32;++ii)data[ii]=buf[ii]
queueSpriteData(elem,z)
return elem}function spriteQueueRaw(texs,x,y,z,w,h,u0,v0,u1,v1,color,shader,shader_params,blend){return spriteQueueRaw4Color(texs,x,y,color,u0,v0,x,y+h,color,u0,v1,x+w,y+h,color,u1,v1,x+w,y,color,u1,v0,z,shader,shader_params,blend)}var temp_uvs=vec4()
function fillUVs(tex,w,h,nozoom,uvs){var ubias=0
var vbias=0
if(!nozoom&&!tex.nozoom){var zoom_level=max((uvs[2]-uvs[0])*tex.width/w,(uvs[3]-uvs[1])*tex.height/h)
if(zoom_level<1){if(tex.filter_mag===gl.LINEAR)ubias=vbias=.5
else if(tex.filter_mag===gl.NEAREST)if(engine.antialias)ubias=vbias=zoom_level/2
else ubias=vbias=.01*zoom_level}else if(zoom_level>1)ubias=vbias=.5+zoom_level/2
if(uvs[0]>uvs[2])ubias*=-1
if(uvs[1]>uvs[3])vbias*=-1}temp_uvs[0]=uvs[0]+ubias/tex.width
temp_uvs[1]=uvs[1]+vbias/tex.height
temp_uvs[2]=uvs[2]-ubias/tex.width
temp_uvs[3]=uvs[3]-vbias/tex.height}var qsp={}
function queuesprite4colorObj(){var rot=qsp.rot,z=qsp.z,sprite=qsp.sprite,color_ul=qsp.color_ul,color_ll=qsp.color_ll,color_lr=qsp.color_lr,color_ur=qsp.color_ur
assert(isFinite(z))
var elem=spriteDataAlloc(sprite.texs,qsp.shader,qsp.shader_params,qsp.blend)
var x=(qsp.x-camera2d.data[0])*camera2d.data[4]
var y=(qsp.y-camera2d.data[1])*camera2d.data[5]
var w=qsp.w*camera2d.data[4]
var h=qsp.h*camera2d.data[5]
if(qsp.pixel_perfect){x|=0
y|=0
w|=0
h|=0}elem.x=x
elem.y=y
var data=elem.data
if(!rot){var x1=x-sprite.origin[0]*w
var y1=y-sprite.origin[1]*h
var x2=x1+w
var y2=y1+h
data[0]=x1
data[1]=y1
data[8]=x1
data[9]=y2
data[16]=x2
data[17]=y2
data[24]=x2
data[25]=y1}else{var dx=sprite.origin[0]*w
var dy=sprite.origin[1]*h
var cosr=cos(rot)
var sinr=sin(rot)
var _x=x-cosr*dx+sinr*dy
var _y=y-sinr*dx-cosr*dy
var ch=cosr*h
var cw=cosr*w
var sh=sinr*h
var sw=sinr*w
data[0]=_x
data[1]=_y
data[8]=_x-sh
data[9]=_y+ch
data[16]=_x+cw-sh
data[17]=_y+sw+ch
data[24]=_x+cw
data[25]=_y+sw}fillUVs(elem.texs[0],w,h,qsp.nozoom,qsp.uvs)
data[2]=color_ul[0]
data[3]=color_ul[1]
data[4]=color_ul[2]
data[5]=color_ul[3]
data[6]=temp_uvs[0]
data[7]=temp_uvs[1]
data[10]=color_ll[0]
data[11]=color_ll[1]
data[12]=color_ll[2]
data[13]=color_ll[3]
data[14]=temp_uvs[0]
data[15]=temp_uvs[3]
data[18]=color_lr[0]
data[19]=color_lr[1]
data[20]=color_lr[2]
data[21]=color_lr[3]
data[22]=temp_uvs[2]
data[23]=temp_uvs[3]
data[26]=color_ur[0]
data[27]=color_ur[1]
data[28]=color_ur[2]
data[29]=color_ur[3]
data[30]=temp_uvs[2]
data[31]=temp_uvs[1]
elem.queue(z)
return elem}function spriteQueueSprite(sprite,x,y,z,w,h,rot,uvs,color,shader,shader_params,nozoom,pixel_perfect,blend){assert(!sprite.lazy_load)
color=color||sprite.color
qsp.sprite=sprite
qsp.x=x
qsp.y=y
qsp.z=z
qsp.w=w
qsp.h=h
qsp.rot=rot
qsp.uvs=uvs
qsp.color_ul=color
qsp.color_ll=color
qsp.color_lr=color
qsp.color_ur=color
qsp.shader=shader
qsp.shader_params=shader_params
qsp.nozoom=nozoom
qsp.pixel_perfect=pixel_perfect
qsp.blend=blend
return queuesprite4colorObj(qsp)}var clip_temp_xy=vec2()
var clip_temp_wh=vec2()
function clipCoordsScissor(x,y,w,h){camera2d.virtualToCanvas(clip_temp_xy,[x,y])
clip_temp_xy[0]=round(clip_temp_xy[0])
clip_temp_xy[1]=round(clip_temp_xy[1])
camera2d.virtualToCanvas(clip_temp_wh,[x+w,y+h])
clip_temp_wh[0]=round(clip_temp_wh[0])-clip_temp_xy[0]
clip_temp_wh[1]=round(clip_temp_wh[1])-clip_temp_xy[1]
var gd_h=engine.render_height||engine.height
return[clip_temp_xy[0],gd_h-(clip_temp_xy[1]+clip_temp_wh[1]),clip_temp_wh[0],clip_temp_wh[1]]}function clipCoordsDom(x,y,w,h){var xywh=vec4()
camera2d.virtualToDom(xywh,[x+w,y+h])
xywh[2]=xywh[0]
xywh[3]=xywh[1]
camera2d.virtualToDom(xywh,[x,y])
xywh[0]=round(xywh[0])
xywh[1]=round(xywh[1])
xywh[2]=round(xywh[2])-xywh[0]
xywh[3]=round(xywh[3])-xywh[1]
return xywh}var active_scissor=null
function scissorSet(scissor){if(!active_scissor)gl.enable(gl.SCISSOR_TEST)
gl.scissor(scissor[0],scissor[1],scissor[2],scissor[3])
active_scissor=scissor}function scisssorClear(){gl.disable(gl.SCISSOR_TEST)
active_scissor=null}var scissor_stack=[]
function scissorPush(new_scissor){scissor_stack.push(active_scissor)
if(new_scissor)scissorSet(new_scissor)
else scisssorClear()}function scissorPushIntersection(new_scissor){scissor_stack.push(active_scissor)
if(new_scissor)if(active_scissor){var x0=max(active_scissor[0],new_scissor[0])
var x1=max(x0,min(active_scissor[0]+active_scissor[2],new_scissor[0]+new_scissor[2]))
var y0=max(active_scissor[1],new_scissor[1])
scissorSet([x0,y0,x1-x0,max(y0,min(active_scissor[1]+active_scissor[3],new_scissor[1]+new_scissor[3]))-y0])}else scissorSet(new_scissor)}function scissorPop(){var prev_scissor=scissor_stack.pop()
if(prev_scissor)scissorSet(prev_scissor)
else scisssorClear()}function spriteClip(z_start,z_end,x,y,w,h){var scissor=clipCoordsScissor(x,y,w,h)
spriteQueueFn(z_start-.01,scissorSet.bind(null,scissor))
spriteQueueFn(z_end-.01,scisssorClear)}var clip_stack=[]
function spriteResetTopOfFrame(){clip_stack.length=0
sprite_queue_stack.length=0}var clip_paused
function spriteClipped(including_paused){return clip_stack.length>0&&(including_paused||!clip_paused)}var clipped_viewport_temp_in=vec2()
var clipped_viewport_temp_pos=vec2()
var clipped_viewport_temp_wh=vec2()
function spriteClippedViewport(){assert(clip_stack.length>0)
var tail=clip_stack[clip_stack.length-1]
camera2d.domToVirtual(clipped_viewport_temp_pos,tail.dom_clip)
v2set(clipped_viewport_temp_in,tail.dom_clip[2],tail.dom_clip[3])
camera2d.domDeltaToVirtual(clipped_viewport_temp_wh,clipped_viewport_temp_in)
return{x:clipped_viewport_temp_pos[0],y:clipped_viewport_temp_pos[1],w:clipped_viewport_temp_wh[0],h:clipped_viewport_temp_wh[1]}}function spriteClipPush(z,x,y,w,h){assert(clip_stack.length<10)
var scissor=clipCoordsScissor(x,y,w,h)
var dom_clip=clipCoordsDom(x,y,w,h)
camera2d.setInputClipping(dom_clip)
spriteQueuePush()
clip_stack.push({z:z,scissor:scissor,dom_clip:dom_clip})}function spriteClipPop(){assert(spriteClipped(true))
spriteQueueFn(Z.TOOLTIP-.1,scisssorClear)
var _clip_stack$pop=clip_stack.pop(),z=_clip_stack$pop.z,scissor=_clip_stack$pop.scissor
var sprites=sprite_queue
spriteQueuePop(true)
if(clip_stack.length){var dom_clip=clip_stack[clip_stack.length-1].dom_clip
camera2d.setInputClipping(dom_clip)}else camera2d.setInputClipping(null)
spriteQueueFn(z,function(){scissorPush(scissor)
spriteQueuePush()
sprite_queue=sprites
spriteDraw()
spriteQueuePop()
scissorPop()})}function spriteClipPause(){assert(spriteClipped(true))
assert(!clip_paused)
clip_paused=true
spriteQueuePush(sprite_queue_stack[0])
camera2d.setInputClipping(null)
clip_stack.push({dom_clip:null})}function spriteClipResume(){assert(spriteClipped(true))
assert(clip_paused)
clip_stack.pop()
clip_paused=false
assert(spriteClipped(true))
var dom_clip=clip_stack[clip_stack.length-1].dom_clip
spriteQueuePop(true)
camera2d.setInputClipping(dom_clip)}var batch_state
var sprite_geom
var sprite_buffer
var sprite_buffer_len=0
var sprite_buffer_batch_start=0
var sprite_buffer_idx=0
var last_blend_mode
var last_bound_shader
var MAX_VERT_COUNT=65532
var batches=[]
function commit(){if(sprite_buffer_idx===sprite_buffer_batch_start)return
batches.push({state:batch_state,start:sprite_buffer_batch_start,end:sprite_buffer_idx})
sprite_buffer_batch_start=sprite_buffer_idx}function blendModeSet(blend){if(last_blend_mode!==blend)if((last_blend_mode=blend)===BLEND_ADDITIVE)gl.blendFunc(gl.SRC_ALPHA,gl.ONE)
else if(last_blend_mode===BLEND_PREMULALPHA)gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA)
else gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}function blendModeReset(force){if(last_blend_mode!==BLEND_ALPHA||force){gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)
last_blend_mode=BLEND_ALPHA}}function commitAndFlush(){commit()
if(!batches.length)return
assert(sprite_buffer_idx)
sprite_geom.update(sprite_buffer,sprite_buffer_idx)
sprite_geom.bind()
for(var ii=0;ii<batches.length;++ii){var batch=batches[ii]
var state=batch.state,start=batch.start,end=batch.end
if(last_bound_shader!==state.shader||state.shader_params){shadersBind(sprite_vshader,state.shader||sprite_fshader,state.shader_params||sprite_shader_params)
last_bound_shader=state.shader}if(last_blend_mode!==state.blend)blendModeSet(state.blend)
textureBindArray(state.texs);++geom_stats.draw_calls_sprite
gl.drawElements(sprite_geom.mode,3*(end-start)/2,gl.UNSIGNED_SHORT,3*start)}batches.length=0
sprite_buffer_batch_start=sprite_buffer_idx=0}function drawSetup(){if(engine.defines.NOSPRITES)sprite_queue.length=0
if(!sprite_queue.length)return
clip_space[0]=2/engine.viewport[2]
clip_space[1]=-2/engine.viewport[3]
last_bound_shader=last_blend_mode=-1
if(!sprite_geom){sprite_geom=geom.create([[SEMANTIC.POSITION,gl.FLOAT,2,false],[SEMANTIC.COLOR,gl.FLOAT,4,false],[SEMANTIC.TEXCOORD,gl.FLOAT,2,false]],[],null,geom.QUADS)
sprite_buffer=new Float32Array(1024)
sprite_buffer_len=sprite_buffer.length/8}profilerStart("sort")
sprite_queue.sort(cmpSprite)
geom_stats.sprite_sort_elems+=sprite_queue.length
profilerStop("sort")
batch_state=null
assert.equal(sprite_buffer_idx,0)
assert.equal(sprite_buffer_batch_start,0)
assert.equal(batches.length,0)}function growSpriteBuffer(){var new_length=min(1.25*sprite_buffer_len+3&-4,MAX_VERT_COUNT)
sprite_buffer_len=new_length
sprite_buffer=new Float32Array(8*new_length)}function drawElem(elem){var count=0
if(elem.fn){commitAndFlush()
batch_state=null
elem.fn()
last_blend_mode=last_bound_shader=-1
assert.equal(sprite_buffer_idx,0)
assert.equal(sprite_buffer_batch_start,0)
assert.equal(batches.length,0)
clip_space[0]=2/engine.viewport[2]
clip_space[1]=-2/engine.viewport[3]
count++}else{if(!batch_state||textureCmpArray(elem.texs,batch_state.texs)||elem.shader!==batch_state.shader||elem.shader_params!==batch_state.shader_params||elem.blend!==batch_state.blend){commit()
batch_state=elem}do{if(sprite_buffer_idx+4>sprite_buffer_len){commitAndFlush()
if(sprite_buffer_len!==MAX_VERT_COUNT)growSpriteBuffer()}var index=8*sprite_buffer_idx
sprite_buffer_idx+=4
sprite_buffer.set(elem.data,index)
count++
sprite_freelist.push(elem)
var next=elem.next
elem.next=null
elem=next}while(elem)}return count}function finishDraw(){commitAndFlush()
blendModeReset()}function spriteDrawReset(){if(active_scissor){gl.disable(gl.SCISSOR_TEST)
active_scissor=null}}function spriteDraw(){profilerStart("sprites:draw")
drawSetup()
profilerStart("drawElem")
for(var ii=0;ii<sprite_queue.length;++ii)drawElem(sprite_queue[ii])
profilerStop("drawElem")
sprite_queue.length=0
finishDraw()
profilerStop("sprites:draw")}function spriteDrawPartial(z){profilerStart("sprites:drawPartial")
drawSetup()
profilerStart("drawElem")
for(var ii=0;ii<sprite_queue.length;++ii){var elem=sprite_queue[ii]
if(elem.z>z){sprite_queue=sprite_queue.slice(ii)
break}drawElem(elem)}profilerStop("drawElem")
finishDraw()
profilerStop("sprites:drawPartial")}function buildRects(ws,hs,tex){if("number"===typeof ws){ws=new Array(ws)
for(var ii=0;ii<ws.length;++ii)ws[ii]=1}if("number"===typeof hs){hs=new Array(hs)
for(var _ii=0;_ii<hs.length;++_ii)hs[_ii]=1}var rects=[]
var total_w=0
for(var _ii2=0;_ii2<ws.length;++_ii2)total_w+=ws[_ii2]
var total_h=0
for(var _ii3=0;_ii3<hs.length;++_ii3)total_h+=hs[_ii3]
var tex_w
var tex_h
if(!tex||nextHighestPowerOfTwo(tex.src_width)===tex.width&&nextHighestPowerOfTwo(tex.src_height)===tex.height){tex_w=nextHighestPowerOfTwo(total_w)
tex_h=nextHighestPowerOfTwo(total_h)}else{tex_w=total_w
tex_h=total_h}var wh=[]
for(var _ii4=0;_ii4<ws.length;++_ii4)wh.push(ws[_ii4]/total_h)
var hw=[]
for(var _ii5=0;_ii5<hs.length;++_ii5)hw.push(hs[_ii5]/total_w)
var aspect=[]
var non_square=false
var y=0
for(var jj=0;jj<hs.length;++jj){var x=0
for(var _ii6=0;_ii6<ws.length;++_ii6){var r=vec4(x/tex_w,y/tex_h,(x+ws[_ii6])/tex_w,(y+hs[jj])/tex_h)
rects.push(r)
var asp=ws[_ii6]/hs[jj]
if(1!==asp)non_square=true
aspect.push(asp)
x+=ws[_ii6]}y+=hs[jj]}return{widths:ws,heights:hs,wh:wh,hw:hw,rects:rects,aspect:non_square?aspect:null,total_w:total_w,total_h:total_h}}function flipRectHoriz(a){return vec4(a[0],a[3],a[2],a[1])}function spriteFlippedUVsApplyHFlip(spr){if(!spr.uidata.rects_orig)spr.uidata.rects_orig=spr.uidata.rects
if(!spr.uidata.rects_flipped)spr.uidata.rects_flipped=spr.uidata.rects.map(flipRectHoriz)
spr.uidata.rects=spr.uidata.rects_flipped}function spriteFlippedUVsRestore(spr){if(spr.uidata.rects_orig)spr.uidata.rects=spr.uidata.rects_orig}function Sprite(params){var _this=this
this.lazy_load=null
if(params.texs)this.texs=params.texs
else{var ext=params.ext||".png"
this.texs=[]
if(params.tex){assert(!params.lazy_load)
this.texs.push(params.tex)}else if(params.layers){assert(params.name)
assert(!params.lazy_load)
this.texs=[]
for(var ii=0;ii<params.layers;++ii)this.texs.push(textureLoad({url:"img/"+params.name+"_"+ii+ext,filter_min:params.filter_min,filter_mag:params.filter_mag,wrap_s:params.wrap_s,wrap_t:params.wrap_t,load_filter:params.load_filter}))}else{var tex_param
if(params.name)tex_param={url:"img/"+params.name+ext+"#"+textureFilterKey(params),filter_min:params.filter_min,filter_mag:params.filter_mag,wrap_s:params.wrap_s,wrap_t:params.wrap_t,soft_error:params.soft_error,load_filter:params.load_filter}
else{assert(params.url)
tex_param=params}if(params.lazy_load)this.lazy_load=tex_param
else this.texs.push(textureLoad(tex_param))}}this.origin=params.origin||vec2(0,0)
this.size=params.size||vec2(1,1)
this.color=params.color||vec4(1,1,1,1)
this.uvs=params.uvs||vec4(0,0,1,1)
if(params.ws)this.uidata=buildRects(params.ws,params.hs)
this.shader=params.shader||null
var tex_on_load=function tex_on_load(tex){if(!params.uvs){_this.uvs[2]=tex.src_width/tex.width
_this.uvs[3]=tex.src_height/tex.height}if(params.ws)_this.uidata=buildRects(params.ws,params.hs,tex)}
if(this.texs.length)this.texs[0].onLoad(tex_on_load)
else this.tex_on_load=tex_on_load}Sprite.prototype.getAspect=function(){var tex=this.texs[0]
if(!tex)return 1
return tex.src_width/tex.src_height}
Sprite.prototype.withOrigin=function(new_origin){var cache_v=String(new_origin[0]+1007*new_origin[1])
if(!this.origin_cache)this.origin_cache={}
if(!this.origin_cache[cache_v])(this.origin_cache[cache_v]=spriteCreate({texs:this.texs,origin:new_origin,size:this.size,color:this.color,uvs:this.uvs})).uidata=this.uidata
return this.origin_cache[cache_v]}
Sprite.prototype.lazyLoadInit=function(){var _this2=this
var tex=textureLoad(_extends({},this.lazy_load,{auto_unload:function auto_unload(){_this2.texs=[]}}))
this.texs.push(tex)
this.loaded_at=0
if(tex.loaded)this.tex_on_load(tex)
else tex.onLoad(function(){_this2.loaded_at=engine.frame_timestamp
_this2.tex_on_load(tex)})}
Sprite.prototype.isLazyLoad=function(){return Boolean(this.lazy_load)}
Sprite.prototype.lazyLoad=function(){if(!this.texs.length)this.lazyLoadInit()
if(!this.texs[0].loaded){for(var ii=0;ii<this.texs.length;++ii)this.texs[ii].last_use=engine.frame_timestamp
return 0}if(!this.loaded_at)return 1
var alpha=(engine.frame_timestamp-this.loaded_at)/250
if(alpha>=1){this.loaded_at=0
return 1}return alpha}
var temp_color=vec4()
Sprite.prototype.draw=function(params){if(0===params.w||0===params.h)return null
var color=params.color||this.color
if(this.lazy_load){var alpha=this.lazyLoad()
if(!alpha)return null
if(1!==alpha)color=v4set(temp_color,color[0],color[1],color[2],color[3]*alpha)}var w=(params.w||1)*this.size[0]
var h=(params.h||1)*this.size[1]
var uvs=(void 0!==params.frame?this.uidata.rects[params.frame]:params.uvs)||this.uvs
qsp.sprite=this
qsp.x=params.x
qsp.y=params.y
qsp.z=params.z||Z.UI
qsp.w=w
qsp.h=h
qsp.rot=params.rot
qsp.uvs=uvs
qsp.color_ul=color
qsp.color_ll=color
qsp.color_lr=color
qsp.color_ur=color
qsp.shader=params.shader||this.shader
qsp.shader_params=params.shader_params
qsp.nozoom=params.nozoom
qsp.pixel_perfect=params.pixel_perfect
qsp.blend=params.blend
return queuesprite4colorObj(qsp)}
Sprite.prototype.drawDualTint=function(params){params.shader=sprite_dual_fshader
params.shader_params={color1:params.color1}
return this.draw(params)}
var temp_color_ul=vec4()
var temp_color_ll=vec4()
var temp_color_ur=vec4()
var temp_color_lr=vec4()
Sprite.prototype.draw4Color=function(params){if(0===params.w||0===params.h)return null
qsp.color_ul=params.color_ul
qsp.color_ll=params.color_ll
qsp.color_lr=params.color_lr
qsp.color_ur=params.color_ur
if(this.lazy_load){var alpha=this.lazyLoad()
if(!alpha)return null
if(1!==alpha){qsp.color_ul=v4set(temp_color_ul,qsp.color_ul[0],qsp.color_ul[1],qsp.color_ul[2],qsp.color_ul[3]*alpha)
qsp.color_ll=v4set(temp_color_ll,qsp.color_ll[0],qsp.color_ll[1],qsp.color_ll[2],qsp.color_ll[3]*alpha)
qsp.color_ur=v4set(temp_color_ur,qsp.color_ur[0],qsp.color_ur[1],qsp.color_ur[2],qsp.color_ur[3]*alpha)
qsp.color_lr=v4set(temp_color_lr,qsp.color_lr[0],qsp.color_lr[1],qsp.color_lr[2],qsp.color_lr[3]*alpha)}}var w=(params.w||1)*this.size[0]
var h=(params.h||1)*this.size[1]
var uvs="number"===typeof params.frame?this.uidata.rects[params.frame]:params.uvs||this.uvs
qsp.sprite=this
qsp.x=params.x
qsp.y=params.y
qsp.z=params.z||Z.UI
qsp.w=w
qsp.h=h
qsp.rot=params.rot
qsp.uvs=uvs
qsp.shader=params.shader||this.shader
qsp.shader_params=params.shader_params
qsp.nozoom=params.nozoom
qsp.pixel_perfect=params.pixel_perfect
qsp.blend=params.blend
return queuesprite4colorObj(qsp)}
Sprite.prototype.draw3D=function(params){if("number"===typeof params.frame)params.uvs=this.uidata.rects[params.frame]
else if(!params.uvs)params.uvs=this.uvs
dynGeomQueueSprite(this,params)}
function spriteCreate(params){return new Sprite(params)}function spriteStartup(){geom_stats=geom.stats
clip_space[2]=-1
clip_space[3]=1
exports.sprite_vshader=sprite_vshader=shaderCreate("shaders/sprite.vp")
exports.sprite_fshader=sprite_fshader=shaderCreate("shaders/sprite.fp")
sprite_dual_fshader=shaderCreate("shaders/sprite_dual.fp")
shadersPrelink(sprite_vshader,sprite_fshader)
shadersPrelink(sprite_vshader,sprite_dual_fshader)}

},{"../common/util.js":96,"../common/vmath.js":98,"./camera2d.js":15,"./dyn_geom.js":18,"./engine.js":21,"./geom.js":30,"./shaders.js":61,"./textures.js":70,"assert":undefined}],69:[function(require,module,exports){
"use strict"
exports.create=create
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}var assert=require("assert")
var _glovClientExternal_users_client=require("./external_users_client")
var externalUsersAutoLoginFallbackProvider=_glovClientExternal_users_client.externalUsersAutoLoginFallbackProvider
var externalUsersAutoLoginProvider=_glovClientExternal_users_client.externalUsersAutoLoginProvider
var externalUsersCurrentUser=_glovClientExternal_users_client.externalUsersCurrentUser
var externalUsersEmailPassLoginProvider=_glovClientExternal_users_client.externalUsersEmailPassLoginProvider
var externalUsersEnabled=_glovClientExternal_users_client.externalUsersEnabled
var externalUsersLogIn=_glovClientExternal_users_client.externalUsersLogIn
var externalUsersLogOut=_glovClientExternal_users_client.externalUsersLogOut
var externalUsersSendEmailConfirmation=_glovClientExternal_users_client.externalUsersSendEmailConfirmation
var _glovCommonChunked_send=require("../common/chunked_send")
var chunkedReceiverFinish=_glovCommonChunked_send.chunkedReceiverFinish
var chunkedReceiverFreeFile=_glovCommonChunked_send.chunkedReceiverFreeFile
var chunkedReceiverGetFile=_glovCommonChunked_send.chunkedReceiverGetFile
var chunkedReceiverInit=_glovCommonChunked_send.chunkedReceiverInit
var chunkedReceiverOnChunk=_glovCommonChunked_send.chunkedReceiverOnChunk
var chunkedReceiverStart=_glovCommonChunked_send.chunkedReceiverStart
var _glovCommonDotProp=require("../common/dot-prop")
var dot_prop=_glovCommonDotProp
var _glovCommonExternal_users_common=require("../common/external_users_common")
var ERR_NO_USER_ID=_glovCommonExternal_users_common.ERR_NO_USER_ID
var _glovCommonMd=require("../common/md5")
var md5=_glovCommonMd
var _glovCommonPacket=require("../common/packet")
var isPacket=_glovCommonPacket.isPacket
var _glovCommonPerfcounters=require("../common/perfcounters")
var perfCounterAdd=_glovCommonPerfcounters.perfCounterAdd
var _glovCommonTinyEvents=require("../common/tiny-events")
var EventEmitter=_glovCommonTinyEvents
var _glovCommonUtil=require("../common/util")
var util=_glovCommonUtil
var _glovCommonUtil2=require("../common/util")
var cloneShallow=_glovCommonUtil2.cloneShallow
var _client_config=require("./client_config")
var platformParameterGet=_client_config.platformParameterGet
var _local_storage=require("./local_storage")
var local_storage=_local_storage
var _net=require("./net")
var netDisconnected=_net.netDisconnected
var netDisconnectedRaw=_net.netDisconnectedRaw
var _walltime=require("./walltime")
var walltime=_walltime
function ClientChannelWorker(subs,channel_id,base_handlers,base_event_listeners){EventEmitter.call(this)
this.subs=subs
var m=(this.channel_id=channel_id).match(/^([^.]*)\.(.*)$/)
assert(m)
this.channel_type=m[1]
this.channel_subid=m[2]
this.subscriptions=0
this.subscribe_failed=false
this.got_subscribe=false
this.immediate_subscribe=0
this.channel_data_ver=0
this.handlers=Object.create(base_handlers)
this.base_event_listeners=base_event_listeners
this.data={}}util.inherits(ClientChannelWorker,EventEmitter)
ClientChannelWorker.prototype.getChannelID=function(){return this.channel_id}
ClientChannelWorker.prototype.emit=function(event){var args=arguments
EventEmitter.prototype.emit.apply(this,args)
if(this.base_event_listeners){var listeners=this.base_event_listeners[event]
if(listeners)for(var ii=0;ii<listeners.length;++ii)listeners[ii].apply(this,Array.prototype.slice.call(args,1))}}
ClientChannelWorker.prototype.onSubscribe=function(cb){assert(this.subscriptions||this.autosubscribed)
this.on("subscribe",cb)
if(this.got_subscribe)cb(this.data)}
ClientChannelWorker.prototype.onceSubscribe=function(cb){assert(this.subscriptions||this.autosubscribed)
if(this.got_subscribe)cb(this.data)
else this.once("subscribe",cb)}
ClientChannelWorker.prototype.numSubscriptions=function(){return this.subscriptions}
ClientChannelWorker.prototype.isFullySubscribed=function(){return this.got_subscribe}
ClientChannelWorker.prototype.handleChannelData=function(data,resp_func){var _this=this
console.log("got channel_data("+this.channel_id+"):  "+JSON.stringify(data))
this.data=data;++this.channel_data_ver
this.emit("channel_data",this.data)
this.got_subscribe=true
this.emit("subscribe",this.data)
var channel_type=this.channel_id.split(".")[0]
var cmd_list=this.subs.cmds_fetched_by_type
if(cmd_list&&!cmd_list[channel_type]){cmd_list[channel_type]=true
this.send("cmdparse","cmd_list",function(err,resp){if(err){console.error("Error getting cmd_list for "+channel_type)
delete cmd_list[channel_type]}else _this.subs.cmd_parse.addServerCommands(resp)})}resp_func()}
ClientChannelWorker.prototype.handleApplyChannelData=function(data,resp_func){if(void 0===data.value)dot_prop.delete(this.data,data.key)
else dot_prop.set(this.data,data.key,data.value);++this.channel_data_ver
this.emit("channel_data",this.data,data.key,data.value)
resp_func()}
ClientChannelWorker.prototype.handleBatchSet=function(data,resp_func){for(var ii=0;ii<data.length;++ii){var _data$ii=data[ii],key=_data$ii[0],value=_data$ii[1]
if(void 0===value)dot_prop.delete(this.data.public,key)
else dot_prop.set(this.data.public,key,value);++this.channel_data_ver
this.emit("channel_data",this.data,"public."+key,value)}resp_func()}
ClientChannelWorker.prototype.getChannelData=function(key,default_value){return dot_prop.get(this.data,key,default_value)}
ClientChannelWorker.prototype.predictSetChannelData=function(key,value){dot_prop.set(this.data,key,value)}
ClientChannelWorker.prototype.setChannelData=function(key,value,skip_predict,resp_func){if(!skip_predict)dot_prop.set(this.data,key,value)
var q=value&&value.q||void 0
var pak=this.subs.client.pak("set_channel_data",this.channel_type+".set_channel_data")
pak.writeAnsiString(this.channel_id)
pak.writeBool(q)
pak.writeAnsiString(key)
pak.writeJSON(value)
pak.send(resp_func)}
ClientChannelWorker.prototype.removeMsgHandler=function(msg,cb){assert(this.handlers[msg]===cb)
delete this.handlers[msg]}
ClientChannelWorker.prototype.onMsg=function(msg,cb){assert(!this.handlers[msg]||this.handlers[msg]===cb)
this.handlers[msg]=cb}
ClientChannelWorker.prototype.pak=function(msg){var pak=this.subs.client.pak("channel_msg","cm:"+this.channel_type+"."+msg)
pak.writeAnsiString(this.channel_id)
pak.writeAnsiString(msg)
return pak}
ClientChannelWorker.prototype.send=function(msg,data,resp_func,old_fourth){assert(!resp_func||"function"===typeof resp_func)
assert(!old_fourth)
this.subs.client.send("channel_msg",{channel_id:this.channel_id,msg:msg,data:data},"cm:"+this.channel_type+"."+msg,resp_func)}
ClientChannelWorker.prototype.cmdParse=function(cmd,resp_func){this.send("cmdparse",cmd,resp_func)}
ClientChannelWorker.prototype.unsubscribe=function(){this.subs.unsubscribe(this.channel_id)}
function SubscriptionManager(client,cmd_parse){EventEmitter.call(this)
this.client=client
this.channels={}
this.logged_in=false
this.login_response_data=null
this.login_credentials=null
this.logged_in_email=null
this.logged_in_username=null
this.logged_in_display_name=null
this.was_logged_in=false
this.logging_in=false
this.logging_out=false
this.auto_create_user=false
this.allow_anon=false
this.no_auto_login=false
this.auto_login_error=void 0
if(this.cmd_parse=cmd_parse)this.cmds_fetched_by_type={}
this.base_handlers={}
this.channel_handlers={}
this.channel_event_listeners={}
this.quiet_messages=Object.create(null)
this.first_connect=true
this.server_time=0
this.server_time_interp=0
this.cack_data={}
client.onMsg("connect",this.handleConnect.bind(this))
client.onMsg("disconnect",this.handleDisconnect.bind(this))
client.onMsg("channel_msg",this.handleChannelMessage.bind(this))
client.onMsg("server_time",this.handleServerTime.bind(this))
client.onMsg("chat_broadcast",this.handleChatBroadcast.bind(this))
client.onMsg("restarting",this.handleRestarting.bind(this))
if(cmd_parse)client.onMsg("csr_to_client",this.handleCSRToClient.bind(this))
this.chunked=null
client.onMsg("upload_start",this.handleUploadStart.bind(this))
client.onMsg("upload_chunk",this.handleUploadChunk.bind(this))
client.onMsg("upload_finish",this.handleUploadFinish.bind(this))
this.onChannelMsg(null,"channel_data",ClientChannelWorker.prototype.handleChannelData)
this.onChannelMsg(null,"apply_channel_data",ClientChannelWorker.prototype.handleApplyChannelData)
this.onChannelMsg(null,"batch_set",ClientChannelWorker.prototype.handleBatchSet)}util.inherits(SubscriptionManager,EventEmitter)
SubscriptionManager.prototype.onceConnected=function(cb){if(this.client.connected&&1===this.client.socket.readyState)return void cb()
this.once("connect",cb)}
SubscriptionManager.prototype.getBaseHandlers=function(channel_type){var handlers=this.channel_handlers[channel_type]
if(!handlers)handlers=this.channel_handlers[channel_type]=Object.create(this.base_handlers)
return handlers}
SubscriptionManager.prototype.onChannelMsg=function(channel_type,msg,cb){var handlers=channel_type?this.getBaseHandlers(channel_type):this.base_handlers
assert(!handlers[msg])
handlers[msg]=cb}
SubscriptionManager.prototype.onChannelEvent=function(channel_type,event,cb){var listeners=this.channel_event_listeners[channel_type]
if(!listeners)listeners=this.channel_event_listeners[channel_type]={}
if(!listeners[event])listeners[event]=[]
listeners[event].push(cb)}
SubscriptionManager.prototype.handleChatBroadcast=function(data){console.error("["+data.src+"] "+data.msg)
this.emit("chat_broadcast",data)}
SubscriptionManager.prototype.handleRestarting=function(data){this.restarting=data
this.emit("restarting",data)}
SubscriptionManager.prototype.handleDisconnect=function(data){this.emit("disconnect",data)}
SubscriptionManager.prototype.sendResubscribe=function(){var _this2=this
assert(!this.logging_in)
assert(this.need_resub)
if(netDisconnectedRaw())return
var _loop=function _loop(channel_id){var channel=_this2.channels[channel_id]
if(channel.subscriptions)_this2.client.send("subscribe",channel_id,null,function(err){if(err){channel.subscribe_failed=true
console.error("Error subscribing to "+channel_id+": "+err)
channel.emit("subscribe_fail",err)}})}
for(var channel_id in this.channels)_loop(channel_id)
this.emit("connect",this.need_resub.reconnect)
this.need_resub=null}
SubscriptionManager.prototype.getCackAppData=function(){var _this$cack_data
return(null==(_this$cack_data=this.cack_data)?void 0:_this$cack_data.app_data)||null}
SubscriptionManager.prototype.handleConnect=function(data){var _this3=this
var reconnect=false
if(this.first_connect)this.first_connect=false
else reconnect=true
this.need_resub={reconnect:reconnect}
this.restarting=Boolean(data.restarting)
this.cack_data=data
walltime.sync(data.time)
if(netDisconnectedRaw())return
if(this.logging_in);else if(this.was_logged_in)this.loginRetry(function(err){if(err&&"ERR_FAILALL_DISCONNECT"===err);else if(err)_this3.auto_login_error=err})
else if(!this.no_auto_login){var auto_login_provider=externalUsersAutoLoginProvider()
var saved_provider
if(auto_login_provider&&externalUsersEnabled(auto_login_provider))this.loginExternal({provider:auto_login_provider},function(err){if(err===ERR_NO_USER_ID&&externalUsersAutoLoginFallbackProvider()){_this3.loginExternal({provider:externalUsersAutoLoginFallbackProvider(),external_login_data:cloneShallow(_this3.login_credentials.external_login_data),creation_display_name:_this3.login_credentials.creation_display_name},function(err){_this3.auto_login_error=err})
return}_this3.auto_login_error=err})
else if(local_storage.get("name")&&local_storage.get("password"))this.login(local_storage.get("name"),local_storage.get("password"),function(err){_this3.auto_login_error=err})
else if(saved_provider=local_storage.get("login_external")){var credentials={provider:saved_provider}
this.loginInternal(credentials,function(err){if(err){_this3.auto_login_error=err
externalUsersLogOut(saved_provider)}})}}if(!this.logging_in&&this.need_resub)this.sendResubscribe()
this.fetchCmds()}
SubscriptionManager.prototype.fetchCmds=function(){var _this4=this
var channel_type="client"
var cmd_list=this.cmds_fetched_by_type
if(cmd_list&&!cmd_list[channel_type]){cmd_list[channel_type]=true
this.client.send("cmd_parse_list_client",null,null,function(err,resp){if(!err)_this4.cmd_parse.addServerCommands(resp)})}}
SubscriptionManager.prototype.quietMessagesSet=function(list){for(var ii=0;ii<list.length;++ii)this.quiet_messages[list[ii]]=true}
SubscriptionManager.prototype.quietMessage=function(msg,payload){return this.quiet_messages[msg]}
SubscriptionManager.prototype.handleChannelMessage=function(pak,resp_func){assert(isPacket(pak))
var channel_id=pak.readAnsiString()
var msg=pak.readAnsiString()
var is_packet=pak.readBool()
var data=is_packet?pak:pak.readJSON()
if(!this.quietMessage(msg)&&(!data||!data.q)){var debug_msg
if(!is_packet)debug_msg=JSON.stringify(data)
else if("function"===typeof data.contents)debug_msg=data.contents()
else debug_msg="(pak)"
console.log("got channel_msg("+channel_id+") "+msg+": "+debug_msg)}var channel=this.getChannel(channel_id)
var handler=channel.handlers[msg]
if(!handler){console.error("no handler for channel_msg("+channel_id+") "+msg+": "+JSON.stringify(data))
return}var msg_name=channel_id.split(".")[0]+"."+msg
perfCounterAdd("cm."+msg_name)
profilerStart(msg_name)
handler.call(channel,data,resp_func)
profilerStop(msg_name)}
SubscriptionManager.prototype.handleServerTime=function(pak){this.server_time=pak.readInt()
if(this.server_time<this.server_time_interp&&this.server_time>this.server_time_interp-250);else this.server_time_interp=this.server_time
walltime.sync(pak.readInt())}
SubscriptionManager.prototype.getServerTime=function(){return this.server_time_interp}
SubscriptionManager.prototype.tick=function(dt){this.server_time_interp+=dt
if(!netDisconnected())for(var channel_id in this.channels){var channel=this.channels[channel_id]
if(channel.immediate_subscribe)if(dt>=channel.immediate_subscribe){channel.immediate_subscribe=0
this.unsubscribe(channel_id)}else channel.immediate_subscribe-=dt}}
SubscriptionManager.prototype.onUploadProgress=function(mime_type,cb){var _this5=this
if(!this.upload_progress_cbs)this.upload_progress_cbs={}
assert(!this.upload_progress_cbs[mime_type])
this.upload_progress_cbs[mime_type]=cb
if(!this.chunked)this.chunked=chunkedReceiverInit("client_receive",Infinity)
if(!this.chunked.on_progress)this.chunked.on_progress=function(progress,total,type){if(_this5.upload_progress_cbs[type])_this5.upload_progress_cbs[type](progress,total)}}
SubscriptionManager.prototype.handleUploadStart=function(pak,resp_func){if(!this.chunked)this.chunked=chunkedReceiverInit("client_receive",Infinity)
chunkedReceiverStart(this.chunked,pak,resp_func)}
SubscriptionManager.prototype.handleUploadChunk=function(pak,resp_func){chunkedReceiverOnChunk(this.chunked,pak,resp_func)}
SubscriptionManager.prototype.handleUploadFinish=function(pak,resp_func){chunkedReceiverFinish(this.chunked,pak,resp_func)}
SubscriptionManager.prototype.uploadGetFile=function(file_id){return chunkedReceiverGetFile(this.chunked,file_id)}
SubscriptionManager.prototype.uploadFreeFile=function(file_data){return chunkedReceiverFreeFile(file_data)}
SubscriptionManager.prototype.subscribe=function(channel_id){this.getChannel(channel_id,true)}
SubscriptionManager.prototype.getChannel=function(channel_id,do_subscribe){var channel=this.channels[channel_id]
if(!channel){var channel_type=channel_id.split(".")[0]
var handlers=this.getBaseHandlers(channel_type)
var event_listeners=this.channel_event_listeners[channel_type]
channel=this.channels[channel_id]=new ClientChannelWorker(this,channel_id,handlers,event_listeners)}if(do_subscribe){channel.subscriptions++
if(!netDisconnectedRaw()&&1===channel.subscriptions){channel.subscribe_failed=false
this.client.send("subscribe",channel_id,null,function(err){if(err){channel.subscribe_failed=true
console.error("Error subscribing to "+channel_id+": "+err)
channel.emit("subscribe_fail",err)}})}}return channel}
SubscriptionManager.prototype.getUserId=function(){return this.loggedIn()}
SubscriptionManager.prototype.getDisplayName=function(){return this.logged_in_display_name}
SubscriptionManager.prototype.getLoginProvider=function(){return this.login_provider}
SubscriptionManager.prototype.getMyUserChannel=function(){var user_id=this.loggedIn()
if(!user_id)return null
var channel=this.getChannel("user."+user_id)
if(!this.logging_out)channel.autosubscribed=true
return channel}
SubscriptionManager.prototype.unsubscribe=function(channel_id){var channel=this.channels[channel_id]
assert(channel)
assert(channel.subscriptions)
channel.subscriptions--
if(!channel.subscriptions&&!channel.autosubscribed){channel.got_subscribe=false
channel.emit("unsubscribe")}if(!netDisconnectedRaw()&&!channel.subscriptions&&!channel.subscribe_failed)this.client.send("unsubscribe",channel_id)}
SubscriptionManager.prototype.getChannelImmediate=function(channel_id,timeout){timeout=timeout||6e4
var channel=this.getChannel(channel_id)
if(!channel.immediate_subscribe)this.subscribe(channel_id)
channel.immediate_subscribe=timeout
return channel}
SubscriptionManager.prototype.onLogin=function(cb){this.on("login",cb)
if(this.logged_in)return void cb()}
SubscriptionManager.prototype.onceLoggedIn=function(cb){if(this.logged_in)return void cb()
this.once("login",cb)}
SubscriptionManager.prototype.loggedIn=function(){return this.logging_out?null:this.logged_in?this.logged_in_username||"missing_name":null}
SubscriptionManager.prototype.userOnChannelData=function(expected_user_id,data,key,value){if(expected_user_id!==this.getUserId())return
if("public.display_name"===key)this.logged_in_display_name=value}
SubscriptionManager.prototype.handleLoginResponse=function(resp_func,err,resp){var _this6=this
this.logging_in=false
var evt="login_fail"
if(!err){var _this$login_credentia
evt="login"
this.login_response_data=resp
this.logged_in_email=resp.email||null
this.logged_in_username=resp.user_id
this.logged_in_display_name=resp.display_name
this.logged_in=true
this.was_logged_in=true
var user_channel=this.getMyUserChannel()
user_channel.onceSubscribe(function(){if(!_this6.did_master_subscribe){var perms=user_channel.getChannelData("public.permissions",{})
if(perms.sysadmin)_this6.subscribe("master.master")
if(perms.sysadmin||perms.csr){_this6.did_master_subscribe=true
_this6.subscribe("global.global")}}})
if(!user_channel.subs_added_user_on_channel_data){user_channel.on("channel_data",this.userOnChannelData.bind(this,this.logged_in_username))
user_channel.subs_added_user_on_channel_data=true}if(this.need_resub)this.sendResubscribe()
if(resp.hash&&null!=(_this$login_credentia=this.login_credentials)&&_this$login_credentia.password){var plaintext_password=this.login_credentials.password
if(plaintext_password){var hashed_salted_password=md5(md5(this.logged_in_username.toLowerCase())+plaintext_password)
if(md5(this.client.secret+hashed_salted_password)!==resp.hash)this.getMyUserChannel().send("set_external_password",{hash:hashed_salted_password})}}}if(this.need_resub)this.sendResubscribe()
this.emit(evt,err)
resp_func(err)}
SubscriptionManager.prototype.loginRetry=function(resp_func){var _this7=this
this.loginInternal(this.login_credentials,function(err){if((_this7.auto_login_error=err)===ERR_NO_USER_ID&&externalUsersAutoLoginFallbackProvider()&&_this7.login_credentials.provider===externalUsersAutoLoginProvider()&&externalUsersEnabled(externalUsersAutoLoginProvider()))_this7.loginExternal({provider:externalUsersAutoLoginFallbackProvider(),external_login_data:cloneShallow(_this7.login_credentials.external_login_data),creation_display_name:_this7.login_credentials.creation_display_name},function(err){_this7.auto_login_error=err
resp_func(err)})
else resp_func(err)})}
SubscriptionManager.prototype.getLastLoginCredentials=function(){return this.login_credentials}
SubscriptionManager.prototype.loginInternalExternalUsers=function(provider,login_credentials,resp_func){var _this8=this
var email=login_credentials.email,password=login_credentials.password,do_creation=login_credentials.do_creation,creation_display_name=login_credentials.creation_display_name,external_login_data=login_credentials.external_login_data
return void externalUsersLogIn(provider,{user_initiated:true,do_creation:do_creation,creation_display_name:creation_display_name,email:email,password:password,external_login_data:external_login_data},function(err,login_data){_this8.login_credentials.external_login_data=login_data
if(err){local_storage.set("login_external",_this8.login_provider=void 0)
_this8.serverLog("authentication_failed_"+provider,{creation_mode:do_creation,email:email,passlen:password&&password.length,external_data:Boolean(external_login_data),err:err})
return void _this8.handleLoginResponse(resp_func,err)}local_storage.set("login_external",_this8.login_provider=provider)
local_storage.set("password",void 0)
externalUsersCurrentUser(provider,function(err,user_info){if(err);if(netDisconnectedRaw())return void _this8.handleLoginResponse(resp_func,"ERR_DISCONNECTED")
var display_name=(null==user_info?void 0:user_info.name)||""
if(platformParameterGet("random_creation_name"))display_name=""
var request_data={provider:provider,validation_data:login_data.validation_data,display_name:display_name}
if(null!=user_info&&user_info.name)_this8.login_credentials.creation_display_name=user_info.name
_this8.client.send("login_external",request_data,null,_this8.handleLoginResponse.bind(_this8,resp_func))})})}
SubscriptionManager.prototype.sessionHashedPassword=function(){assert(this.login_credentials.password)
return md5(this.client.secret+this.login_credentials.password)}
SubscriptionManager.prototype.loginInternal=function(login_credentials,resp_func){if(this.logging_in)return void resp_func("Login already in progress")
this.auto_login_error=null
this.logging_in=true
this.logged_in=false
if((this.login_credentials=login_credentials).do_creation){this.login_credentials=cloneShallow(login_credentials)
delete this.login_credentials.do_creation}var provider=login_credentials.provider
if(provider)this.loginInternalExternalUsers(provider,login_credentials,resp_func)
else{var user_id=login_credentials.user_id
this.client.send("login",{user_id:user_id,password:this.sessionHashedPassword()},null,this.handleLoginResponse.bind(this,resp_func))}}
SubscriptionManager.prototype.userCreateInternal=function(params,resp_func){if(this.logging_in)return resp_func("Login already in progress")
this.logging_in=true
this.logged_in=false
return this.client.send("user_create",params,null,this.handleLoginResponse.bind(this,resp_func))}
function hashedPassword(user_id,password){var split=password.split("$$")
if(2===split.length&&"prehashed"===split[0]&&32===split[1].length)password=split[1]
else password=md5(md5(user_id.toLowerCase())+password)
return password}SubscriptionManager.prototype.login=function(username,password,resp_func){var _this9=this
if(!(username=(username||"").trim()))return resp_func("Missing username")
if(!(password=(password||"").trim()))return resp_func("Missing password")
var hashed_password=hashedPassword(username,password)
if(hashed_password!==password)local_storage.set("password","prehashed$$"+hashed_password)
var credentials={user_id:username,password:hashed_password}
if(!this.auto_create_user)return this.loginInternal(credentials,resp_func)
return this.loginInternal(credentials,function(err,data){if(!err||"ERR_USER_NOT_FOUND"!==err)return void resp_func(err,data)
_this9.userCreate({user_id:username,password:password,password_confirm:password,email:"autocreate@glovjs.org"},resp_func)})}
SubscriptionManager.prototype.loginEmailPass=function(credentials,resp_func){credentials={email:credentials.email,password:credentials.password,provider:externalUsersEmailPassLoginProvider(),do_creation:credentials.do_creation,creation_display_name:credentials.creation_display_name}
return this.loginInternal(credentials,resp_func)}
SubscriptionManager.prototype.loginExternal=function(credentials,resp_func){return this.loginInternal(cloneShallow(credentials),resp_func)}
SubscriptionManager.prototype.sendActivationEmail=function(email,resp_func){return externalUsersSendEmailConfirmation(email,resp_func)}
SubscriptionManager.prototype.userCreate=function(params,resp_func){params.user_id=(params.user_id||"").trim()
if(!params.user_id)return resp_func("Missing username")
params.password=(params.password||"").trim()
if(!params.password)return resp_func("Missing password")
params.password_confirm=(params.password_confirm||"").trim()
if(!this.auto_create_user&&!params.password_confirm)return resp_func("Missing password confirmation")
params.email=(params.email||"").trim()
if(!this.auto_create_user&&!params.email)return resp_func("Missing email")
params.display_name=(params.display_name||"").trim()
var hashed_password=hashedPassword(params.user_id,params.password)
if(hashed_password!==params.password)local_storage.set("password","prehashed$$"+hashed_password)
if(hashed_password!==hashedPassword(params.user_id,params.password_confirm))return resp_func("Passwords do not match")
this.login_credentials={user_id:params.user_id,password:hashed_password}
return this.userCreateInternal({display_name:params.display_name||params.user_id,user_id:params.user_id,email:params.email,password:hashed_password},resp_func)}
SubscriptionManager.prototype.logout=function(){var _this10=this
assert(this.logged_in)
assert(!this.logging_in)
assert(!this.logging_out)
if(this.did_master_subscribe){this.did_master_subscribe=false
var user_channel=this.getMyUserChannel()
var perms=user_channel&&user_channel.getChannelData("public.permissions",{})
if(perms&&perms.sysadmin)this.unsubscribe("master.master")
this.unsubscribe("global.global")}this.emit("prelogout")
for(var channel_id in this.channels){var channel=this.channels[channel_id]
if(channel.immediate_subscribe){channel.immediate_subscribe=0
this.unsubscribe(channel_id)}assert(!channel.subscriptions,"Remaining active subscription for "+channel_id)
if(channel.autosubscribed)channel.autosubscribed=false}this.logging_out=true
this.client.send("logout",null,null,function(err){_this10.logging_out=false
if(!err){local_storage.set("password",void 0)
local_storage.set("login_external",_this10.login_provider=void 0)
_this10.login_response_data=null
_this10.logged_in=false
_this10.logged_in_username=null
_this10.logged_in_display_name=null
_this10.was_logged_in=false
_this10.login_credentials=null
_this10.emit("logout")}})}
SubscriptionManager.prototype.getLoginResponseData=function(){return this.login_response_data||{}}
SubscriptionManager.prototype.serverLogSetExtraData=function(data){this.server_log_extra_data=data}
SubscriptionManager.prototype.serverLog=function(type,data){var _this11=this
this.onceConnected(function(){_this11.client.send("log",_extends({type:type,data:data},_this11.server_log_extra_data))})}
SubscriptionManager.prototype.sendCmdParse=function(command,resp_func){var _this12=this
this.onceConnected(function(){var pak=_this12.client.pak("cmd_parse_auto")
pak.writeString(command)
pak.send(resp_func)})}
SubscriptionManager.prototype.handleCSRToClient=function(pak,resp_func){var _this13=this
var cmd=pak.readString()
var access=pak.readJSON()
this.cmd_parse.handle({access:access},cmd,function(err,resp){if(err&&_this13.cmd_parse.was_not_found)return resp_func(null,{found:0,err:err})
return resp_func(err,{found:1,resp:resp})})}
function create(client,cmd_parse){return new SubscriptionManager(client,cmd_parse)}

},{"../common/chunked_send":81,"../common/dot-prop":85,"../common/external_users_common":87,"../common/md5":89,"../common/packet":90,"../common/perfcounters":91,"../common/tiny-events":95,"../common/util":96,"./client_config":16,"./external_users_client":25,"./local_storage":40,"./net":48,"./walltime":75,"assert":undefined}],70:[function(require,module,exports){
"use strict"
exports.TEXTURE_FORMAT=void 0
exports.textureBind=textureBind
exports.textureBindArray=textureBindArray
exports.textureCmpArray=textureCmpArray
exports.textureCname=textureCname
exports.textureCreateForCapture=textureCreateForCapture
exports.textureCreateForDepthCapture=textureCreateForDepthCapture
exports.textureDefaultFilters=textureDefaultFilters
exports.textureDefaultIsNearest=textureDefaultIsNearest
exports.textureError=textureError
exports.textureFilterKey=textureFilterKey
exports.textureFindForReplacement=textureFindForReplacement
exports.textureGetAll=textureGetAll
exports.textureIsArrayBound=textureIsArrayBound
exports.textureLoad=textureLoad
exports.textureLoadCount=textureLoadCount
exports.textureResetState=textureResetState
exports.textureStartup=textureStartup
exports.textureSupportsDepth=textureSupportsDepth
exports.textureTick=textureTick
exports.textureUnloadDynamic=textureUnloadDynamic
exports.textureWhite=textureWhite
var _assert=require("assert")
var assert=_assert
var _glovAsync=require("glov-async")
var asyncParallel=_glovAsync.asyncParallel
var asyncSeries=_glovAsync.asyncSeries
var _glovCommonTexpack_common=require("../common/texpack_common")
var FORMAT_PACK=_glovCommonTexpack_common.FORMAT_PACK
var FORMAT_PNG=_glovCommonTexpack_common.FORMAT_PNG
var TEXPACK_MAGIC=_glovCommonTexpack_common.TEXPACK_MAGIC
var _glovCommonUtil=require("../common/util")
var callEach=_glovCommonUtil.callEach
var callbackify=_glovCommonUtil.callbackify
var isPowerOfTwo=_glovCommonUtil.isPowerOfTwo
var nextHighestPowerOfTwo=_glovCommonUtil.nextHighestPowerOfTwo
var ridx=_glovCommonUtil.ridx
var _engine=require("./engine")
var engine=_engine
var _fetch=require("./fetch")
var fetch=_fetch.fetch
var _filewatch=require("./filewatch")
var filewatchOn=_filewatch.filewatchOn
var _local_storage=require("./local_storage")
var localStorageGetJSON=_local_storage.localStorageGetJSON
var localStorageSetJSON=_local_storage.localStorageSetJSON
var _locate_asset=require("./locate_asset")
var locateAsset=_locate_asset.locateAsset
var _settings=require("./settings")
var settings=_settings
var _shaders=require("./shaders")
var shadersSetGLErrorReportDetails=_shaders.shadersSetGLErrorReportDetails
var _urlhash=require("./urlhash")
var urlhash=_urlhash
var _webfs=require("./webfs")
var webFSExists=_webfs.webFSExists
var webFSGetFile=_webfs.webFSGetFile
var floor=Math.floor
var TEX_UNLOAD_TIME=3e5
var textures={}
var load_count=0
function textureLoadCount(){return load_count}var aniso=4
var max_aniso=0
var aniso_enum
var default_filter_min
var default_filter_mag
var cube_faces=[{target:"TEXTURE_CUBE_MAP_NEGATIVE_X",pos:[0,1]},{target:"TEXTURE_CUBE_MAP_POSITIVE_X",pos:[0,0]},{target:"TEXTURE_CUBE_MAP_NEGATIVE_Y",pos:[1,0]},{target:"TEXTURE_CUBE_MAP_POSITIVE_Y",pos:[1,1]},{target:"TEXTURE_CUBE_MAP_NEGATIVE_Z",pos:[2,0]},{target:"TEXTURE_CUBE_MAP_POSITIVE_Z",pos:[2,1]}]
var TEXTURE_FORMAT={R8:{count:1},RGB8:{count:3},RGBA8:{count:4},DEPTH16:{count:1},DEPTH24:{count:1}}
exports.TEXTURE_FORMAT=TEXTURE_FORMAT
function textureDefaultFilters(min,mag){default_filter_min=min
default_filter_mag=mag}function textureDefaultIsNearest(){return default_filter_mag===gl.NEAREST}var bound_unit=null
var bound_tex=[]
var handle_loading
var handle_error
var frame_timestamp
function setUnit(unit){if(unit!==bound_unit){gl.activeTexture(gl.TEXTURE0+unit)
bound_unit=unit}}function bindHandle(unit,target,handle){if(bound_tex[unit]!==handle){setUnit(unit)
gl.bindTexture(target,handle)
bound_tex[unit]=handle}}function unbindAll(target){for(var unit=0;unit<bound_tex.length;++unit){setUnit(unit)
gl.bindTexture(target,target===gl.TEXTURE_2D?handle_loading:null)
bound_tex[unit]=null}}function textureGetAll(){return textures}function textureWhite(){return textures.white}function textureError(){return textures.error}function textureBind(unit,tex){tex.last_use=frame_timestamp
bindHandle(unit,tex.target,tex.eff_handle)}function textureBindArray(texs){for(var ii=0;ii<texs.length;++ii){var tex=texs[ii]
tex.last_use=frame_timestamp
var handle=tex.eff_handle
if(bound_tex[ii]!==handle){if(ii!==bound_unit){gl.activeTexture(gl.TEXTURE0+ii)
bound_unit=ii}gl.bindTexture(tex.target,handle)
bound_tex[ii]=handle}}}function textureCmpArray(texsa,texsb){var d=texsa.length-texsb.length
if(d)return d
for(var ii=0;ii<texsa.length;++ii)if(d=texsa[ii].id-texsb[ii].id)return d
return 0}function textureIsArrayBound(texs){for(var ii=0;ii<texs.length;++ii){var handle=texs[ii].eff_handle
if(bound_tex[ii]!==handle)return false}return true}function textureResetState(){bound_unit=-1
if(engine.webgl2)unbindAll(gl.TEXTURE_2D_ARRAY)
unbindAll(gl.TEXTURE_2D)
setUnit(0)}function textureCname(key){var idx=key.lastIndexOf("/")
if(-1!==idx)key=key.slice(idx+1)
if(-1!==(idx=key.indexOf(".")))key=key.slice(0,idx)
return key.toLowerCase()}var auto_unload_textures=[]
var last_id=0
function Texture(params){this.id=++last_id
this.name=params.name
this.cname=textureCname(this.name)
this.loaded=false
this.load_fail=false
this.target=params.target||gl.TEXTURE_2D
this.is_array=this.target===gl.TEXTURE_2D_ARRAY
this.is_cube=this.target===gl.TEXTURE_CUBE_MAP
this.packed_mips=Boolean(params.packed_mips)
if(this.packed_mips)assert(this.is_array)
this.handle=gl.createTexture()
this.eff_handle=handle_loading
this.setSamplerState(params)
this.src_width=this.src_height=1
this.width=this.height=1
this.nozoom=params.nozoom||false
this.on_load=[]
this.gpu_mem=0
this.soft_error=params.soft_error||false
this.last_use=frame_timestamp
this.auto_unload=params.auto_unload?[]:null
if("function"===typeof params.auto_unload)this.auto_unload.push(params.auto_unload)
if(this.auto_unload)auto_unload_textures.push(this)
this.load_filter=params.load_filter||null
this.format=params.format||TEXTURE_FORMAT.RGBA8
if(params.data){var err=this.updateData(params.width,params.height,params.data)
if(err){shadersSetGLErrorReportDetails()
assert(false,"Error loading "+params.name+": "+err)}}else{unbindAll(this.target)
if(params.url){this.format=TEXTURE_FORMAT.RGBA8
this.url=params.url
this.loadURL(params.url,this.load_filter)}}}Texture.prototype.updateGPUMem=function(){var new_size=this.width*this.height*this.format.count
if(this.mipmaps)new_size*=1.5
var diff=new_size-this.gpu_mem
engine.perf_state.gpu_mem.tex+=diff
this.gpu_mem=diff}
function bindForced(tex){var target=tex.target
setUnit(0)
bound_tex[0]=null
bindHandle(0,target,tex.handle)}function textureFilterKey(params){return(params.filter_min||default_filter_min)+1e4*(params.filter_mag||default_filter_mag)}Texture.prototype.setSamplerState=function(params){var target=this.target
bindForced(this)
this.filter_min=params.filter_min||default_filter_min
this.filter_mag=params.filter_mag||default_filter_mag
gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,this.filter_min)
gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,this.filter_mag)
this.wrap_s=params.wrap_s||gl.REPEAT
this.wrap_t=params.wrap_t||gl.REPEAT
gl.texParameteri(target,gl.TEXTURE_WRAP_S,this.wrap_s)
gl.texParameteri(target,gl.TEXTURE_WRAP_T,this.wrap_t)
this.mipmaps=this.filter_min>=9984&&this.filter_min<=9987||params.force_mipmaps
if(max_aniso)if(this.mipmaps&&params.filter_mag!==gl.NEAREST)gl.texParameterf(gl.TEXTURE_2D,aniso_enum,aniso)
else gl.texParameterf(gl.TEXTURE_2D,aniso_enum,1)}
Texture.prototype.uploadPackedTexArrayWithMips=function uploadPackedTexArrayWithMips(per_mipmap_data,tile_w,num_images,orig_img){var temp_canvas
var level=0
var last_w=tile_w
while(last_w>=1){var img=per_mipmap_data[level]
assert(img)
gl.texImage3D(this.target,level,this.format.internal_type,last_w,last_w,num_images,0,this.format.internal_type,this.format.gl_type,0===level?orig_img:img)
if(gl.getError()){(temp_canvas=temp_canvas||document.createElement("canvas")).width=last_w
temp_canvas.height=last_w*num_images
temp_canvas.getContext("2d").drawImage(img,0,0)
gl.texImage3D(this.target,level,this.format.internal_type,last_w,last_w,num_images,0,this.format.internal_type,this.format.gl_type,temp_canvas)}level++
last_w=floor(last_w/2)}assert(!per_mipmap_data[level])}
Texture.prototype.updateData=function updateData(w,h,data,per_mipmap_data){profilerStart("Texture:updateData")
assert(!this.destroyed)
bindForced(this)
this.last_use=frame_timestamp
this.src_width=w
this.src_height=h
this.width=w
this.height=h
for(var ii=0;ii<10&&gl.getError();++ii);var np2=(!isPowerOfTwo(w)||!isPowerOfTwo(h))&&!this.is_array&&!this.is_cube&&!(!this.mipmaps&&this.wrap_s===gl.CLAMP_TO_EDGE&&this.wrap_t===gl.CLAMP_TO_EDGE)
if(np2){this.width=nextHighestPowerOfTwo(w)
this.height=nextHighestPowerOfTwo(h)
gl.texImage2D(this.target,0,this.format.internal_type,this.width,this.height,0,this.format.internal_type,this.format.gl_type,null)}if(data instanceof Uint8Array||data instanceof Uint8ClampedArray){assert(!per_mipmap_data)
assert(data.length>=w*h*this.format.count)
assert(!this.is_cube)
if(this.is_array){var num_images=h/w
gl.texImage3D(this.target,0,this.format.internal_type,w,w,num_images,0,this.format.internal_type,this.format.gl_type,data)}else if(np2)gl.texSubImage2D(this.target,0,0,0,w,h,this.format.internal_type,this.format.gl_type,data)
else gl.texImage2D(this.target,0,this.format.internal_type,w,h,0,this.format.internal_type,this.format.gl_type,data)}else{if(!data.width){profilerStop()
return"Missing width ("+data.width+') ("'+String(data).slice(0,100)+'")'}if(this.is_cube){assert(!per_mipmap_data)
assert.equal(2*w,3*h)
var tex_size=h/2
var canvas=document.createElement("canvas")
canvas.width=tex_size
canvas.height=tex_size
var ctx=canvas.getContext("2d")
for(var _ii=0;_ii<cube_faces.length;++_ii){var face=cube_faces[_ii]
ctx.drawImage(data,face.pos[0]*tex_size,face.pos[1]*tex_size,tex_size,tex_size,0,0,tex_size,tex_size)
gl.texImage2D(gl[face.target],0,this.format.internal_type,this.format.internal_type,this.format.gl_type,canvas)}}else if(this.is_array&&per_mipmap_data){var tile_w=per_mipmap_data[0].width
assert(per_mipmap_data[0].height%tile_w===0)
var _num_images=per_mipmap_data[0].height/tile_w
this.uploadPackedTexArrayWithMips(per_mipmap_data,tile_w,_num_images,data)}else if(this.is_array){assert(!per_mipmap_data)
var _num_images2=h/w
gl.texImage3D(this.target,0,this.format.internal_type,w,w,_num_images2,0,this.format.internal_type,this.format.gl_type,data)
if(gl.getError()){var _canvas=document.createElement("canvas")
_canvas.width=w
_canvas.height=h
_canvas.getContext("2d").drawImage(data,0,0)
gl.texImage3D(this.target,0,this.format.internal_type,w,w,_num_images2,0,this.format.internal_type,this.format.gl_type,_canvas)}}else if(np2){assert(!per_mipmap_data)
if(w!==this.width)gl.texSubImage2D(this.target,0,1,0,this.format.internal_type,this.format.gl_type,data)
if(h!==this.height)gl.texSubImage2D(this.target,0,0,1,this.format.internal_type,this.format.gl_type,data)
gl.texSubImage2D(this.target,0,0,0,this.format.internal_type,this.format.gl_type,data)}else{assert(!per_mipmap_data)
gl.texImage2D(this.target,0,this.format.internal_type,this.format.internal_type,this.format.gl_type,data)}}var err=null
var gl_err=gl.getError()
if(gl_err)err="GLError("+gl_err+")"
if(!err&&this.mipmaps&&!per_mipmap_data){gl.generateMipmap(this.target)
if(gl_err=gl.getError())err="GLError("+gl_err+")"}if(!err){this.updateGPUMem()
this.eff_handle=this.handle
this.loaded=true
callEach(this.on_load,this.on_load=null,this)}profilerStop()
return err}
Texture.prototype.onLoad=function(cb){if(this.loaded)cb(this)
else this.on_load.push(cb)}
var has_content_security_policy=localStorageGetJSON("has_csp",false)
document.addEventListener("securitypolicyviolation",function(){localStorageSetJSON("has_csp",true)
has_content_security_policy=true})
var createImageBitmap=callbackify(window.createImageBitmap)
var blob_supported
function blobSupported(){if(void 0!==blob_supported)return blob_supported
if("undefined"===typeof window.Blob)return blob_supported=false
try{var view=new Uint8Array(4)
var url_object=URL.createObjectURL(new Blob([view],{type:"image/png"}))
URL.revokeObjectURL(url_object)
blob_supported=true}catch(e){blob_supported=false}return blob_supported}function removeHash(url){var idx=url.indexOf("#")
if(-1===idx)return url
return url.slice(0,idx)}var TEX_RETRY_COUNT=4
Texture.prototype.loadURL=function loadURL(url,filter){var tex=this
assert(!tex.destroyed)
var tflags
var load_gen=tex.load_gen=(tex.load_gen||0)+1
function tryLoad(next){profilerStart("Texture:tryLoad")
var url_use=url
var did_next=false
function done(err,img){profilerStart("Texture:onload")
if(!did_next){did_next=true
next(err,img,url_use)}profilerStop()}tflags=0
if(url_use.includes(":"))url_use=locateAsset(removeHash(url_use))
var is_external=url_use.includes(":")
if(!is_external){var ext_idx=url_use.lastIndexOf(".")
assert(-1!==ext_idx)
var filename_no_ext=url_use.slice(0,ext_idx)
var png_name=filename_no_ext+".png"
var tflag_file=filename_no_ext+".tflag"
if(webFSExists(tflag_file)){tflags=webFSGetFile(tflag_file,"jsobj")
assert.equal(typeof tflags,"number")
if(tflags&FORMAT_PACK)url_use=filename_no_ext+".txp"}if(webFSExists(png_name)&&blobSupported()){assert(!(tflags&FORMAT_PACK))
var view=webFSGetFile(png_name)
var url_object=URL.createObjectURL(new Blob([view],{type:"image/png"}))
var _img=new Image
_img.onload=function(){URL.revokeObjectURL(url_object)
done(null,_img)}
_img.onerror=function(){URL.revokeObjectURL(url_object)
done("img decode error")}
_img.src=url_object
profilerStop()
return}url_use=locateAsset(removeHash(url_use))
url_use=""+urlhash.getURLBase()+url_use}if(tflags&FORMAT_PACK){fetch({url:url_use,response_type:"arraybuffer"},done)
profilerStop()
return}if(is_external&&blobSupported()&&has_content_security_policy){fetch({url:url_use,response_type:"arraybuffer"},done)
profilerStop()
return}var img=new Image
img.onload=function(){done(null,img)}
img.onerror=function(){done("error",null)}
img.crossOrigin="anonymous"
img.src=url_use
profilerStop()}function decodeTexturePack(arraybuffer,next){assert(arraybuffer instanceof ArrayBuffer)
var dv=new DataView(arraybuffer)
var header_offs=0
var header=dv.getUint32(header_offs,true)
header_offs+=4
if(header!==TEXPACK_MAGIC)return void next("TXP: Invalid header")
var num_images=dv.getUint32(header_offs,true)
if(num_images>32)return void next("TXP: Data out of bounds")
var txp_flags=dv.getUint32(header_offs+=4,true)
var mipmaps=[]
var tasks=[]
function decodeLevelPNG(level,offset,length,next){var img_out=new Image
var view=new Uint8Array(arraybuffer,offset,length)
var url_object=URL.createObjectURL(new Blob([view],{type:"image/png"}))
img_out.onload=function(){URL.revokeObjectURL(url_object)
mipmaps[level]=img_out
next()}
img_out.onerror=function(){URL.revokeObjectURL(url_object)
next("img load error")}
img_out.src=url_object}var data_offs=(header_offs+=4)+4*num_images
for(var level=0;level<num_images;++level){var len=dv.getUint32(header_offs,true)
header_offs+=4
if(txp_flags&FORMAT_PNG)tasks.push(decodeLevelPNG.bind(null,level,data_offs,len))
else return void next("TXP: Unknown format "+txp_flags)
data_offs+=len}if(data_offs!==arraybuffer.byteLength)if(data_offs>arraybuffer.byteLength)return void next("TXP: Unexpected end of file ("+data_offs+" > "+arraybuffer.byteLength+")")
else assert(false,"TXP: Unexpected end of file ("+data_offs+" != "+arraybuffer.byteLength+")")
asyncSeries(tasks,function(err){next(err,mipmaps[0],mipmaps)})}function decodeFetchedImage(arraybuffer,next){assert(arraybuffer instanceof ArrayBuffer)
var img_out=new Image
var view=new Uint8Array(arraybuffer)
var url_object=URL.createObjectURL(new Blob([view],{type:"image/png"}))
img_out.onload=function(){URL.revokeObjectURL(url_object)
next(null,img_out)}
img_out.onerror=function(){URL.revokeObjectURL(url_object)
next("img load error")}
img_out.src=url_object}function prepImage(err,img,next){if(err||!img)return void next(err||"error",img)
if(tflags&FORMAT_PACK)return void decodeTexturePack(img,next)
var unpack_mips=tex.is_array&&tex.packed_mips
if(img instanceof ArrayBuffer){assert(!unpack_mips)
return void decodeFetchedImage(img,next)}if(filter)img=filter(tex,img)
if(!unpack_mips)return void next(null,img)
var mipmaps=[]
var tasks=[]
var w=img.width
var h=img.height
var tile_w=2*w/3
assert.equal(floor(tile_w),tile_w)
var num_images=h/tile_w
if(engine.defines.ARRAYNOMIP){img.width=tile_w
img.height=num_images*tile_w
return void next(null,img)}function getLevel(level,x,y,wh,next){createImageBitmap(img,x,y,wh,wh*num_images,{premultiplyAlpha:"none",colorSpaceConversion:"none"},function(err,result){if(err)return void next(err)
mipmaps[level]=result
next()})}var level=0
var last_w=tile_w
var next_y=0
var next_x=0
while(last_w>=1){tasks.push(getLevel.bind(null,level,next_x,next_y,last_w))
if(next_x)next_y+=last_w*num_images
else next_x=last_w
last_w=floor(last_w/2);++level}asyncParallel(tasks,function(err){next(err,img,mipmaps)})}++load_count
var retries=0
function handleLoad(err,img,url_use_debug){if(tex.load_gen!==load_gen||tex.destroyed){--load_count
return}prepImage(err,img,function(err_prep,img_new,mipmaps){if(tex.load_gen!==load_gen||tex.destroyed){--load_count
return}img=img_new
var err_details=""
if(err_prep)err_details=err_prep
else if(img){var _err=tex.updateData(img.width,img.height,img,mipmaps)
if(_err){err_details=String(_err)
if(tex.is_array&&("GLError(1282)"===_err||"GLError(1281)"===_err)&&engine.webgl2&&!engine.DEBUG){localStorageSetJSON("webgl2_disable",{ua:navigator.userAgent,ts:Date.now()})
console.error('Error loading array texture "'+url_use_debug+'": '+err_details+", reloading without WebGL2..")
engine.reloadSafe()
return}if(!tex.for_reload)retries=TEX_RETRY_COUNT}else{--load_count
return}}var err='Error loading texture "'+(url_use_debug&&url_use_debug.length>200?url_use_debug.slice(0,200)+"...":url_use_debug)+'": '+err_details
if(++retries>TEX_RETRY_COUNT){--load_count
tex.eff_handle=handle_error
tex.load_fail=true
console.error(err+": "+err_details+", retries failed")
if(tex.soft_error)tex.err="Load failed"
else{shadersSetGLErrorReportDetails()
assert(false,err)}return}console.error(err+": "+err_details+", retrying... ")
setTimeout(tryLoad.bind(null,handleLoad),100*retries*retries)})}tryLoad(handleLoad)}
Texture.prototype.allocFBO=function(w,h){var fbo_format=settings.fbo_rgba?gl.RGBA:gl.RGB
bindForced(this)
gl.texImage2D(this.target,0,fbo_format,w,h,0,fbo_format,gl.UNSIGNED_BYTE,null)
this.fbo=gl.createFramebuffer()
assert(this.fbo)
gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo)
gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.handle,0)
this.last_use=frame_timestamp
this.src_width=this.width=w
this.src_height=this.height=h
this.updateGPUMem()}
Texture.prototype.allocDepth=function(w,h){bindForced(this)
gl.texImage2D(gl.TEXTURE_2D,0,this.format.internal_type,w,h,0,this.format.format,this.format.gl_type,null)
this.last_use=frame_timestamp
this.src_width=this.width=w
this.src_height=this.height=h
this.updateGPUMem()}
Texture.prototype.captureStart=function(w,h){assert(!this.capture)
this.capture={w:w,h:h}
if(this.fbo)gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo)
else{assert(w)
assert(h)}}
Texture.prototype.captureEnd=function(filter_linear,wrap){assert(this.capture)
var capture=this.capture
this.capture=null
if(this.fbo)gl.bindFramebuffer(gl.FRAMEBUFFER,null)
else this.copyTexImage(0,0,capture.w,capture.h)
var filter=filter_linear?gl.LINEAR:gl.NEAREST
this.setSamplerState({filter_min:filter,filter_mag:filter,wrap_s:wrap?gl.REPEAT:gl.CLAMP_TO_EDGE,wrap_t:wrap?gl.REPEAT:gl.CLAMP_TO_EDGE})}
Texture.prototype.copyTexImage=function(x,y,w,h){assert(!this.destroyed)
assert(w&&h)
bindHandle(0,this.target,this.handle)
gl.copyTexImage2D(this.target,0,gl.RGB,x,y,w,h,0)
this.last_use=frame_timestamp
this.src_width=this.width=w
this.src_height=this.height=h
this.updateGPUMem()}
Texture.prototype.destroy=function(){if(this.destroyed)return
profilerStart("Texture:destroy")
assert(this.name)
var auto_unload=this.auto_unload
if(auto_unload){this.auto_unload=null
var idx=auto_unload_textures.indexOf(this)
assert(-1!==idx)
ridx(auto_unload_textures,idx)}delete textures[this.name]
unbindAll(this.target)
gl.deleteTexture(this.handle)
if(this.fbo){gl.bindFramebuffer(gl.FRAMEBUFFER,null)
gl.deleteFramebuffer(this.fbo)}this.width=this.height=0
this.updateGPUMem()
this.destroyed=true
if(auto_unload)for(var ii=0;ii<auto_unload.length;++ii)auto_unload[ii]()
profilerStop("Texture:destroy")}
function create(params){assert(params.name)
var texture=new Texture(params)
return textures[params.name]=texture}var last_temporary_id=0
function textureCreateForCapture(unique_name,auto_unload){var name=unique_name||"screen_temporary_tex_"+ ++last_temporary_id
assert(!textures[name])
var texture=create({filter_min:gl.NEAREST,filter_mag:gl.NEAREST,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE,format:TEXTURE_FORMAT.RGB8,name:name,auto_unload:auto_unload})
texture.loaded=true
texture.eff_handle=texture.handle
return texture}function textureCreateForDepthCapture(unique_name,tex_format){var name=unique_name||"screen_temporary_tex_"+ ++last_temporary_id
assert(!textures[name])
var texture=create({filter_min:gl.NEAREST,filter_mag:gl.NEAREST,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE,format:tex_format,name:name})
texture.loaded=true
texture.eff_handle=texture.handle
return texture}function textureLoad(params){var key=params.name=params.name||params.url
assert(key)
var tex=textures[key]
if(!tex)tex=create(params)
else if("function"===typeof params.auto_unload){assert(tex.auto_unload)
tex.auto_unload.push(params.auto_unload)}tex.last_use=frame_timestamp
return tex}function textureFindForReplacement(search_key){search_key=textureCname(search_key)
for(var key in textures)if(textures[key].cname===search_key)return textures[key]
return null}var tick_next_tex=0
function textureTick(){frame_timestamp=engine.frame_timestamp
var len=auto_unload_textures.length
if(!len)return
if(tick_next_tex>=len)tick_next_tex=0
var tex=auto_unload_textures[tick_next_tex]
if(tex.last_use<frame_timestamp-TEX_UNLOAD_TIME){console.log("Unloading texture "+tex.name)
tex.destroy()}else++tick_next_tex}function textureUnloadDynamic(){while(auto_unload_textures.length)auto_unload_textures[0].destroy()}function textureReload(filename){var ret=false
var cname=textureCname(filename)
for(var key in textures){var tex=textures[key]
if(tex.cname===cname&&tex.url){tex.for_reload=true
tex.loadURL(removeHash(tex.url)+"?rl="+Date.now(),tex.load_filter)
ret=true}}return ret}var depth_supported
function textureSupportsDepth(){return depth_supported}function textureStartup(){default_filter_min=gl.LINEAR_MIPMAP_LINEAR
default_filter_mag=gl.LINEAR
TEXTURE_FORMAT.R8.internal_type=gl.LUMINANCE
TEXTURE_FORMAT.R8.gl_type=gl.UNSIGNED_BYTE
TEXTURE_FORMAT.RGB8.internal_type=gl.RGB
TEXTURE_FORMAT.RGB8.gl_type=gl.UNSIGNED_BYTE
TEXTURE_FORMAT.RGBA8.internal_type=gl.RGBA
TEXTURE_FORMAT.RGBA8.gl_type=gl.UNSIGNED_BYTE
var UNSIGNED_INT_24_8
if(engine.webgl2){depth_supported=true
UNSIGNED_INT_24_8=gl.UNSIGNED_INT_24_8}else{var ext=gl.getExtension("WEBGL_depth_texture")
if(ext){UNSIGNED_INT_24_8=ext.UNSIGNED_INT_24_8_WEBGL
depth_supported=true}}if(depth_supported){TEXTURE_FORMAT.DEPTH16.internal_type=engine.webgl2?gl.DEPTH_COMPONENT16:gl.DEPTH_COMPONENT
TEXTURE_FORMAT.DEPTH16.format=gl.DEPTH_COMPONENT
TEXTURE_FORMAT.DEPTH16.gl_type=gl.UNSIGNED_SHORT
TEXTURE_FORMAT.DEPTH24.internal_type=engine.webgl2?gl.DEPTH24_STENCIL8:gl.DEPTH_STENCIL
TEXTURE_FORMAT.DEPTH24.format=gl.DEPTH_STENCIL
TEXTURE_FORMAT.DEPTH24.gl_type=UNSIGNED_INT_24_8}var ext_anisotropic=gl.getExtension("EXT_texture_filter_anisotropic")||gl.getExtension("MOZ_EXT_texture_filter_anisotropic")||gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic")
if(ext_anisotropic){aniso_enum=ext_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT
aniso=max_aniso=gl.getParameter(ext_anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}handle_error=textureLoad({name:"error",width:2,height:2,nozoom:true,format:TEXTURE_FORMAT.RGBA8,filter_mag:gl.NEAREST,data:new Uint8Array([255,20,147,255,255,0,0,255,255,255,255,255,255,20,147,255])}).handle
handle_loading=textureLoad({name:"loading",width:2,height:2,nozoom:true,format:TEXTURE_FORMAT.RGBA8,data:new Uint8Array([127,127,127,255,0,0,0,255,64,64,64,255,127,127,127,255])}).handle
textureLoad({name:"white",width:2,height:2,nozoom:true,format:TEXTURE_FORMAT.RGBA8,data:new Uint8Array([255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255])})
textureLoad({name:"invisible",width:2,height:2,nozoom:true,format:TEXTURE_FORMAT.RGBA8,data:new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])})
filewatchOn(".png",textureReload)
filewatchOn(".jpg",textureReload)
filewatchOn(".txp",textureReload)}exports.format=TEXTURE_FORMAT
exports.defaultFilters=textureDefaultFilters
exports.texturesUnloadDynamic=textureUnloadDynamic
exports.bind=textureBind
exports.bindArray=textureBindArray
exports.load=textureLoad
exports.cmpTextureArray=textureCmpArray
exports.isArrayBound=textureIsArrayBound
exports.createForCapture=textureCreateForCapture
exports.createForDepthCapture=textureCreateForDepthCapture
exports.cname=textureCname
exports.findTexForReplacement=textureFindForReplacement
exports.textures=textures

},{"../common/texpack_common":94,"../common/util":96,"./engine":21,"./fetch":26,"./filewatch":27,"./local_storage":40,"./locate_asset":42,"./settings":59,"./shaders":61,"./urlhash":74,"./webfs":76,"assert":undefined,"glov-async":undefined}],71:[function(require,module,exports){
"use strict"
exports.REMOVE=exports.IMMEDIATE=exports.CONTINUE=void 0
exports.active=active
exports.fade=fade
exports.pixelate=pixelate
exports.queue=queue
exports.randomTransition=randomTransition
exports.render=render
exports.splitScreen=splitScreen
exports.wipe=wipe
var assert=require("assert")
var _glovCommonUtil=require("../common/util")
var easeOut=_glovCommonUtil.easeOut
var lerp=_glovCommonUtil.lerp
var _glovCommonVerify=require("../common/verify")
var verify=_glovCommonVerify
var _glovCommonVmath=require("../common/vmath")
var unit_vec=_glovCommonVmath.unit_vec
var vec4=_glovCommonVmath.vec4
var _camera2d=require("./camera2d")
var camera2d=_camera2d
var _effects=require("./effects")
var applyCopy=_effects.applyCopy
var effectsIsFinal=_effects.effectsIsFinal
var effectsQueue=_effects.effectsQueue
var _engine=require("./engine")
var glov_engine=_engine
var _framebuffer=require("./framebuffer")
var framebufferCapture=_framebuffer.framebufferCapture
var framebufferEnd=_framebuffer.framebufferEnd
var framebufferStart=_framebuffer.framebufferStart
var temporaryTextureClaim=_framebuffer.temporaryTextureClaim
var _shaders=require("./shaders")
var shaderCreate=_shaders.shaderCreate
var _sprites=require("./sprites")
var spriteQueueRaw=_sprites.spriteQueueRaw
var spriteQueueRaw4=_sprites.spriteQueueRaw4
var spriteQueueRaw4Color=_sprites.spriteQueueRaw4Color
var _textures=require("./textures")
var textureCreateForCapture=_textures.textureCreateForCapture
var _ui=require("./ui")
var glov_ui=_ui
var PI=Math.PI,abs=Math.abs,cos=Math.cos,floor=Math.floor,min=Math.min,pow=Math.pow,random=Math.random,sin=Math.sin,sqrt=Math.sqrt
var SQRT1_2=sqrt(.5)
var PI_4=PI/4
var PI_2=PI/2
var transitions=[]
var IMMEDIATE="immediate"
exports.IMMEDIATE=IMMEDIATE
var REMOVE="remove"
exports.REMOVE=REMOVE
var CONTINUE="continue"
exports.CONTINUE=CONTINUE
var shader_data={transition_pixelate:{fp:"shaders/transition_pixelate.fp"}}
function getShader(key){var elem=shader_data[key]
if(!elem.shader)elem.shader=shaderCreate(elem.fp)
return elem.shader}function GlovTransition(z,func){this.z=z
this.capture=null
this.func=func
this.accum_time=0}function transitionCapture(trans){assert(!trans.capture)
trans.capture=textureCreateForCapture()
framebufferCapture(trans.capture)}function transitionCaptureFramebuffer(trans){assert(!trans.capture)
trans.capture=framebufferEnd()
temporaryTextureClaim(trans.capture)
if(trans.capture.fbo)applyCopy({source:trans.capture,final:effectsIsFinal()})
else framebufferStart({width:trans.capture.width,height:trans.capture.height,final:effectsIsFinal()})}function queue(z,fn){assert(!glov_engine.had_3d_this_frame)
var immediate=false
if(z===IMMEDIATE){immediate=true
z=Z.TRANSITION_FINAL}for(var ii=0;ii<transitions.length;++ii){var _trans=transitions[ii]
if(_trans.z===z)if(!verify(_trans.capture))return false}var trans=new GlovTransition(z,fn)
transitions.push(trans)
if(immediate)transitionCapture(trans)
else effectsQueue(z+Z.TRANSITION_RANGE,transitionCaptureFramebuffer.bind(null,trans))
return true}function destroyTexture(tex){profilerStart("transition:destroyTexture")
tex.destroy()
profilerStop()}function render(dt){dt=min(dt,100)
for(var trans_idx=0;trans_idx<transitions.length;++trans_idx){var trans=transitions[trans_idx]
trans.accum_time+=dt
assert(trans.capture)
var force_end=trans_idx<transitions.length-1
if(trans.func(trans.z,trans.capture,trans.accum_time,force_end)===REMOVE){setTimeout(destroyTexture.bind(null,trans.capture),0)
transitions.splice(trans_idx,1)
trans_idx--}}}function active(){return transitions.length}function glovTransitionFadeFunc(fade_time,z,initial,ms_since_start,force_end){var progress=min(ms_since_start/fade_time,1)
var alpha=1-easeOut(progress,2)
var color=vec4(1,1,1,alpha)
camera2d.setNormalized()
spriteQueueRaw4([initial],0,0,0,1,1,1,1,0,z,0,1,1,0,color)
if(force_end||1===progress)return REMOVE
return CONTINUE}function glovTransitionWipeFunc(wipe_time,wipe_angle,z,tex,ms_since_start,force_end){var progress=min(ms_since_start/wipe_time,1)
camera2d.setNormalized()
var uvs=[[0,1],[1,0]]
var points=[{},{},{},{}]
for(var ii=0;ii<4;ii++){var x=1===ii||2===ii?1:0
var y=ii>=2?1:0
points[ii].x=x
points[ii].y=y}wipe_angle-=PI/2
while(wipe_angle>PI)wipe_angle-=2*PI
while(wipe_angle<-PI)wipe_angle+=2*PI
if(wipe_angle>=-PI_4&&wipe_angle<=PI_4){var x0=2*progress
var x1=x0-sin(abs(wipe_angle))/SQRT1_2
if(wipe_angle<0){points[0].x=x1
points[3].x=x0}else{points[0].x=x0
points[3].x=x1}points[1].x=points[2].x=2}else if(wipe_angle>=PI_2+PI_4||wipe_angle<=-PI_2-PI_4){var _x=1-2*progress
var _x2=_x+sin(abs(wipe_angle))/SQRT1_2
if(wipe_angle<0){points[1].x=_x2
points[2].x=_x}else{points[1].x=_x
points[2].x=_x2}points[0].x=points[3].x=-1}else if(wipe_angle>PI_4&&wipe_angle<=PI_2+PI_4){var y0=2*progress
var offs=cos(wipe_angle)/SQRT1_2
var y1=y0-abs(offs)
if(offs>0){points[0].y=y0
points[1].y=y1}else{points[0].y=y1
points[1].y=y0}points[2].y=points[3].y=2}else{var _y=1-2*progress
var _offs=cos(wipe_angle)/SQRT1_2
var _y2=_y+abs(_offs)
if(_offs>0){points[2].y=_y2
points[3].y=_y}else{points[2].y=_y
points[3].y=_y2}points[0].y=points[1].y=-1}points[0].u=lerp(points[0].x,uvs[0][0],uvs[1][0])
points[1].u=lerp(points[1].x,uvs[0][0],uvs[1][0])
points[2].u=lerp(points[2].x,uvs[0][0],uvs[1][0])
points[3].u=lerp(points[3].x,uvs[0][0],uvs[1][0])
points[0].v=lerp(points[0].y,uvs[0][1],uvs[1][1])
points[1].v=lerp(points[1].y,uvs[0][1],uvs[1][1])
points[2].v=lerp(points[2].y,uvs[0][1],uvs[1][1])
points[3].v=lerp(points[3].y,uvs[0][1],uvs[1][1])
spriteQueueRaw4Color([tex],points[0].x,points[0].y,unit_vec,points[0].u,points[0].v,points[3].x,points[3].y,unit_vec,points[3].u,points[3].v,points[2].x,points[2].y,unit_vec,points[2].u,points[2].v,points[1].x,points[1].y,unit_vec,points[1].u,points[1].v,z)
if(force_end||1===progress)return REMOVE
return CONTINUE}function glovTransitionSplitScreenFunc(time,border_width,slide_window,z,tex,ms_since_start,force_end){var border_color=vec4(1,1,1,1)
var progress=easeOut(min(ms_since_start/time,1),2)
camera2d.setNormalized()
var uvs=[[0,1],[1,0]]
var xoffs=progress
var v_half=uvs[0][1]+(uvs[1][1]-uvs[0][1])/2
if(slide_window){spriteQueueRaw([tex],0,0,z,1-xoffs,.5,0,uvs[0][1],uvs[1][0]*(1-progress),v_half,unit_vec)
spriteQueueRaw([tex],0+xoffs,.5,z,1-xoffs,.5,uvs[1][0]*progress,v_half,uvs[1][0],uvs[1][1],unit_vec)}else{spriteQueueRaw([tex],0-xoffs,0,z,1,.5,uvs[0][0],uvs[0][1],uvs[1][0],v_half,unit_vec)
spriteQueueRaw([tex],0+xoffs,.5,z,1,.5,uvs[0][0],v_half,uvs[1][0],uvs[1][1],unit_vec)}var border_grow_progress=min(4*progress,1)
border_color[3]=border_grow_progress
glov_ui.drawRect(0,.5-(border_width*=border_grow_progress),1-xoffs,.5,z+1,border_color)
glov_ui.drawRect(1-xoffs-border_width,0,1-xoffs,.5,z+1,border_color)
glov_ui.drawRect(xoffs,.5,1,.5+border_width,z+1,border_color)
glov_ui.drawRect(xoffs,.5,xoffs+border_width,1,z+1,border_color)
if(force_end||1===progress)return REMOVE
return CONTINUE}var render_scale=1
var transition_pixelate_textures=[null]
function transitionPixelateCapture(){var tex=framebufferEnd()
framebufferStart({width:tex.width,height:tex.height,final:effectsIsFinal()})
transition_pixelate_textures[0]=tex}function glovTransitionPixelateFunc(time,z,tex,ms_since_start,force_end){var gd_width=glov_engine.width
var progress=min(ms_since_start/time,1)
camera2d.setNormalized()
transition_pixelate_textures[0]=tex
if(progress>.5)effectsQueue(z,transitionPixelateCapture)
var pixel_scale=pow(2,floor(8.9*(2*(progress>.5?1-progress:progress))))/1024*gd_width*render_scale
var param0=vec4(tex.width/pixel_scale,tex.height/pixel_scale,pixel_scale/tex.width,pixel_scale/tex.height)
var param1=vec4(.5/tex.width,.5/tex.height,(tex.texSizeX-1)/tex.width,(tex.texSizeY-1)/tex.height)
spriteQueueRaw(transition_pixelate_textures,0,0,z+1,1,1,0,1,1,0,unit_vec,getShader("transition_pixelate"),{param0:param0,param1:param1})
if(force_end||1===progress)return REMOVE
return CONTINUE}function fade(fade_time){return glovTransitionFadeFunc.bind(null,fade_time)}function wipe(wipe_time,wipe_angle){return glovTransitionWipeFunc.bind(null,wipe_time,wipe_angle)}function splitScreen(time,border_width,slide_window){border_width/=camera2d.w()
return glovTransitionSplitScreenFunc.bind(null,time,border_width,slide_window)}function pixelate(fade_time){return glovTransitionPixelateFunc.bind(null,fade_time)}function randomTransition(fade_time_scale){fade_time_scale=fade_time_scale||1
switch(floor(3*random())){case 0:return fade(500*fade_time_scale)
case 1:return splitScreen(250*fade_time_scale,2,false)
case 2:return pixelate(750*fade_time_scale)
case 3:return wipe(250*fade_time_scale,2*random()*PI)
default:assert(0)}return null}

},{"../common/util":96,"../common/verify":97,"../common/vmath":98,"./camera2d":15,"./effects":20,"./engine":21,"./framebuffer":29,"./shaders":61,"./sprites":68,"./textures":70,"./ui":72,"assert":undefined}],72:[function(require,module,exports){
"use strict"
exports.Z_MIN_INC=exports.Z=exports.LINE_NO_AA=exports.LINE_CAP_SQUARE=exports.LINE_CAP_ROUND=exports.LINE_ALIGN=void 0
exports.addHook=addHook
exports.button=button
exports.buttonBackgroundDraw=buttonBackgroundDraw
exports.buttonImage=buttonImage
exports.buttonLastSpotRet=buttonLastSpotRet
exports.buttonSetDefaultYOffs=buttonSetDefaultYOffs
exports.buttonShared=buttonShared
exports.buttonSpotBackgroundDraw=buttonSpotBackgroundDraw
exports.buttonText=buttonText
exports.buttonTextDraw=buttonTextDraw
exports.buttonWasFocused=buttonWasFocused
exports.button_mouseover=exports.button_last_spot_ret=exports.button_last_color=exports.button_focused=exports.button_click=void 0
exports.checkbox=checkbox
exports.colorSetMakeCustom=colorSetMakeCustom
exports.colorSetSetShades=colorSetSetShades
exports.color_panel=void 0
exports.copyTextToClipboard=copyTextToClipboard
exports.createEditBox=createEditBox
exports.drawBox=drawBox
exports.drawCircle=drawCircle
exports.drawCone=drawCone
exports.drawElipse=drawElipse
exports.drawHBox=drawHBox
exports.drawHollowCircle=drawHollowCircle
exports.drawHollowRect=drawHollowRect
exports.drawHollowRect2=drawHollowRect2
exports.drawLine=drawLine
exports.drawMultiPartBox=drawMultiPartBox
exports.drawRect=drawRect
exports.drawRect2=drawRect2
exports.drawRect4Color=drawRect4Color
exports.drawTooltip=drawTooltip
exports.drawTooltipBox=drawTooltipBox
exports.drawVBox=drawVBox
exports.focusCanvas=focusCanvas
exports.font=void 0
exports.getUIElemData=getUIElemData
exports.internal=void 0
exports.isMenuUp=isMenuUp
exports.label=label
exports.loadUISprite=loadUISprite
exports.loadUISprite2=loadUISprite2
exports.makeColorSet=makeColorSet
exports.menuUp=menuUp
exports.menu_up=void 0
exports.modalDialog=modalDialog
exports.modalDialogClear=modalDialogClear
exports.modalTextEntry=modalTextEntry
exports.modal_y0=exports.modal_width=exports.modal_title_scale=exports.modal_pad=exports.modal_button_width=void 0
exports.panel=panel
exports.panel_pixel_scale=void 0
exports.playUISound=playUISound
exports.print=print
exports.progressBar=progressBar
exports.provideUserString=provideUserString
exports.scaleSizes=scaleSizes
exports.setButtonHeight=setButtonHeight
exports.setButtonsDefaultLabels=setButtonsDefaultLabels
exports.setFontHeight=setFontHeight
exports.setFontStyles=setFontStyles
exports.setModalSizes=setModalSizes
exports.setPanelPixelScale=setPanelPixelScale
exports.setProvideUserStringDefaultMessages=setProvideUserStringDefaultMessages
exports.setTooltipTextOffset=setTooltipTextOffset
exports.setTooltipWidth=setTooltipWidth
exports.sprites=void 0
exports.suppressNewDOMElemWarnings=suppressNewDOMElemWarnings
exports.tooltip_width=exports.tooltip_panel_pixel_scale=exports.tooltip_pad=exports.title_font=void 0
exports.uiBindSounds=uiBindSounds
exports.uiButtonHeight=uiButtonHeight
exports.uiButtonWidth=uiButtonWidth
exports.uiFontStyleDisabled=uiFontStyleDisabled
exports.uiFontStyleFocused=uiFontStyleFocused
exports.uiFontStyleModal=uiFontStyleModal
exports.uiFontStyleNormal=uiFontStyleNormal
exports.uiGetButtonRolloverColor=uiGetButtonRolloverColor
exports.uiGetDOMElem=uiGetDOMElem
exports.uiGetDOMTabIndex=uiGetDOMTabIndex
exports.uiGetFont=uiGetFont
exports.uiGetFontStyleFocused=uiGetFontStyleFocused
exports.uiGetPanelColor=uiGetPanelColor
exports.uiGetTitleFont=uiGetTitleFont
exports.uiGetTooltipPad=uiGetTooltipPad
exports.uiGetTooltipPanelPixelScale=uiGetTooltipPanelPixelScale
exports.uiHandlingNav=uiHandlingNav
exports.uiSetButtonColorSet=uiSetButtonColorSet
exports.uiSetFontStyleFocused=uiSetFontStyleFocused
exports.uiSetPanelColor=uiSetPanelColor
exports.uiTextHeight=uiTextHeight
var _SPOT_STATE_TO_UI_BUT
function _extends(){return(_extends=Object.assign?Object.assign.bind():function(target){for(var i=1;i<arguments.length;i++){var source=arguments[i]
for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))target[key]=source[key]}return target}).apply(this,arguments)}window.Z=window.Z||{}
var Z=window.Z
exports.Z=Z
var Z_MIN_INC=1e-5
exports.Z_MIN_INC=Z_MIN_INC
Z.BORDERS=Z.BORDERS||90
Z.UI=Z.UI||100
Z.MODAL=Z.MODAL||1e3
Z.TOOLTIP=Z.TOOLTIP||2e3
Z.DEBUG=Z.DEBUG||9800
Z.TRANSITION_FINAL=Z.TRANSITION_FINAL||9900
Z.TRANSITION_RANGE=Z.TRANSITION_RANGE||10
Z.FPSMETER=Z.FPSMETER||1e4
var LINE_ALIGN=1
exports.LINE_ALIGN=LINE_ALIGN
var LINE_CAP_SQUARE=2
exports.LINE_CAP_SQUARE=LINE_CAP_SQUARE
var LINE_CAP_ROUND=4
exports.LINE_CAP_ROUND=LINE_CAP_ROUND
var LINE_NO_AA=8
exports.LINE_NO_AA=LINE_NO_AA
var internal={checkHooks:checkHooks,cleanupDOMElems:cleanupDOMElems,uiEndFrame:uiEndFrame,uiSetFonts:uiSetFonts,uiStartup:uiStartup,uiTick:uiTick,uiApplyStyle:uiApplyStyle}
exports.internal=internal
var sprites={}
exports.sprites=sprites
var assert=require("assert")
var _require=require("./autoatlas"),autoAtlas=_require.autoAtlas
var camera2d=require("./camera2d.js")
var _require2=require("./edit_box.js"),editBoxCreate=_require2.editBoxCreate,editBoxTick=_require2.editBoxTick
var effects=require("./effects.js")
var effectsQueue=effects.effectsQueue
var glov_engine=require("./engine.js")
var glov_font=require("./font.js")
var ALIGN=glov_font.ALIGN,fontSetDefaultSize=glov_font.fontSetDefaultSize,fontStyle=glov_font.fontStyle,fontStyleColored=glov_font.fontStyleColored
var glov_input=require("./input.js")
var _require3=require("./link.js"),linkTick=_require3.linkTick,linkObscureRect=_require3.linkObscureRect
var _require4=require("./localization.js"),getStringFromLocalizable=_require4.getStringFromLocalizable
var _require5=require("./markdown"),markdownAuto=_require5.markdownAuto
var abs=Math.abs,floor=Math.floor,max=Math.max,min=Math.min,round=Math.round,sqrt=Math.sqrt
var _require6=require("./scroll_area.js"),scrollAreaSetPixelScale=_require6.scrollAreaSetPixelScale
var _require7=require("./slider.js"),sliderSetDefaultShrink=_require7.sliderSetDefaultShrink
var _require8=require("./sound.js"),soundLoad=_require8.soundLoad,soundPlay=_require8.soundPlay
var _require9=require("./spot.js"),SPOT_DEFAULT_BUTTON=_require9.SPOT_DEFAULT_BUTTON,SPOT_DEFAULT_BUTTON_DRAW_ONLY=_require9.SPOT_DEFAULT_BUTTON_DRAW_ONLY,SPOT_DEFAULT_LABEL=_require9.SPOT_DEFAULT_LABEL,SPOT_STATE_REGULAR=_require9.SPOT_STATE_REGULAR,SPOT_STATE_DOWN=_require9.SPOT_STATE_DOWN,SPOT_STATE_FOCUSED=_require9.SPOT_STATE_FOCUSED,SPOT_STATE_DISABLED=_require9.SPOT_STATE_DISABLED,spot=_require9.spot,spotEndOfFrame=_require9.spotEndOfFrame,spotKey=_require9.spotKey,spotPadMode=_require9.spotPadMode,spotPadSuppressed=_require9.spotPadSuppressed,spotTopOfFrame=_require9.spotTopOfFrame,spotUnfocus=_require9.spotUnfocus
var _require10=require("./sprites.js"),BLEND_ADDITIVE=_require10.BLEND_ADDITIVE,BLEND_PREMULALPHA=_require10.BLEND_PREMULALPHA,spriteClipped=_require10.spriteClipped,spriteClipPause=_require10.spriteClipPause,spriteClipResume=_require10.spriteClipResume,spriteChainedStart=_require10.spriteChainedStart,spriteChainedStop=_require10.spriteChainedStop,spriteCreate=_require10.spriteCreate,spriteQueueRaw=_require10.spriteQueueRaw,spriteQueueRaw4=_require10.spriteQueueRaw4
var _require11=require("./textures.js"),TEXTURE_FORMAT=_require11.TEXTURE_FORMAT
var _require12=require("./uistyle.js"),uiStyleDefault=_require12.uiStyleDefault,uiStyleModify=_require12.uiStyleModify,uiStyleTopOfFrame=_require12.uiStyleTopOfFrame
var _require13=require("../common/util.js"),clamp=_require13.clamp,clone=_require13.clone,defaults=_require13.defaults,deprecate=_require13.deprecate,lerp=_require13.lerp,merge=_require13.merge
var _require14=require("./mat43.js"),mat43=_require14.mat43,m43identity=_require14.m43identity,m43mul=_require14.m43mul
var _require15=require("../common/vmath.js"),vec2=_require15.vec2,vec4=_require15.vec4,v4copy=_require15.v4copy,v3scale=_require15.v3scale,unit_vec=_require15.unit_vec
deprecate(exports,"slider_dragging","slider.js:sliderIsDragging()")
deprecate(exports,"slider_rollover","slider.js:sliderIsFocused()")
deprecate(exports,"setSliderDefaultShrink","slider.js:sliderSetDefaultShrink()")
deprecate(exports,"slider","slider.js:slider()")
deprecate(exports,"bindSounds","uiBindSounds")
deprecate(exports,"modal_font_style","uiFontStyleModal()")
deprecate(exports,"font_style_noraml","uiFontStyleNoraml()")
deprecate(exports,"font_style_focused","uiFontStyleFocused()")
deprecate(exports,"color_button","uiSetButtonColorSet()")
var MODAL_DARKEN=.75
var KEYS
var PAD
var ui_style_current
var menu_fade_params_default={blur:[.125,.865],saturation:[.5,.1],brightness:[1,1-MODAL_DARKEN],fallback_darken:vec4(0,0,0,MODAL_DARKEN),z:Z.MODAL}
var color_set_shades=vec4(1,.8,1,1)
var color_sets=[]
function applyColorSet(color_set){v3scale(color_set.regular,color_set.color,color_set_shades[0])
v3scale(color_set.rollover,color_set.color,color_set_shades[1])
v3scale(color_set.down,color_set.color,color_set_shades[2])
v3scale(color_set.disabled,color_set.color,color_set_shades[3])}function makeColorSet(color){var ret={color:color,regular:vec4(),rollover:vec4(),down:vec4(),disabled:vec4()}
for(var field in ret)ret[field][3]=color[3]
color_sets.push(ret)
applyColorSet(ret)
return ret}function colorSetMakeCustom(regular,rollover,down,disabled){return{regular:regular,rollover:rollover,down:down,disabled:disabled}}var hooks=[]
function addHook(draw,click){hooks.push({draw:draw,click:click})}var per_frame_dom_alloc=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
var per_frame_dom_suppress=0
function suppressNewDOMElemWarnings(){per_frame_dom_suppress=glov_engine.frame_index+1}function uiElemAllocCheck(){if(glov_engine.DEBUG&&!glov_engine.resizing()&&glov_engine.frame_index>per_frame_dom_suppress){per_frame_dom_alloc[glov_engine.frame_index%per_frame_dom_alloc.length]=1
var sum=0
for(var ii=0;ii<per_frame_dom_alloc.length;++ii)sum+=per_frame_dom_alloc[ii]
assert(sum<per_frame_dom_alloc.length,"Allocated new UI elements for too many consecutive frames")}}var ui_elem_data={}
function getUIElemData(type,param,allocator){var key=spotKey(param)
var by_type=ui_elem_data[type]
if(!by_type)by_type=ui_elem_data[type]={}
var elem_data=by_type[key]
if(!elem_data){elem_data=by_type[key]=allocator?allocator(param):{}
uiElemAllocCheck()}elem_data.frame_index=glov_engine.frame_index
return elem_data}function doBlurEffect(factor){effects.applyGaussianBlur({blur:factor})}var desaturate_xform=mat43()
var desaturate_tmp=mat43()
function doDesaturateEffect(saturation,brightness){m43identity(desaturate_xform)
effects.saturationMatrix(desaturate_tmp,saturation)
m43mul(desaturate_xform,desaturate_xform,desaturate_tmp)
effects.brightnessScaleMatrix(desaturate_tmp,brightness)
m43mul(desaturate_xform,desaturate_xform,desaturate_tmp)
effects.applyColorMatrix({colorMatrix:desaturate_xform})}var modal_button_width=100
exports.modal_button_width=modal_button_width
var modal_width=600
exports.modal_width=modal_width
var modal_y0=200
exports.modal_y0=modal_y0
var modal_title_scale=1.2
exports.modal_title_scale=modal_title_scale
var modal_pad=16
exports.modal_pad=modal_pad
var panel_pixel_scale=32/13
var tooltip_panel_pixel_scale=exports.panel_pixel_scale=panel_pixel_scale
exports.tooltip_panel_pixel_scale=tooltip_panel_pixel_scale
var tooltip_width=400
exports.tooltip_width=tooltip_width
var tooltip_pad=8
exports.tooltip_pad=tooltip_pad
var tooltip_text_offs=0
var font_style_normal
var font_style_focused
var font_style_disabled
var font_style_modal
function setFontStyles(normal,focused,modal,disabled){font_style_normal=normal||fontStyleColored(null,255)
font_style_focused=focused||fontStyle(font_style_normal,{})
font_style_modal=modal||fontStyle(font_style_normal,{})
font_style_disabled=disabled||fontStyleColored(font_style_normal,572662527)}setFontStyles()
function uiFontStyleNormal(){return font_style_normal}function uiFontStyleFocused(){return font_style_focused}function uiFontStyleDisabled(){return font_style_modal}function uiFontStyleModal(){return font_style_modal}function uiTextHeight(){return ui_style_current.text_height}function uiButtonHeight(){return ui_style_current.button_height}function uiButtonWidth(){return ui_style_current.button_width}function uiGetTooltipPad(){return tooltip_pad}function uiGetTooltipPanelPixelScale(){return tooltip_panel_pixel_scale}var font
exports.font=font
var title_font
exports.title_font=title_font
function uiGetFont(){return font}function uiGetTitleFont(){return title_font}var color_button=makeColorSet([1,1,1,1])
function uiSetButtonColorSet(color_button_in){color_button=color_button_in}function uiGetButtonRolloverColor(){return color_button.rollover}var color_panel=vec4(1,1,.75,1)
exports.color_panel=color_panel
var sounds={}
var button_mouseover=false
exports.button_mouseover=button_mouseover
var button_focused=false
exports.button_focused=button_focused
var button_click=null
exports.button_click=button_click
var button_last_spot_ret=null
exports.button_last_spot_ret=button_last_spot_ret
function buttonWasFocused(){return button_focused}function buttonLastSpotRet(){return button_last_spot_ret}var modal_dialog=null
var menu_up=false
exports.menu_up=menu_up
var menu_fade_params=merge({},menu_fade_params_default)
var menu_up_time=0
var dom_elems=[]
var dom_elems_issued=0
var button_keys
var default_line_mode
var buttons_default_labels={ok:"OK",cancel:"Cancel",yes:"Yes",no:"No"}
var default_copy_success_msg="Text copied to clipboard!"
var default_copy_failure_msg="Copy to clipboard FAILED, please copy from below."
function colorSetSetShades(rollover,down,disabled){color_set_shades[1]=rollover
color_set_shades[2]=down
color_set_shades[3]=disabled
for(var ii=0;ii<color_sets.length;++ii)applyColorSet(color_sets[ii])}function uiGetFontStyleFocused(){return font_style_focused}function uiSetFontStyleFocused(new_style){font_style_focused=new_style}function uiSetPanelColor(color){v4copy(color_panel,color)}function uiGetPanelColor(){return color_panel}function loadUISprite(name,ws,hs){var wrap_s=gl.CLAMP_TO_EDGE
var wrap_t=gl.CLAMP_TO_EDGE
sprites[name]=spriteCreate({name:"ui/"+name,ws:ws,hs:hs,wrap_s:wrap_s,wrap_t:wrap_t})}function loadUISprite2(name,param){if(null===param)return
if(param.atlas){sprites[name]=autoAtlas(param.atlas,param.name||name)
return}var wrap_s=gl.CLAMP_TO_EDGE
var wrap_t=param.wrap_t?gl.REPEAT:gl.CLAMP_TO_EDGE
var sprite_param={ws:param.ws,hs:param.hs,wrap_s:wrap_s,wrap_t:wrap_t,layers:param.layers}
if(param.url)sprite_param.url=param.url
else sprite_param.name="ui/"+(param.name||name)
sprites[name]=spriteCreate(sprite_param)}function uiSetFonts(new_font,new_title_font){exports.font=font=new_font
exports.title_font=title_font=new_title_font||font}function setButtonsDefaultLabels(buttons_labels){for(var key in buttons_labels)buttons_default_labels[key.toLowerCase()]=buttons_labels[key]}function setProvideUserStringDefaultMessages(success_msg,failure_msg){default_copy_success_msg=success_msg
default_copy_failure_msg=failure_msg}var base_ui_sprites={color_set_shades:[1,1,1],white:{url:"white"},button:{atlas:"default"},button_rollover:{atlas:"default"},button_down:{atlas:"default"},button_disabled:{atlas:"default"},panel:{atlas:"default"},menu_entry:{atlas:"default"},menu_selected:{atlas:"default"},menu_down:{atlas:"default"},menu_header:{atlas:"default"},slider:{atlas:"default"},slider_handle:{atlas:"default"},checked:{atlas:"default"},unchecked:{atlas:"default"},scrollbar_bottom:{atlas:"default"},scrollbar_trough:{atlas:"default"},scrollbar_top:{atlas:"default"},scrollbar_handle_grabber:{atlas:"default"},scrollbar_handle:{atlas:"default"},progress_bar:{atlas:"default"},progress_bar_trough:{atlas:"default"},collapsagories:{atlas:"default"},collapsagories_rollover:{atlas:"default"},collapsagories_shadow_down:{atlas:"default"},collapsagories_shadow_up:null}
function uiStartup(param){exports.font=font=param.font
exports.title_font=title_font=param.title_font||font
KEYS=glov_input.KEYS
PAD=glov_input.PAD
var ui_sprites=_extends({},base_ui_sprites,param.ui_sprites)
for(var key in ui_sprites){var elem=ui_sprites[key]
if("object"===typeof elem&&!Array.isArray(elem))loadUISprite2(key,elem)}sprites.button_regular=sprites.button
if(ui_sprites.color_set_shades)colorSetSetShades.apply(void 0,ui_sprites.color_set_shades)
if(ui_sprites.slider_params)sliderSetDefaultShrink.apply(void 0,ui_sprites.slider_params);(button_keys={ok:{key:[KEYS.O],pad:[PAD.X],low_key:[KEYS.ESC]},cancel:{key:[KEYS.ESC],pad:[PAD.B,PAD.Y]}}).yes=clone(button_keys.ok)
button_keys.yes.key.push(KEYS.Y)
button_keys.no=clone(button_keys.cancel)
button_keys.no.key.push(KEYS.N)
if(void 0!==param.line_mode)default_line_mode=param.line_mode
else default_line_mode=LINE_ALIGN|LINE_CAP_ROUND
scaleSizes(1)}var dynamic_text_elem
function uiGetDOMElem(last_elem,allow_modal){if(isMenuUp()&&!allow_modal)return null
if(dom_elems_issued>=dom_elems.length||!last_elem){var _elem=document.createElement("div")
uiElemAllocCheck()
_elem.setAttribute("class","glovui_dynamic")
if(!dynamic_text_elem)dynamic_text_elem=document.getElementById("dynamic_text")
dynamic_text_elem.appendChild(_elem)
dom_elems.push(_elem)
last_elem=_elem}if(dom_elems[dom_elems_issued]!==last_elem)for(var ii=dom_elems_issued+1;ii<dom_elems.length;++ii)if(dom_elems[ii]===last_elem){dom_elems[ii]=dom_elems[dom_elems_issued]
dom_elems[dom_elems_issued]=last_elem}var elem=dom_elems[dom_elems_issued]
dom_elems_issued++
return elem}var dom_tab_index=0
function uiGetDOMTabIndex(){return++dom_tab_index}var base_ui_sounds={button_click:"button_click",rollover:"rollover"}
function uiBindSounds(_sounds){for(var key in sounds=defaults(_sounds||{},base_ui_sounds))if(sounds[key])soundLoad(sounds[key],sounds[key].opts)}var draw_box_param={nozoom:true}
function drawHBox(coords,s,color){spriteChainedStart()
var uidata=s.uidata
var x=coords.x
var ws=[uidata.wh[0]*coords.h,0,(uidata.wh[2]||0)*coords.h]
if(coords.no_min_width&&ws[0]+ws[2]>coords.w){var scale=coords.w/(ws[0]+ws[2])
ws[0]*=scale
ws[2]*=scale}else if(uidata.wh[1])ws[1]=max(0,coords.w-ws[0]-ws[2])
else ws[0]=coords.w
draw_box_param.y=coords.y
draw_box_param.z=coords.z
draw_box_param.h=coords.h
draw_box_param.color=color
draw_box_param.color1=coords.color1
draw_box_param.shader=null
for(var ii=0;ii<ws.length;++ii){var my_w=ws[ii]
if(my_w){draw_box_param.x=x
draw_box_param.w=my_w
draw_box_param.uvs=uidata.rects[ii]
if(coords.color1)s.drawDualTint(draw_box_param)
else s.draw(draw_box_param)}x+=my_w}spriteChainedStop()}function drawVBox(coords,s,color){spriteChainedStart()
var uidata=s.uidata
var hs=[uidata.hw[0]*coords.w,0,(uidata.hw[2]||0)*coords.w]
var y=coords.y
hs[1]=max(0,coords.h-hs[0]-hs[2])
draw_box_param.x=coords.x
draw_box_param.z=coords.z
draw_box_param.w=coords.w
draw_box_param.color=color
draw_box_param.shader=null
for(var ii=0;ii<hs.length;++ii){var my_h=hs[ii]
draw_box_param.y=y
draw_box_param.h=my_h
draw_box_param.uvs=uidata.rects[ii]
s.draw(draw_box_param)
y+=my_h}spriteChainedStop()}function drawBox(coords,s,pixel_scale,color,color1){spriteChainedStart()
var uidata=s.uidata
var scale=pixel_scale
var ws=[uidata.widths[0]*scale,0,uidata.widths[2]*scale]
ws[1]=max(0,coords.w-ws[0]-ws[2])
var hs=[uidata.heights[0]*scale,0,uidata.heights[2]*scale]
hs[1]=max(0,coords.h-hs[0]-hs[2])
var x=coords.x
draw_box_param.z=coords.z
draw_box_param.color=color
draw_box_param.shader=null
if(color1)draw_box_param.color1=color1
for(var ii=0;ii<ws.length;++ii){var my_w=ws[ii]
if(my_w){draw_box_param.x=x
draw_box_param.w=my_w
var y=coords.y
for(var jj=0;jj<hs.length;++jj){var my_h=hs[jj]
if(my_h){draw_box_param.y=y
draw_box_param.h=my_h
draw_box_param.uvs=uidata.rects[3*jj+ii]
if(color1)s.drawDualTint(draw_box_param)
else s.draw(draw_box_param)
y+=my_h}}x+=my_w}}spriteChainedStop()}function drawMultiPartBox(coords,scaleable_data,s,pixel_scale,color){spriteChainedStart()
var uidata=s.uidata
var scale=pixel_scale
var ws=[]
var fixed_w_sum=0
var scaleable_sum=0
for(var i=0;i<uidata.widths.length;i++)if(scaleable_data.widths[i]<0){ws.push(uidata.widths[i]*scale)
fixed_w_sum+=uidata.widths[i]*scale}else{ws.push(0)
scaleable_sum+=scaleable_data.widths[i]}assert(1===scaleable_sum)
for(var _i=0;_i<uidata.widths.length;_i++)if(scaleable_data.widths[_i]>=0)ws[_i]=max(0,(coords.w-fixed_w_sum)*scaleable_data.widths[_i])
var hs=[]
var fixed_h_sum=scaleable_sum=0
for(var _i2=0;_i2<uidata.heights.length;_i2++)if(scaleable_data.heights[_i2]<0){hs.push(uidata.heights[_i2]*scale)
fixed_h_sum+=uidata.heights[_i2]*scale}else{hs.push(0)
scaleable_sum+=scaleable_data.heights[_i2]}assert(1===scaleable_sum)
for(var _i3=0;_i3<uidata.heights.length;_i3++)if(scaleable_data.heights[_i3]>=0)hs[_i3]=max(0,(coords.h-fixed_h_sum)*scaleable_data.heights[_i3])
var x=coords.x
for(var ii=0;ii<ws.length;++ii){var my_w=ws[ii]
if(my_w){var y=coords.y
for(var jj=0;jj<hs.length;++jj){var my_h=hs[jj]
if(my_h){s.draw({x:x,y:y,z:coords.z,color:color,w:my_w,h:my_h,uvs:uidata.rects[jj*ws.length+ii],nozoom:true})
y+=my_h}}x+=my_w}}spriteChainedStop()}function playUISound(name,volume){profilerStart("playUISound")
if("select"===name)name="button_click"
if(sounds[name])soundPlay(sounds[name],volume)
profilerStop("playUISound")}function focusCanvas(){spotUnfocus()}function uiHandlingNav(){return menu_up||!spotPadSuppressed()}function panel(param){assert("number"===typeof param.x)
assert("number"===typeof param.y)
assert("number"===typeof param.w)
assert("number"===typeof param.h)
param.z=param.z||Z.UI-1
param.eat_clicks=void 0===param.eat_clicks?true:param.eat_clicks
var color=param.color||color_panel
drawBox(param,param.sprite||sprites.panel,param.pixel_scale||panel_pixel_scale,color)
if(param.eat_clicks){glov_input.mouseOver(param)
linkObscureRect(param)}}function drawTooltip(param){var tooltip=param.tooltip
if("function"===typeof tooltip)if(!(tooltip=tooltip(param)))return
tooltip=getStringFromLocalizable(tooltip)
assert("number"===typeof param.x)
assert("number"===typeof param.y)
assert("string"===typeof tooltip)
var clip_pause=spriteClipped()
if(clip_pause)spriteClipPause()
var spuid=sprites.panel.uidata
var pixel_scale=param.pixel_scale||tooltip_panel_pixel_scale
var tooltip_w=param.tooltip_width||tooltip_width
var z=param.z||Z.TOOLTIP
var tooltip_y0=param.y
var eff_tooltip_pad_left=param.tooltip_pad||(spuid.padh&&spuid.padh[0])*pixel_scale||tooltip_pad
var eff_tooltip_pad_right=param.tooltip_pad||(spuid.padh&&spuid.padh[2])*pixel_scale||tooltip_pad
var eff_tooltip_pad_top=param.tooltip_pad||(spuid.padv&&spuid.padv[0])*pixel_scale||tooltip_pad
var eff_tooltip_pad_bottom=param.tooltip_pad||(spuid.padv&&spuid.padv[2])*pixel_scale||tooltip_pad
var w=tooltip_w-eff_tooltip_pad_left-eff_tooltip_pad_right
var dims
if(false!==param.tooltip_markdown)dims=markdownAuto({font_style:font_style_modal,w:w,align:ALIGN.HWRAP,text_height:ui_style_current.text_height,text:tooltip,no_draw:true})
else dims=font.dims(font_style_modal,w,0,ui_style_current.text_height,tooltip)
var above=param.tooltip_above
if(!above&&param.tooltip_auto_above_offset)above=tooltip_y0+dims.h+eff_tooltip_pad_top+eff_tooltip_pad_bottom>camera2d.y1()
var x=param.x
var eff_tooltip_w=dims.w+eff_tooltip_pad_left+eff_tooltip_pad_right
var right=param.tooltip_right
var center=param.tooltip_center
if(right&&param.tooltip_auto_right_offset)x+=param.tooltip_auto_right_offset-eff_tooltip_w
else if(center&&param.tooltip_auto_right_offset)x+=(param.tooltip_auto_right_offset-eff_tooltip_w)/2
if(x+eff_tooltip_w>camera2d.x1())x=camera2d.x1()-eff_tooltip_w
if(above)tooltip_y0-=dims.h+eff_tooltip_pad_top+eff_tooltip_pad_bottom+(param.tooltip_auto_above_offset||0)
var y=tooltip_y0+eff_tooltip_pad_top
if(false===param.tooltip_markdown)y+=font.drawSizedWrapped(font_style_modal,x+eff_tooltip_pad_left,y+tooltip_text_offs,z+1,w,0,ui_style_current.text_height,tooltip)
else{var mddims=markdownAuto({font_style:font_style_modal,x:x+eff_tooltip_pad_left,y:y+tooltip_text_offs,z:z+1,w:w,align:ALIGN.HWRAP,text_height:ui_style_current.text_height,text:tooltip})
eff_tooltip_w=max(mddims.w+eff_tooltip_pad_left+eff_tooltip_pad_right,eff_tooltip_w)
y+=mddims.h}panel({x:x,y:tooltip_y0,z:z,w:eff_tooltip_w,h:(y+=eff_tooltip_pad_bottom)-tooltip_y0,pixel_scale:pixel_scale,eat_clicks:false})
if(clip_pause)spriteClipResume()}function checkHooks(param,click){if(param.hook)for(var ii=0;ii<hooks.length;++ii){if(click)hooks[ii].click(param)
hooks[ii].draw(param)}}function drawTooltipBox(param){var tooltip=param.tooltip
if("function"===typeof tooltip)if(!(tooltip=tooltip(param)))return
drawTooltip({x:param.x,y:param.y+param.h+2,tooltip_auto_above_offset:param.h+4,tooltip_above:param.tooltip_above,tooltip_auto_right_offset:param.w,tooltip_right:param.tooltip_right,tooltip_center:param.tooltip_center,tooltip:tooltip,tooltip_width:param.tooltip_width,tooltip_markdown:param.tooltip_markdown})}function progressBar(param){drawHBox(param,sprites.progress_bar_trough,param.color_trough||param.color||unit_vec)
var progress=clamp(param.progress,0,1)
drawHBox({x:param.x+(param.centered?param.w*(1-progress)*.5:0),y:param.y,z:(param.z||Z.UI)+Z_MIN_INC,w:param.w*progress,h:param.h,no_min_width:true},sprites.progress_bar,param.color||unit_vec)
if(param.tooltip)spot({x:param.x,y:param.y,w:param.w,h:param.h,tooltip:param.tooltip,def:SPOT_DEFAULT_LABEL})}var button_y_offs={regular:0,down:0,rollover:0,disabled:0}
function buttonSetDefaultYOffs(y_offs){merge(button_y_offs,y_offs)}var SPOT_STATE_TO_UI_BUTTON_STATE=((_SPOT_STATE_TO_UI_BUT={})[SPOT_STATE_REGULAR]="regular",_SPOT_STATE_TO_UI_BUT[SPOT_STATE_DOWN]="down",_SPOT_STATE_TO_UI_BUT[SPOT_STATE_FOCUSED]="rollover",_SPOT_STATE_TO_UI_BUT[SPOT_STATE_DISABLED]="disabled",_SPOT_STATE_TO_UI_BUT)
var UISPOT_BUTTON_DISABLED=_extends({},SPOT_DEFAULT_BUTTON,{disabled:true,disabled_focusable:false,sound_rollover:null})
function buttonShared(param){profilerStart("buttonShared")
param.z=param.z||Z.UI
if(param.rollover_quiet)param.sound_rollover=null
var spot_ret
if(param.draw_only&&!param.draw_only_mouseover)spot_ret={ret:false,state:"regular",focused:false}
else{if(param.draw_only){assert(!param.def||param.def===SPOT_DEFAULT_BUTTON_DRAW_ONLY)
param.def=SPOT_DEFAULT_BUTTON_DRAW_ONLY}else if(param.disabled&&!param.disabled_focusable)param.def=param.def||UISPOT_BUTTON_DISABLED
else param.def=param.def||SPOT_DEFAULT_BUTTON
if(param.sound)param.sound_button=param.sound;(spot_ret=spot(param)).state=SPOT_STATE_TO_UI_BUTTON_STATE[spot_ret.spot_state]
if(spot_ret.ret){exports.button_click=button_click=spot_ret
button_click.was_double_click=spot_ret.double_click}}exports.button_focused=button_focused=exports.button_mouseover=button_mouseover=spot_ret.focused
param.z+=param.z_bias&&param.z_bias[spot_ret.state]||0
exports.button_last_spot_ret=button_last_spot_ret=spot_ret
profilerStop("buttonShared")
return spot_ret}var button_last_color
exports.button_last_color=button_last_color
function buttonBackgroundDraw(param,state){profilerStart("buttonBackgroundDraw")
var colors=param.colors||color_button
var color=exports.button_last_color=button_last_color=param.color||colors[state]
if(!param.no_bg){var base_name=param.base_name||(param.w/param.h<1.5&&sprites.squarebutton?"squarebutton":"button")
var sprite=sprites[base_name+"_"+state]
if(sprite)color=colors.regular
else sprite=sprites[base_name]
if(9===sprite.uidata.rects.length)drawBox(param,sprite,param.pixel_scale||1,color)
else drawHBox(param,sprite,color)}profilerStop("buttonBackgroundDraw")}function buttonSpotBackgroundDraw(param,spot_state){profilerStart("buttonSpotBackgroundDraw")
buttonBackgroundDraw(param,SPOT_STATE_TO_UI_BUTTON_STATE[spot_state])
profilerStop("buttonSpotBackgroundDraw")}function buttonTextDraw(param,state,focused){profilerStart("buttonTextDraw")
buttonBackgroundDraw(param,state)
var hpad=min(.25*param.font_height,.1*param.w)
var yoffs=param.yoffs&&void 0!==param.yoffs[state]?param.yoffs[state]:button_y_offs[state]
var disabled="disabled"===state
var font_use=param.font||font
var font_style=disabled?param.font_style_disabled||font_style_disabled:focused?param.font_style_focused||font_style_focused:param.font_style_normal||font_style_normal
var x=param.x+hpad
var y=param.y+yoffs
var z=param.z+.1
var w=param.w-2*hpad
var align=param.align||glov_font.ALIGN.HVCENTERFIT
var text_height=param.font_height
if(param.markdown)markdownAuto({font:font_use,font_style:font_style,x:x,y:y,z:z,w:w,h:param.h,align:align,text_height:text_height,text:param.text})
else font_use.drawSizedAligned(font_style,x,y,z,text_height,align,w,param.h,param.text)
profilerStop("buttonTextDraw")}function buttonText(param){profilerStart("buttonText")
param.text=getStringFromLocalizable(param.text)
assert("number"===typeof param.x)
assert("number"===typeof param.y)
assert("string"===typeof param.text)
param.w=param.w||ui_style_current.button_width
param.h=param.h||ui_style_current.button_height
param.font_height=param.font_height||(param.style||ui_style_current).text_height
var spot_ret=buttonShared(param)
var ret=spot_ret.ret
buttonTextDraw(param,spot_ret.state,spot_ret.focused)
profilerStop("buttonText")
return ret?spot_ret:null}function buttonImageDraw(param,state,focused){profilerStart("buttonImageDraw")
var uvs=param.img_rect
var img=param.imgs&&param.imgs[state]||param.img
if("number"===typeof param.frame)uvs=img.uidata.rects[param.frame]
buttonBackgroundDraw(param,state)
var color=button_last_color
var img_origin=img.origin
var img_w=img.size[0]
var img_h=img.size[1]
var aspect=img_w/img_h
if("number"===typeof param.frame)aspect=img.uidata.aspect?img.uidata.aspect[param.frame]:1
var largest_w_horiz=param.w*param.shrink
var largest_w_vert=param.h*param.shrink*aspect
img_w=min(largest_w_horiz,largest_w_vert)
var yoffs=param.yoffs&&void 0!==param.yoffs[state]?param.yoffs[state]:button_y_offs[state]
var pad_top=(param.h-(img_h=img_w/aspect))/2
var draw_param={x:param.x+(param.left_align?pad_top:(param.w-img_w)/2)+img_origin[0]*img_w,y:param.y+pad_top+img_origin[1]*img_h+yoffs,z:param.z+(param.z_inc||Z_MIN_INC),color:param.img_color||param.color1&&param.color||color,color1:param.color1,w:img_w/img.size[0],h:img_h/img.size[1],uvs:uvs,rot:param.rotation}
if(param.flip){var x=draw_param.x,w=draw_param.w
draw_param.x=x+w
draw_param.w=-w}if(param.color1)img.drawDualTint(draw_param)
else img.draw(draw_param)
profilerStop("buttonImageDraw")}function buttonImage(param){profilerStart("buttonImage")
assert("number"===typeof param.x)
assert("number"===typeof param.y)
assert(param.imgs||param.img&&param.img.draw)
param.z=param.z||Z.UI
param.w=param.w||ui_style_current.button_height
param.h=param.h||param.w||ui_style_current.button_height
param.shrink=param.shrink||.75
var spot_ret=buttonShared(param)
var ret=spot_ret.ret
buttonImageDraw(param,spot_ret.state,spot_ret.focused)
profilerStop("buttonImage")
return ret?spot_ret:null}function button(param){if(param.img&&!param.text)return buttonImage(param)
else if(param.text&&!param.img)return buttonText(param)
profilerStart("button")
assert("number"===typeof param.x)
assert("number"===typeof param.y)
assert(param.img&&param.img.draw)
param.z=param.z||Z.UI
param.h=param.h||ui_style_current.button_height
param.w=param.w||ui_style_current.button_width
param.shrink=param.shrink||.75
param.left_align=true
param.font_height=param.font_height||(param.style||ui_style_current).text_height
var spot_ret=buttonShared(param)
var ret=spot_ret.ret,state=spot_ret.state,focused=spot_ret.focused
buttonImageDraw(param,state,focused)
var saved_no_bg=param.no_bg
var saved_w=param.w
var saved_x=param.x
param.no_bg=true
var img_size=param.h*param.shrink
var img_pad=param.h*(1-param.shrink)/2
param.x+=img_pad+img_size
param.w-=img_pad+img_size
buttonTextDraw(param,state,focused)
param.no_bg=saved_no_bg
param.w=saved_w
param.x=saved_x
profilerStop("button")
return ret?spot_ret:null}function print(font_style,x,y,z,text){return font.drawSized(font_style,x,y,z,ui_style_current.text_height,text)}function label(param){profilerStart("label")
var font_style=param.font_style,label_font_style_focused=param.font_style_focused,x=param.x,y=param.y,align=param.align,w=param.w,h=param.h,text=param.text,tooltip=param.tooltip,tooltip_markdown=param.tooltip_markdown,tooltip_above=param.tooltip_above,tooltip_right=param.tooltip_right,img=param.img,frame=param.frame,img_color=param.img_color,img_color_focused=param.img_color_focused
if(param.style)assert(!param.style.color)
var z=param.z||Z.UI
assert(isFinite(x))
assert(isFinite(y))
var style=param.style||ui_style_current
var use_font=param.font||font
var size=param.size||style.text_height
if(img);else{assert(void 0!==text)
text=getStringFromLocalizable(text)
if(tooltip){if(!w){w=use_font.getStringWidth(font_style,size,text)
if(align&ALIGN.HRIGHT)x-=w
else if(align&ALIGN.HCENTER)x-=w/2}if(!h){h=size
if(align&ALIGN.VBOTTOM)y-=h
else if(align&ALIGN.VCENTER)y-=h/2}}}if(tooltip){assert(isFinite(w))
assert(isFinite(h))
if(spot({x:x,y:y,w:w,h:h,tooltip:tooltip,tooltip_markdown:tooltip_markdown,tooltip_width:param.tooltip_width,tooltip_above:tooltip_above,tooltip_right:tooltip_right||param.align&ALIGN.HRIGHT,tooltip_center:param.align&ALIGN.HCENTER,def:SPOT_DEFAULT_LABEL}).focused&&spotPadMode()){var need_focus_indicator=false
if(img)if(img_color_focused)img_color=img_color_focused
else need_focus_indicator=true
else if(label_font_style_focused)font_style=label_font_style_focused
else need_focus_indicator=true
if(need_focus_indicator)drawElipse(x-.25*w,y-.25*h,x+1.25*w,y+1.25*h,z-.001,.5,unit_vec)}}var text_w=0
if(img)img.draw({x:x,y:y,z:z,w:w,h:h,color:img_color,frame:frame})
else if(text)if(align)text_w=use_font.drawSizedAligned(font_style,x,y,z,size,align,w,h,text)
else text_w=use_font.drawSized(font_style,x,y,z,size,text)
profilerStop("label")
return w||text_w}function checkbox(value,param){profilerStart("checkbox")
param.text=getStringFromLocalizable(param.text)
assert("number"===typeof param.x)
assert("number"===typeof param.y)
param.z=param.z||Z.UI
var text=param.text
param.h=param.h||ui_style_current.button_height
param.w=param.w||(text?ui_style_current.button_width:param.h)
param.font_height=param.font_height||(param.style||ui_style_current).text_height
param.align=param.align||ALIGN.VCENTER|ALIGN.HLEFT|ALIGN.HFIT
if(buttonText(_extends({},param,{no_bg:true,text:"",tooltip:param.tooltip})))value=!value
var spot_ret=button_last_spot_ret
var focused=spot_ret.focused
var base_name_checked=param.base_name_checked||"checked"
var base_name_unchecked=param.base_name_checked||"unchecked"
buttonSpotBackgroundDraw(_extends({},param,{w:param.h,base_name:value?base_name_checked:base_name_unchecked}),spot_ret.spot_state)
if(text){var font_use=param.font||font
var font_style=param.disabled?param.font_style_disabled||font_style_disabled:focused?param.font_style_focused||font_style_focused:param.font_style_normal||font_style_normal
text=getStringFromLocalizable(text)
var text_height=param.font_height
var xoffs=param.h+font_use.getCharacterWidth(font_style,text_height,32)
var x=param.x+xoffs
var y=param.y
var z=param.z+.1
var w=param.w-xoffs
var h=param.h
var align=param.align
if(param.markdown)markdownAuto({font:font_use,font_style:font_style,x:x,y:y,z:z,w:w,h:h,align:align,text_height:text_height,text:text})
else font_use.drawSizedAligned(font_style,x,y,z,text_height,align,w,h,text)}profilerStop("checkbox")
return value}function modalDialog(param){param.title=getStringFromLocalizable(param.title)
param.text=""+(getStringFromLocalizable(param.text)||"")
assert(!param.title||"string"===typeof param.title)
assert(!param.text||"string"===typeof param.text)
assert(!param.buttons||"object"===typeof param.buttons)
if(param.buttons)for(var key in param.buttons)if("object"!==typeof param.buttons[key])param.buttons[key]={cb:param.buttons[key]}
modal_dialog=param}function modalDialogClear(){modal_dialog=null}var dom_requirement=vec2(24,24)
var virtual_size=vec2()
function modalDialogRun(){camera2d.domDeltaToVirtual(virtual_size,dom_requirement)
var fullscreen_mode=false
var eff_font_height=modal_dialog.font_height||(modal_dialog.style||ui_style_current).text_height
var eff_button_height=ui_style_current.button_height
var pad=modal_pad
var vpad=.5*modal_pad
var general_scale=1
var exit_lock=true
var num_lines
if(!modal_dialog.no_fullscreen_zoom&&virtual_size[0]>.05*camera2d.h()&&camera2d.w()>2*camera2d.h()){fullscreen_mode=true
eff_button_height=eff_font_height
vpad=pad=4
var old_h=camera2d.h()
camera2d.push()
for(num_lines=1;;num_lines++){camera2d.setAspectFixed2(1,eff_font_height*(modal_title_scale+1+num_lines)+4.5*pad)
general_scale=camera2d.h()/old_h
if(!modal_dialog.text)break
var _text_w=camera2d.x1()-camera2d.x0()-2*pad
if(font.numLines(font_style_modal,_text_w,0,eff_font_height,modal_dialog.text)<=num_lines)break}}var _modal_dialog=modal_dialog,buttons=_modal_dialog.buttons,click_anywhere=_modal_dialog.click_anywhere
var keys=Object.keys(buttons||{})
var game_width=camera2d.x1()-camera2d.x0()
var eff_modal_width=fullscreen_mode?game_width:modal_dialog.width||modal_width
var eff_button_width=modal_dialog.button_width||modal_button_width
eff_button_width=min(eff_button_width,2*eff_modal_width/3/keys.length)
var text_w=eff_modal_width-2*pad
var x0=camera2d.x0()+round((game_width-eff_modal_width)/2)
var x=x0+pad
var y0=fullscreen_mode?0:modal_dialog.y0||modal_y0
var y=round(y0+pad)
if(modal_dialog.title){if(fullscreen_mode){title_font.drawSizedAligned(font_style_modal,x,y,Z.MODAL,eff_font_height*modal_title_scale,glov_font.ALIGN.HFIT,text_w,0,modal_dialog.title)
y+=eff_font_height*modal_title_scale}else y+=title_font.drawSizedWrapped(font_style_modal,x,y,Z.MODAL,text_w,0,eff_font_height*modal_title_scale,modal_dialog.title)
y=round(y+1.5*vpad)}if(modal_dialog.text||fullscreen_mode){if(fullscreen_mode){if(modal_dialog.text)font.drawSizedAligned(font_style_modal,x,y,Z.MODAL,eff_font_height,glov_font.ALIGN.HWRAP,text_w,0,modal_dialog.text)
y+=eff_font_height*num_lines}else y+=font.drawSizedWrapped(font_style_modal,x,y,Z.MODAL,text_w,0,eff_font_height,modal_dialog.text)
y=round(y+vpad)}var panel_color=modal_dialog.color||null
var tick_key
if(modal_dialog.tick){var avail_width=eff_modal_width-2*pad
if(fullscreen_mode)avail_width-=(pad+eff_button_width)*keys.length
var param={x0:x0,y0:y0,x:x,y:y,modal_width:eff_modal_width,avail_width:avail_width,font_height:eff_font_height,fullscreen_mode:fullscreen_mode}
tick_key=modal_dialog.tick(param)
y=param.y}x=x0+eff_modal_width-(pad+eff_button_width)*keys.length
var did_button=-1
for(var ii=0;ii<keys.length;++ii){var key=keys[ii]
var key_lower=key.toLowerCase()
var cur_button=buttons[key]=buttons[key]||{}
var eff_button_keys=button_keys[key_lower]
var pressed=0
if(eff_button_keys){for(var jj=0;jj<eff_button_keys.key.length;++jj){pressed+=glov_input.keyUpEdge(eff_button_keys.key[jj],cur_button.in_event_cb)
if(eff_button_keys.key[jj]===tick_key)pressed++}for(var _jj=0;_jj<eff_button_keys.pad.length;++_jj)pressed+=glov_input.padButtonUpEdge(eff_button_keys.pad[_jj])}if(click_anywhere&&0===ii&&glov_input.click())++pressed
if(pressed)did_button=ii
var but_label=cur_button.label||buttons_default_labels[key_lower]||key
if(button(defaults({key:"md_"+key,x:x,y:y,z:Z.MODAL,w:eff_button_width,h:eff_button_height,text:but_label,auto_focus:0===ii,focus_steal:1===keys.length&&!modal_dialog.tick},cur_button)))did_button=ii
x=round(x+pad+eff_button_width)}if(-1===did_button)for(var _ii=0;_ii<keys.length;++_ii){var _key=keys[_ii]
var _eff_button_keys=button_keys[_key.toLowerCase()]
if(_eff_button_keys&&_eff_button_keys.low_key)for(var _jj2=0;_jj2<_eff_button_keys.low_key.length;++_jj2)if(glov_input.keyUpEdge(_eff_button_keys.low_key[_jj2],buttons[_key].in_event_cb)||_eff_button_keys.low_key[_jj2]===tick_key)did_button=_ii}if(-1!==did_button){var _key2=keys[did_button]
playUISound("button_click")
modal_dialog=null
if(buttons[_key2].cb)buttons[_key2].cb()
exit_lock=false}if(keys.length>0)y+=eff_button_height
y=round(y+vpad+pad)
panel({x:x0,y:y0,z:Z.MODAL-1,w:eff_modal_width,h:(fullscreen_mode?camera2d.y1():y)-y0,pixel_scale:panel_pixel_scale*general_scale,color:panel_color})
if(glov_input.pointerLocked()&&exit_lock)glov_input.pointerLockExit()
glov_input.eatAllInput()
if(fullscreen_mode)camera2d.pop()}function modalTextEntry(param){var eb=editBoxCreate({initial_focus:true,spellcheck:false,initial_select:true,text:param.edit_text,multiline:param.multiline,enforce_multiline:param.enforce_multiline,max_len:param.max_len,max_visual_size:param.max_visual_size,esc_clears:false,auto_unfocus:true})
var buttons={}
for(var key in param.buttons){var cb=param.buttons[key]
if(null!==cb&&"object"===typeof cb&&"cb"in cb)cb=param.buttons[key].cb
if("function"===typeof cb)cb=function(old_fn){return function(){old_fn(eb.getText())}}(cb)
buttons[key]=defaults({cb:cb},param.buttons[key])}param.buttons=buttons
param.text=""+(param.text||"")
var old_tick=param.tick
param.tick=function(params){var eb_ret=eb.run({x:params.x,y:params.y,w:params.avail_width||param.edit_w,font_height:params.font_height})
if(!params.fullscreen_mode)params.y+=params.font_height*(param.multiline||1)+modal_pad
var ret
if(eb_ret===eb.SUBMIT)ret=KEYS.O
else if(eb_ret===eb.CANCEL)ret=KEYS.ESC
if(old_tick)ret=old_tick(params)||ret
return ret}
modalDialog(param)}function createEditBox(param){return editBoxCreate(param)}var pp_bad_frames=0
function isMenuUp(){return modal_dialog||menu_up}function releaseOldUIElemData(){for(var type in ui_elem_data){var by_type=ui_elem_data[type]
var any=false
var keys=Object.keys(by_type)
for(var ii=0;ii<keys.length;++ii){var key=keys[ii]
if(by_type[key].frame_index<glov_engine.frame_index-1)delete by_type[key]
else any=true}if(!any)delete ui_elem_data[type]}}function uiTick(dt){per_frame_dom_alloc[glov_engine.frame_index%per_frame_dom_alloc.length]=0
releaseOldUIElemData()
editBoxTick()
linkTick()
dom_tab_index=dom_elems_issued=0
var pp_this_frame=false
if(modal_dialog||menu_up){var params=menu_fade_params
if(!menu_up)params=menu_fade_params_default
menu_up_time+=dt
if(glov_engine.postprocessing&&!glov_engine.defines.NOPP){var factor=min(menu_up_time/500,1)
if(factor<1)glov_engine.renderNeeded()
var blur_factor=lerp(factor,params.blur[0],params.blur[1])
if(blur_factor)effectsQueue(params.z-2,doBlurEffect.bind(null,blur_factor))
var saturation=lerp(factor,params.saturation[0],params.saturation[1])
var brightness=lerp(factor,params.brightness[0],params.brightness[1])
if(1!==saturation||1!==brightness)effectsQueue(params.z-1,doDesaturateEffect.bind(null,saturation,brightness))
pp_this_frame=true}else sprites.white.draw({x:camera2d.x0Real(),y:camera2d.y0Real(),z:params.z-2,color:params.fallback_darken,w:camera2d.wReal(),h:camera2d.hReal()})}else menu_up_time=0
exports.menu_up=menu_up=false
if(!glov_engine.is_loading&&glov_engine.getFrameDtActual()>50&&pp_this_frame){if((pp_bad_frames=(pp_bad_frames||0)+1)>=6)glov_engine.postprocessingAllow(false)}else if(pp_bad_frames)pp_bad_frames=0
spotTopOfFrame()
uiStyleTopOfFrame()
if(modal_dialog)modalDialogRun()}function uiEndFrame(){spotEndOfFrame()
if(glov_input.click({x:-Infinity,y:-Infinity,w:Infinity,h:Infinity}))spotUnfocus()
while(dom_elems_issued<dom_elems.length){var elem=dom_elems.pop()
dynamic_text_elem.removeChild(elem)}}function cleanupDOMElems(){while(dom_elems.length){var elem=dom_elems.pop()
dynamic_text_elem.removeChild(elem)}}function menuUp(param){merge(menu_fade_params,menu_fade_params_default)
if(param)merge(menu_fade_params,param)
exports.menu_up=menu_up=true
glov_input.eatAllInput()}function copyTextToClipboard(text){var textArea=document.createElement("textarea")
textArea.style.position="fixed"
textArea.style.top=0
textArea.style.left=0
textArea.style.width="2em"
textArea.style.height="2em"
textArea.style.border="none"
textArea.style.outline="none"
textArea.style.boxShadow="none"
textArea.style.background="transparent"
textArea.value=text
document.body.appendChild(textArea)
textArea.focus()
textArea.select()
var ret=false
try{ret=document.execCommand("copy")}catch(err){}document.body.removeChild(textArea)
return ret}function provideUserString(title,str,alt_buttons){var copy_success=copyTextToClipboard(str)
modalTextEntry({edit_w:400,edit_text:str.replace(/[\n\r]/g," "),title:title,text:copy_success?default_copy_success_msg:default_copy_failure_msg,buttons:_extends({},alt_buttons||{},{ok:null})})}var draw_rect_param={}
function drawRect(x0,y0,x1,y1,z,color){var mx=min(x0,x1)
var my=min(y0,y1)
var Mx=max(x0,x1)
var My=max(y0,y1)
draw_rect_param.x=mx
draw_rect_param.y=my
draw_rect_param.z=z
draw_rect_param.w=Mx-mx
draw_rect_param.h=My-my
draw_rect_param.color=color
return sprites.white.draw(draw_rect_param)}function drawRect2(param){return sprites.white.draw(param)}var draw_rect_4color_param={}
function drawRect4Color(x0,y0,x1,y1,z,color_ul,color_ur,color_ll,color_lr){var mx=min(x0,x1)
var my=min(y0,y1)
var Mx=max(x0,x1)
var My=max(y0,y1)
draw_rect_4color_param.x=mx
draw_rect_4color_param.y=my
draw_rect_4color_param.z=z
draw_rect_4color_param.w=Mx-mx
draw_rect_4color_param.h=My-my
draw_rect_4color_param.color_ul=color_ul
draw_rect_4color_param.color_ll=color_ll
draw_rect_4color_param.color_lr=color_lr
draw_rect_4color_param.color_ur=color_ur
return sprites.white.draw4Color(draw_rect_4color_param)}function spreadTechParams(spread){spread=min(max(spread,0),.99)
var tech_params={param0:vec4(0,0,0,0)}
tech_params.param0[0]=1/(1-spread)
tech_params.param0[1]=-.5*tech_params.param0[0]+.5
return tech_params}var temp_color=vec4()
function premulAlphaColor(color){temp_color[0]=color[0]*color[3]
temp_color[1]=color[1]*color[3]
temp_color[2]=color[2]*color[3]
temp_color[3]=color[3]
return temp_color}function premulAlphaAdditiveColor(color){temp_color[0]=color[0]*color[3]
temp_color[1]=color[1]*color[3]
temp_color[2]=color[2]*color[3]
temp_color[3]=0
return temp_color}function drawElipseInternal(sprite,x0,y0,x1,y1,z,spread,tu0,tv0,tu1,tv1,color,blend){if(!glov_engine.defines.NOPREMUL)if(!blend){blend=BLEND_PREMULALPHA
color=premulAlphaColor(color)}else if(blend===BLEND_ADDITIVE){blend=BLEND_PREMULALPHA
color=premulAlphaAdditiveColor(color)}spriteQueueRaw(sprite.texs,x0,y0,z,x1-x0,y1-y0,tu0,tv0,tu1,tv1,color,glov_font.font_shaders.font_aa,spreadTechParams(spread),blend)}function drawCircleInternal(sprite,x,y,z,r,spread,tu0,tv0,tu1,tv1,color,blend){drawElipseInternal(sprite,x-2*r+4*r*tu0,y-2*r+4*r*tv0,x-2*r+4*r*tu1,y-2*r+4*r*tv1,z,spread,tu0,tv0,tu1,tv1,color,blend)}function initCircleSprite(){var CIRCLE_SIZE=32
var data=new Uint8Array(CIRCLE_SIZE*CIRCLE_SIZE)
var midp=(CIRCLE_SIZE-1)/2
for(var i=0;i<CIRCLE_SIZE;i++)for(var j=0;j<CIRCLE_SIZE;j++){var d=sqrt((i-midp)*(i-midp)+(j-midp)*(j-midp))/midp
var v=clamp(1-d,0,1)
data[i+j*CIRCLE_SIZE]=255*v}sprites.circle=spriteCreate({url:"circle",width:CIRCLE_SIZE,height:CIRCLE_SIZE,format:TEXTURE_FORMAT.R8,data:data,filter_min:gl.LINEAR,filter_mag:gl.LINEAR,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE,origin:vec2(.5,.5)})}function drawElipse(x0,y0,x1,y1,z,spread,color,blend){if(!sprites.circle)initCircleSprite()
drawElipseInternal(sprites.circle,x0,y0,x1,y1,z,spread,0,0,1,1,color,blend)}function drawCircle(x,y,z,r,spread,color,blend){if(!sprites.circle)initCircleSprite()
drawCircleInternal(sprites.circle,x,y,z,r,spread,0,0,1,1,color,blend)}function drawHollowCircle(x,y,z,r,spread,color,blend){if(!sprites.hollow_circle){var CIRCLE_SIZE=128
var LINE_W=2
var data=new Uint8Array(CIRCLE_SIZE*CIRCLE_SIZE)
var midp=(CIRCLE_SIZE-1)/2
for(var i=0;i<CIRCLE_SIZE;i++)for(var j=0;j<CIRCLE_SIZE;j++){var d=sqrt((i-midp)*(i-midp)+(j-midp)*(j-midp))/midp
var v=clamp(1-d,0,1)
if(v>.5)v=1-v
v+=LINE_W/CIRCLE_SIZE
data[i+j*CIRCLE_SIZE]=255*v}sprites.hollow_circle=spriteCreate({url:"hollow_circle",width:CIRCLE_SIZE,height:CIRCLE_SIZE,format:TEXTURE_FORMAT.R8,data:data,filter_min:gl.LINEAR,filter_mag:gl.LINEAR,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE,origin:vec2(.5,.5)})}drawCircleInternal(sprites.hollow_circle,x,y,z,r,spread,0,0,1,1,color,blend)}var LINE_TEX_W=16
var LINE_TEX_H=16
var LINE_MIDP=floor((LINE_TEX_H-1)/2)
var LINE_V0=.5/LINE_TEX_H
var LINE_V1=1-1.5/LINE_TEX_H
var LINE_U0=.5/LINE_TEX_W
var LINE_U1=(LINE_MIDP+.5)/LINE_TEX_W
var LINE_U2=1-LINE_U1
var LINE_U3=1-.5/LINE_TEX_W
var line_last_shader_param={param0:[0,0]}
function drawLine(x0,y0,x1,y1,z,w,precise,color,mode){if(void 0===mode)mode=default_line_mode
var blend
if(!glov_engine.defines.NOPREMUL){blend=BLEND_PREMULALPHA
color=premulAlphaColor(color)}var tex_key=mode&LINE_CAP_ROUND?"line3":"line2"
if(!sprites[tex_key]){var data=new Uint8Array(LINE_TEX_W*LINE_TEX_H)
var i1=LINE_MIDP
var i2=LINE_TEX_W-1-LINE_MIDP
if("line2"===tex_key)for(var j=0;j<LINE_TEX_H;j++){var d=abs((j-LINE_MIDP)/LINE_MIDP)
var j_value=round(255*clamp(1-d,0,1))
for(var i=0;i<LINE_TEX_W;i++){var i_value=round(255*clamp(d=i<i1?i/LINE_MIDP:i>=i2?1-(i-i2)/LINE_MIDP:1,0,1))
data[i+j*LINE_TEX_W]=min(i_value,j_value)}}else for(var _j=0;_j<LINE_TEX_H;_j++){var _d=abs((_j-LINE_MIDP)/LINE_MIDP)
for(var _i4=0;_i4<LINE_TEX_W;_i4++){var id=_i4<i1?1-_i4/LINE_MIDP:_i4>=i2?(_i4-i2)/LINE_MIDP:0
var dv=sqrt(id*id+_d*_d)
dv=clamp(1-dv,0,1)
data[_i4+_j*LINE_TEX_W]=round(255*dv)}}sprites[tex_key]=spriteCreate({url:tex_key,width:LINE_TEX_W,height:LINE_TEX_H,format:TEXTURE_FORMAT.R8,data:data,filter_min:gl.LINEAR,filter_mag:gl.LINEAR,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE})}var texs=sprites[tex_key].texs
var virtual_to_pixels=.5*(camera2d.data[4]+camera2d.data[5])
var w_in_pixels=w*virtual_to_pixels
var draw_w_pixels=w_in_pixels+4
var half_draw_w_pixels=.5*draw_w_pixels
var draw_w=half_draw_w_pixels*(1/virtual_to_pixels)
var dx=x1-x0
var dy=y1-y0
var length=sqrt(dx*dx+dy*dy)
var tangx=-(dy/=length)*draw_w
var tangy=(dx/=length)*draw_w
if(mode&LINE_ALIGN){var y0_real=(y0-camera2d.data[1])*camera2d.data[5]
var yoffs=(round(y0_real-half_draw_w_pixels)+half_draw_w_pixels-y0_real)/camera2d.data[5]
y0+=yoffs
y1+=yoffs
var x0_real=(x0-camera2d.data[0])*camera2d.data[4]
var xoffs=(round(x0_real-half_draw_w_pixels)+half_draw_w_pixels-x0_real)/camera2d.data[4]
x0+=xoffs
x1+=xoffs}var step_start=1-(w_in_pixels+1)/draw_w_pixels
var step_end=step_start+2/draw_w_pixels
var A=1/((step_end=1+precise*(step_end-1))-step_start)
var B=-step_start*A
if(mode&LINE_NO_AA){A*=512
B=512*B-255.5}var shader_param
if(line_last_shader_param.param0[0]!==A||line_last_shader_param.param0[1]!==B)line_last_shader_param={param0:[A,B]}
shader_param=line_last_shader_param
spriteQueueRaw4(texs,x1+tangx,y1+tangy,x1-tangx,y1-tangy,x0-tangx,y0-tangy,x0+tangx,y0+tangy,z,LINE_U1,LINE_V0,LINE_U2,LINE_V1,color,glov_font.font_shaders.font_aa,shader_param,blend)
if(mode&(LINE_CAP_ROUND|LINE_CAP_SQUARE)){var nx=dx*w/2
var ny=dy*w/2
spriteQueueRaw4(texs,x1-tangx,y1-tangy,x1+tangx,y1+tangy,x1+tangx+nx,y1+tangy+ny,x1-tangx+nx,y1-tangy+ny,z,LINE_U2,LINE_V1,LINE_U3,LINE_V0,color,glov_font.font_shaders.font_aa,shader_param,blend)
spriteQueueRaw4(texs,x0-tangx,y0-tangy,x0+tangx,y0+tangy,x0+tangx-nx,y0+tangy-ny,x0-tangx-nx,y0-tangy-ny,z,LINE_U1,LINE_V1,LINE_U0,LINE_V0,color,glov_font.font_shaders.font_aa,shader_param,blend)}}function drawHollowRect(x0,y0,x1,y1,z,w,precise,color,mode){drawLine(x0,y0,x1,y0,z,w,precise,color,mode)
drawLine(x1,y0,x1,y1,z,w,precise,color,mode)
drawLine(x1,y1,x0,y1,z,w,precise,color,mode)
drawLine(x0,y1,x0,y0,z,w,precise,color,mode)}function drawHollowRect2(param){drawHollowRect(param.x,param.y,param.x+param.w,param.y+param.h,param.z||Z.UI,param.line_width||1,param.precise||1,param.color||unit_vec)}function drawCone(x0,y0,x1,y1,z,w0,w1,spread,color){var blend
if(!glov_engine.defines.NOPREMUL){blend=BLEND_PREMULALPHA
color=premulAlphaColor(color)}if(!sprites.cone){var CONE_SIZE=32
var data=new Uint8Array(CONE_SIZE*CONE_SIZE)
var midp=(CONE_SIZE-1)/2
for(var i=0;i<CONE_SIZE;i++)for(var j=0;j<CONE_SIZE;j++){var _dx=0
var _dy=0
var d=0
if(i>midp){_dx=(i-midp)/midp
_dy=abs(j-midp)/midp
d=_dx*sqrt(_dx*_dx+_dy*_dy)}var v=clamp(1-d,0,1)
data[i+j*CONE_SIZE]=255*v}sprites.cone=spriteCreate({url:"cone",width:CONE_SIZE,height:CONE_SIZE,format:TEXTURE_FORMAT.R8,data:data,filter_min:gl.LINEAR,filter_mag:gl.LINEAR,wrap_s:gl.CLAMP_TO_EDGE,wrap_t:gl.CLAMP_TO_EDGE,origin:vec2(.5,.5)})}var dx=x1-x0
var dy=y1-y0
var length=sqrt(dx*dx+dy*dy)
var tangx=-(dy/=length)
var tangy=dx/=length
spriteQueueRaw4(sprites.cone.texs,x0-tangx*w0,y0-tangy*w0,x0+tangx*w0,y0+tangy*w0,x1+tangx*w1,y1+tangy*w1,x1-tangx*w1,y1-tangy*w1,z,0,0,1,1,color,glov_font.font_shaders.font_aa,spreadTechParams(spread),blend)}function setFontHeight(_font_height){uiStyleModify(uiStyleDefault(),{text_height:_font_height})}function uiApplyStyle(style){ui_style_current=style
exports.font_height=style.text_height
exports.button_width=style.button_width
exports.button_height=style.button_height
fontSetDefaultSize(style.text_height)}function setButtonHeight(button_height){exports.panel_pixel_scale=panel_pixel_scale=button_height/sprites.panel.uidata.total_h
scrollAreaSetPixelScale(button_height/sprites.button.uidata.total_h)
uiStyleModify(uiStyleDefault(),{button_height:button_height})}function scaleSizes(scale){var text_height=round(24*scale)
var button_width=round(200*scale)
exports.modal_button_width=modal_button_width=round(button_width/2)
exports.modal_width=modal_width=round(600*scale)
exports.modal_y0=modal_y0=round(200*scale)
exports.modal_title_scale=modal_title_scale=1.2
exports.modal_pad=modal_pad=round(16*scale)
exports.tooltip_width=tooltip_width=round(400*scale)
exports.tooltip_pad=tooltip_pad=round(8*scale)
uiStyleModify(uiStyleDefault(),{text_height:text_height,button_width:button_width})
setButtonHeight(round(32*scale))
exports.tooltip_panel_pixel_scale=tooltip_panel_pixel_scale=panel_pixel_scale}function setPanelPixelScale(scale){exports.tooltip_panel_pixel_scale=tooltip_panel_pixel_scale=exports.panel_pixel_scale=panel_pixel_scale=scale}function setModalSizes(_modal_button_width,width,y0,title_scale,pad){exports.modal_button_width=modal_button_width=_modal_button_width||round(ui_style_current.button_width/2)
exports.modal_width=modal_width=width||600
exports.modal_y0=modal_y0=y0||200
exports.modal_title_scale=modal_title_scale=title_scale||1.2
exports.modal_pad=modal_pad=pad||modal_pad}function setTooltipWidth(_tooltip_width,_tooltip_panel_pixel_scale){exports.tooltip_width=tooltip_width=_tooltip_width
exports.tooltip_panel_pixel_scale=tooltip_panel_pixel_scale=_tooltip_panel_pixel_scale
exports.tooltip_pad=tooltip_pad=round(modal_pad/2*_tooltip_panel_pixel_scale)}function setTooltipTextOffset(_tooltip_text_offs){tooltip_text_offs=_tooltip_text_offs}

},{"../common/util.js":96,"../common/vmath.js":98,"./autoatlas":11,"./camera2d.js":15,"./edit_box.js":19,"./effects.js":20,"./engine.js":21,"./font.js":28,"./input.js":37,"./link.js":39,"./localization.js":41,"./markdown":43,"./mat43.js":46,"./scroll_area.js":58,"./slider.js":63,"./sound.js":65,"./spot.js":66,"./sprites.js":68,"./textures.js":70,"./uistyle.js":73,"assert":undefined}],73:[function(require,module,exports){
"use strict"
exports.uiStyleAlloc=uiStyleAlloc
exports.uiStyleCurrent=uiStyleCurrent
exports.uiStyleDefault=uiStyleDefault
exports.uiStyleModify=uiStyleModify
exports.uiStylePop=uiStylePop
exports.uiStylePush=uiStylePush
exports.uiStyleSetCurrent=uiStyleSetCurrent
exports.uiStyleTopOfFrame=uiStyleTopOfFrame
var assert=require("assert")
var _glovCommonUtil=require("../common/util")
var tail=_glovCommonUtil.tail
var verify=require("../common/verify")
var _ui=require("./ui")
var ui_internal=_ui.internal
var uiApplyStyle=ui_internal.uiApplyStyle
var default_style_params_init={text_height:24,button_width:200,button_height:32}
var ui_style_default
var ui_style_current
var UIStyleImpl=function UIStyleImpl(id_chain){this.id_chain=void 0
this.text_height=void 0
this.button_width=void 0
this.button_height=void 0
this.id_chain=id_chain}
var style_params=Object.create(null)
var style_param_auto_last_idx=0
style_params.default={def:default_style_params_init,deps:[]}
function uiStyleCompute(style){var id_chain=style.id_chain
var text_height
var button_width
var button_height
for(var ii=0;ii<id_chain.length;++ii){var id=id_chain[ii]
var entry=style_params[id]
assert(entry)
var v=entry.def.text_height
if(void 0!==v)if("string"===typeof v){var m=v.match(/^(\d+)%$/)
assert(m)
text_height*=Number(m[1])/100}else{assert.equal(typeof v,"number")
text_height=v}if(void 0!==(v=entry.def.button_width))if("string"===typeof v){var _m=v.match(/^(\d+)%$/)
assert(_m)
button_width*=Number(_m[1])/100}else{assert.equal(typeof v,"number")
button_width=v}if(void 0!==(v=entry.def.button_height))if("string"===typeof v){var _m2=v.match(/^(\d+)%$/)
assert(_m2)
button_height*=Number(_m2[1])/100}else{assert.equal(typeof v,"number")
button_height=v}if(0===ii){assert("number"===typeof text_height)
assert("number"===typeof button_width)
assert("number"===typeof button_height)}}style.text_height=text_height
style.button_width=button_width
style.button_height=button_height}function uiStyleModify(style,params){var id=tail(style.id_chain)
assert(id)
var entry=style_params[id]
assert(entry)
var def=entry.def
for(var key in params){var v=params[key]
if(void 0===v)delete def[key]
else def[key]=v}for(var ii=0;ii<entry.deps.length;++ii){var style_walk=entry.deps[ii]
uiStyleCompute(style_walk)
if(style_walk===ui_style_current)uiApplyStyle(ui_style_current)}}function uiStyleAlloc(){var id_chain=[]
id_chain.push("default")
for(var ii=0;ii<arguments.length;++ii){var v=ii<0||arguments.length<=ii?void 0:arguments[ii]
var id=void 0
if("string"===typeof v)assert(style_params[id=v])
else{id="$"+ ++style_param_auto_last_idx+")"
style_params[id]={def:v,deps:[]}}id_chain.push(id)}var ret=new UIStyleImpl(id_chain)
uiStyleCompute(ret)
for(var _ii=0;_ii<id_chain.length;++_ii){var _id=id_chain[_ii]
style_params[_id].deps.push(ret)}return ret}function uiStyleDefault(){return ui_style_default}function uiStyleCurrent(){return ui_style_current}function uiStyleSetCurrent(style){uiApplyStyle(ui_style_current=style)}uiStyleSetCurrent(ui_style_default=uiStyleAlloc())
var style_stack=[]
function uiStylePush(style){style_stack.push(ui_style_current)
uiStyleSetCurrent(style)}function uiStylePop(){var popped=style_stack.pop()
assert(popped)
uiStyleSetCurrent(popped)}var did_once=false
function uiStyleTopOfFrame(){if(style_stack.length){if(!did_once){did_once=true
verify(!style_stack.length,"Style stack push/pop mismatch")}style_stack.length=0}}

},{"../common/util":96,"../common/verify":97,"./ui":72,"assert":undefined}],74:[function(require,module,exports){
"use strict"
exports.TYPE_STRING=exports.TYPE_SET=void 0
exports.get=get
exports.getLinkURL=getLinkURL
exports.getRouteString=getRouteString
exports.getURLBase=getURLBase
exports.getURLPageBase=getURLPageBase
exports.go=go
exports.goRoute=goRoute
exports.historyDeferUpdate=historyDeferUpdate
exports.onChange=onChange
exports.onURLChange=onURLChange
exports.refreshTitle=refreshTitle
exports.register=register
exports.route=route
exports.routeFixed=routeFixed
exports.set=set
exports.setMulti=setMulti
exports.startup=startup
exports.urlhashFireInitialChanges=urlhashFireInitialChanges
var assert=require("assert")
var _require=require("../common/util.js"),callEach=_require.callEach
var HISTORY_UPDATE_TIME=1e3
var TYPE_SET="set"
exports.TYPE_SET=TYPE_SET
var TYPE_STRING="string"
exports.TYPE_STRING=TYPE_STRING
var params={}
var title_transformer
var page_base=(document.location.href||"").match(/^[^#?]+/)[0]
var url_base=page_base.replace(/[^/]*$/,"")
if(url_base.endsWith("/a/"))url_base=url_base.slice(0,-2)
var on_change=[]
function getURLBase(){return url_base}function getURLPageBase(){return page_base}function getLinkURL(suburl){var mid=""
if(!page_base.endsWith("/")&&suburl&&!suburl.startsWith("?"))mid="?"
var url=""+page_base+mid+suburl
if(url.endsWith("?"))url=url.slice(0,-1)
return url}function onChange(cb){on_change.push(cb)}function cmpNumKeys(a,b){var d=b.keys.length-a.keys.length
if(d)return d
for(var ii=0;ii<a.keys.length;++ii)if(a.keys[ii]<b.keys[ii])return-1
else if(a.keys[ii]>b.keys[ii])return 1
assert(false)
return 0}var route_param_regex=/:(\w+)/g
var routes=[]
function queryString(){var href=String(document.location)
if((href=href.slice(page_base.length)).includes("#"))href=href.slice(0,href.indexOf("#"))
return href}var regex_value=/[^\w]\w+=([^&]+)/
function getValue(query_string,opts){if(opts.routes)for(var ii=0;ii<opts.routes.length;++ii){var r=opts.routes[ii]
var _m=query_string.match(r.regex)
if(_m){if(r.value)return r.value
return _m[1+r.keys.indexOf(opts.key)]}}var m=query_string.match(opts.regex)||[]
if(opts.type===TYPE_SET){var _r={}
for(var _ii=0;_ii<m.length;++_ii){var m2=m[_ii].match(regex_value)
assert(m2)
_r[m2[1]]=1}return _r}else return m[1]||opts.def}var last_history_str=null
function goInternal(query_string,for_init,skip_apply,route_only){var hidden={}
for(var key in params){var opts=params[key]
if(opts.hides)if(for_init?opts.value:getValue(query_string,opts))for(var otherkey in opts.hides)hidden[otherkey]=1}var dirty={}
for(var _key in params){if(hidden[_key])continue
var _opts=params[_key]
var new_value=for_init?_opts.value:getValue(query_string,_opts)
if(_opts.type===TYPE_SET){for(var v in new_value)if(!_opts.value[v]||for_init){_opts.value[v]=1
dirty[_key]=true}if(route_only&&!(_opts.routes||_opts.clear_on_route_change))continue
for(var _v in _opts.value)if(!new_value[_v]){delete _opts.value[_v]
dirty[_key]=true}}else{if(route_only&&!(_opts.routes||_opts.clear_on_route_change)&&!new_value)continue
if(new_value!==_opts.value||for_init){dirty[_key]=true
_opts.value=new_value}}}if(!skip_apply){for(var _key2 in dirty){var _opts2=params[_key2]
if(_opts2.change)_opts2.change(_opts2.value,for_init)}callEach(on_change,for_init)}}var eff_title
function toString(route_only){eff_title=""
var hidden={}
for(var key in params){var opts=params[key]
if(opts.hides&&opts.value)for(var otherkey in opts.hides)hidden[otherkey]=1}var root_value=""
outer:for(var ii=0;ii<routes.length;++ii){var r=routes[ii]
var route_title=""
for(var jj=0;jj<r.keys.length;++jj){var _key3=r.keys[jj]
if(hidden[_key3])continue outer
var _opts3=params[_key3]
if(_opts3.hide_values[_opts3.value])continue outer
if(!route_title&&_opts3.title)route_title=_opts3.title(_opts3.value)}for(var _jj=0;_jj<r.keys.length;++_jj){var _key4=r.keys[_jj]
if(params[_key4].route_only)hidden[_key4]=true}root_value=r.route_string.replace(route_param_regex,function(ignored,key){hidden[key]=true
return String(params[key].value)})
if(!eff_title&&route_title)eff_title=route_title
break}var values=[]
for(var _key5 in params){if(hidden[_key5])continue
var _opts4=params[_key5]
if(_opts4.type===TYPE_SET)for(var v in _opts4.value)values.push(_key5+"="+v)
else if(!_opts4.hide_values[_opts4.value]){values.push(_key5+"="+_opts4.value)
if(!eff_title&&_opts4.title)eff_title=_opts4.title(_opts4.value)}}if(title_transformer)eff_title=title_transformer(eff_title)
eff_title=String(eff_title)
if(route_only)values=[]
return root_value+(values.length?"?":"")+values.join("&")}function refreshTitle(){toString(false)
if(eff_title&&eff_title!==document.title)document.title=eff_title}function periodicRefreshTitle(){profilerStart("periodicRefreshTitle")
refreshTitle()
setTimeout(periodicRefreshTitle,1e3)
profilerStop()}function onPopState(){var query_string=queryString()
goInternal(last_history_str=query_string,false,false,false)
refreshTitle()}var on_url_change
function onURLChange(cb){on_url_change=cb}var history_update_deferred=false
function historyDeferUpdate(defer){history_update_deferred=defer}var last_history_set_time=0
var scheduled=false
var need_push_state=false
function updateHistoryCommit(){profilerStart("updateHistoryCommit")
if(history_update_deferred){setTimeout(updateHistoryCommit,1e3)
return void profilerStop()}scheduled=false
last_history_set_time=Date.now()
var url=getLinkURL(last_history_str)
if(url.endsWith("?"))url=url.slice(0,-1)
try{if(need_push_state){need_push_state=false
window.history.pushState(void 0,eff_title,url)}else window.history.replaceState(void 0,eff_title,url)}catch(e){}if(eff_title)document.title=eff_title
if(on_url_change)on_url_change()
profilerStop()}function updateHistory(new_need_push_state){var new_str=toString(false)
if(last_history_str===new_str)return
need_push_state=need_push_state||new_need_push_state
last_history_str=new_str
if(scheduled)return
var delay=HISTORY_UPDATE_TIME
if(Date.now()-last_history_set_time>HISTORY_UPDATE_TIME)delay=1
scheduled=true
setTimeout(updateHistoryCommit,delay)}function startup(param){assert(!title_transformer)
if(!(title_transformer=param.title_transformer)&&(param.title_suffix||param.title_default)){var title_suffix=param.title_suffix,title_default=param.title_default
title_transformer=function title_transformer(title){if(title_suffix&&title)return title+" | "+title_suffix
return title||title_default||title_suffix}}updateHistory(false)
if(title_transformer){refreshTitle()
setTimeout(periodicRefreshTitle,1e3)}}function urlhashFireInitialChanges(){goInternal(null,true,false,false)}function routeEx(new_route){var keys=new_route.keys
for(var ii=0;ii<keys.length;++ii){var opts=params[keys[ii]]
assert(opts)
opts.routes=opts.routes||[]
opts.routes.push(new_route)
opts.value=getValue(queryString(),opts)}routes.push(new_route)
routes.sort(cmpNumKeys)}function route(route_string){var keys=[]
var base=route_string.replace(route_param_regex,function(ignored,match){keys.push(match)
return"([^/&?]+)"})
routeEx({route_string:route_string,regex:new RegExp("^\\??"+base+"(?:$|\\?|#)"),keys:keys})}function routeFixed(route_string,key){routeEx({route_string:route_string,regex:new RegExp("^\\??"+route_string+"(?:$|\\?|#)"),value:"1",keys:[key]})}function register(opts){assert(opts.key)
assert(!params[opts.key])
opts.type=opts.type||TYPE_STRING
var regex_search="(?:[^\\w])"+opts.key+"=([^&#]+)"
var regex_type=""
if(opts.type===TYPE_SET)regex_type="g"
else{opts.def=opts.def||""
opts.hide_values=opts.hide_values||{}
opts.hide_values[opts.def]=true}opts.regex=new RegExp(regex_search,regex_type);(params[opts.key]=opts).value=getValue(queryString(),opts)
var ret=opts.value
if(opts.type===TYPE_SET&&"function"===typeof Proxy)ret=new Proxy(opts.value,{set:function set(target,prop,value){if(value)target[prop]=1
else delete target[prop]
updateHistory()
return true}})
if(!window.onpopstate)window.onpopstate=onPopState
return ret}function set(key,value,value2){var opts=params[key]
assert(opts)
if(opts.type===TYPE_SET){if(Boolean(opts.value[value])!==Boolean(value2)){opts.value[value]=value2?1:0
updateHistory(opts.push)}}else if(opts.value!==value){opts.value=value
updateHistory(opts.push)}}function setMulti(values){var any=false
var push=false
for(var key in values){var value=values[key]
var opts=params[key]
assert(opts)
assert(opts.type!==TYPE_SET)
if(opts.value!==value){opts.value=value
any=true
push=push||opts.push}}if(any)updateHistory(push)}function get(key){var opts=params[key]
assert(opts)
return opts.value}function getRouteString(){return toString(true)}function go(query_string,skip_apply){goInternal(query_string,false,skip_apply,false)
updateHistory(true)}function goRoute(route_string,skip_apply){goInternal(route_string,false,skip_apply,true)
updateHistory(true)}

},{"../common/util.js":96,"assert":undefined}],75:[function(require,module,exports){
"use strict"
var _require=require("../common/util"),msToSS2020=_require.msToSS2020
var min=Math.min
var offs=0
function now(){return Date.now()+offs}module.exports=exports=now
exports.now=now
var first=true
exports.sync=function(server_time){if(first)offs=server_time-Date.now()
else offs=min(offs,server_time-Date.now())}
exports.seconds=function(){return msToSS2020(now())}

},{"../common/util":96}],76:[function(require,module,exports){
"use strict"
exports.webFSAPI=webFSAPI
exports.webFSApplyReload=webFSApplyReload
exports.webFSExists=webFSExists
exports.webFSGetData=webFSGetData
exports.webFSGetFile=webFSGetFile
exports.webFSGetFileNames=webFSGetFileNames
exports.webFSOnReady=webFSOnReady
exports.webFSReportUnused=webFSReportUnused
exports.webFSSetToWorkerCB=webFSSetToWorkerCB
exports.webFSStartup=webFSStartup
var assert=require("assert")
var _glovCommonUtil=require("../common/util")
var callEach=_glovCommonUtil.callEach
var clone=_glovCommonUtil.clone
var deepEqual=_glovCommonUtil.deepEqual
var _filewatch=require("./filewatch")
var filewatchOn=_filewatch.filewatchOn
var filewatchTriggerChange=_filewatch.filewatchTriggerChange
var fs
var decoded={}
var used={}
var active_reload=false
var on_ready=[]
function webFSOnReady(cb){if(fs)cb()
else on_ready.push(cb)}function decode(data){var len=data[0]
var str=data[1]
var u8=new Uint8Array(len)
var idxo=0
var idxi=0
while(idxo<len){var byte=str.charCodeAt(idxi++)
if(126===byte)byte=0
else if(27===byte)byte=str.charCodeAt(idxi++)
u8[idxo++]=byte}assert.equal(idxi,str.length)
assert.equal(idxo,len)
return u8}function webFSGetFileNames(directory){assert(fs)
var ret=[]
for(var filename in fs)if(filename.startsWith(directory))ret.push(filename)
return ret}function webFSGetFile(filename,encoding){assert(fs)
var ret=decoded[filename]
if(ret)return ret
used[filename]=true
var data=fs[filename]
assert(data,"Error loading file: "+filename)
if("jsobj"===encoding){assert(!Array.isArray(data)||!(2===data.length&&"number"===typeof data[0]&&"string"===typeof data[1]))
ret=active_reload?clone(data):data}else{assert(Array.isArray(data))
if("text"===encoding)ret=data[1]
else ret=decode(data)}return decoded[filename]=ret}function webFSExists(filename){assert(fs)
return Boolean(fs[filename])}function webFSReportUnused(ignore_regex){ignore_regex=ignore_regex||/\.(fp|vp)$/
var tot_size=0
for(var filename in fs)if(!used[filename]&&!filename.match(ignore_regex)){console.warn("WebFS file bundled but unreferenced: "+filename)
tot_size+=fs[filename][0]}if(tot_size)console.warn("WebFS wasting "+tot_size+" bytes")}var webfs_to_worker_cb
function webFSSetToWorkerCB(cb){webfs_to_worker_cb=cb}function webFSGetData(){return fs}function webFSApplyReload(fs_in){var old_fs=fs
fs=fs_in
if(webfs_to_worker_cb)webfs_to_worker_cb(fs)
decoded={}
used={}
for(var key in fs){var old_value=old_fs[key]
var new_value=fs[key]
if(Array.isArray(old_value)){for(var ii=0;ii<new_value.length;++ii)if(!old_value||new_value[ii]!==old_value[ii]){filewatchTriggerChange(key)
break}}else if(!deepEqual(old_value,new_value))filewatchTriggerChange(key)}for(var _key in old_fs)if(!fs[_key])filewatchTriggerChange(_key)}var base_url_for_reload
function webFSReload(){active_reload=true
window.glov_webfs=null
var scriptTag=document.createElement("script")
scriptTag.src=base_url_for_reload+"fsdata.js?rl="+Date.now()
scriptTag.onload=function(){if(window.glov_webfs)webFSApplyReload(window.glov_webfs)}
document.head.appendChild(scriptTag)}function webFSStartup(fs_in,base_url_for_reload_in){fs=fs_in||{}
if(base_url_for_reload_in){base_url_for_reload=base_url_for_reload_in
filewatchOn("fsdata.js",webFSReload)}if(webfs_to_worker_cb)webfs_to_worker_cb(fs)
callEach(on_ready,on_ready=null)}function webFSAPI(){return{getFileNames:webFSGetFileNames,getFile:webFSGetFile,filewatchOn:filewatchOn}}

},{"../common/util":96,"./filewatch":27,"assert":undefined}],77:[function(require,module,exports){
"use strict"
exports.profanityFilter=profanityFilter
exports.profanityStartup=profanityStartup
exports.profanityStartupLate=profanityStartupLate
var _glovClientFont=require("../font")
var fontSetReplacementChars=_glovClientFont.fontSetReplacementChars
var _glovClientLocate_asset=require("../locate_asset")
var locateAsset=_glovClientLocate_asset.locateAsset
var _glovClientRand_fast=require("../rand_fast")
var randFastCreate=_glovClientRand_fast.randFastCreate
var _glovClientUrlhash=require("../urlhash")
var getURLBase=_glovClientUrlhash.getURLBase
var _glovClientWebfs=require("../webfs")
var webFSGetFile=_glovClientWebfs.webFSGetFile
var _glovCommonRand_alea=require("../../common/rand_alea")
var mashString=_glovCommonRand_alea.mashString
var _glovCommonWordsProfanity_common=require("../../common/words/profanity_common")
var profanityCommonStartup=_glovCommonWordsProfanity_common.profanityCommonStartup
var profanityFilterCommon=_glovCommonWordsProfanity_common.profanityFilterCommon
var profanitySetReplacementChars=_glovCommonWordsProfanity_common.profanitySetReplacementChars
var non_profanity
function profanityStartup(){non_profanity=webFSGetFile("words/replacements.txt","text").split("\n").filter(function(a){return a})
profanityCommonStartup(webFSGetFile("words/filter.gkg","text"),webFSGetFile("words/exceptions.txt","text"))}function profanityStartupLate(){var scriptTag=document.createElement("script")
scriptTag.src=""+getURLBase()+locateAsset("replacement_chars.min.js")
scriptTag.onload=function(){if(window.unicode_replacement_chars){profanitySetReplacementChars(window.unicode_replacement_chars)
fontSetReplacementChars(window.unicode_replacement_chars)}}
document.getElementsByTagName("head")[0].appendChild(scriptTag)}var rand=randFastCreate()
var last_word
function randWord(){if(-1===last_word||1===non_profanity.length)last_word=rand.range(non_profanity.length)
else{var choice=rand.range(non_profanity.length-1)
last_word=choice<last_word?choice:choice+1}return non_profanity[last_word]}function profanityFilter(user_str){last_word=-1
rand.seed=mashString(user_str)
return profanityFilterCommon(user_str,randWord)}

},{"../../common/rand_alea":93,"../../common/words/profanity_common":99,"../font":28,"../locate_asset":42,"../rand_fast":57,"../urlhash":74,"../webfs":76}],78:[function(require,module,exports){
"use strict"
exports.ERR_RESTARTING=exports.ERR_CONNECTING=exports.ERR_CLIENT_VERSION_OLD=exports.ERR_CLIENT_VERSION_NEW=void 0
exports.WSClient=WSClient
exports.wsclientSetExtraParam=wsclientSetExtraParam
var _glovClientEnvironments=require("./environments")
var getAPIPath=_glovClientEnvironments.getAPIPath
var setCurrentEnvironment=_glovClientEnvironments.setCurrentEnvironment
var ack=require("../common/ack.js")
var ackInitReceiver=ack.ackInitReceiver
var verify=require("../common/verify.js")
var assert=require("assert")
var _require=require("./error_report.js"),errorReportSetDetails=_require.errorReportSetDetails,session_uid=_require.session_uid
var _require2=require("./fetch.js"),ERR_CONNECTION=_require2.ERR_CONNECTION,fetch=_require2.fetch,fetchDelaySet=_require2.fetchDelaySet
var min=Math.min,random=Math.random
var _require3=require("../common/perfcounters.js"),perfCounterAdd=_require3.perfCounterAdd
var urlhash=require("./urlhash.js")
var wscommon=require("../common/wscommon.js")
var netDelaySet=wscommon.netDelaySet,wsHandleMessage=wscommon.wsHandleMessage
var _require4=require("./client_config.js"),platformGetID=_require4.platformGetID,getAbilityReloadUpdates=_require4.getAbilityReloadUpdates
var ERR_CONNECTING="ERR_CONNECTING"
exports.ERR_CONNECTING=ERR_CONNECTING
var ERR_RESTARTING="ERR_RESTARTING"
exports.ERR_RESTARTING=ERR_RESTARTING
var ERR_CLIENT_VERSION_NEW="ERR_CLIENT_VERSION_NEW"
exports.ERR_CLIENT_VERSION_NEW=ERR_CLIENT_VERSION_NEW
var ERR_CLIENT_VERSION_OLD="ERR_CLIENT_VERSION_OLD"
exports.ERR_CLIENT_VERSION_OLD=ERR_CLIENT_VERSION_OLD
exports.CURRENT_VERSION=0
function WSClient(path,client_app){this.id=null
this.my_ids={}
this.handlers={}
this.socket=null
this.net_delayer=null
this.connected=false
this.disconnected=false
this.retry_scheduled=false
this.retry_count=0
this.retry_extra_delay=0
this.disconnect_time=Date.now()
this.last_receive_time=Date.now()
this.idle_counter=0
this.last_send_time=Date.now()
this.connect_error=ERR_CONNECTING
this.update_available=false
this.client_app=client_app||"app"
ackInitReceiver(this)
if(path)this.path=path
this.connect(false)
this.onMsg("cack",this.onConnectAck.bind(this))
this.onMsg("build",this.onBuildChange.bind(this))
this.onMsg("error",this.onError.bind(this))}WSClient.prototype.logPacketDispatch=function(source,pak,buf_offs,msg){perfCounterAdd("ws."+msg)}
WSClient.prototype.timeSinceDisconnect=function(){return Date.now()-this.disconnect_time}
function getVersionUrlParams(){return"plat="+platformGetID()+"&ver="+exports.CURRENT_VERSION+"&build="+"1730509975354"+"&sesuid="+session_uid}function jsonParseResponse(response){if(!response)return null
if("<"===response.trim()[0])return null
try{return JSON.parse(response)}catch(e){return null}}function whenServerReady(cb){var retry_count=0
function doit(){fetch({url:getAPIPath()+"ready?"+getVersionUrlParams()},function(err,response){if(err){var response_data=jsonParseResponse(response)
if("ERR_CLIENT_VERSION_OLD"!==(null==response_data?void 0:response_data.status)){++retry_count
setTimeout(doit,min(retry_count*retry_count*100,15e3)*(.75+.5*random()))
return}}cb()})}doit()}WSClient.prototype.onBuildChange=function(obj){if(obj.app!==this.client_app)return
this.onBuildTimestamp(obj.ver)}
WSClient.prototype.onBuildTimestamp=function(build_timestamp){if(build_timestamp!=="1730509975354")if(this.on_build_timestamp_mismatch)this.on_build_timestamp_mismatch()
else if(getAbilityReloadUpdates()){console.error("App build mismatch (server: "+build_timestamp+", client: "+"1730509975354"+"), reloading")
whenServerReady(function(){if(window.reloadSafe)window.reloadSafe()
else document.location.reload()})}else console.warn("App build mismatch (server: "+build_timestamp+", client: "+"1730509975354"+"), ignoring")}
WSClient.prototype.onConnectAck=function(data,resp_func){var client=this
client.connected=true
client.connect_error=null
client.disconnected=false
client.id=data.id
client.my_ids[data.id]=true
errorReportSetDetails("client_id",client.id)
client.secret=data.secret
if(data.build)client.onBuildTimestamp(data.build)
if(data.net_delay){netDelaySet(data.net_delay[0],data.net_delay[1])
fetchDelaySet(data.net_delay[0],data.net_delay[1])}assert(client.handlers.connect)
data.client_id=client.id
client.handlers.connect(client,data)
resp_func()}
WSClient.prototype.pak=function(msg,msg_debug_name){return wscommon.wsPak(msg,null,this,msg_debug_name)}
WSClient.prototype.send=function(msg,data,msg_debug_name,resp_func){if(!verify("function"!==typeof msg_debug_name)){resp_func=msg_debug_name
msg_debug_name=null}wscommon.sendMessage.call(this,msg,data,msg_debug_name,resp_func)}
WSClient.prototype.onError=function(e){console.error("WSClient Error")
console.error(e)
if(!(e instanceof Error))e=new Error(e)
throw e}
WSClient.prototype.onMsg=function(msg,cb){assert.ok(!this.handlers[msg])
this.handlers[msg]=function wrappedCallback(client,data,resp_func){return cb(data,resp_func)}}
WSClient.prototype.checkForNewAppBuild=function(){var _this=this
if(!getAbilityReloadUpdates())return
if(this.new_build_check_in_progress)return
this.new_build_check_in_progress=true
fetch({url:urlhash.getURLBase()+"app.ver.json",response_type:"json"},function(err,obj){_this.new_build_check_in_progress=false
if(obj&&obj.ver)_this.onBuildTimestamp(obj.ver)
if(err&&err!==ERR_CONNECTION)if(!_this.delayed_recheck){_this.delayed_recheck=true
setTimeout(function(){_this.delayed_recheck=false
_this.checkForNewAppBuild()},1e3)}})}
WSClient.prototype.retryConnection=function(){var client=this
assert(!client.socket)
assert(!client.retry_scheduled)
client.retry_scheduled=true;++client.retry_count
this.checkForNewAppBuild()
setTimeout(function(){assert(client.retry_scheduled)
assert(!client.socket)
client.retry_scheduled=false
client.connect(true)},min(client.retry_count*client.retry_count*100,15e3)*(.75+.5*random())+this.retry_extra_delay)
this.retry_extra_delay=0}
WSClient.prototype.checkDisconnect=function(){if(this.connected&&1!==this.socket.readyState){this.on_close()
assert(!this.connected)}}
WSClient.prototype.connect=function(for_reconnect){var _this2=this
var client=this
client.socket={readyState:0}
assert(!this.ready_check_in_progress)
this.ready_check_in_progress=true
fetch({url:getAPIPath()+"ready?"+getVersionUrlParams()},function(err,response){var response_data=jsonParseResponse(response)
var status=null==response_data?void 0:response_data.status
var redirect_environment=null==response_data?void 0:response_data.redirect_environment
_this2.update_available=null==response_data?void 0:response_data.update_available
var should_reload=_this2.update_available&&getAbilityReloadUpdates()
assert(_this2.ready_check_in_progress)
_this2.ready_check_in_progress=false
_this2.connect_error=ERR_CONNECTING
if(!err&&!redirect_environment&&!should_reload){if(_this2.update_available);return void _this2.connectAfterReady(for_reconnect)}console.log("Server not ready, err="+err+", response="+response)
if("ERR_RESTARTING"===status||"ERR_STARTUP"===status)client.connect_error=ERR_RESTARTING
else if("ERR_CLIENT_VERSION_NEW"===status)client.connect_error=ERR_CLIENT_VERSION_NEW
else if("ERR_CLIENT_VERSION_OLD"===status)client.connect_error=ERR_CLIENT_VERSION_OLD
if(redirect_environment)setCurrentEnvironment(redirect_environment)
client.socket=null
client.net_delayer=null
_this2.retryConnection()})}
var connect_url_params=""
var connect_url_extra={}
function wsclientSetExtraParam(key,value){if(!value)delete connect_url_extra[key]
else connect_url_extra[key]=value
var pairs=[]
for(var walk in connect_url_extra)pairs.push(walk+"="+connect_url_extra[walk])
if(pairs.length)connect_url_params="&"+pairs.join("&")
else connect_url_params=""}WSClient.prototype.connectAfterReady=function(for_reconnect){var client=this
var path=client.path||getAPIPath().replace(/^http/,"ws").replace(/api\/$/,"ws")
path=path+"?"+getVersionUrlParams()+(for_reconnect&&client.id&&client.secret?"&reconnect="+client.id+"&secret="+client.secret:"")+connect_url_params
var socket=new WebSocket(path)
socket.binaryType="arraybuffer"
client.socket=socket
function guard(fn){return function(){if(client.socket!==socket)return
fn.apply(void 0,arguments)}}function abort(skip_close){client.socket=null
client.net_delayer=null
if(client.connected){client.disconnect_time=Date.now()
client.disconnected=true
errorReportSetDetails("disconnected",1)}client.connected=false
client.connect_error=ERR_CONNECTING
if(!skip_close)try{socket.close()}catch(e){}client.handlers.disconnect()
ack.failAll(client)}function retry(skip_close){abort(skip_close)
client.retryConnection()}var connected=false
client.socket.addEventListener("error",guard(function(err){if(!connected){console.log("WebSocket error during initial connection, retrying...",err)
retry()}else console.error("WebSocket error",err)}))
client.socket.addEventListener("message",guard(function(message){profilerStart("WS")
assert(message.data instanceof ArrayBuffer)
wsHandleMessage(client,new Uint8Array(message.data))
profilerStop("WS")}))
client.socket.addEventListener("open",guard(function(){console.log("WebSocket open")
connected=true
client.retry_count=0}))
client.on_close=guard(function(){console.log("WebSocket close, retrying connection...")
retry(true)})
client.socket.addEventListener("close",client.on_close)
var doPing=guard(function(){if(Date.now()-client.last_send_time>=wscommon.PING_TIME&&client.connected&&1===client.socket.readyState)client.send("ping")
setTimeout(doPing,wscommon.PING_TIME/2)})
setTimeout(doPing,wscommon.PING_TIME/2)}

},{"../common/ack.js":79,"../common/perfcounters.js":91,"../common/verify.js":97,"../common/wscommon.js":100,"./client_config.js":16,"./environments":23,"./error_report.js":24,"./fetch.js":26,"./urlhash.js":74,"assert":undefined}],79:[function(require,module,exports){
"use strict"
exports.ackHandleMessage=ackHandleMessage
exports.ackInitReceiver=ackInitReceiver
exports.ackReadHeader=ackReadHeader
exports.ackWrapPakFinish=ackWrapPakFinish
exports.ackWrapPakPayload=ackWrapPakPayload
exports.ackWrapPakStart=ackWrapPakStart
exports.failAll=failAll
var assert=require("assert")
var _require=require("./packet.js"),isPacket=_require.isPacket
var _require2=require("./perfcounters.js"),perfCounterAddValue=_require2.perfCounterAddValue
function ackInitReceiver(receiver){receiver.last_pak_id=0
receiver.resp_cbs={}
receiver.responses_waiting=0}var ERR_FAILALL_DISCONNECT="ERR_FAILALL_DISCONNECT"
var ACKFLAG_IS_RESP=8
var ACKFLAG_ERR=16
var ACKFLAG_DATA_JSON=32
function ackWrapPakStart(pak,receiver,msg,msg_debug_name){var flags=0
pak.ack_data={receiver:receiver,msg_dbg_name:msg_debug_name||msg}
if("number"===typeof msg){flags|=ACKFLAG_IS_RESP
pak.writeInt(msg)}else pak.writeAnsiString(msg)
var resp_pak_id=receiver?++receiver.last_pak_id:0
pak.ack_data.resp_pak_id=resp_pak_id
pak.ack_data.resp_pak_id_offs=pak.getOffset()
pak.writeInt(resp_pak_id)
pak.ack_data.data_offs=pak.getOffset()
pak.ack_data.flags=flags}function ackWrapPakPayload(pak,data){if(isPacket(data))pak.appendRemaining(data)
else{pak.ack_data.flags|=ACKFLAG_DATA_JSON
pak.writeJSON(data)}}function ackWrapPakFinish(pak,err,resp_func){var flags=pak.ack_data.flags
var offs=pak.getOffset()
if(err){assert.equal(pak.ack_data.data_offs,offs)
flags|=ACKFLAG_ERR
pak.writeString(String(err))
offs=pak.getOffset()}pak.makeReadable()
var resp_pak_id=0
if(resp_func&&false!==resp_func.expecting_response){resp_pak_id=pak.ack_data.resp_pak_id
assert(resp_pak_id)
assert(pak.ack_data.receiver)
assert(pak.ack_data.msg_dbg_name)
var ack_name="ack."+pak.ack_data.msg_dbg_name
pak.ack_data.receiver.resp_cbs[resp_pak_id]={func:resp_func,ack_name:ack_name}}else{pak.seek(pak.ack_data.resp_pak_id_offs)
pak.zeroInt()
pak.seek(offs)}pak.updateFlags(flags)
delete pak.ack_data
return resp_pak_id}function ackReadHeader(pak){var flags=pak.getFlags()
var msg=flags&ACKFLAG_IS_RESP?pak.readInt():pak.readAnsiString()
var pak_id=pak.readInt()
var err=flags&ACKFLAG_ERR?pak.readString():void 0
var data
if(flags&ACKFLAG_DATA_JSON)data=pak.readJSON()
else data=pak
return{msg:msg,err:err,data:data,pak_id:pak_id}}function failAll(receiver,err){err=err||ERR_FAILALL_DISCONNECT
var cbs=receiver.resp_cbs
receiver.resp_cbs={}
receiver.responses_waiting=0
for(var pak_id in cbs)cbs[pak_id].func(err)}function ackHandleMessage(receiver,source,pak,send_func,pak_func,handle_func,filter_func){var pak_initial_offs=pak.getOffset()
var _ackReadHeader=ackReadHeader(pak),err=_ackReadHeader.err,data=_ackReadHeader.data,msg=_ackReadHeader.msg,pak_id=_ackReadHeader.pak_id
var msg_name
if("number"===typeof msg){var pair=receiver.resp_cbs[msg]
assert(!pair||pair.ack_name)
if(pair&&pair.ack_name)msg_name=pair.ack_name
else msg_name="ack"}else msg_name=msg
if(receiver.logPacketDispatch){perfCounterAddValue("net.recv_bytes.total",pak.totalSize())
perfCounterAddValue("net.recv_bytes."+msg_name,pak.totalSize())
receiver.logPacketDispatch(source,pak,pak_initial_offs,msg_name)}var now=Date.now()
var expecting_response=Boolean(pak_id)
var timeout_id
if(expecting_response)timeout_id="pending"
var sent_response=false
var start_time=now
if(filter_func&&!filter_func(receiver,msg,data))return
function preSendResp(err){assert(!sent_response,"Response function called twice")
sent_response=true
if(expecting_response){if(timeout_id){if("pending"!==timeout_id)clearTimeout(timeout_id)}else if(err===ERR_FAILALL_DISCONNECT);else(receiver.log?receiver:console).log("Response finally sent for "+msg_name+" after "+((Date.now()-start_time)/1e3).toFixed(1)+"s")
receiver.responses_waiting--}}function respFunc(err,resp_data,resp_func){preSendResp(err)
if(!expecting_response){if(resp_func&&false!==resp_func.expecting_response){receiver.onError("Sending a response to a packet ("+msg_name+") that did not expect one, but we are expecting a response")
return}if(err)send_func("error",null,err,null)
return}send_func(pak_id,err,resp_data,resp_func)}respFunc.expecting_response=expecting_response
respFunc.pak=function(ref_pak){assert(expecting_response)
var pak=pak_func(pak_id,ref_pak)
var orig_send=pak.send
pak.send=function(err,resp_func){preSendResp(err)
orig_send.call(pak,err,resp_func)}
return pak}
if("number"===typeof msg){var cb=receiver.resp_cbs[msg]
if(!cb)return void receiver.onError("Received response to unknown packet with id "+msg+" from "+source)
delete receiver.resp_cbs[msg]
profilerStart("response")
cb.func(err,data,respFunc)
profilerStop("response")}else{if(!msg)return void receiver.onError("Received message with no .msg from "+source)
profilerStart(msg)
handle_func(msg,data,respFunc)
profilerStop(msg)}if(expecting_response){receiver.responses_waiting++
if(!sent_response&&!respFunc.suppress_timeout)timeout_id=setTimeout(function(){timeout_id=null
if(!respFunc.suppress_timeout)(receiver.log?receiver:console).log("Response not sent for "+msg_name+" from "+source+" after "+((Date.now()-start_time)/1e3).toFixed(1)+"s")},15e3)}}

},{"./packet.js":90,"./perfcounters.js":91,"assert":undefined}],80:[function(require,module,exports){
(function (Buffer){(function (){
"use strict"
var floor=Math.floor
var chr_table="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("")
var PAD="="
function encode(dv,offset,length){var data=dv.u8
var result=""
var i
var effi
for(i=0;i<length-2;i+=3){result+=chr_table[data[effi=offset+i]>>2]
result+=chr_table[((3&data[effi])<<4)+(data[effi+1]>>4)]
result+=chr_table[((15&data[effi+1])<<2)+(data[effi+2]>>6)]
result+=chr_table[63&data[effi+2]]}if(length%3){result+=chr_table[data[effi=offset+(i=length-length%3)]>>2]
if(length%3===2){result+=chr_table[((3&data[effi])<<4)+(data[effi+1]>>4)]
result+=chr_table[(15&data[effi+1])<<2]
result+=PAD}else{result+=chr_table[(3&data[effi])<<4]
result+=PAD+PAD}}return result}function decodeNativeBrowser(data,allocator){var str=window.atob(data)
var len=str.length
var dv=allocator(len)
var u8=dv.u8
for(var ii=0;ii<len;++ii)u8[ii]=str.charCodeAt(ii)
dv.decode_size=len
return dv}function encodeNativeNode(dv,offset,length){return Buffer.from(dv.buffer).toString("base64",offset,offset+length)}function decodeNativeNode(data,allocator){var dv=allocator(3*(data.length>>2)+floor(data.length%4/1.5))
var buffer=Buffer.from(dv.buffer)
dv.decode_size=buffer.write(data,"base64")
return dv}var BROWSER="undefined"!==typeof window
exports.base64Decode=BROWSER?decodeNativeBrowser:decodeNativeNode
exports.base64Encode=BROWSER?encode:encodeNativeNode
exports.base64CharTable=chr_table

}).call(this)}).call(this,require("buffer").Buffer)

},{"buffer":undefined}],81:[function(require,module,exports){
"use strict"
exports.MAX_CLIENT_UPLOAD_SIZE=void 0
exports.chunkedReceiverCleanup=chunkedReceiverCleanup
exports.chunkedReceiverFinish=chunkedReceiverFinish
exports.chunkedReceiverFreeFile=chunkedReceiverFreeFile
exports.chunkedReceiverGetFile=chunkedReceiverGetFile
exports.chunkedReceiverInit=chunkedReceiverInit
exports.chunkedReceiverOnChunk=chunkedReceiverOnChunk
exports.chunkedReceiverStart=chunkedReceiverStart
exports.chunkedSend=chunkedSend
var assert=require("assert")
var _require=require("glov-async"),asyncParallelLimit=_require.asyncParallelLimit,asyncSeries=_require.asyncSeries
var crc32=require("./crc32.js")
var ceil=Math.ceil,min=Math.min
var _require2=require("./packet.js"),packetBufPoolAlloc=_require2.packetBufPoolAlloc,packetBufPoolFree=_require2.packetBufPoolFree
var MAX_CLIENT_UPLOAD_SIZE=2097152
exports.MAX_CLIENT_UPLOAD_SIZE=MAX_CLIENT_UPLOAD_SIZE
var CHUNK_SIZE=8092
function cleanupFile(state,file_id,pool){var file_data=state.files[file_id]
if(file_data.dv){packetBufPoolFree(file_data.dv)
delete file_data.dv}state.buffer_size-=file_data.length
assert(state.buffer_size>=0)
delete state.files[file_id]}function chunkedReceiverInit(name,max_buffer_size){return{name:name,max_buffer_size:max_buffer_size,last_file_id:0,buffer_size:0,files:{}}}function chunkedReceiverCleanup(state){if(!state||!state.files)return
for(var file_id in state.files)cleanupFile(state,file_id)}function chunkedReceiverFreeFile(container){var buffer=container.buffer,dv=container.dv
assert(buffer)
assert(dv)
packetBufPoolFree(dv)
delete container.buffer}function chunkedReceiverGetFile(state,file_id){if(!state)return{err:"ERR_NOT_INITIALIZED"}
function err(msg){console.error(state.name+": chunkedReceiverGetFile("+file_id+"): "+msg)
return{err:msg}}if(!state.files)return err("ERR_FILE_NOT_FOUND")
var file_data=state.files[file_id]
if(!file_data)return err("ERR_FILE_NOT_FOUND")
if(!file_data.finished){cleanupFile(state,file_id)
return err("ERR_UPLOAD_UNFINISHED")}var dv=file_data.dv,mime_type=file_data.mime_type,length=file_data.length
file_data.buffer=null
file_data.dv=null
cleanupFile(state,file_id)
return{dv:dv,mime_type:mime_type,buffer:new Uint8Array(dv.buffer,dv.byteOffset,length)}}function chunkedReceiverStart(state,pak,resp_func){assert(state)
var length=pak.readInt()
var crc=pak.readU32()
var mime_type=pak.readAnsiString()
var log=state.name+": chunkedReceiverStart length="+length+" crc="+crc+" mime="+mime_type
if(length>state.max_buffer_size){console.error(log+": ERR_TOO_LARGE")
return void resp_func("ERR_TOO_LARGE")}if(state.buffer_size+length>state.max_buffer_size){console.error(log+": ERR_OUT_OF_SPACE")
return void resp_func("ERR_OUT_OF_SPACE")}state.buffer_size+=length
var id=++state.last_file_id
console.log(log+" id="+id)
state.files[id]={length:length,crc:crc,mime_type:mime_type,total:0,dv:packetBufPoolAlloc(length)}
resp_func(null,id)}function chunkedReceiverOnChunk(state,pak,resp_func){if(!state){pak.pool()
return void resp_func("ERR_NOT_INITED")}var id=pak.readInt()
var offs=pak.readInt()
var buf=pak.readBuffer(false)
var log=state.name+": chunkedReceiverOnChunk id="+id+" offs="+offs+" length="+buf.length
var file_data=state.files&&state.files[id]
if(!file_data){console.error(log+": ERR_INVALID_FILE_ID")
return void resp_func("ERR_INVALID_FILE_ID")}if(file_data.total+buf.length>file_data.length){cleanupFile(state,id)
console.error(log+": ERR_BUFFER_OVERRUN")
return void resp_func("ERR_BUFFER_OVERRUN")}console.debug(log)
file_data.total+=buf.length
file_data.dv.u8.set(buf,offs)
if(state.on_progress)state.on_progress(file_data.total,file_data.length,file_data.mime_type,id)
resp_func()}function chunkedReceiverFinish(state,pak,resp_func){var id=pak.readInt()
if(!state)return void resp_func("ERR_NOT_INITED")
var file_data=state.files&&state.files[id]
var log=state.name+": chunkedReceiverFinish id="+id
if(!file_data){console.error(log+": ERR_INVALID_FILE_ID")
return void resp_func("ERR_INVALID_FILE_ID")}if(file_data.total!==file_data.length){cleanupFile(state,id)
console.error(log+": ERR_INCOMPLETE (total="+file_data.total+" length="+file_data.length+")")
return void resp_func("ERR_INCOMPLETE")}var crc=crc32(file_data.dv.u8,file_data.length)
if(crc!==file_data.crc){cleanupFile(state,id)
console.error(log+": ERR_CRC_MISMATCH (expected="+file_data.crc+" actual="+crc+")")
return void resp_func("ERR_CRC_MISMATCH")}file_data.finished=true
resp_func()}function chunkedSend(opts,cb){var client=opts.client,buffer=opts.buffer,mime_type=opts.mime_type,max_in_flight=opts.max_in_flight
assert(buffer instanceof Uint8Array,"Invalid data type")
assert(mime_type,"Missing mime_type")
var length=buffer.length
assert(length)
var crc=crc32(buffer)
var id
asyncSeries([function getID(next){var pak=client.pak("upload_start")
pak.writeInt(length)
pak.writeU32(crc)
pak.writeAnsiString(mime_type)
pak.send(function(err,assigned_id){id=assigned_id
next(err)})},function streamFile(next){var num_chunks=ceil(length/CHUNK_SIZE)
var any_error=false
function sendChunk(idx,next){if(any_error)return void next()
assert(idx<num_chunks)
var pak=client.pak("upload_chunk")
pak.writeInt(id)
var start=idx*CHUNK_SIZE
pak.writeInt(start)
var chunk_len=min(CHUNK_SIZE,length-start)
pak.writeBuffer(new Uint8Array(buffer.buffer,buffer.byteOffset+start,chunk_len))
pak.send(function(err){if(err)any_error=true
next(err)})}var tasks=[]
for(var ii=0;ii<num_chunks;++ii)tasks.push(sendChunk.bind(null,ii))
asyncParallelLimit(tasks,max_in_flight,next)},function finish(next){var pak=client.pak("upload_finish")
pak.writeInt(id)
pak.send(next)}],function(err){cb(err,id)})}

},{"./crc32.js":83,"./packet.js":90,"assert":undefined,"glov-async":undefined}],82:[function(require,module,exports){
"use strict"
exports.TYPE_STRING=exports.TYPE_INT=exports.TYPE_FLOAT=void 0
exports.canonical=canonical
exports.cmdParseCreate=cmdParseCreate
exports.defaultHandler=defaultHandler
var TYPE_INT=0
exports.TYPE_INT=TYPE_INT
var TYPE_FLOAT=1
exports.TYPE_FLOAT=TYPE_FLOAT
var TYPE_STRING=2
exports.TYPE_STRING=TYPE_STRING
exports.create=cmdParseCreate
var assert=require("assert")
var _perfcounters=require("./perfcounters")
var perfCounterAdd=_perfcounters.perfCounterAdd
var _util=require("./util")
var isInteger=_util.isInteger
function canonical(cmd){return cmd.toLowerCase().replace(/[_.]/g,"")}var TYPE_NAME=["INTEGER","NUMBER","STRING"]
function defaultHandler(err,resp){if(err)console.error(err,resp)
else console.info(resp)}function _checkAccess(access,implied_access,list){if(list){if(!access)return false
for(var ii=0;ii<list.length;++ii){var role=list[ii]
if(!access[role]){var ok=false
for(var my_role in access){var extra=implied_access[my_role]
if(extra&&extra[role]){ok=true
break}}if(!ok)return false}}}return true}function formatUsage(usage,help,prefix_help){return!usage?void 0:prefix_help?help+"\n"+usage:help?String(usage).replace(/\$HELP/,help):String(usage)}function formatRangeValue(type,value){var ret=String(value)
if(type===TYPE_FLOAT&&!ret.includes("."))ret+=".00"
return ret}function formatEnumValue(enum_lookup,value){if(enum_lookup)for(var _key in enum_lookup)if(enum_lookup[_key]===value)return _key
return value}function lookupEnumValue(enum_lookup,str){var v=enum_lookup[str=str.toUpperCase()]
if("number"===typeof v)return v
var n=Number(str)
if(Object.values(enum_lookup).includes(n))return n
for(var _key2 in enum_lookup)if(_key2.startsWith(str))return enum_lookup[_key2]
return null}var BOOLEAN_LOOKUP={OFF:0,ON:1}
var CMD_STORAGE_PREFIX="cmd_parse_"
function cmpCmd(a,b){if(a.cname<b.cname)return-1
return 1}var CmdParseImpl=function(){function CmdParseImpl(params){this.default_handler=defaultHandler
this.last_access=null
this.was_not_found=false
this.storage=void 0
this.cmds=void 0
this.cmds_for_complete=void 0
this.implied_access=void 0
this.last_cmd_data=void 0
this.cmd_list=void 0
this.cmds={}
this.cmds_for_complete=this.cmds
this.storage=params&&params.storage
this.register({cmd:"cmd_list",func:this.cmdList.bind(this),access_show:["hidden"]})
this.implied_access={sysadmin:{csr:1}}}var _proto=CmdParseImpl.prototype
_proto.cmdList=function cmdList(str,resp_func){if(!this.cmd_list){this.cmd_list={}
var list=this.cmd_list
for(var cmd in this.cmds){var cmd_data=this.cmds[cmd]
var access=[]
if(cmd_data.access_show)access=access.concat(cmd_data.access_show)
if(cmd_data.access_run)access=access.concat(cmd_data.access_run)
if(-1!==access.indexOf("hidden"))continue
var data={name:cmd_data.name,help:String(cmd_data.help)}
if(cmd_data.usage)data.usage=formatUsage(cmd_data.usage,cmd_data.help,cmd_data.prefix_usage_with_help)
if(access.length)data.access_show=access
list[cmd]=data}}resp_func(null,this.cmd_list)}
_proto.setDefaultHandler=function setDefaultHandler(fn){assert(this.default_handler===defaultHandler)
this.default_handler=fn}
_proto.checkAccess=function checkAccess(access_list){return _checkAccess(this.last_access,this.implied_access,access_list)}
_proto.handle=function handle(self,str,resp_func){resp_func=resp_func||this.default_handler
this.was_not_found=false
this.last_cmd_data=void 0
var m=str.match(/^([^\s]+)(?:\s+(.*))?$/)
if(!m){resp_func("Missing command")
return true}var cmd=canonical(m[1])
var cmd_data=this.cmds[cmd]
this.last_access=self&&self.access||null
if(cmd_data&&!this.checkAccess(cmd_data.access_run)){resp_func('Access denied: "'+m[1]+'"')
return false}if(!cmd_data){this.was_not_found=true
resp_func('Unknown command: "'+m[1]+'"')
return this.was_not_found=false}perfCounterAdd("cmd."+cmd);(this.last_cmd_data=cmd_data).fn.call(self,m[2]||"",resp_func)
return true}
_proto.getLastSuccessfulCmdData=function getLastSuccessfulCmdData(){return this.last_cmd_data}
_proto.exposeGlobal=function exposeGlobal(cmd,override){var _this=this
if("undefined"===typeof window)return
var func_name=cmd.replace(/_(.)/g,function(a,b){return b.toUpperCase()})
if(window[func_name]&&!override)return
window[func_name]=function(){var is_sync=true
var sync_ret
for(var _len=arguments.length,args=new Array(_len),_key3=0;_key3<_len;_key3++)args[_key3]=arguments[_key3]
_this.handle(void 0,cmd+" "+args.join(" "),function(err,resp){if(err)if(is_sync&&!resp)sync_ret=err
else console.error(err,resp)
else if(is_sync)sync_ret=resp
else console.info(resp)})
is_sync=false
return sync_ret}}
_proto.register=function register(param){assert.equal(typeof param,"object")
var cmd=param.cmd,func=param.func,help=param.help,usage=param.usage,prefix_usage_with_help=param.prefix_usage_with_help,access_show=param.access_show,access_run=param.access_run,store_data=param.store_data,override=param.override,expose_global=param.expose_global
assert(cmd)
assert(func,'Missing function for command "'+cmd+'"')
var help_lower=String(help||"").toLowerCase()
if(help_lower.includes("(admin)"))assert(access_run&&access_run.includes("sysadmin"))
if(help_lower.includes("(csr)"))assert(access_run&&access_run.includes("csr"))
if(help_lower.includes("(hidden)"))assert(access_show&&access_show.length)
var canon=canonical(cmd)
assert(!this.cmds[canon]||override,'Duplicate commands registered as "'+canon+'"')
if(void 0===expose_global)expose_global=!access_show&&!access_run
if(expose_global)this.exposeGlobal(cmd,override)
this.cmds[canon]={name:cmd,fn:func,help:help,usage:usage,prefix_usage_with_help:prefix_usage_with_help,access_show:access_show,access_run:access_run,store_data:store_data}}
_proto.registerValue=function registerValue(cmd,param_in){var _this2=this
var param=param_in
assert(TYPE_NAME[param.type]||!param.set)
assert(param.set||param.get)
var label=param.label||cmd
var store=param.store&&this.storage||false
var enum_lookup=param.enum_lookup
if(enum_lookup)assert.equal(param.type,TYPE_INT)
var store_key=""+CMD_STORAGE_PREFIX+canonical(cmd)
if(param.ver)store_key+="_"+param.ver
var is_toggle=param.is_toggle
if(is_toggle)assert(param.get&&param.set&&param.range)
var store_data
if(store){assert(this.storage)
assert(param.set)
store_data={store_key:store_key,param:param}
var init_value=this.storage.getJSON(store_key)
if(void 0!==init_value){if(param.range){init_value=Number(init_value)
if(!isFinite(init_value)||init_value<param.range[0]||init_value>param.range[1])init_value=void 0}if(void 0!==init_value){param.set(init_value)
if(param.on_change)param.on_change(true)}}}if(!enum_lookup&&param.type===TYPE_INT&&param.range&&0===param.range[0]&&1===param.range[1])enum_lookup=BOOLEAN_LOOKUP
var param_label=TYPE_NAME[param.type]
if(enum_lookup)param_label=Object.keys(enum_lookup).join("|")
var fn=function fn(str,resp_func){function value(){resp_func(null,label+" = **"+formatEnumValue(enum_lookup,param.get())+"**")}function usage(){resp_func("Usage: **/"+cmd+" "+param_label+"**")}if(!str&&is_toggle)if(param.get()===param.range[0])str=String(param.range[1])
else str=String(param.range[0])
if(!str)if(param.get&&param.set){var help=[label+":"]
if(param.range&&!(enum_lookup&&param.type===TYPE_INT))help.push("Valid range: ["+formatRangeValue(param.type,param.range[0])+"..."+formatRangeValue(param.type,param.range[1])+"]")
var cur_value=param.get()
var value_example=param.range?cur_value===param.range[0]?param.range[1]:param.range[0]:1
if(enum_lookup)value_example=Object.keys(enum_lookup)[0]
help.push("To change: **/"+cmd+" "+param_label+"**")
help.push("  example: **/"+cmd+" "+value_example+"**")
var def_value=param.default_value
if(void 0!==def_value)help.push("Default value = **"+formatEnumValue(enum_lookup,def_value)+"**")
help.push("Current value = **"+formatEnumValue(enum_lookup,cur_value)+"**")
return resp_func(null,help.join("\n"))}else if(param.get)return value()
else return usage()
if(!param.set)return resp_func("Usage: **/"+cmd+"**")
var n=Number(str)
if(enum_lookup){var n_test=lookupEnumValue(enum_lookup,str)
if(null===n_test)return usage()
n=n_test}if(param.range)if(n<param.range[0])n=param.range[0]
else if(n>param.range[1])n=param.range[1]
var store_value=n
if(param.type===TYPE_INT){if(!isInteger(n))return usage()
param.set(n)}else if(param.type===TYPE_FLOAT){if(!isFinite(n))return usage()
param.set(n)}else{store_value=str
param.set(str)}if(store)_this2.storage.setJSON(store_key,store_value)
if(param.on_change)param.on_change(false)
if(param.get)return value()
else return resp_func(null,label+" updated")}
this.register({cmd:cmd,func:fn,help:param.help||(param.get&&param.set?"Set or display *"+label+"* value":param.set?"Set *"+label+"* value":"Display *"+label+"* value"),usage:param.usage||(param.get?"Display *"+label+"* value\n  Usage: **/"+cmd+"**\n":"")+(param.set?"Set *"+label+"* value\n  Usage: **/"+cmd+" "+param_label+"**":""),prefix_usage_with_help:param.prefix_usage_with_help,access_show:param.access_show,access_run:param.access_run,store_data:store_data})}
_proto.resetSettings=function resetSettings(){assert(this.storage)
var results=[]
var all_saved_data=this.storage.localStorageExportAll(CMD_STORAGE_PREFIX)
var count=0
for(var _key4 in all_saved_data){var _value=all_saved_data[_key4]
var cmd_name=_key4.slice(CMD_STORAGE_PREFIX.length)
var version=void 0
var _cmd_name$split=cmd_name.split("_")
cmd_name=_cmd_name$split[0]
version=_cmd_name$split[1]
var cmd_data=this.cmds[cmd_name]
if(!cmd_data){this.storage.set(_key4,void 0)
results.push('Cleared unknown setting "'+cmd_name+'" = '+_value);++count}else{var _store_data$param
var _cmd_data=cmd_data,name=_cmd_data.name,store_data=_cmd_data.store_data
var default_value=null==store_data?void 0:null==(_store_data$param=store_data.param)?void 0:_store_data$param.default_value
if(store_data&&store_data.store_key!==_key4){this.storage.set(_key4,void 0)
results.push('Cleared old setting "'+name+" (v"+(version||0)+')"');++count}else if(void 0!==default_value)if(JSON.stringify(default_value)===_value)this.storage.set(_key4,void 0)
else{this.storage.set(_key4,void 0)
results.push('Cleared setting "'+name+'" = '+_value+" (default = "+default_value+")");++count}else{this.storage.set(_key4,void 0)
results.push('Cleared setting "'+name+'" = '+_value);++count}}}if(results.length)results.push("Reset "+count+" setting(s)")
return results}
_proto.addServerCommands=function addServerCommands(new_cmds){var cmds=this.cmds_for_complete
if(this.cmds_for_complete===this.cmds){cmds=this.cmds_for_complete={}
for(var cname in this.cmds)cmds[cname]=this.cmds[cname]}for(var _cname in new_cmds)if(!cmds[_cname])cmds[_cname]=new_cmds[_cname]}
_proto.autoComplete=function autoComplete(str_in,access){var list=[]
var str=str_in.split(" ")
var first_tok=canonical(str[0])
this.last_access=access
for(var cname in this.cmds_for_complete)if(1===str.length&&cname.slice(0,first_tok.length)===first_tok||str.length>1&&cname===first_tok){var cmd_data=this.cmds_for_complete[cname]
if(this.checkAccess(cmd_data.access_show)&&this.checkAccess(cmd_data.access_run))list.push({cname:cname,cmd:cmd_data.name,help:String(cmd_data.help),usage:formatUsage(cmd_data.usage,cmd_data.help,cmd_data.prefix_usage_with_help)})}list.sort(cmpCmd)
return list}
return CmdParseImpl}()
CmdParseImpl.prototype.canonical=canonical
CmdParseImpl.prototype.TYPE_INT=TYPE_INT
CmdParseImpl.prototype.TYPE_FLOAT=TYPE_FLOAT
CmdParseImpl.prototype.TYPE_STRING=TYPE_STRING
function cmdParseCreate(params){return new CmdParseImpl(params)}

},{"./perfcounters":91,"./util":96,"assert":undefined}],83:[function(require,module,exports){
"use strict"
var crc_table=new Array(256);(function(){for(var n=0;n<256;n++){var c=n
for(var k=0;k<8;k++)if(1&c)c=-306674912^c>>>1
else c>>>=1
crc_table[n]=c}})()
function update_crc(crc,buf,len){for(var n=0;n<len;n++)crc=crc_table[255&(crc^buf[n])]^crc>>>8
return crc}function crc32(buf,len){return(4294967295^update_crc(4294967295,buf,len=len||buf.length))>>>0}module.exports=crc32
module.exports.crc32=crc32

},{}],84:[function(require,module,exports){
"use strict"
exports.dataError=dataError
exports.dataErrorEx=dataErrorEx
exports.dataErrorOnError=dataErrorOnError
exports.dataErrorQueueClear=dataErrorQueueClear
exports.dataErrorQueueEnable=dataErrorQueueEnable
exports.dataErrorQueueGet=dataErrorQueueGet
var assert=require("assert")
var on_error=null
var enabled=false
var error_queue=[]
var msgs_in_queue=Object.create(null)
function dataErrorEx(err){if(!enabled)return
if(err.per_frame){if(msgs_in_queue[err.msg])return
msgs_in_queue[err.msg]=true}if(on_error)on_error(err)
error_queue.push(err)
if(error_queue.length>25){var removed=error_queue.splice(0,1)[0]
if(removed.per_frame)delete msgs_in_queue[removed.msg]}}function dataError(msg){dataErrorEx({msg:msg})}function dataErrorQueueEnable(val){enabled=val}function dataErrorOnError(cb){assert(!on_error)
on_error=cb}function dataErrorQueueGet(){return error_queue}function dataErrorQueueClear(){error_queue=[]
msgs_in_queue=Object.create(null)}

},{"assert":undefined}],85:[function(require,module,exports){
"use strict"
exports.dotPropDelete=dotPropDelete
exports.dotPropGet=dotPropGet
exports.dotPropHas=dotPropHas
exports.dotPropSet=dotPropSet
var _require=require("./util.js"),arrayToSet=_require.arrayToSet
var disallowedKeys=arrayToSet(["__proto__","prototype","constructor"])
function isObject(value){var type=typeof value
return null!==value&&("object"===type||"function"===type)}function isValidPath(pathSegments){for(var ii=0;ii<pathSegments.length;++ii)if(disallowedKeys[pathSegments[ii]])return false
return true}function getPathSegments(path){var pathArray=path.split(".")
var parts=[]
for(var i=0;i<pathArray.length;i++){var p=pathArray[i]
while("\\"===p[p.length-1]&&void 0!==pathArray[i+1]){p=p.slice(0,-1)+"."
p+=pathArray[++i]}parts.push(p)}if(!isValidPath(parts))return[]
return parts}function dotPropGet(object,path,value){if(!isObject(object)||"string"!==typeof path)return void 0===value?object:value
var pathArray=getPathSegments(path)
if(0===pathArray.length)return value
for(var i=0;i<pathArray.length;i++)if(void 0===(object=object[pathArray[i]])||null===object){if(i!==pathArray.length-1)return value
break}return void 0===object?value:object}function dotPropSet(object,path,value){if(!isObject(object)||"string"!==typeof path)return object
var root=object
var pathArray=getPathSegments(path)
for(var i=0;i<pathArray.length;i++){var p=pathArray[i]
if(i===pathArray.length-1)object[p]=value
else if(!isObject(object[p]))object[p]={}
object=object[p]}return root}function dotPropDelete(object,path){if(!isObject(object)||"string"!==typeof path)return false
var pathArray=getPathSegments(path)
for(var i=0;i<pathArray.length;i++){var p=pathArray[i]
if(i===pathArray.length-1){delete object[p]
return true}if(!isObject(object=object[p]))return false}}function dotPropHas(object,path){if(!isObject(object)||"string"!==typeof path)return false
var pathArray=getPathSegments(path)
if(0===pathArray.length)return false
for(var i=0;i<pathArray.length;i++)if(isObject(object)){if(!(pathArray[i]in object))return false
object=object[pathArray[i]]}else return false
return true}exports.get=dotPropGet
exports.set=dotPropSet
exports.delete=dotPropDelete
exports.has=dotPropHas

},{"./util.js":96}],86:[function(require,module,exports){
"use strict"
exports.PRESENCE_OFFLINE_INACTIVE=exports.PRESENCE_OFFLINE=exports.PRESENCE_INACTIVE=exports.PRESENCE_ACTIVE=exports.CHAT_FLAG_USERCHAT=exports.CHAT_FLAG_EMOTE=void 0
exports.getStringEnumValues=getStringEnumValues
exports.isValidNumberEnumKey=isValidNumberEnumKey
exports.isValidStringEnumKey=isValidStringEnumKey
exports.isValidStringEnumValue=isValidStringEnumValue
exports.presenceActive=presenceActive
exports.presenceVisible=presenceVisible
var PRESENCE_OFFLINE=0
exports.PRESENCE_OFFLINE=PRESENCE_OFFLINE
var PRESENCE_ACTIVE=1
exports.PRESENCE_ACTIVE=PRESENCE_ACTIVE
var PRESENCE_INACTIVE=2
exports.PRESENCE_INACTIVE=PRESENCE_INACTIVE
var PRESENCE_OFFLINE_INACTIVE=3
exports.PRESENCE_OFFLINE_INACTIVE=PRESENCE_OFFLINE_INACTIVE
function presenceActive(presence_value){return!(presence_value===PRESENCE_INACTIVE||presence_value===PRESENCE_OFFLINE_INACTIVE)}function presenceVisible(presence_value){return!(presence_value===PRESENCE_OFFLINE||presence_value===PRESENCE_OFFLINE_INACTIVE)}function getStringEnumValues(e){return Object.values(e)}function isValidNumberEnumKey(e,k){return"number"===typeof e[k]}function isValidStringEnumKey(e,k){return k in e}function isValidStringEnumValue(e,v){for(var key in e)if(e[key]===v)return true
return false}var CHAT_FLAG_EMOTE=1
exports.CHAT_FLAG_EMOTE=CHAT_FLAG_EMOTE
var CHAT_FLAG_USERCHAT=2
exports.CHAT_FLAG_USERCHAT=CHAT_FLAG_USERCHAT

},{}],87:[function(require,module,exports){
"use strict"
exports.ERR_UNCONFIRMED_EMAIL=exports.ERR_UNAUTHORIZED=exports.ERR_SERVER=exports.ERR_NO_USER_ID=exports.ERR_NOT_AVAILABLE=exports.ERR_INVALID_PROVIDER=exports.ERR_INVALID_DATA=exports.ERR_EMAIL_ALREADY_USED=void 0
var ERR_INVALID_DATA="ERR_INVALID_DATA"
exports.ERR_INVALID_DATA=ERR_INVALID_DATA
var ERR_INVALID_PROVIDER="ERR_INVALID_PROVIDER"
exports.ERR_INVALID_PROVIDER=ERR_INVALID_PROVIDER
var ERR_UNAUTHORIZED="ERR_UNAUTHORIZED"
exports.ERR_UNAUTHORIZED=ERR_UNAUTHORIZED
var ERR_NO_USER_ID="ERR_NO_USER_ID"
exports.ERR_NO_USER_ID=ERR_NO_USER_ID
var ERR_UNCONFIRMED_EMAIL="ERR_UNCONFIRMED_EMAIL"
exports.ERR_UNCONFIRMED_EMAIL=ERR_UNCONFIRMED_EMAIL
var ERR_SERVER="ERR_SERVER"
exports.ERR_SERVER=ERR_SERVER
var ERR_EMAIL_ALREADY_USED="ERR_EMAIL_ALREADY_USED"
exports.ERR_EMAIL_ALREADY_USED=ERR_EMAIL_ALREADY_USED
var ERR_NOT_AVAILABLE="ERR_NOT_AVAILABLE"
exports.ERR_NOT_AVAILABLE=ERR_NOT_AVAILABLE

},{}],88:[function(require,module,exports){
"use strict"
exports.FriendStatus=void 0
var FriendStatus;(function(FriendStatus){FriendStatus[FriendStatus["Added"]=1]="Added"
FriendStatus[FriendStatus["AddedAuto"]=2]="AddedAuto"
FriendStatus[FriendStatus["Removed"]=3]="Removed"
FriendStatus[FriendStatus["Blocked"]=4]="Blocked"})((exports.FriendStatus=FriendStatus)||(exports.FriendStatus=FriendStatus={}))

},{}],89:[function(require,module,exports){
"use strict"
var assert=require("assert")
function stringUtf8Encode(str){var c
var n
var utftext=[]
str=str.replace(/\r\n/g,"\n")
for(n=0;n<str.length;++n)if((c=str.charCodeAt(n))<128)utftext.push(String.fromCharCode(c))
else if(c>127&&c<2048){utftext.push(String.fromCharCode(c>>6|192))
utftext.push(String.fromCharCode(63&c|128))}else{utftext.push(String.fromCharCode(c>>12|224))
utftext.push(String.fromCharCode(c>>6&63|128))
utftext.push(String.fromCharCode(63&c|128))}return utftext.join("")}function rotateLeft(lValue,iShiftBits){return lValue<<iShiftBits|lValue>>>32-iShiftBits}function addUnsigned(lX,lY){var lX8=2147483648&lX
var lY8=2147483648&lY
var lX4=1073741824&lX
var lY4=1073741824&lY
var lResult=(1073741823&lX)+(1073741823&lY)
if(lX4&lY4)return 2147483648^lResult^lX8^lY8
if(lX4|lY4)if(1073741824&lResult)return 3221225472^lResult^lX8^lY8
else return 1073741824^lResult^lX8^lY8
else return lResult^lX8^lY8}function F(x,y,z){return x&y|~x&z}function G(x,y,z){return x&z|y&~z}function H(x,y,z){return x^y^z}function I(x,y,z){return y^(x|~z)}function FF(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(F(b,c,d),x),ac))
return addUnsigned(rotateLeft(a,s),b)}function GG(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(G(b,c,d),x),ac))
return addUnsigned(rotateLeft(a,s),b)}function HH(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(H(b,c,d),x),ac))
return addUnsigned(rotateLeft(a,s),b)}function II(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(I(b,c,d),x),ac))
return addUnsigned(rotateLeft(a,s),b)}function convertToWordArray(string){var lMessageLength=string.length
var lNumberOfWords_temp1=lMessageLength+8
var lNumberOfWords=16*((lNumberOfWords_temp1-lNumberOfWords_temp1%64)/64+1)
var lWordArray=new Array(lNumberOfWords-1)
var lBytePosition=0
var lByteCount=0
while(lByteCount<lMessageLength){lBytePosition=lByteCount%4*8
lWordArray[(lByteCount-lByteCount%4)/4]|=string.charCodeAt(lByteCount)<<lBytePosition
lByteCount++}lWordArray[(lByteCount-lByteCount%4)/4]|=128<<(lBytePosition=lByteCount%4*8)
lWordArray[lNumberOfWords-2]=lMessageLength<<3
lWordArray[lNumberOfWords-1]=lMessageLength>>>29
return lWordArray}function wordToHex(lValue){var wordToHexValue=""
var wordToHexValue_temp=""
var lCount
for(lCount=0;lCount<=3;lCount++)wordToHexValue+=(wordToHexValue_temp="0"+(lValue>>>8*lCount&255).toString(16)).substr(wordToHexValue_temp.length-2,2)
return wordToHexValue}module.exports=function md5(string){var AA
var BB
var CC
var DD
var a
var b
var c
var d
var k
var S11=7
var S12=12
var S13=17
var S14=22
var S21=5
var S22=9
var S23=14
var S24=20
var S31=4
var S32=11
var S33=16
var S34=23
var S41=6
var S42=10
var S43=15
var S44=21
var x
if("string"===typeof string)x=convertToWordArray(string=stringUtf8Encode(string))
else assert(false)
a=1732584193
b=4023233417
c=2562383102
d=271733878
for(k=0;k<x.length;k+=16){a=FF(AA=a,BB=b,CC=c,DD=d,x[k],S11,3614090360)
d=FF(d,a,b,c,x[k+1],S12,3905402710)
c=FF(c,d,a,b,x[k+2],S13,606105819)
b=FF(b,c,d,a,x[k+3],S14,3250441966)
a=FF(a,b,c,d,x[k+4],S11,4118548399)
d=FF(d,a,b,c,x[k+5],S12,1200080426)
c=FF(c,d,a,b,x[k+6],S13,2821735955)
b=FF(b,c,d,a,x[k+7],S14,4249261313)
a=FF(a,b,c,d,x[k+8],S11,1770035416)
d=FF(d,a,b,c,x[k+9],S12,2336552879)
c=FF(c,d,a,b,x[k+10],S13,4294925233)
b=FF(b,c,d,a,x[k+11],S14,2304563134)
a=FF(a,b,c,d,x[k+12],S11,1804603682)
d=FF(d,a,b,c,x[k+13],S12,4254626195)
c=FF(c,d,a,b,x[k+14],S13,2792965006)
a=GG(a,b=FF(b,c,d,a,x[k+15],S14,1236535329),c,d,x[k+1],S21,4129170786)
d=GG(d,a,b,c,x[k+6],S22,3225465664)
c=GG(c,d,a,b,x[k+11],S23,643717713)
b=GG(b,c,d,a,x[k],S24,3921069994)
a=GG(a,b,c,d,x[k+5],S21,3593408605)
d=GG(d,a,b,c,x[k+10],S22,38016083)
c=GG(c,d,a,b,x[k+15],S23,3634488961)
b=GG(b,c,d,a,x[k+4],S24,3889429448)
a=GG(a,b,c,d,x[k+9],S21,568446438)
d=GG(d,a,b,c,x[k+14],S22,3275163606)
c=GG(c,d,a,b,x[k+3],S23,4107603335)
b=GG(b,c,d,a,x[k+8],S24,1163531501)
a=GG(a,b,c,d,x[k+13],S21,2850285829)
d=GG(d,a,b,c,x[k+2],S22,4243563512)
c=GG(c,d,a,b,x[k+7],S23,1735328473)
a=HH(a,b=GG(b,c,d,a,x[k+12],S24,2368359562),c,d,x[k+5],S31,4294588738)
d=HH(d,a,b,c,x[k+8],S32,2272392833)
c=HH(c,d,a,b,x[k+11],S33,1839030562)
b=HH(b,c,d,a,x[k+14],S34,4259657740)
a=HH(a,b,c,d,x[k+1],S31,2763975236)
d=HH(d,a,b,c,x[k+4],S32,1272893353)
c=HH(c,d,a,b,x[k+7],S33,4139469664)
b=HH(b,c,d,a,x[k+10],S34,3200236656)
a=HH(a,b,c,d,x[k+13],S31,681279174)
d=HH(d,a,b,c,x[k],S32,3936430074)
c=HH(c,d,a,b,x[k+3],S33,3572445317)
b=HH(b,c,d,a,x[k+6],S34,76029189)
a=HH(a,b,c,d,x[k+9],S31,3654602809)
d=HH(d,a,b,c,x[k+12],S32,3873151461)
c=HH(c,d,a,b,x[k+15],S33,530742520)
a=II(a,b=HH(b,c,d,a,x[k+2],S34,3299628645),c,d,x[k],S41,4096336452)
d=II(d,a,b,c,x[k+7],S42,1126891415)
c=II(c,d,a,b,x[k+14],S43,2878612391)
b=II(b,c,d,a,x[k+5],S44,4237533241)
a=II(a,b,c,d,x[k+12],S41,1700485571)
d=II(d,a,b,c,x[k+3],S42,2399980690)
c=II(c,d,a,b,x[k+10],S43,4293915773)
b=II(b,c,d,a,x[k+1],S44,2240044497)
a=II(a,b,c,d,x[k+8],S41,1873313359)
d=II(d,a,b,c,x[k+15],S42,4264355552)
c=II(c,d,a,b,x[k+6],S43,2734768916)
b=II(b,c,d,a,x[k+13],S44,1309151649)
a=II(a,b,c,d,x[k+4],S41,4149444226)
d=II(d,a,b,c,x[k+11],S42,3174756917)
c=II(c,d,a,b,x[k+2],S43,718787259)
b=II(b,c,d,a,x[k+9],S44,3951481745)
a=addUnsigned(a,AA)
b=addUnsigned(b,BB)
c=addUnsigned(c,CC)
d=addUnsigned(d,DD)}return(wordToHex(a)+wordToHex(b)+wordToHex(c)+wordToHex(d)).toLowerCase()}

},{"assert":undefined}],90:[function(require,module,exports){
(function (Buffer){(function (){
"use strict"
exports.packetBufPoolAlloc=packetBufPoolAlloc
exports.packetBufPoolFree=packetBufPoolFree
exports.packetDefaultFlags=packetDefaultFlags
exports.packetEnableDebug=packetEnableDebug
exports.packetReadIntFromBuffer=packetReadIntFromBuffer
exports.packetSizeAnsiString=packetSizeAnsiString
exports.packetSizeInt=packetSizeInt
var PACKET_DEBUG=exports.PACKET_DEBUG=1
var PACKET_RESERVED1=exports.PACKET_RESERVED1=2
var PACKET_RESERVED2=exports.PACKET_RESERVED2=4
var FLAG_PACKET_INTERNAL=PACKET_DEBUG|PACKET_RESERVED1|PACKET_RESERVED2
var PACKET_UNOWNED_BUFFER=256
var assert=require("assert")
var _base=require("./base64")
var base64Decode=_base.base64Decode
var base64Encode=_base.base64Encode
var _util=require("./util")
var deprecate=_util.deprecate
var isInteger=_util.isInteger
var log2=_util.log2
var max=Math.max
deprecate(exports,"default_flags")
var FALSYS=[void 0,null,0,false,"",NaN]
var PAK_BUF_DEFAULT_SIZE=1024
var UNDERRUN="PKTERR_UNDERRUN"
var POOL_PACKETS=5e3
var POOL_TIMEOUT=5e3
var POOL_BUF_BY_SIZE=[0,10,10,20,20,20,20,20,20,20,5e3,20,20,20,20,20,20,10,10]
var pak_pool=[]
var pak_debug_pool=[]
var buf_pool=POOL_BUF_BY_SIZE.map(function(){return[]})
function allocDataView(size){var pool_idx=log2(size)
assert(pool_idx)
if(pool_idx>=buf_pool.length)pool_idx=0
if(pool_idx){size=1<<pool_idx
if(buf_pool[pool_idx].length)return buf_pool[pool_idx].pop()}var u8=new Uint8Array(size)
var dv=new DataView(u8.buffer)
dv.u8=u8
if(pool_idx)dv.packet_pool_idx=pool_idx
return dv}function wrapU8AsDataView(u8){var dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength)
dv.u8=u8
return dv}function utf8ByteLength(str){var len=str.length
var ret=len
for(var ii=0;ii<len;++ii){var c=str.charCodeAt(ii)
if(c>127){++ret
if(c>2047){++ret
if(c>65535){++ret
if(c>2097151){++ret
if(c>67108863)++ret}}}}}return ret}function utf8WriteChar(buf,buf_offs,c){if(c>1114111)c=65535
if(c<=127)buf.u8[buf_offs++]=c
else if(c<=2047){buf.u8[buf_offs++]=c>>6|192
buf.u8[buf_offs++]=63&c|128}else if(c<=65535){buf.u8[buf_offs++]=c>>12|224
buf.u8[buf_offs++]=c>>6&63|128
buf.u8[buf_offs++]=63&c|128}else if(c<=1114111){buf.u8[buf_offs++]=c>>18|240
buf.u8[buf_offs++]=c>>12&63|128
buf.u8[buf_offs++]=c>>6&63|128
buf.u8[buf_offs++]=63&c|128}else assert(false)
return buf_offs}function poolBuf(dv){assert(dv)
assert(dv.u8)
var pool_idx=dv.packet_pool_idx
if(pool_idx){var arr=buf_pool[pool_idx]
if(arr.length<POOL_BUF_BY_SIZE[pool_idx])arr.push(dv)}}function packetBufPoolAlloc(size){return allocDataView(size)}function packetBufPoolFree(dv){poolBuf(dv)}var default_flags=0
function packetDefaultFlags(){return default_flags}function packetEnableDebug(enable){if(enable)default_flags|=PACKET_DEBUG}function Packet(flags,init_size,pak_debug){this.reinit(flags,init_size,pak_debug)}Packet.prototype.reinit=function(flags,init_size,pak_debug){this.flags=flags||0
this.has_flags=false
this.buf=null
this.buf_len=0
this.buf_offs=0
this.bufs=null
this.bsizes=null
this.readable=false
this.ref_count=1
this.pak_debug=pak_debug
if(init_size){this.fit(init_size,true)
this.buf_len=init_size}}
Packet.prototype.getRefCount=function(){return this.ref_count}
Packet.prototype.ref=function(){assert(this.ref_count);++this.ref_count}
Packet.prototype.pool=function(){assert(this.ref_count)
if(--this.ref_count)return
if(this.flags&PACKET_UNOWNED_BUFFER);else{if(this.buf)poolBuf(this.buf)
if(this.bufs)for(var ii=0;ii<this.bufs.length;++ii)poolBuf(this.bufs[ii])}if(pak_pool.length<POOL_PACKETS)pak_pool.push(this)
if(this.pak_debug)this.pak_debug.poolDebug()}
Packet.prototype.totalSize=function(){var ret=0
if(this.readable)return this.buf_len
if(this.bsizes)for(var ii=0;ii<this.bsizes.length;++ii)ret+=this.bsizes[ii]
return ret+=this.buf_offs}
Packet.prototype.setReadable=function(){assert(this.buf)
assert(!this.bufs)
assert(!this.readable)
this.readable=true}
Packet.prototype.makeReadable=function(){assert(this.buf)
assert(!this.readable)
var total=this.totalSize()
this.readable=true
if(!this.bufs){this.buf_len=total
this.buf_offs=0
return}var buf=allocDataView(total)
var u8=buf.u8
var offs=0
for(var ii=0;ii<this.bufs.length;++ii){var bsize=this.bsizes[ii]
var dv=this.bufs[ii]
if(offs+dv.u8.length>total){assert.equal(dv.byteOffset,0)
u8.set(new Uint8Array(dv.buffer,0,bsize),offs)}else u8.set(dv.u8,offs)
offs+=bsize
poolBuf(dv)}assert.equal(this.buf.byteOffset,0)
u8.set(new Uint8Array(this.buf.buffer,this.buf.byteOffset,this.buf_offs),offs)
poolBuf(this.buf)
assert.equal(offs+this.buf_offs,total)
this.bufs=this.bsizes=null
this.buf=buf
this.buf_offs=0
this.buf_len=total}
Packet.prototype.flush=function(){var buf=this.buf,buf_offs=this.buf_offs
if(!this.bufs){this.bufs=[buf]
this.bsizes=[buf_offs]}else{this.bufs.push(buf)
this.bsizes.push(buf_offs)}this.buf=null
this.buf_len=0
this.buf_offs=0}
Packet.prototype.fit=function(extra_bytes,no_advance){var buf=this.buf,buf_len=this.buf_len,buf_offs=this.buf_offs
var new_offs=buf_offs+extra_bytes
if(new_offs<=buf_len){if(!no_advance)this.buf_offs=new_offs
return buf_offs}assert(!this.readable)
if(buf)this.flush()
this.buf_len=buf_len=max(PAK_BUF_DEFAULT_SIZE,extra_bytes)
this.buf=allocDataView(buf_len)
this.buf_offs=no_advance?0:extra_bytes
return 0}
Packet.prototype.advance=function(bytes){var offs=this.buf_offs
var new_offs=offs+bytes
if((this.buf_offs=new_offs)>this.buf_len)throw new Error(UNDERRUN)
if(new_offs===this.buf_len)this.pool()
return offs}
Packet.prototype.ended=function(){return this.buf_offs===this.buf_len}
Packet.prototype.writeU8=function(v){assert(v>=0&&v<256)
var offs=this.fit(1)
this.buf.u8[offs]=v}
Packet.prototype.readU8=function(){return this.buf.u8[this.advance(1)]}
function packetSizeInt(v){assert(isInteger(v))
var neg=v<0?1:0
if(neg)v=-v
if(v<248){if(neg)return 2
return 1}else if(v<65536)return 3
else if(v<4294967296)return 5
else return 9}Packet.prototype.writeInt=function(v){assert(isInteger(v))
var offs=this.fit(9,true)
var buf=this.buf
var neg=v<0?1:0
if(neg)v=-v
if(v<248){if(neg)buf.u8[offs++]=255
buf.u8[offs++]=v}else if(v<65536){buf.u8[offs++]=248+neg
buf.setUint16(offs,v,true)
offs+=2}else if(v<4294967296){buf.u8[offs++]=250+neg
buf.setUint32(offs,v,true)
offs+=4}else{buf.u8[offs++]=252+neg
var low_bits=v>>>0
buf.setUint32(offs,low_bits,true)
buf.setUint32(offs+=4,(v-low_bits)/4294967296,true)
offs+=4}this.buf_offs=offs}
Packet.prototype.zeroInt=function(){var b1=this.buf.u8[this.buf_offs]
if(b1<248){this.buf.u8[this.buf_offs++]=0
return}this.buf_offs++
var zeroes
switch(b1){case 253:case 252:zeroes=8
break
case 251:case 250:zeroes=4
break
case 249:case 248:zeroes=2
break
case 255:zeroes=1
break
default:throw new Error("PKTERR_PACKED_INT")}while(zeroes){--zeroes
this.buf.u8[this.buf_offs++]=0}}
function packetReadIntFromBuffer(buf,offs,buf_len){if(buf_len-offs<1)return null
var b1=buf[offs++]
if(b1<248)return{v:b1,offs:offs}
var sign=1
switch(b1){case 249:sign=-1
case 248:if(buf_len-offs<2)return null
return{v:sign*buf.readUInt16LE(offs),offs:offs+=2}
case 251:sign=-1
case 250:if(buf_len-offs<4)return null
return{v:sign*buf.readUInt32LE(offs),offs:offs+=4}
case 253:sign=-1
case 252:if(buf_len-offs<8)return null
var low_bits=buf.readUInt32LE(offs)
return{v:sign*(4294967296*buf.readUInt32LE(offs+=4)+low_bits),offs:offs+=4}
case 255:if(buf_len-offs<1)return null
return{v:-buf[offs++],offs:offs}
default:throw new Error("PKTERR_PACKED_INT")}}Packet.prototype.readInt=function(){var b1=this.buf.u8[this.advance(1)]
if(b1<248)return b1
var sign=1
switch(b1){case 249:sign=-1
case 248:return sign*this.buf.getUint16(this.advance(2),true)
case 251:sign=-1
case 250:return sign*this.buf.getUint32(this.advance(4),true)
case 253:sign=-1
case 252:var low_bits=this.buf.getUint32(this.advance(4),true)
return sign*(4294967296*this.buf.getUint32(this.advance(4),true)+low_bits)
case 255:return-this.buf.u8[this.advance(1)]
default:throw new Error("PKTERR_PACKED_INT")}}
Packet.prototype.writeFloat=function(v){assert.equal(typeof v,"number")
if(!v){this.buf.u8[this.fit(1)]=0
return}var offs=this.fit(5,true)
this.buf.setFloat32(offs,v,true)
if(this.buf.u8[offs]<=1){this.buf.u8[offs++]=1
this.buf.setFloat32(offs,v,true)}this.buf_offs=offs+4}
Packet.prototype.readFloat=function(){var offs=this.advance(1)
var b1=this.buf.u8[offs]
if(!b1)return 0
if(1===b1)return this.buf.getFloat32(this.advance(4),true)
this.advance(3)
return this.buf.getFloat32(offs,true)}
Packet.prototype.writeU32=function(v){assert.equal(typeof v,"number")
this.buf.setUint32(this.fit(4),v,true)}
Packet.prototype.readU32=function(){return this.buf.getUint32(this.advance(4),true)}
Packet.prototype.writeString=function(v){assert.equal(typeof v,"string")
var byte_length=utf8ByteLength(v)
this.writeInt(byte_length)
if(!byte_length)return
var offs=this.fit(byte_length)
var buf=this.buf
for(var ii=0;ii<v.length;++ii){var c=v.charCodeAt(ii)
if(c<=127)buf.u8[offs++]=c
else offs=utf8WriteChar(buf,offs,c)}}
Packet.prototype.utf8ReadChar=function(c){var buf=this.buf
if(c>=192&&c<224)return(31&c)<<6|63&buf.u8[this.buf_offs++]
else if(c>=224&&c<240)return(15&c)<<12|(63&buf.u8[this.buf_offs++])<<6|63&buf.u8[this.buf_offs++]
else if(c>=240&&c<248)return(15&c)<<18|(63&buf.u8[this.buf_offs++])<<12|(63&buf.u8[this.buf_offs++])<<6|63&buf.u8[this.buf_offs++]
else return 65533}
var string_assembly=[]
Packet.prototype.readString=function(){var byte_length=this.readInt()
if(!byte_length)return""
if(this.buf_offs+byte_length>this.buf_len)throw new Error(UNDERRUN)
var buf=this.buf
var end_offset=this.buf_offs+byte_length
var ret
if(byte_length>8192){ret=""
while(this.buf_offs<end_offset){var c=buf.u8[this.buf_offs++]
if(c>127)c=this.utf8ReadChar(c)
ret+=String.fromCharCode(c)}}else{string_assembly.length=byte_length
var ii=0
while(this.buf_offs<end_offset){var _c=buf.u8[this.buf_offs++]
if(_c>127)_c=this.utf8ReadChar(_c)
string_assembly[ii++]=_c}if(string_assembly.length!==ii)string_assembly.length=ii
ret=String.fromCharCode.apply(void 0,string_assembly)}if(this.buf_offs===this.buf_len)this.pool()
return ret}
Packet.prototype.writeAnsiString=function(v){assert.equal(typeof v,"string")
var byte_length=v.length
this.writeInt(byte_length)
var offs=this.fit(byte_length)
var buf=this.buf
for(var ii=0;ii<byte_length;++ii)buf.u8[offs++]=v.charCodeAt(ii)}
Packet.prototype.readAnsiString=function(){var len=this.readInt()
if(!len)return""
var offs=this.advance(len)
var buf=this.buf
string_assembly.length=len
for(var ii=0;ii<len;++ii)string_assembly[ii]=buf.u8[offs++]
return String.fromCharCode.apply(void 0,string_assembly)}
function packetSizeAnsiString(v){return packetSizeInt(v.length)+v.length}Packet.prototype.writeJSON=function(v){if(!v){var idx=FALSYS.indexOf(v)
assert(-1!==idx)
this.writeU8(idx+1)
return}this.writeU8(0)
this.writeString(JSON.stringify(v))}
Packet.prototype.readJSON=function(){var byte=this.readU8()
if(byte){if(byte-1>=FALSYS.length)throw new Error("PKTERR_JSON_HEADER")
return FALSYS[byte-1]}var str=this.readString()
return JSON.parse(str)}
Packet.prototype.writeBuffer=function(v){this.writeInt(v.length)
if(v.length){var offs=this.fit(v.length)
this.buf.u8.set(v,offs)}}
var null_buf=new Uint8Array(0)
Packet.prototype.readBuffer=function(do_copy){var len=this.readInt()
if(!len)return null_buf
var offs=this.advance(len)
if(do_copy)return this.buf.u8.slice(offs,offs+len)
else{var buf=this.buf
return new Uint8Array(buf.buffer,buf.byteOffset+offs,len)}}
Packet.prototype.appendBuffer=function(v){if(v.length){var offs=this.fit(v.length)
this.buf.u8.set(v,offs)}}
Packet.prototype.writeBool=function(v){this.writeU8(v?1:0)}
Packet.prototype.readBool=function(){return Boolean(this.readU8())}
Packet.prototype.append=function(pak){assert.equal(this.flags&FLAG_PACKET_INTERNAL,pak.flags&FLAG_PACKET_INTERNAL)
if(pak.bufs)for(var ii=0;ii<pak.bufs.length;++ii){var buf=pak.bufs[ii]
var bsize=pak.bsizes[ii]
var offs=this.fit(bsize)
if(bsize!==buf.byteLength)this.buf.u8.set(new Uint8Array(buf.buffer,buf.byteOffset,bsize),offs)
else this.buf.u8.set(buf.u8,offs)}if(pak.buf){var _buf=pak.buf
var _bsize=pak.readable?pak.buf_len:pak.buf_offs
var _offs=this.fit(_bsize)
if(_bsize!==_buf.byteLength)this.buf.u8.set(new Uint8Array(_buf.buffer,_buf.byteOffset,_bsize),_offs)
else this.buf.u8.set(_buf.u8,_offs)}}
Packet.prototype.appendRemaining=function(pak){assert.equal(this.flags&FLAG_PACKET_INTERNAL,pak.flags&FLAG_PACKET_INTERNAL)
assert(pak.readable)
assert(!pak.bufs)
assert(pak.buf)
assert(pak.buf_offs<=pak.buf_len)
var bsize=pak.buf_len-pak.buf_offs
if(bsize){var offs=this.fit(bsize)
this.buf.u8.set(new Uint8Array(pak.buf.buffer,pak.buf.byteOffset+pak.buf_offs,bsize),offs)}pak.pool()}
Packet.prototype.toJSON=function(){var ret={f:this.flags}
if(this.bufs){ret.b=[]
for(var ii=0;ii<this.bufs.length;++ii)ret.b.push(base64Encode(this.bufs[ii],0,this.bsizes[ii]))}if(this.buf)if(this.readable)ret.d=base64Encode(this.buf,0,this.buf_len)
else ret.d=base64Encode(this.buf,0,this.buf_offs)
return ret}
Packet.prototype.setBuffer=function(buf,buf_len){assert(!this.buf)
assert(!this.bufs)
assert(this.flags&PACKET_UNOWNED_BUFFER)
assert(buf instanceof Uint8Array)
this.buf=wrapU8AsDataView(buf)
this.buf_len=buf_len
this.readable=true}
Packet.prototype.getBuffer=function(){assert(this.buf)
assert(!this.bufs)
return this.buf.u8}
Packet.prototype.getBufferLen=function(){assert(this.buf)
assert(!this.bufs)
return this.readable?this.buf_len:this.buf_offs}
Packet.prototype.getOffset=function(){if(this.readable)return this.buf_offs
return this.totalSize()}
Packet.prototype.seek=function(pos){assert(this.readable)
assert(pos>=0&&pos<=this.buf_len)
this.buf_offs=pos}
Packet.prototype.writeFlags=function(){assert(!this.has_flags)
assert.equal(this.buf_offs,0)
this.writeU8(this.flags)
this.has_flags=true}
Packet.prototype.updateFlags=function(flags){assert(this.has_flags)
assert(!(flags&FLAG_PACKET_INTERNAL))
this.flags=this.flags&FLAG_PACKET_INTERNAL|flags;(this.bufs?this.bufs[0]:this.buf).u8[0]=this.flags}
Packet.prototype.readFlags=function(){var read=this.readU8()
assert.equal(read,255&this.flags)
this.has_flags=true
return this.flags}
Packet.prototype.getFlags=function(){return this.flags}
Packet.prototype.getInternalFlags=function(){return this.flags&FLAG_PACKET_INTERNAL}
Packet.prototype.contents=function(){return"pak("+this.totalSize()+"b)"}
function PacketDebug(flags,init_size){this.reinit(flags,init_size)}PacketDebug.prototype.reinit=function(flags,init_size){var _this=this
this.in_pool=false
if(pak_pool.length){this.pak=pak_pool.pop()
this.pak.reinit(flags,init_size,this)}else this.pak=new Packet(flags,init_size,this)
this.warned=false
this.pool_timer=setTimeout(function(){console.warn("Packet not pooled after 5s: "+_this.contents())
_this.warned=true},POOL_TIMEOUT)}
PacketDebug.prototype.poolDebug=function(){if(this.warned)console.warn("Packet pooled after timeout")
else clearTimeout(this.pool_timer)
assert(!this.in_pool)
this.in_pool=true
if(pak_debug_pool.length<POOL_PACKETS)pak_debug_pool.push(this)}
var types=[null,"U8","U32","Int","Float","String","AnsiString","JSON","Bool","Buffer"]
types.forEach(function(type,idx){if(!type)return
var write="write"+type
var read="read"+type
var write_fn=Packet.prototype[write]
var read_fn=Packet.prototype[read]
PacketDebug.prototype[write]=function(v){this.pak.writeU8(idx)
write_fn.call(this.pak,v)}
PacketDebug.prototype[read]=function(param){var found_idx=this.pak.readU8()
if(found_idx!==idx)assert(false,"PacketDebug error: Expected "+type+"("+idx+"), found "+types[found_idx]+"("+found_idx+")")
return read_fn.call(this.pak,param)}})
PacketDebug.prototype.zeroInt=function(){this.pak.writeU8(3)
this.pak.zeroInt()};["ended","getBuffer","getBufferLen","getFlags","getInternalFlags","getOffset","getRefCount","makeReadable","pool","readFlags","ref","seek","setBuffer","setReadable","toJSON","totalSize","updateFlags","writeFlags","appendBuffer"].forEach(function(fname){var fn=Packet.prototype[fname]
PacketDebug.prototype[fname]=function(){return fn.apply(this.pak,arguments)}})
PacketDebug.prototype.append=function(pak){assert(pak instanceof PacketDebug)
this.pak.append(pak.pak)}
PacketDebug.prototype.appendRemaining=function(pak){assert(pak instanceof PacketDebug)
this.pak.appendRemaining(pak.pak)}
function format(v){switch(typeof v){case"object":if(v instanceof Uint8Array)return"u8<"+v.length+">"
return JSON.stringify(v)
default:return v}}PacketDebug.prototype.contents=function(){var pak=this.pak
var cur_offs=pak.getOffset()
var read_len=cur_offs
var ret=["buf:"+pak.buf_offs+"/"+pak.buf_len]
if(pak.bufs){pak.makeReadable()
ret.push("bufs")}else if(pak.buf){if(pak.readable)read_len=pak.buf_len
pak.buf_offs=0}else{ret.push("empty")
read_len=-1}var saved_ref_count=pak.ref_count
pak.ref_count=2
try{if(!saved_ref_count)ret.push("!ref_count=0!")
if(pak.has_flags)ret.push("flags:"+pak.readU8())
while(pak.buf_offs<read_len){var type_idx=pak.readU8()
var type=types[type_idx]
if(!type){ret.push("UnknownType:"+type_idx)
break}var val=pak["read"+type]()
ret.push(type+":"+format(val))}}catch(e){ret.push("Error dumping packet contents: "+e)}pak.ref_count=saved_ref_count
pak.buf_offs=cur_offs
return ret.join(",")}
function packetCreate(flags,init_size){if(void 0===flags)flags=default_flags
var pool=flags&PACKET_DEBUG?pak_debug_pool:pak_pool
if(pool.length){var pak=pool.pop()
pak.reinit(flags,init_size)
return pak}if(flags&PACKET_DEBUG)return new PacketDebug(flags,init_size)
return new Packet(flags,init_size)}exports.packetCreate=packetCreate
function packetFromBuffer(buf,buf_len,need_copy){var flags=buf[0]
assert.equal(typeof flags,"number")
if(need_copy){assert(buf_len)
assert(buf.buffer instanceof ArrayBuffer)
var pak=packetCreate(flags,buf_len)
if(buf.byteLength!==buf_len)buf=Buffer.from(buf.buffer,buf.byteOffset,buf_len)
pak.getBuffer().set(buf)
pak.setReadable()
return pak}else{assert(buf instanceof Uint8Array)
var _pak=packetCreate(flags|PACKET_UNOWNED_BUFFER)
_pak.setBuffer(buf,buf_len||buf.byteLength)
return _pak}}exports.packetFromBuffer=packetFromBuffer
function packetFromJSON(js_obj){var pak=packetCreate(js_obj.f)
var payload=pak.pak||pak
function decode(str){return base64Decode(str,allocDataView)}if(js_obj.b){payload.bsizes=[]
payload.bufs=[]
for(var ii=0;ii<js_obj.b.length;++ii){var buf=decode(js_obj.b[ii])
payload.bufs.push(buf)
payload.bsizes.push(buf.decode_size)
delete buf.decode_size}}if(js_obj.d){payload.buf=decode(js_obj.d)
payload.buf_len=payload.buf.decode_size
delete payload.buf.decode_size
payload.buf_offs=0}return pak}exports.packetFromJSON=packetFromJSON
function isPacket(thing){return thing instanceof Packet||thing instanceof PacketDebug}exports.isPacket=isPacket

}).call(this)}).call(this,require("buffer").Buffer)

},{"./base64":80,"./util":96,"assert":undefined,"buffer":undefined}],91:[function(require,module,exports){
"use strict"
exports.perfCounterAdd=perfCounterAdd
exports.perfCounterAddValue=perfCounterAddValue
exports.perfCounterHistory=perfCounterHistory
exports.perfCounterSetBucketTime=perfCounterSetBucketTime
exports.perfCounterTick=perfCounterTick
var NUM_BUCKETS=5
var counters={time_start:Date.now()}
var hist=[counters]
var bucket_time=1e4
var countdown=bucket_time
function perfCounterSetBucketTime(time){countdown=bucket_time=time}function perfCounterAdd(key){counters[key]=(counters[key]||0)+1}function perfCounterAddValue(key,value){counters[key]=(counters[key]||0)+value}function perfCounterTick(dt,log){if((countdown-=dt)<=0){countdown=bucket_time
if(hist.length===NUM_BUCKETS)hist.splice(0,1)
var now=Date.now()
counters.time_end=now
if(log)log(counters);(counters={}).time_start=now
hist.push(counters)}}function perfCounterHistory(){return hist}

},{}],92:[function(require,module,exports){
"use strict"
exports.platformGetValidIDs=platformGetValidIDs
exports.platformIsValid=platformIsValid
exports.platformOverrideParameter=platformOverrideParameter
exports.platformParameter=platformParameter
exports.platformRegister=platformRegister
var assert=require("assert")
var platforms=Object.create(null)
var too_late_to_register=false
function platformRegister(id,def){assert(!too_late_to_register)
assert(!platforms[id]||"web"===id)
platforms[id]=def}function platformGetValidIDs(){return Object.keys(platforms)}function platformIsValid(v){too_late_to_register=true
return Boolean("string"===typeof v&&platforms[v])}var parameter_overrides=Object.create(null)
function platformParameter(platform,parameter){var override=parameter_overrides[parameter]
if(void 0!==override)return override
var platdef=platforms[platform]
assert(platdef)
return platdef[parameter]}function platformOverrideParameter(parameter,value){parameter_overrides[parameter]=value}platformRegister("web",{devmode:"auto",reload:true,reload_updates:true,random_creation_name:false})

},{"assert":undefined}],93:[function(require,module,exports){
"use strict"
exports.mashI53=mashI53
exports.mashString=mashString
exports.randCreate=randCreate
exports.shuffleArray=shuffleArray
function mashString(data){var n=4022871197
for(var i=0;i<data.length;i++){var h=.02519603282416938*(n+=data.charCodeAt(i))
h-=n=h>>>0
n=(h*=n)>>>0
n+=4294967296*(h-=n)}return n>>>0}function mashI53(data){var n=4022871197
while(data){var byte=data%256
data=(data-byte)/256
var h=.02519603282416938*(n+=byte)
h-=n=h>>>0
n=(h*=n)>>>0
n+=4294967296*(h-=n)}return 2.3283064365386963e-10*(n>>>0)}function Mash(){this.n=3228327880}Mash.prototype.mash=function(data){var n=this.n+data
var h=.02519603282416938*n
h-=n=h>>>0
n=(h*=n)>>>0
return 2.3283064365386963e-10*((this.n=n+=4294967296*(h-=n))>>>0)}
function Alea(seed){this.reseed(seed)}Alea.prototype.reseed=function(seed){if(seed>=4294967296)seed=mashI53(seed)
this.c=1
var mash=new Mash
this.s0=.3014581324532628
this.s1=.2643220406025648
this.s2=.7516536582261324
this.s0-=mash.mash(seed)
if(this.s0<0)this.s0+=1
this.s1-=mash.mash(seed)
if(this.s1<0)this.s1+=1
this.s2-=mash.mash(seed)
if(this.s2<0)this.s2+=1}
Alea.prototype.step=function(){var t=2091639*this.s0+2.3283064365386963e-10*this.c
this.s0=this.s1
this.s1=this.s2
return this.s2=t-(this.c=0|t)}
Alea.prototype.uint32=function(){return 4294967296*this.step()}
Alea.prototype.fract53=function(){return this.step()+11102230246251565e-32*(2097152*this.step()|0)}
Alea.prototype.random=Alea.prototype.step
Alea.prototype.range=function(range){return this.step()*range|0}
Alea.prototype.floatBetween=function(a,b){return a+(b-a)*this.random()}
Alea.prototype.exportState=function(){return[this.s0,this.s1,this.s2,this.c]}
Alea.prototype.importState=function(i){this.s0=i[0]
this.s1=i[1]
this.s2=i[2]
this.c=i[3]}
function randCreate(seed){return new Alea(seed)}function shuffleArray(rand,arr){for(var ii=arr.length-1;ii>=1;--ii){var swap=rand.range(ii+1)
var t=arr[ii]
arr[ii]=arr[swap]
arr[swap]=t}}

},{}],94:[function(require,module,exports){
"use strict"
exports.FORMAT_PACK=1
exports.FORMAT_PNG=2
exports.TEXPACK_MAGIC=2403967826

},{}],95:[function(require,module,exports){
"use strict"
var assert=require("assert")
function EventEmitter(){this._listeners={}}module.exports=EventEmitter
Object.defineProperty(module.exports,"EventEmitter",{value:EventEmitter,enumerable:false})
function addListener(ee,type,fn,once){assert("function"===typeof fn)
var arr=ee._listeners[type]
if(!arr)arr=ee._listeners[type]=[]
arr.push({once:once,fn:fn})}EventEmitter.prototype.hasListener=function(type,fn){var arr=this._listeners[type]
if(!arr)return false
for(var ii=0;ii<arr.length;++ii)if(arr[ii].fn===fn)return true
return false}
EventEmitter.prototype.on=function(type,fn){addListener(this,type,fn,0)
return this}
EventEmitter.prototype.once=function(type,fn){addListener(this,type,fn,1)
return this}
EventEmitter.prototype.removeListener=function(type,fn){var arr=this._listeners[type]
assert(arr)
for(var ii=0;ii<arr.length;++ii)if(arr[ii].fn===fn){arr.splice(ii,1)
return this}assert(false)
return this}
function filterNotOnce(elem){return!elem.once}EventEmitter.prototype.emit=function(type){var arr=this._listeners[type]
if(!arr)return false
var any=false
var any_once=false
for(var _len=arguments.length,args=new Array(_len>1?_len-1:0),_key=1;_key<_len;_key++)args[_key-1]=arguments[_key]
for(var ii=0;ii<arr.length;++ii){var elem=arr[ii]
any=true
elem.fn.apply(elem,args)
if(elem.once)any_once=true}if(any_once)this._listeners[type]=arr.filter(filterNotOnce)
return any}

},{"assert":undefined}],96:[function(require,module,exports){
"use strict"
exports.VALID_USER_ID_REGEX=exports.EMAIL_REGEX=void 0
exports.arrayToSet=arrayToSet
exports.asyncDictionaryGet=asyncDictionaryGet
exports.callEach=callEach
exports.callbackify=callbackify
exports.clamp=clamp
exports.cleanStringSplit=cleanStringSplit
exports.cleanupStringArray=cleanupStringArray
exports.clone=clone
exports.cloneShallow=cloneShallow
exports.cmpNumericSmart=cmpNumericSmart
exports.dateToFileTimestamp=dateToFileTimestamp
exports.dateToSafeLocaleString=dateToSafeLocaleString
exports.deepAdd=deepAdd
exports.deepEqual=deepEqual
exports.defaults=defaults
exports.defaultsDeep=defaultsDeep
exports.deprecate=deprecate
exports.easeIn=easeIn
exports.easeInOut=easeInOut
exports.easeOut=easeOut
exports.eatPossiblePromise=eatPossiblePromise
exports.empty=empty
exports.errorString=errorString
exports.fract=fract
exports.has=has
exports.identity=identity
exports.inherits=inherits
exports.isInteger=isInteger
exports.isPowerOfTwo=isPowerOfTwo
exports.lerp=lerp
exports.lerpAngle=lerpAngle
exports.lineCircleIntersect=lineCircleIntersect
exports.lineLineIntersect=lineLineIntersect
exports.log2=log2
exports.logdata=logdata
exports.map01=map01
exports.matchAll=matchAll
exports.mdEscape=mdEscape
exports.merge=merge
exports.mix=mix
exports.mod=mod
exports.msToSS2020=msToSS2020
exports.msToTimeString=msToTimeString
exports.nearSame=nearSame
exports.nearSameAngle=nearSameAngle
exports.nextHighestPowerOfTwo=nextHighestPowerOfTwo
exports.nop=nop
exports.objectToSet=objectToSet
exports.once=once
exports.plural=plural
exports.randomNot=randomNot
exports.removeSymbols=removeSymbols
exports.ridx=ridx
exports.round100=round100
exports.round1000=round1000
exports.sanitize=sanitize
exports.secondsSince2020=secondsSince2020
exports.secondsToFriendlyString=secondsToFriendlyString
exports.shortAngleDist=shortAngleDist
exports.sign=sign
exports.ss2020ToMS=ss2020ToMS
exports.tail=tail
exports.titleCase=titleCase
exports.toArray=toArray
exports.toNumber=toNumber
exports.trimEnd=trimEnd
exports.unpromisify=unpromisify
var assert=require("assert")
var PI=Math.PI,abs=Math.abs,floor=Math.floor,min=Math.min,max=Math.max,random=Math.random,round=Math.round,pow=Math.pow,sqrt=Math.sqrt
var TWO_PI=2*PI
var EMAIL_REGEX=/^[^\s@]+@[^\s@]+\.[^\s@]+$/
exports.EMAIL_REGEX=EMAIL_REGEX
var VALID_USER_ID_REGEX=/^(?:fb\$|[a-z0-9])[a-z0-9_]{1,32}$/
exports.VALID_USER_ID_REGEX=VALID_USER_ID_REGEX
function nop(){}function identity(a){return a}function once(fn){var called=false
return function(){if(called)return
called=true
fn.apply(void 0,arguments)}}function empty(obj){for(var key in obj)return false
return true}function easeInOut(v,a){var va=pow(v,a)
return va/(va+pow(1-v,a))}function easeIn(v,a){return 2*easeInOut(.5*v,a)}function easeOut(v,a){return 2*easeInOut(.5+.5*v,a)-1}function clone(obj){if(!obj)return obj
return JSON.parse(JSON.stringify(obj))}function merge(dest,src){for(var _f in src)dest[_f]=src[_f]
return dest}function has(obj,field){return Object.prototype.hasOwnProperty.call(obj,field)}function defaults(dest,src){for(var _f2 in src)if(!has(dest,_f2))dest[_f2]=src[_f2]
return dest}function defaultsDeep(dest,src){for(var _f3 in src)if(!has(dest,_f3))dest[_f3]=src[_f3]
else{var vd=dest[_f3]
var vs=src[_f3]
if("object"===typeof vd&&!Array.isArray(vd)&&"object"===typeof vs&&!Array.isArray(vs))defaultsDeep(vd,src[_f3])}return dest}function cloneShallow(src){return merge({},src)}function deepEqual(a,b){if(Array.isArray(a)){if(!Array.isArray(b))return false
if(a.length!==b.length)return false
for(var ii=0;ii<a.length;++ii)if(!deepEqual(a[ii],b[ii]))return false
return true}else if("object"===typeof a){if("object"!==typeof b)return false
if(!a||!b)return!a&&!b
for(var key in a)if(!deepEqual(a[key],b[key]))return false
for(var _key in b)if(void 0!==b[_key]&&void 0===a[_key])return false
return true}return a===b}function deepAdd(dest,src){assert(dest&&src)
for(var key in src){var _value=src[key]
var dest_value=dest[key]
if("object"===typeof _value){assert(_value)
var dest_sub=dest[key]=dest_value||{}
assert.equal(typeof dest_sub,"object")
deepAdd(dest_sub,_value)}else{if(!dest_value)dest_value=0
assert("number"===typeof dest_value)
assert("number"===typeof _value)
dest[key]=(dest_value||0)+_value}}}function clamp(v,mn,mx){return min(max(mn,v),mx)}function lerp(a,v0,v1){return(1-a)*v0+a*v1}function shortAngleDist(a0,a1){var delta=(a1-a0)%TWO_PI
return 2*delta%TWO_PI-delta}function lerpAngle(t,a0,a1){var r=a0+shortAngleDist(a0,a1)*t
if(r<0)r+=TWO_PI
return r}function mix(v0,v1,a){return(1-a)*v0+a*v1}function map01(number,in_min,in_max){return(number-in_min)/(in_max-in_min)}function sign(a){return a<0?-1:a>0?1:0}function mod(a,n){return(a%n+n)%n}function log2(val){for(var ii=1,jj=0;;ii<<=1,++jj)if(ii>=val)return jj}function ridx(arr,idx){arr[idx]=arr[arr.length-1]
arr.pop()}function tail(arr){if(!arr.length)return null
return arr[arr.length-1]}function round100(a){return round(100*a)/100}function round1000(a){return round(1e3*a)/1e3}function fract(a){return a-floor(a)}function nearSame(a,b,tol){return abs(b-a)<=tol}function nearSameAngle(a,b,tol){return abs(shortAngleDist(a,b))<=tol}function titleCase(str){return str.split(" ").map(function(word){return""+word[0].toUpperCase()+word.slice(1)}).join(" ")}var EPSILON=1e-5
function lineCircleIntersect(p1,p2,pCircle,radius){var dp=[p2[0]-p1[0],p2[1]-p1[1]]
var a=dp[0]*dp[0]+dp[1]*dp[1]
var b=2*(dp[0]*(p1[0]-pCircle[0])+dp[1]*(p1[1]-pCircle[1]))
var c=pCircle[0]*pCircle[0]+pCircle[1]*pCircle[1]
c+=p1[0]*p1[0]+p1[1]*p1[1]
c-=2*(pCircle[0]*p1[0]+pCircle[1]*p1[1])
var bb4ac=b*b-4*a*(c-=radius*radius)
if(abs(a)<EPSILON||bb4ac<0)return false
var mu1=(-b+sqrt(bb4ac))/(2*a)
var mu2=(-b-sqrt(bb4ac))/(2*a)
if(mu1>=0&&mu1<=1||mu2>=0&&mu2<=1)return true
return false}function lineLineIntersect(p1,p2,p3,p4){var denominator=(p4[1]-p3[1])*(p2[0]-p1[0])-(p4[0]-p3[0])*(p2[1]-p1[1])
var numa=(p4[0]-p3[0])*(p1[1]-p3[1])-(p4[1]-p3[1])*(p1[0]-p3[0])
var numb=(p2[0]-p1[0])*(p1[1]-p3[1])-(p2[1]-p1[1])*(p1[0]-p3[0])
if(0===denominator){if(!numa&&!numb)return true
return false}var ua=numa/denominator
var ub=numb/denominator
if(ua<0||ua>1||ub<0||ub>1)return false
return true}function inherits(ctor,superCtor){assert("function"===typeof superCtor)
var ctor_proto_orig=ctor.prototype
ctor.prototype=Object.create(superCtor.prototype,{constructor:{value:ctor,enumerable:false,writable:true,configurable:true}})
for(var key in ctor_proto_orig)ctor.prototype[key]=ctor_proto_orig[key]
for(var _key2 in superCtor)ctor[_key2]=superCtor[_key2]}function isPowerOfTwo(n){return 0===(n&n-1)}function nextHighestPowerOfTwo(x){--x
for(var i=1;i<32;i<<=1)x|=x>>i
return x+1}function logdata(data){if(void 0===data)return""
var r=JSON.stringify(data)
if(r.length<120)return r
return r.slice(0,117)+"...("+r.length+")"}function isInteger(v){return"number"===typeof v&&isFinite(v)&&floor(v)===v}function toNumber(v){return Number(v)}function randomNot(not_value,min_value,max_value){var new_value
var range=max_value-min_value
do{new_value=floor(min_value+random()*range)}while(new_value===not_value)
return new_value}function toArray(array_like){return Array.prototype.slice.call(array_like)}function arrayToSet(array){var ret=Object.create(null)
for(var ii=0;ii<array.length;++ii)ret[array[ii]]=true
return ret}function objectToSet(obj){return merge(Object.create(null),obj)}function matchAll(str,re){var ret=[]
var m
do{if(m=re.exec(str))ret.push(m[1])}while(m)
return ret}function callEach(arr,pre_clear){if(arr&&arr.length){for(var _len=arguments.length,args=new Array(_len>2?_len-2:0),_key3=2;_key3<_len;_key3++)args[_key3-2]=arguments[_key3]
for(var ii=0;ii<arr.length;++ii)arr[ii].apply(arr,args)}}var sanitize_regex=/[\uD800-\uDFFF\x00-\x1F\x7F\u1D54\u1D55\u2000-\u200F\u205F-\u206F\uFE00]/g
function sanitize(str){return(str||"").replace(sanitize_regex,"")}function plural(number,label){return label+(1===number?"":"s")}function secondsToFriendlyString(seconds,force_include_seconds){var days=floor(seconds/86400)
var hours=floor((seconds-=60*days*60*24)/3600)
var minutes=floor((seconds-=60*hours*60)/60)
seconds-=60*minutes
var resp=[]
if(days){var years=floor(days/365.25)
if(years){days-=floor(365.25*years)
resp.push(years+" "+plural(years,"year"))}resp.push(days+" "+plural(days,"day"))}if(hours)resp.push(hours+" "+plural(hours,"hour"))
if(minutes||!resp.length)resp.push(minutes+" "+plural(minutes,"minute"))
if(force_include_seconds)resp.push(seconds+" "+plural(seconds,"second"))
return resp.join(", ")}function secondsSince2020(){return floor(Date.now()/1e3)-1577836800}function dateToSafeLocaleString(date,date_only,options){var date_text
try{date_text=date_only?date.toLocaleDateString(void 0,options):date.toLocaleString(void 0,options)}catch(e){console.error(e,"(Using toString as fallback)")
date_text=date_only?date.toDateString():date.toString()}return date_text}function dateToFileTimestamp(date){function pad(value){return""+(value<10?0:"")+value}return date.getFullYear()+"-"+pad(date.getMonth()+1)+"-"+pad(date.getDate())+" "+pad(date.getHours())+"_"+pad(date.getMinutes())+"_"+pad(date.getSeconds())}function msToTimeString(duration,opts){var ms=duration%1e3
var s
var m
var h
h=(m=(s=duration-ms)-(s%=6e4))-(m%=36e5)
m/=6e4
return((h/=36e5)?h+":":"")+(h&&m<10?"0":"")+m+":"+((s/=1e3)<10?"0":"")+s+((opts=opts||{}).hide_ms?"":"."+(ms<10?"00":ms<100?"0":"")+ms)}function removeSymbols(string){return string.replace(/[.,/\\@#£!$%^&*;:<>{}|?=\-+_`'"~[\]()]/g,"").replace(/\s{1,}/g," ")}var sw=arrayToSet(["am","an","and","as","at","be","by","el","for","in","is","la","las","los","of","on","or","the","that","this","to","with"])
function cleanupStringArray(string_array){return string_array.filter(function(s){return s.length>1&&s.length<=32&&!sw[s]})}function cleanStringSplit(string,pattern){return cleanupStringArray(removeSymbols(sanitize(string)).toLowerCase().split(pattern).map(function(s){return s.trim()}))}function eatPossiblePromise(p){if(p&&p.catch)p.catch(nop)}function errorString(e){var msg=String(e)
if("[object Object]"===msg)try{msg=JSON.stringify(e)}catch(ignored){}if(e&&e.stack&&e.message)msg=String(e.message)
return msg=msg.slice(0,600)}function deprecate(exports,field,replacement){Object.defineProperty(exports,field,{get:function get(){assert(false,field+" is deprecated, use "+replacement+" instead")
return}})}var nextTick="undefined"!==typeof process?process.nextTick:"undefined"!==typeof window&&window.setImmediate?window.setImmediate:function(fn){return setTimeout(fn,1)}
function callbackify(f){return function(){var _this=this
var cb=arguments[arguments.length-1]
assert.equal(typeof cb,"function")
var args=Array.prototype.slice.call(arguments,0,-1)
f.apply(this,args).then(function(result){if(cb){nextTick(cb.bind(_this,null,result))
cb=null}}).catch(function(err){if(cb){nextTick(cb.bind(_this,err))
cb=null}})}}function unpromisify(f){return function(){nextTick(f.apply.bind(f,this,arguments))}}function msToSS2020(milliseconds){return floor(milliseconds/1e3)-1577836800}function ss2020ToMS(ss2020){return 1e3*(ss2020+1577836800)}var whitespace_regex=/\s/
function trimEnd(s){var idx=s.length
while(idx>0&&s[idx-1].match(whitespace_regex))--idx
return s.slice(0,idx)}function isDigit(c){return c>="0"&&c<="9"}var char_code_0="0".charCodeAt(0)
function cmpNumericSmart(a,b){var ia=0
var ib=0
while(ia<a.length&&ib<b.length)if(isDigit(a[ia]))if(isDigit(b[ib])){var va=0
while(isDigit(a[ia])){va*=10
va+=a.charCodeAt(ia++)-char_code_0}var vb=0
while(isDigit(b[ib])){vb*=10
vb+=b.charCodeAt(ib++)-char_code_0}var d=va-vb
if(d)return d}else return-1
else if(isDigit(b[ib]))return 1
else{var _d=a[ia].toLowerCase().charCodeAt(0)-b[ib].toLowerCase().charCodeAt(0)
if(_d)return _d
ia++
ib++}if(ia<a.length)return 1
else if(ib<b.length)return-1
else return 0}function mdEscape(text){return text.replace(/([\\[*_])/g,"\\$1")}var async_dict_caches={}
function asyncDictionaryGet(cache_in,key,get,cb){if("string"===typeof cache_in)cache_in=async_dict_caches[cache_in]=async_dict_caches[cache_in]||{}
var cache=cache_in
var elem=cache[key]
if(elem){if(elem.in_flight)elem.in_flight.push(cb)
else cb(elem.value)
return}cache[key]=elem={in_flight:[cb]}
get(key,function(value){assert(elem)
elem.value=value
callEach(elem.in_flight,elem.in_flight=void 0,value)})}

},{"assert":undefined}],97:[function(require,module,exports){
"use strict"
var should_throw=true
function verify(exp,msg){if(!exp&&should_throw)throw new Error("Assertion failed"+(msg?": "+msg:""))
return exp}(function(_verify){_verify.ok=verify
function equal(a,b){if(a===b)return true
if(should_throw)throw new Error('Assertion failed: "'+a+'"==="'+b+'"')
return false}_verify.equal=equal
function dothrow(doit){should_throw=doit}_verify.dothrow=dothrow
function shouldThrow(){return should_throw}_verify.shouldThrow=shouldThrow
function unreachable(x){verify(false)
return false}_verify.unreachable=unreachable})(verify=verify||{})
module.exports=verify

},{}],98:[function(require,module,exports){
"use strict"
exports.identity_mat4=exports.identity_mat3=exports.half_vec=void 0
exports.ivec2=ivec2
exports.ivec3=ivec3
exports.m4TransformVec3=m4TransformVec3
exports.mat4=exports.mat3=void 0
exports.mat4isFinite=mat4isFinite
exports.unit_vec=exports.rovec4=exports.rovec3=exports.rovec2=exports.rovec1=exports.roivec3=exports.roivec2=void 0
exports.v2abs=v2abs
exports.v2add=v2add
exports.v2addScale=v2addScale
exports.v2angle=v2angle
exports.v2copy=v2copy
exports.v2dist=v2dist
exports.v2distSq=v2distSq
exports.v2div=v2div
exports.v2dot=v2dot
exports.v2floor=v2floor
exports.v2iFloor=v2iFloor
exports.v2iNormalize=v2iNormalize
exports.v2iRound=v2iRound
exports.v2iScale=v2iScale
exports.v2length=v2length
exports.v2lengthSq=v2lengthSq
exports.v2lerp=v2lerp
exports.v2linePointDist=v2linePointDist
exports.v2mul=v2mul
exports.v2normalize=v2normalize
exports.v2round=v2round
exports.v2same=v2same
exports.v2scale=v2scale
exports.v2set=v2set
exports.v2sub=v2sub
exports.v3add=v3add
exports.v3addScale=v3addScale
exports.v3angle=v3angle
exports.v3clone=v3clone
exports.v3copy=v3copy
exports.v3cross=v3cross
exports.v3determinant=v3determinant
exports.v3dist=v3dist
exports.v3distSq=v3distSq
exports.v3div=v3div
exports.v3dot=v3dot
exports.v3floor=v3floor
exports.v3iAdd=v3iAdd
exports.v3iAddScale=v3iAddScale
exports.v3iFloor=v3iFloor
exports.v3iMax=v3iMax
exports.v3iMin=v3iMin
exports.v3iMul=v3iMul
exports.v3iNormalize=v3iNormalize
exports.v3iRound=v3iRound
exports.v3iScale=v3iScale
exports.v3iSub=v3iSub
exports.v3length=v3length
exports.v3lengthSq=v3lengthSq
exports.v3lerp=v3lerp
exports.v3min=v3min
exports.v3mul=v3mul
exports.v3mulMat4=v3mulMat4
exports.v3normalize=v3normalize
exports.v3perspectiveProject=v3perspectiveProject
exports.v3pow=v3pow
exports.v3round=v3round
exports.v3same=v3same
exports.v3scale=v3scale
exports.v3scaleFloor=v3scaleFloor
exports.v3set=v3set
exports.v3sub=v3sub
exports.v3zero=v3zero
exports.v4add=v4add
exports.v4clone=v4clone
exports.v4copy=v4copy
exports.v4dot=v4dot
exports.v4fromRGBA=v4fromRGBA
exports.v4lerp=v4lerp
exports.v4mul=v4mul
exports.v4mulAdd=v4mulAdd
exports.v4same=v4same
exports.v4scale=v4scale
exports.v4set=v4set
exports.v4zero=v4zero
exports.vec1=vec1
exports.vec2=vec2
exports.vec3=vec3
exports.vec4=vec4
exports.zero_vec=exports.zaxis=exports.yaxis=exports.xaxis=void 0
var mat3Create=require("gl-mat3/create")
var mat4Create=require("gl-mat4/create")
var abs=Math.abs,acos=Math.acos,max=Math.max,min=Math.min,floor=Math.floor,pow=Math.pow,round=Math.round,sqrt=Math.sqrt
var mat3=mat3Create
exports.mat3=mat3
var mat4=mat4Create
exports.mat4=mat4
function vec1(v){return new Float64Array([v||0])}var rovec1=vec1
exports.rovec1=rovec1
function vec2(a,b){var r=new Float64Array(2)
if(a||b){r[0]=a
r[1]=b}return r}var rovec2=vec2
exports.rovec2=rovec2
function ivec2(a,b){var r=new Int32Array(2)
if(a||b){r[0]=a
r[1]=b}return r}var roivec2=ivec2
exports.roivec2=roivec2
function vec3(a,b,c){var r=new Float64Array(3)
if(a||b||c){r[0]=a
r[1]=b
r[2]=c}return r}var rovec3=vec3
exports.rovec3=rovec3
function ivec3(a,b,c){var r=new Int32Array(3)
if(a||b||c){r[0]=a
r[1]=b
r[2]=c}return r}var roivec3=ivec3
exports.roivec3=roivec3
function vec4(a,b,c,d){var r=new Float64Array(4)
if(a||b||c||d){r[0]=a
r[1]=b
r[2]=c
r[3]=d}return r}var rovec4=vec4
exports.rovec4=rovec4
function frozenVec4(a,b,c,d){return rovec4(a,b,c,d)}var unit_vec=frozenVec4(1,1,1,1)
exports.unit_vec=unit_vec
var half_vec=frozenVec4(.5,.5,.5,.5)
exports.half_vec=half_vec
var zero_vec=frozenVec4(0,0,0,0)
exports.zero_vec=zero_vec
var identity_mat3=mat3()
exports.identity_mat3=identity_mat3
var identity_mat4=mat4()
exports.identity_mat4=identity_mat4
var xaxis=frozenVec4(1,0,0,0)
exports.xaxis=xaxis
var yaxis=frozenVec4(0,1,0,0)
exports.yaxis=yaxis
var zaxis=frozenVec4(0,0,1,0)
exports.zaxis=zaxis
function v2abs(out,a){out[0]=abs(a[0])
out[1]=abs(a[1])
return out}function v2add(out,a,b){out[0]=a[0]+b[0]
out[1]=a[1]+b[1]
return out}function v2addScale(out,a,b,s){out[0]=a[0]+b[0]*s
out[1]=a[1]+b[1]*s
return out}function v2angle(a,b){var mag=sqrt((a[0]*a[0]+a[1]*a[1])*(b[0]*b[0]+b[1]*b[1]))
return acos(min(max(mag&&(a[0]*b[0]+a[1]*b[1])/mag,-1),1))}function v2copy(out,a){out[0]=a[0]
out[1]=a[1]
return out}function v2dist(a,b){return sqrt((a[0]-b[0])*(a[0]-b[0])+(a[1]-b[1])*(a[1]-b[1]))}function v2distSq(a,b){return(a[0]-b[0])*(a[0]-b[0])+(a[1]-b[1])*(a[1]-b[1])}function v2div(out,a,b){out[0]=a[0]/b[0]
out[1]=a[1]/b[1]
return out}function v2dot(a,b){return a[0]*b[0]+a[1]*b[1]}function v2floor(out,a){out[0]=floor(a[0])
out[1]=floor(a[1])
return out}function v2iFloor(inout){inout[0]=floor(inout[0])
inout[1]=floor(inout[1])
return inout}function v2lengthSq(a){return a[0]*a[0]+a[1]*a[1]}function v2length(a){return sqrt(v2lengthSq(a))}function v2lerp(out,t,a,b){var it=1-t
out[0]=it*a[0]+t*b[0]
out[1]=it*a[1]+t*b[1]
return out}function v2mul(out,a,b){out[0]=a[0]*b[0]
out[1]=a[1]*b[1]
return out}function v2normalize(out,a){var len=a[0]*a[0]+a[1]*a[1]
if(len>0){len=1/sqrt(len)
out[0]=a[0]*len
out[1]=a[1]*len}return out}function v2iNormalize(inout){var len=inout[0]*inout[0]+inout[1]*inout[1]
if(len>0){len=1/sqrt(len)
inout[0]*=len
inout[1]*=len}return inout}function v2round(out,a){out[0]=round(a[0])
out[1]=round(a[1])
return out}function v2iRound(inout){inout[0]=round(inout[0])
inout[1]=round(inout[1])
return inout}function v2same(a,b){return a[0]===b[0]&&a[1]===b[1]}function v2scale(out,a,s){out[0]=a[0]*s
out[1]=a[1]*s
return out}function v2iScale(inout,s){inout[0]*=s
inout[1]*=s
return inout}function v2set(out,a,b){out[0]=a
out[1]=b
return out}function v2sub(out,a,b){out[0]=a[0]-b[0]
out[1]=a[1]-b[1]
return out}var v2temp=vec2()
function v2linePointDist(p1,p2,test){v2sub(v2temp,p2,p1)
var line_len_sq=v2lengthSq(v2temp)
if(!line_len_sq)return v2dist(p1,test)
var u=((test[0]-p1[0])*v2temp[0]+(test[1]-p1[1])*v2temp[1])/line_len_sq
if(u<=0)return v2dist(p1,test)
else if(u>=1)return v2dist(p2,test)
v2addScale(v2temp,p1,v2temp,u)
return v2dist(v2temp,test)}function v3add(out,a,b){out[0]=a[0]+b[0]
out[1]=a[1]+b[1]
out[2]=a[2]+b[2]
return out}function v3iAdd(inout,b){inout[0]+=b[0]
inout[1]+=b[1]
inout[2]+=b[2]
return inout}function v3addScale(out,a,b,s){out[0]=a[0]+b[0]*s
out[1]=a[1]+b[1]*s
out[2]=a[2]+b[2]*s
return out}function v3iAddScale(inout,b,s){inout[0]+=b[0]*s
inout[1]+=b[1]*s
inout[2]+=b[2]*s
return inout}function v3angle(a,b){var mag=sqrt((a[0]*a[0]+a[1]*a[1]+a[2]*a[2])*(b[0]*b[0]+b[1]*b[1]+b[2]*b[2]))
return acos(min(max(mag&&(a[0]*b[0]+a[1]*b[1]+a[2]*b[2])/mag,-1),1))}function v3clone(a){return a.slice(0)}function v3copy(out,a){out[0]=a[0]
out[1]=a[1]
out[2]=a[2]
return out}function v3cross(out,a,b){var a0=a[0]
var a1=a[1]
var a2=a[2]
var b0=b[0]
var b1=b[1]
var b2=b[2]
out[0]=a1*b2-a2*b1
out[1]=a2*b0-a0*b2
out[2]=a0*b1-a1*b0
return out}function v3determinant(a,b,c){var a00=a[0]
var a01=b[0]
var a02=c[0]
var a10=a[1]
var a11=b[1]
var a12=c[1]
var a20=a[2]
var a21=b[2]
var a22=c[2]
return a00*(a22*a11-a12*a21)+a01*(-a22*a10+a12*a20)+a02*(a21*a10-a11*a20)}function v3distSq(a,b){return(a[0]-b[0])*(a[0]-b[0])+(a[1]-b[1])*(a[1]-b[1])+(a[2]-b[2])*(a[2]-b[2])}function v3dist(a,b){return sqrt(v3distSq(a,b))}function v3div(out,a,b){out[0]=a[0]/b[0]
out[1]=a[1]/b[1]
out[2]=a[2]/b[2]
return out}function v3dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}function v3iFloor(inout){inout[0]=floor(inout[0])
inout[1]=floor(inout[1])
inout[2]=floor(inout[2])
return inout}function v3floor(out,a){out[0]=floor(a[0])
out[1]=floor(a[1])
out[2]=floor(a[2])
return out}function v3lengthSq(a){return a[0]*a[0]+a[1]*a[1]+a[2]*a[2]}function v3length(a){return sqrt(v3lengthSq(a))}function v3lerp(out,t,a,b){var it=1-t
out[0]=it*a[0]+t*b[0]
out[1]=it*a[1]+t*b[1]
out[2]=it*a[2]+t*b[2]
return out}function v3iMax(inout,b){inout[0]=max(inout[0],b[0])
inout[1]=max(inout[1],b[1])
inout[2]=max(inout[2],b[2])
return inout}function v3min(out,a,b){out[0]=min(a[0],b[0])
out[1]=min(a[1],b[1])
out[2]=min(a[2],b[2])
return out}function v3iMin(inout,b){inout[0]=min(inout[0],b[0])
inout[1]=min(inout[1],b[1])
inout[2]=min(inout[2],b[2])
return inout}function v3mul(out,a,b){out[0]=a[0]*b[0]
out[1]=a[1]*b[1]
out[2]=a[2]*b[2]
return out}function v3iMul(inout,b){inout[0]*=b[0]
inout[1]*=b[1]
inout[2]*=b[2]
return inout}function v3mulMat4(out,a,m){var x=a[0]
var y=a[1]
var z=a[2]
out[0]=x*m[0]+y*m[4]+z*m[8]
out[1]=x*m[1]+y*m[5]+z*m[9]
out[2]=x*m[2]+y*m[6]+z*m[10]
return out}function m4TransformVec3(out,a,m){var x=a[0]
var y=a[1]
var z=a[2]
out[0]=x*m[0]+y*m[4]+z*m[8]+m[12]
out[1]=x*m[1]+y*m[5]+z*m[9]+m[13]
out[2]=x*m[2]+y*m[6]+z*m[10]+m[14]
return out}function v3normalize(out,a){var len=a[0]*a[0]+a[1]*a[1]+a[2]*a[2]
if(len>0){len=1/sqrt(len)
out[0]=a[0]*len
out[1]=a[1]*len
out[2]=a[2]*len}return out}function v3iNormalize(inout){var len=inout[0]*inout[0]+inout[1]*inout[1]+inout[2]*inout[2]
if(len>0){len=1/sqrt(len)
inout[0]*=len
inout[1]*=len
inout[2]*=len}return inout}function v3perspectiveProject(out,a,m){var x=a[0]
var y=a[1]
var z=a[2]
var invw=.5/(m[3]*x+m[7]*y+m[11]*z+m[15]||1e-5)
out[0]=(m[0]*x+m[4]*y+m[8]*z+m[12])*invw+.5
out[1]=(m[1]*x+m[5]*y+m[9]*z+m[13])*-invw+.5
out[2]=m[2]*x+m[6]*y+m[10]*z+m[14]
return out}function v3pow(out,a,exp){out[0]=pow(a[0],exp)
out[1]=pow(a[1],exp)
out[2]=pow(a[2],exp)
return out}function v3round(out,a){out[0]=round(a[0])
out[1]=round(a[1])
out[2]=round(a[2])
return out}function v3iRound(inout){inout[0]=round(inout[0])
inout[1]=round(inout[1])
inout[2]=round(inout[2])
return inout}function v3same(a,b){return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]}function v3scale(out,a,s){out[0]=a[0]*s
out[1]=a[1]*s
out[2]=a[2]*s
return out}function v3scaleFloor(out,a,s){out[0]=floor(a[0]*s)
out[1]=floor(a[1]*s)
out[2]=floor(a[2]*s)
return out}function v3iScale(inout,s){inout[0]*=s
inout[1]*=s
inout[2]*=s
return inout}function v3set(out,a,b,c){out[0]=a
out[1]=b
out[2]=c
return out}function v3sub(out,a,b){out[0]=a[0]-b[0]
out[1]=a[1]-b[1]
out[2]=a[2]-b[2]
return out}function v3iSub(inout,b){inout[0]-=b[0]
inout[1]-=b[1]
inout[2]-=b[2]
return inout}function v3zero(out){out[0]=out[1]=out[2]=0
return out}function v4add(out,a,b){out[0]=a[0]+b[0]
out[1]=a[1]+b[1]
out[2]=a[2]+b[2]
out[3]=a[3]+b[3]
return out}function v4clone(a){return a.slice(0)}function v4copy(out,a){out[0]=a[0]
out[1]=a[1]
out[2]=a[2]
out[3]=a[3]
return out}function v4dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]}function v4fromRGBA(rgba){return vec4((rgba>>>24)/255,((16711680&rgba)>>16)/255,((65280&rgba)>>8)/255,(255&rgba)/255)}function v4lerp(out,t,a,b){var it=1-t
out[0]=it*a[0]+t*b[0]
out[1]=it*a[1]+t*b[1]
out[2]=it*a[2]+t*b[2]
out[3]=it*a[3]+t*b[3]
return out}function v4mul(out,a,b){out[0]=a[0]*b[0]
out[1]=a[1]*b[1]
out[2]=a[2]*b[2]
out[3]=a[3]*b[3]
return out}function v4mulAdd(out,a,b,c){out[0]=a[0]*b[0]+c[0]
out[1]=a[1]*b[1]+c[1]
out[2]=a[2]*b[2]+c[2]
out[3]=a[3]*b[3]+c[3]
return out}function v4same(a,b){return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===b[3]}function v4scale(out,a,s){out[0]=a[0]*s
out[1]=a[1]*s
out[2]=a[2]*s
out[3]=a[3]*s
return out}function v4set(out,a,b,c,d){out[0]=a
out[1]=b
out[2]=c
out[3]=d
return out}function v4zero(out){out[0]=out[1]=out[2]=out[3]=0
return out}function mat4isFinite(m){return isFinite(m[0])&&isFinite(m[1])&&isFinite(m[2])&&isFinite(m[3])&&isFinite(m[4])&&isFinite(m[5])&&isFinite(m[6])&&isFinite(m[7])&&isFinite(m[8])&&isFinite(m[9])&&isFinite(m[10])&&isFinite(m[11])&&isFinite(m[12])&&isFinite(m[13])&&isFinite(m[14])&&isFinite(m[15])}

},{"gl-mat3/create":undefined,"gl-mat4/create":undefined}],99:[function(require,module,exports){
"use strict"
exports.isProfane=isProfane
exports.isReserved=isReserved
exports.profanityCommonStartup=profanityCommonStartup
exports.profanityFilterCommon=profanityFilterCommon
exports.profanitySetReplacementChars=profanitySetReplacementChars
exports.reservedStartup=reservedStartup
var assert=require("assert")
var max=Math.max
var trans_src="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+"
var trans_dst="4bcd3fgh1jk1mn0pqr57uvwxy24bcd3fgh1jk1mn0pqr57uvwxy201234567897"
var trans_src_regex=/\S+/g
var trans_lookup={}
var unicode_replacement_chars={}
function cannonizeCharacter(c){c=unicode_replacement_chars[c]||c
return trans_lookup[c]||""}function canonize(str){return str.split("").map(cannonizeCharacter).join("")}function rot13(str){return str.split("").map(function(c){if((c=c.charCodeAt(0))>=97&&c<=122)c=97+(c-97+13)%26
else if(c>=65&&c<=90)c=65+(c-65+13)%26
return String.fromCharCode(c)}).join("")}var profanity={}
var reserved={}
var suffixes=["","s","s","in","ing","er","ers","ed","y"]
var suffixes_canonized=["","5","35","1n","1ng","3r","3r5","3d","y"]
var max_len=0
var inited=false
function profanityCommonStartup(filter_gkg,exceptions_txt){assert(!inited)
inited=true
for(var ii=0;ii<trans_src.length;++ii)trans_lookup[trans_src[ii]]=trans_dst[ii]
var data=filter_gkg.split("\n").filter(function(a){return a})
for(var _ii=0;_ii<data.length;++_ii){var s=rot13(data[_ii])
var start_len=s.length
s=canonize(s)
assert.equal(start_len,s.length)
for(var jj=0;jj<suffixes_canonized.length;++jj){var str=s+suffixes_canonized[jj]
var existing=profanity[str]
if(!existing||existing>jj){max_len=max(max_len,str.length)
profanity[str]=jj+1}}}data=exceptions_txt.split("\n").filter(function(a){return a})
for(var _ii2=0;_ii2<data.length;++_ii2)delete profanity[canonize(data[_ii2])]}function profanitySetReplacementChars(replacement_chars){assert(replacement_chars)
for(var char_code_str in replacement_chars){var target=replacement_chars[char_code_str]
target=String.fromCharCode(target)
var source=String.fromCharCode(Number(char_code_str))
if(" "===target)if(""!==source.trim()){console.log("Invalid whitespace replacement character: "+char_code_str)
continue}unicode_replacement_chars[source]=target}}var reserved_substrings=[]
function reservedStartup(reserved_txt,reserved_substrings_in){var data=reserved_txt.split("\n").filter(function(a){return a})
for(var i=0;i<data.length;++i){var string=canonize(data[i])
reserved[string]=1}for(var ii=0;ii<reserved_substrings_in.length;++ii)reserved_substrings.push(canonize(reserved_substrings_in[ii]))}var randWord
function filterWord(word_src){if(word_src.length>=max_len)return word_src
var is_uppercase=word_src[0].toUpperCase()===word_src[0]
var word_canon=canonize(word_src)
var suffix_idx=profanity[word_canon]
if(!suffix_idx)return word_src;--suffix_idx
var word=randWord()
if(is_uppercase)word=word[0].toUpperCase()+word.slice(1)
var suffix=suffixes[suffix_idx]
if(word[word.length-1]===suffix[0])suffix=suffix.slice(1)
if(word.endsWith("e")&&"i"===suffix[0])word=word.slice(0,-1)
return word+=suffix}var is_profane
function checkWord(word_src){if(word_src.length>=max_len)return
if(profanity[canonize(word_src)])is_profane=true}function profanityFilterCommon(user_str,rand_word_fn){assert(inited)
randWord=rand_word_fn
return user_str.replace(trans_src_regex,filterWord)}function isProfane(user_str){assert(inited)
is_profane=false
user_str.replace(trans_src_regex,checkWord)
return is_profane}var is_reserved
function checkReserved(word_src){word_src=canonize(word_src)
if(reserved[word_src])is_reserved=true
for(var ii=0;ii<reserved_substrings.length;++ii)if(word_src.includes(reserved_substrings[ii]))is_reserved=true}function isReserved(user_str){assert(inited)
is_reserved=false
user_str.replace(trans_src_regex,checkReserved)
var no_whitespace=canonize(user_str.replace(/[\s_.]/g,""))
for(var ii=0;ii<reserved_substrings.length;++ii)if(no_whitespace.includes(reserved_substrings[ii]))is_reserved=true
return is_reserved}

},{"assert":undefined}],100:[function(require,module,exports){
"use strict"
exports.PING_TIME=exports.CONNECTION_TIMEOUT=void 0
exports.netDelayGet=netDelayGet
exports.netDelaySet=netDelaySet
exports.sendMessage=sendMessage
exports.wsHandleMessage=wsHandleMessage
exports.wsPak=wsPak
exports.wsPakSendDest=wsPakSendDest
exports.wsSetSendCB=wsSetSendCB
exports.wsstats_out=exports.wsstats=void 0
var wsstats={msgs:0,bytes:0}
exports.wsstats=wsstats
var wsstats_out={msgs:0,bytes:0}
exports.wsstats_out=wsstats_out
var assert=require("assert")
var _ack=require("./ack")
var ackHandleMessage=_ack.ackHandleMessage
var ackReadHeader=_ack.ackReadHeader
var ackWrapPakFinish=_ack.ackWrapPakFinish
var ackWrapPakPayload=_ack.ackWrapPakPayload
var ackWrapPakStart=_ack.ackWrapPakStart
var _packet=require("./packet")
var isPacket=_packet.isPacket
var packetCreate=_packet.packetCreate
var packetDefaultFlags=_packet.packetDefaultFlags
var packetFromBuffer=_packet.packetFromBuffer
var _perfcounters=require("./perfcounters")
var perfCounterAddValue=_perfcounters.perfCounterAddValue
var random=Math.random,round=Math.round
var CONNECTION_TIMEOUT=6e4
var PING_TIME=(exports.CONNECTION_TIMEOUT=CONNECTION_TIMEOUT)/2
exports.PING_TIME=PING_TIME
var PAK_HEADER_SIZE=28
var net_delay=0
var net_delay_rand=0
var send_cb=null
function wsSetSendCB(cb){send_cb=cb}function socketSendInternal(client,buf,pak){if(send_cb)send_cb(buf)
if(client.ws_server)client.socket.send(buf,pak.pool.bind(pak))
else{client.socket.send(buf)
pak.pool()}}function netDelaySet(delay,rand){if(void 0===delay){delay=100
rand=50}if(delay)console.log("NetDelay: ON ("+delay+"+"+rand+")")
else console.log("NetDelay: Off")
net_delay=delay
net_delay_rand=rand}function netDelayGet(){return[net_delay,net_delay_rand]}function NetDelayer(client,socket){this.client=client
this.head=null
this.tail=null
this.tick=this.tickFn.bind(this)}NetDelayer.prototype.send=function(buf,pak){var now=Date.now()
var delay=round(net_delay+net_delay_rand*random())
var elem={buf:buf,pak:pak,time:now+delay,next:null}
if(this.tail){this.tail.next=elem
this.tail=elem}else{this.head=this.tail=elem
setTimeout(this.tick,delay)}}
NetDelayer.prototype.tickFn=function(){var client=this.client
if(client.net_delayer!==this){while(this.head){var elem=this.head
elem.pak.pool()
this.head=elem.next}this.tail=null
return}var now=Date.now()
do{var _elem=this.head
this.head=_elem.next
if(!this.head)this.tail=null
socketSendInternal(client,_elem.buf,_elem.pak)}while(this.head&&this.head.time<=now)
if(this.head)setTimeout(this.tick,this.head.time-now)}
function wsPakSendDest(client,pak){if(!client.connected||1!==client.socket.readyState){console.warn("Attempting to send on a disconnected link (client_id:"+client.id+"), ignoring")
pak.pool()
return}var buf=pak.getBuffer()
var buf_len=pak.getBufferLen()
if(buf_len!==buf.length)buf=new Uint8Array(buf.buffer,buf.byteOffset,buf_len)
perfCounterAddValue("net.send_bytes.total",buf.length)
wsstats_out.msgs++
wsstats_out.bytes+=buf.length
if(net_delay){if(!client.net_delayer)client.net_delayer=new NetDelayer(client)
client.net_delayer.send(buf,pak)}else socketSendInternal(client,buf,pak)
client.last_send_time=Date.now()}function wsPakSendFinish(pak,err,resp_func){var _pak$ws_data=pak.ws_data,client=_pak$ws_data.client,msg=_pak$ws_data.msg
delete pak.ws_data
var ack_resp_pkt_id=ackWrapPakFinish(pak,err,resp_func)
if(!client.connected||1!==client.socket.readyState){if("channel_msg"===msg){pak.seek(0)
pak.readFlags()
var header=ackReadHeader(pak)
var channel_id
var submsg
if(isPacket(header.data)){pak.ref()
channel_id=pak.readAnsiString()
submsg=pak.readAnsiString()
if(!pak.ended())pak.pool()}else{channel_id=header.data.channel_id
submsg=header.data.msg}msg="channel_msg:"+channel_id+":"+submsg}if("number"!==typeof msg){(client.log?client:console).log("Attempting to send msg="+msg+" on a disconnected link, ignoring")
if(!client.log&&client.onError&&msg)client.onError("Attempting to send msg="+msg+" on a disconnected link")}if(ack_resp_pkt_id)delete client.resp_cbs[ack_resp_pkt_id]
pak.pool()
return}assert.equal(Boolean(resp_func&&false!==resp_func.expecting_response),Boolean(ack_resp_pkt_id))
wsPakSendDest(client,pak)}function wsPakSend(err,resp_func){if("function"===typeof err&&!resp_func){resp_func=err
err=null}wsPakSendFinish(this,err,resp_func)}function wsPak(msg,ref_pak,client,msg_debug_name){assert("string"===typeof msg||"number"===typeof msg)
var pak=packetCreate(ref_pak?ref_pak.getInternalFlags():packetDefaultFlags(),ref_pak?ref_pak.totalSize()+PAK_HEADER_SIZE:0)
pak.writeFlags()
ackWrapPakStart(pak,client,msg,msg_debug_name)
pak.ws_data={msg:msg,client:client}
pak.send=wsPakSend
return pak}function sendMessageInternal(client,msg,err,data,msg_debug_name,resp_func){var pak=wsPak(msg,isPacket(data)?data:null,client,msg_debug_name)
if(!err)ackWrapPakPayload(pak,data)
pak.send(err,resp_func)}function sendMessage(msg,data,msg_debug_name,resp_func){sendMessageInternal(this,msg,null,data,msg_debug_name,resp_func)}function wsHandleMessage(client,buf,filter){++wsstats.msgs
var now=Date.now()
var source=client.id?"client "+client.id:"server"
if(!(buf instanceof Uint8Array)){(client.log?client:console).log("Received incorrect WebSocket data type from "+source+" ("+typeof buf+")")
if("string"===typeof buf)(client.log?client:console).log("Invalid WebSocket data: "+JSON.stringify(buf.slice(0,120)))
if(client.ws_server){if(!client.has_warned_about_text){client.has_warned_about_text=true
client.send("error","Server received non-binary WebSocket data.  Likely cause is a proxy, VPN or something else intercepting and modifying network traffic.")}return}return void client.onError("Invalid data received")}wsstats.bytes+=buf.length
var pak=packetFromBuffer(buf,buf.length,false)
pak.readFlags()
client.last_receive_time=now
client.idle_counter=0
return void ackHandleMessage(client,source,pak,function sendFunc(msg,err,data,resp_func){if(resp_func&&!resp_func.expecting_response)resp_func=null
sendMessageInternal(client,msg,err,data,null,resp_func)},function pakFunc(msg,ref_pak){return wsPak(msg,ref_pak,client)},function handleFunc(msg,data,resp_func){var handler=client.handlers[msg]
if(!handler){var error_msg="No handler for message "+JSON.stringify(msg)+" from "+source
console.error(error_msg,isPacket(data)?data.contents():data)
if(client.onError)return client.onError(error_msg)
return resp_func(error_msg)}return handler(client,data,resp_func)},filter)}

},{"./ack":79,"./packet":90,"./perfcounters":91,"assert":undefined}]},{},[1])


//# sourceMappingURL=http://localhost:3000/app.bundle.js.map?ver=1730509975354
