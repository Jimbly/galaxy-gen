!function n(o,i,s){function u(e,r){if(!i[e]){if(!o[e]){var t="function"==typeof require&&require;if(!r&&t)return t(e,!0);if(f)return f(e,!0);throw(t=new Error("Cannot find module '"+e+"'")).code="MODULE_NOT_FOUND",t}t=i[e]={exports:{}},o[e][0].call(t.exports,function(r){return u(o[e][1][r]||r)},t,t.exports,n,o,i,s)}return i[e].exports}for(var f="function"==typeof require&&require,r=0;r<s.length;r++)u(s[r]);return u}({1:[function(r,e,t){"use strict";r("../glov/client/require.js"),deps.assert=r("assert")},{"../glov/client/require.js":2,assert:3}],2:[function(r,e,t){"use strict";var n="undefined"==typeof window?self:window,o=n.deps=n.deps||{};n.require=function(r){if(!o[r])throw new Error("Cannot find module '"+r+"' (add it to deps.js or equivalent)");return o[r]}},{}],3:[function(r,e,t){"use strict";function n(r,e){if(!r)throw e=e||(void 0===r||!1===r?"":JSON.stringify(r)),new Error("Assertion failed"+(e?": "+e:""))}e.exports=n,e.exports.ok=n,e.exports.equal=function(r,e){if(r!==e)throw new Error('Assertion failed: "'+r+'"==="'+e+'"')}},{}]},{},[1]);

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict"
var worker=require("../glov/client/worker_thread.js")
worker.addHandler("test",function(){console.log("Worker Test!")})

},{"../glov/client/worker_thread.js":6}],2:[function(require,module,exports){
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

},{"./locate_asset":3,"assert":undefined}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

},{"../common/util":7,"./filewatch":2,"assert":undefined}],6:[function(require,module,exports){
"use strict"
exports.addHandler=addHandler
exports.debugmsg=debugmsg
exports.endWork=endWork
exports.sendmsg=sendmsg
exports.startWork=startWork
require("./polyfill.js")
if(!self.profilerStart)self.profilerStart=self.profilerStop=self.profilerStopStart=function(){}
var assert=require("assert")
var _webfs=require("./webfs")
var webFSApplyReload=_webfs.webFSApplyReload
var webFSGetData=_webfs.webFSGetData
var webFSStartup=_webfs.webFSStartup
function sendmsg(id,data,transfer){postMessage({id:id,data:data},transfer)}function debugmsg(msg,clear){sendmsg("debugmsg",{msg:msg,clear:clear})}function consoleLogForward(){for(var _len=arguments.length,args=new Array(_len),_key=0;_key<_len;_key++)args[_key]=arguments[_key]
sendmsg("log",args.join(" "))}if(!self.console)self.console={log:consoleLogForward,info:consoleLogForward,warn:consoleLogForward,error:consoleLogForward}
self.addEventListener("error",function(evt){if(evt.error){sendmsg("error",{message:evt.error.message,stack:evt.error.stack})
evt.preventDefault()}})
var handlers={}
function addHandler(id,cb){assert(!handlers[id])
handlers[id]=cb}var time_work=0
var time_idle=0
var batch_timing=[]
var last_report_time=Date.now()
var timing_enabled=false
function reportTiming(now){if(now-last_report_time>100){var elapsed=time_work+time_idle
assert(elapsed<=now-last_report_time+10)
sendmsg("timing",{time_work:time_work,time_idle:time_idle,elapsed:elapsed,batches:batch_timing})
last_report_time=now
time_idle=time_work=0
batch_timing.length=0}}var last_work_end=last_report_time
var last_work_start=0
function startWork(){var now=Date.now()
var idle_time=now-last_work_end
if(timing_enabled)batch_timing.push(idle_time)
time_idle+=idle_time
last_work_start=now}function endWork(){var now=Date.now()
var batch_time=(last_work_end=now)-last_work_start
time_work+=batch_time
if(timing_enabled){batch_timing.push(batch_time)
reportTiming(now)}}function isMyWorkerMessage(evt){return Boolean(evt instanceof Object&&evt.id)}self.onmessage=function(evt_in){startWork()
var evt=evt_in.data
if(isMyWorkerMessage(evt)){var handler=handlers[evt.id]
assert(handler,evt.id)
try{handler(evt.data)}catch(e){sendmsg("error",{message:e.message||String(e),stack:e.stack})}}else console.log("worker (worker thread) unhandled message",evt)
endWork()}
addHandler("busy",function(data){var start=Date.now()
while(Date.now()-start<data){0
0}sendmsg("busy_done",null)})
addHandler("timing_enable",function(data){timing_enabled=data})
addHandler("webfs_data",function(data){if(webFSGetData())webFSApplyReload(data)
else webFSStartup(data)})
addHandler("assert_now",function(){assert(false)})
addHandler("assert_later",function(){setTimeout(function assertLater(){assert(false)},100)})
addHandler("crash_now",function(){null.foo.bar++})
addHandler("crash_later",function(){setTimeout(function crashLater(){null.foo.bar++},100)})
addHandler("reject_now",function(){new Promise(function(resolve,reject){reject(new Error("client_worker_reject_now"))})})
sendmsg("log","WebWorker communication initialized")

},{"./polyfill.js":4,"./webfs":5,"assert":undefined}],7:[function(require,module,exports){
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

},{"assert":undefined}]},{},[1])




//# sourceMappingURL=http://localhost:3000/worker.bundle.js.map
