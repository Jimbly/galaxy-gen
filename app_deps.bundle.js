!function o(r,u,a){function i(t,e){if(!u[t]){if(!r[t]){var n="function"==typeof require&&require;if(!e&&n)return n(t,!0);if(d)return d(t,!0);throw(n=new Error("Cannot find module '"+t+"'")).code="MODULE_NOT_FOUND",n}n=u[t]={exports:{}},r[t][0].call(n.exports,function(e){return i(r[t][1][e]||e)},n,n.exports,o,r,u,a)}return u[t].exports}for(var d="function"==typeof require&&require,e=0;e<a.length;e++)i(a[e]);return i}({1:[function(e,t,o){!function(n){!function(){"use strict";!function(){function e(){this.init()}e.prototype={init:function(){var e=this||g;return e._counter=1e3,e._html5AudioPool=[],e.html5PoolSize=10,e._codecs={},e._howls=[],e._muted=!1,e._volume=1,e._canPlayEvent="canplaythrough",e._navigator="undefined"!=typeof window&&window.navigator?window.navigator:null,e.masterGain=null,e.noAudio=!1,e.usingWebAudio=!0,e.autoSuspend=!0,e.ctx=null,e.safeToPlay=!1,e.autoUnlock=!0,e._setup(),e},volume:function(e){var t=this||g;if(e=parseFloat(e),t.ctx||l(),void 0!==e&&0<=e&&e<=1){if(t._volume=e,t._muted)return t;t.usingWebAudio&&t.masterGain.gain.setValueAtTime(e,g.ctx.currentTime);for(var n=0;n<t._howls.length;n++)if(!t._howls[n]._webAudio)for(var o=t._howls[n]._getSoundIds(),r=0;r<o.length;r++){var u=t._howls[n]._soundById(o[r]);u&&u._node&&(u._node.volume=u._volume*e)}return t}return t._volume},mute:function(e){var t=this||g;t.ctx||l(),t._muted=e,t.usingWebAudio&&t.masterGain.gain.setValueAtTime(e?0:t._volume,g.ctx.currentTime);for(var n=0;n<t._howls.length;n++)if(!t._howls[n]._webAudio)for(var o=t._howls[n]._getSoundIds(),r=0;r<o.length;r++){var u=t._howls[n]._soundById(o[r]);u&&u._node&&(u._node.muted=!!e||u._muted)}return t},stop:function(){for(var e=this||g,t=0;t<e._howls.length;t++)e._howls[t].stop();return e},unload:function(){for(var e=this||g,t=e._howls.length-1;0<=t;t--)e._howls[t].unload();return e.usingWebAudio&&e.ctx&&void 0!==e.ctx.close&&(e.ctx.close(),e.ctx=null,l()),e},codecs:function(e){return(this||g)._codecs[e.replace(/^x-/,"")]},_setup:function(){var t=this||g;if(t.state=t.ctx&&t.ctx.state||"suspended","running"===t.state&&(t.safeToPlay=!0),t._autoSuspend(),!t.usingWebAudio)if("undefined"!=typeof Audio)try{void 0===(new Audio).oncanplaythrough&&(t._canPlayEvent="canplay")}catch(e){t.noAudio=!0}else t.noAudio=!0;try{(new Audio).muted&&(t.noAudio=!0)}catch(e){}return t.noAudio||t._setupCodecs(),t},_setupCodecs:function(){var t=this||g,e=null;try{e="undefined"!=typeof Audio?new Audio:null}catch(e){return t}if(!e||"function"!=typeof e.canPlayType)return t;var n=e.canPlayType("audio/mpeg;").replace(/^no$/,""),o=t._navigator&&t._navigator.userAgent.match(/OPR\/([0-6].)/g),o=o&&parseInt(o[0].split("/")[1],10)<33;return t._codecs={mp3:!(o||!n&&!e.canPlayType("audio/mp3;").replace(/^no$/,"")),mpeg:!!n,opus:!!e.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/,""),ogg:!!e.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),oga:!!e.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),wav:!!e.canPlayType('audio/wav; codecs="1"').replace(/^no$/,""),aac:!!e.canPlayType("audio/aac;").replace(/^no$/,""),caf:!!e.canPlayType("audio/x-caf;").replace(/^no$/,""),m4a:!!(e.canPlayType("audio/x-m4a;")||e.canPlayType("audio/m4a;")||e.canPlayType("audio/aac;")).replace(/^no$/,""),mp4:!!(e.canPlayType("audio/x-mp4;")||e.canPlayType("audio/mp4;")||e.canPlayType("audio/aac;")).replace(/^no$/,""),weba:!!e.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,""),webm:!!e.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,""),dolby:!!e.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/,""),flac:!!(e.canPlayType("audio/x-flac;")||e.canPlayType("audio/flac;")).replace(/^no$/,"")},t},manualUnlock:function(){var e=this||g;!e.noAudio&&e.unlockFunction&&e.unlockFunction()},_unlockAudio:function(){var d=this||g;d._audioUnlocked=!1,d.autoUnlock=!1,d.ctx&&(d._mobileUnloaded||44100===d.ctx.sampleRate||(d._mobileUnloaded=!0,d.unload())),d.ctx&&(d._scratchBuffer=d.ctx.createBuffer(1,1,22050));var s=d.unlockFunction=function(e){for(;d._html5AudioPool.length<d.html5PoolSize;)try{var t=new Audio;t._unlocked=!0,d._releaseHtml5Audio(t)}catch(e){d.noAudio=!0;break}for(var n,o=0;o<d._howls.length;o++)if(!d._howls[o]._webAudio)for(var r=d._howls[o]._getSoundIds(),u=0;u<r.length;u++){var a=d._howls[o]._soundById(r[u]);a&&a._node&&!a._node._unlocked&&(a._node._unlocked=!0,a._node.load())}function i(){d._audioUnlocked=!0,d.safeToPlay=!0,d.unlockFunction=null,document.removeEventListener("touchstart",s,!0),document.removeEventListener("touchend",s,!0),document.removeEventListener("click",s,!0),document.removeEventListener("mousedown",s,!0),document.removeEventListener("keydown",s,!0);for(var e=0;e<d._howls.length;e++)d._howls[e]._emit("unlock")}d._autoResume(),d.ctx?((n=d.ctx.createBufferSource()).buffer=d._scratchBuffer,n.connect(d.ctx.destination),void 0===n.start?n.noteOn(0):n.start(0),"function"==typeof d.ctx.resume&&d.ctx.resume(),n.onended=function(){n.disconnect(0),i()}):i()};return document.addEventListener("touchstart",s,!0),document.addEventListener("touchend",s,!0),document.addEventListener("click",s,!0),document.addEventListener("mousedown",s,!0),document.addEventListener("keydown",s,!0),d},_obtainHtml5Audio:function(){var e=this||g;return e._html5AudioPool.length?e._html5AudioPool.pop():new Audio},_releaseHtml5Audio:function(e){var t=this||g;return e._unlocked&&t._html5AudioPool.push(e),t},_autoSuspend:function(){var e=this;if(!e.autoSuspend||!e.ctx||void 0===e.ctx.suspend||!g.usingWebAudio)return e;for(var t=0;t<e._howls.length;t++)if(e._howls[t]._webAudio)for(var n=0;n<e._howls[t]._sounds.length;n++)if(!e._howls[t]._sounds[n]._paused)return e;return e._suspendTimer&&clearTimeout(e._suspendTimer),e._suspendTimer=setTimeout(function(){e.autoSuspend&&(e._suspendTimer=null,e.state="suspending",e.ctx.suspend().then(function(){e.state="suspended",e._resumeAfterSuspend&&(delete e._resumeAfterSuspend,e._autoResume())}))},3e4),e},_autoResume:function(){var t=this;return t.ctx&&void 0!==t.ctx.resume&&g.usingWebAudio&&("running"===t.state&&t._suspendTimer?(clearTimeout(t._suspendTimer),t._suspendTimer=null):"suspended"===t.state?(t.ctx.resume().then(function(){t.state="running";for(var e=0;e<t._howls.length;e++)t._howls[e]._emit("resume")}),t._suspendTimer&&(clearTimeout(t._suspendTimer),t._suspendTimer=null)):"suspending"===t.state&&(t._resumeAfterSuspend=!0)),t}};function t(e){e.src&&0!==e.src.length?this.init(e):console.error("An array of source files must be passed with any new Howl.")}var g=new e;t.prototype={init:function(e){var t=this;return g.ctx||l(),t._autoplay=e.autoplay||!1,t._format="string"!=typeof e.format?e.format:[e.format],t._html5=e.html5||!1,t._muted=e.mute||!1,t._loop=e.loop||!1,t._pool=e.pool||5,t._preload="boolean"!=typeof e.preload||e.preload,t._rate=e.rate||1,t._sprite=e.sprite||{},t._src="string"!=typeof e.src?e.src:[e.src],t._volume=void 0!==e.volume?e.volume:1,t._xhrWithCredentials=e.xhrWithCredentials||!1,t._xhrHeaders=e.xhrHeaders||null,t._duration=0,t._state="unloaded",t._sounds=[],t._endTimers={},t._queue=[],t._playLock=!1,t._onend=e.onend?[{fn:e.onend}]:[],t._onfade=e.onfade?[{fn:e.onfade}]:[],t._onload=e.onload?[{fn:e.onload}]:[],t._onloaderror=e.onloaderror?[{fn:e.onloaderror}]:[],t._onplayerror=e.onplayerror?[{fn:e.onplayerror}]:[],t._onpause=e.onpause?[{fn:e.onpause}]:[],t._onplay=e.onplay?[{fn:e.onplay}]:[],t._onstop=e.onstop?[{fn:e.onstop}]:[],t._onmute=e.onmute?[{fn:e.onmute}]:[],t._onvolume=e.onvolume?[{fn:e.onvolume}]:[],t._onrate=e.onrate?[{fn:e.onrate}]:[],t._onseek=e.onseek?[{fn:e.onseek}]:[],t._onunlock=e.onunlock?[{fn:e.onunlock}]:[],t._onresume=[],t._webAudio=g.usingWebAudio&&!t._html5,g.autoUnlock&&g._unlockAudio(),g._howls.push(t),t._autoplay&&t._queue.push({event:"play",action:function(){t.play()}}),t._preload&&t.load(),t},load:function(){var e=this,t=null;if(g.noAudio)return e._emit("loaderror",null,"No audio support."),e;"string"==typeof e._src&&(e._src=[e._src]);for(var n,o,r=0;r<e._src.length;r++){if(e._format&&e._format[r])n=e._format[r];else{if("string"!=typeof(o=e._src[r])){e._emit("loaderror",null,"Non-string found in selected audio sources - ignoring.");continue}n=(n=(n=/^data:audio\/([^;,]+);/i.exec(o))||/\.([^.]+)$/.exec(o.split("?",1)[0]))&&n[1].toLowerCase()}if(n||console.warn('No file extension was found. Consider using the "format" property or specify an extension.'),n&&g.codecs(n)){t=e._src[r];break}}return t?(e._src=t,e._state="loading","https:"===window.location.protocol&&"http:"===t.slice(0,5)&&(e._html5=!0,e._webAudio=!1),new u(e),e._webAudio&&i(e)):e._emit("loaderror",null,"No codec support for selected audio sources."),e},play:function(t,e,n){var o=this,r=null;if("number"==typeof t)r=t,t=null;else{if("string"==typeof t&&"loaded"===o._state&&!o._sprite[t])return null;if(void 0===t&&(t="__default",!o._playLock)){for(var u=0,a=0;a<o._sounds.length;a++)o._sounds[a]._paused&&!o._sounds[a]._ended&&(u++,r=o._sounds[a]._id);1===u?t=null:r=null}}var i=r?o._soundById(r):o._inactiveSound();if(!i)return null;if(r&&!t&&(t=i._sprite||"__default"),"loaded"!==o._state){i._sprite=t,i._ended=!1;var d=i._id;return o._queue.push({event:"play",action:function(){o.play(d)}}),d}if(r&&!i._paused)return n||o._loadQueue("play"),i._id;o._webAudio&&g._autoResume();var s=Math.max(0,0<i._seek?i._seek:o._sprite[t][0]/1e3),_=Math.max(0,(o._sprite[t][0]+o._sprite[t][1])/1e3-s),l=1e3*_/Math.abs(i._rate);l+=500;var c=o._sprite[t][0]/1e3,f=(o._sprite[t][0]+o._sprite[t][1])/1e3;i._sprite=t,i._ended=!1;var p=function(){i._paused=!1,i._seek=s,i._start=c,i._stop=f,i._loop=!(!i._loop&&!o._sprite[t][2])};if(f<=s)return o._ended(i),null;var m,h,v="number"==typeof e?e:i._volume,y=i._node;return o._webAudio?(h=function(){o._playLock=!1,p(),o._refreshBuffer(i);var e=i._muted||o._muted?0:v;y.gain.setValueAtTime(e,g.ctx.currentTime),i._playStart=g.ctx.currentTime,void 0===y.bufferSource.start?i._loop?y.bufferSource.noteGrainOn(0,s,86400):y.bufferSource.noteGrainOn(0,s,_):i._loop?y.bufferSource.start(0,s,86400):y.bufferSource.start(0,s,_),l!==1/0&&(o._endTimers[i._id]=setTimeout(o._ended.bind(o,i),l)),n||setTimeout(function(){o._emit("play",i._id),o._loadQueue()},0)},"running"===g.state?h():(o._playLock=!0,o.once("resume",h),o._clearTimer(i._id))):(m=function(){y.currentTime=s,y.muted=i._muted||o._muted||g._muted||y.muted,y.volume=v*g.volume(),y.playbackRate=i._rate;try{var e=y.play();if(e&&"undefined"!=typeof Promise&&(e instanceof Promise||"function"==typeof e.then)?(o._playLock=!0,p(),e.then(function(){o._playLock=!1,y._unlocked=!0,n||(o._emit("play",i._id),o._loadQueue())}).catch(function(){o._playLock=!1,o._emit("playerror",i._id,"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."),i._ended=!0,i._paused=!0})):n||(o._playLock=!1,p(),o._emit("play",i._id),o._loadQueue()),y.playbackRate=i._rate,y.paused)return void o._emit("playerror",i._id,"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");"__default"!==t||i._loop?o._endTimers[i._id]=setTimeout(o._ended.bind(o,i),l):(o._endTimers[i._id]=function(){o._ended(i),y.removeEventListener("ended",o._endTimers[i._id],!1)},y.addEventListener("ended",o._endTimers[i._id],!1))}catch(e){o._emit("playerror",i._id,e)}},"data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"===y.src&&(y.src=o._src,y.load()),h=window&&window.ejecta||!y.readyState&&g._navigator.isCocoonJS,3<=y.readyState||h?m():(o._playLock=!0,h=function e(){m(),y.removeEventListener(g._canPlayEvent,e,!1)},y.addEventListener(g._canPlayEvent,h,!1),o._clearTimer(i._id))),i._id},pause:function(e){var t=this;if("loaded"!==t._state||t._playLock)return t._queue.push({event:"pause",action:function(){t.pause(e)}}),t;for(var n=t._getSoundIds(e),o=0;o<n.length;o++){t._clearTimer(n[o]);var r=t._soundById(n[o]);if(r&&!r._paused&&(r._seek=t.seek(n[o]),r._rateSeek=0,r._paused=!0,t._stopFade(n[o]),r._node))if(t._webAudio){if(!r._node.bufferSource)continue;void 0===r._node.bufferSource.stop?r._node.bufferSource.noteOff(0):r._node.bufferSource.stop(0),t._cleanBuffer(r._node)}else isNaN(r._node.duration)&&r._node.duration!==1/0||r._node.pause();arguments[1]||t._emit("pause",r?r._id:null)}return t},stop:function(e,t){var n=this;if("loaded"!==n._state||n._playLock)return n._queue.push({event:"stop",action:function(){n.stop(e)}}),n;for(var o=n._getSoundIds(e),r=0;r<o.length;r++){n._clearTimer(o[r]);var u=n._soundById(o[r]);u&&(u._seek=u._start||0,u._rateSeek=0,u._paused=!0,u._ended=!0,n._stopFade(o[r]),u._node&&(n._webAudio?u._node.bufferSource&&(void 0===u._node.bufferSource.stop?u._node.bufferSource.noteOff(0):u._node.bufferSource.stop(0),n._cleanBuffer(u._node)):isNaN(u._node.duration)&&u._node.duration!==1/0||(u._node.currentTime=u._start||0,u._node.pause(),u._node.duration===1/0&&n._clearSound(u._node))),t||n._emit("stop",u._id))}return n},mute:function(e,t){var n=this;if("loaded"!==n._state||n._playLock)return n._queue.push({event:"mute",action:function(){n.mute(e,t)}}),n;if(void 0===t){if("boolean"!=typeof e)return n._muted;n._muted=e}for(var o=n._getSoundIds(t),r=0;r<o.length;r++){var u=n._soundById(o[r]);u&&(u._muted=e,u._interval&&n._stopFade(u._id),n._webAudio&&u._node?u._node.gain.setValueAtTime(e?0:u._volume,g.ctx.currentTime):u._node&&(u._node.muted=!!g._muted||e),n._emit("mute",u._id))}return n},volume:function(){var e,t,n=this,o=arguments;if(0===o.length)return n._volume;if(1===o.length||2===o.length&&void 0===o[1]?0<=n._getSoundIds().indexOf(o[0])?r=parseInt(o[0],10):e=parseFloat(o[0]):2<=o.length&&(e=parseFloat(o[0]),r=parseInt(o[1],10)),!(void 0!==e&&0<=e&&e<=1))return(t=r?n._soundById(r):n._sounds[0])?t._volume:0;if("loaded"!==n._state||n._playLock)return n._queue.push({event:"volume",action:function(){n.volume.apply(n,o)}}),n;void 0===r&&(n._volume=e);for(var r=n._getSoundIds(r),u=0;u<r.length;u++)(t=n._soundById(r[u]))&&(t._volume=e,o[2]||n._stopFade(r[u]),n._webAudio&&t._node&&!t._muted?t._node.gain.setValueAtTime(e,g.ctx.currentTime):t._node&&!t._muted&&(t._node.volume=e*g.volume()),n._emit("volume",t._id));return n},fade:function(e,t,n,o){var r=this;if("loaded"!==r._state||r._playLock)return r._queue.push({event:"fade",action:function(){r.fade(e,t,n,o)}}),r;e=parseFloat(e),t=parseFloat(t),n=parseFloat(n),r.volume(e,o);for(var u=r._getSoundIds(o),a=0;a<u.length;a++){var i,d,s=r._soundById(u[a]);s&&(o||r._stopFade(u[a]),r._webAudio&&!s._muted&&(d=(i=g.ctx.currentTime)+n/1e3,s._volume=e,s._node.gain.setValueAtTime(e,i),s._node.gain.linearRampToValueAtTime(t,d)),r._startFadeInterval(s,e,t,n,u[a],void 0===o))}return r},_startFadeInterval:function(t,n,o,r,e,u){var a=this,i=n,d=o-n,s=Math.abs(d/.01),s=Math.max(4,0<s?r/s:r),_=Date.now();t._fadeTo=o,t._interval=setInterval(function(){var e=(Date.now()-_)/r;_=Date.now(),i+=d*e,i=Math.max(0,i),i=Math.min(1,i),i=Math.round(100*i)/100,a._webAudio?t._volume=i:a.volume(i,t._id,!0),u&&(a._volume=i),(o<n&&i<=o||n<o&&o<=i)&&(clearInterval(t._interval),t._interval=null,t._fadeTo=null,a.volume(o,t._id),a._emit("fade",t._id))},s)},_stopFade:function(e){var t=this,n=t._soundById(e);return n&&n._interval&&(t._webAudio&&n._node.gain.cancelScheduledValues(g.ctx.currentTime),clearInterval(n._interval),n._interval=null,t.volume(n._fadeTo,e),n._fadeTo=null,t._emit("fade",e)),t},loop:function(){var e,t,n,o=this,r=arguments;if(0===r.length)return o._loop;if(1===r.length){if("boolean"!=typeof r[0])return!!(n=o._soundById(parseInt(r[0],10)))&&n._loop;o._loop=e=r[0]}else 2===r.length&&(e=r[0],t=parseInt(r[1],10));for(var u=o._getSoundIds(t),a=0;a<u.length;a++)(n=o._soundById(u[a]))&&(n._loop=e,o._webAudio&&n._node&&n._node.bufferSource&&(n._node.bufferSource.loop=e)&&(n._node.bufferSource.loopStart=n._start||0,n._node.bufferSource.loopEnd=n._stop));return o},rate:function(){var e,t=this,n=arguments;if(0===n.length?u=t._sounds[0]._id:1===n.length?0<=t._getSoundIds().indexOf(n[0])?u=parseInt(n[0],10):e=parseFloat(n[0]):2===n.length&&(e=parseFloat(n[0]),u=parseInt(n[1],10)),"number"!=typeof e)return((r=t._soundById(u))||t)._rate;if("loaded"!==t._state||t._playLock)return t._queue.push({event:"rate",action:function(){t.rate.apply(t,n)}}),t;void 0===u&&(t._rate=e);for(var o,r,u=t._getSoundIds(u),a=0;a<u.length;a++)(r=t._soundById(u[a]))&&(t.playing(u[a])&&(r._rateSeek=t.seek(u[a]),r._playStart=t._webAudio?g.ctx.currentTime:r._playStart),r._rate=e,t._webAudio&&r._node&&r._node.bufferSource?r._node.bufferSource.playbackRate.setValueAtTime(e,g.ctx.currentTime):r._node&&(r._node.playbackRate=e),o=t.seek(u[a]),o=1e3*((t._sprite[r._sprite][0]+t._sprite[r._sprite][1])/1e3-o)/Math.abs(r._rate),!t._endTimers[u[a]]&&r._paused||(t._clearTimer(u[a]),t._endTimers[u[a]]=setTimeout(t._ended.bind(t,r),o)),t._emit("rate",r._id));return t},seek:function(){var e,t,n=this,o=arguments;if(0===o.length?t=n._sounds[0]._id:1===o.length?0<=n._getSoundIds().indexOf(o[0])?t=parseInt(o[0],10):n._sounds.length&&(t=n._sounds[0]._id,e=parseFloat(o[0])):2===o.length&&(e=parseFloat(o[0]),t=parseInt(o[1],10)),void 0===t)return n;if("loaded"!==n._state||n._playLock)return n._queue.push({event:"seek",action:function(){n.seek.apply(n,o)}}),n;var r=n._soundById(t);if(r){if(!("number"==typeof e&&0<=e)){if(n._webAudio){var u=n.playing(t)?g.ctx.currentTime-r._playStart:0,a=r._rateSeek?r._rateSeek-r._seek:0;return r._seek+(a+u*Math.abs(r._rate))}return r._node.currentTime}var i=n.playing(t);i&&n.pause(t,!0),r._seek=e,r._ended=!1,n._clearTimer(t),n._webAudio||!r._node||isNaN(r._node.duration)||(r._node.currentTime=e);var d=function(){n._emit("seek",t),i&&n.play(t,void 0,!0)};i&&!n._webAudio?(r=function e(){n._playLock?setTimeout(e,0):d()},setTimeout(r,0)):d()}return n},playing:function(e){if("number"==typeof e){e=this._soundById(e);return!!e&&!e._paused}for(var t=0;t<this._sounds.length;t++)if(!this._sounds[t]._paused)return!0;return!1},duration:function(e){var t=this._duration,e=this._soundById(e);return t=e?this._sprite[e._sprite][1]/1e3:t},state:function(){return this._state},unload:function(){for(var e=this,t=e._sounds,n=0;n<t.length;n++)t[n]._paused||e.stop(t[n]._id),e._webAudio||(e._clearSound(t[n]._node),t[n]._node.removeEventListener("error",t[n]._errorFn,!1),t[n]._node.removeEventListener(g._canPlayEvent,t[n]._loadFn,!1),g._releaseHtml5Audio(t[n]._node)),delete t[n]._node,e._clearTimer(t[n]._id);var o=g._howls.indexOf(e);0<=o&&g._howls.splice(o,1);for(var r=!0,n=0;n<g._howls.length;n++)if(g._howls[n]._src===e._src||0<=e._src.indexOf(g._howls[n]._src)){r=!1;break}return a&&r&&delete a[e._src],g.noAudio=!1,e._state="unloaded",e._sounds=[],e=null},on:function(e,t,n,o){e=this["_on"+e];return"function"==typeof t&&e.push(o?{id:n,fn:t,once:o}:{id:n,fn:t}),this},off:function(e,t,n){var o=this,r=o["_on"+e],u=0;if("number"==typeof t&&(n=t,t=null),t||n)for(u=0;u<r.length;u++){var a=n===r[u].id;if(t===r[u].fn&&a||!t&&a){r.splice(u,1);break}}else if(e)o["_on"+e]=[];else for(var i=Object.keys(o),u=0;u<i.length;u++)0===i[u].indexOf("_on")&&Array.isArray(o[i[u]])&&(o[i[u]]=[]);return o},once:function(e,t,n){return this.on(e,t,n,1),this},_emit:function(e,t,n){for(var o=this,r=o["_on"+e],u=r.length-1;0<=u;u--)r[u].id&&r[u].id!==t&&"load"!==e||(setTimeout(function(e){e.call(this,t,n)}.bind(o,r[u].fn),0),r[u].once&&o.off(e,r[u].fn,r[u].id));return o._loadQueue(e),o},_loadQueue:function(e){var t,n=this;return 0<n._queue.length&&((t=n._queue[0]).event===e&&(n._queue.shift(),n._loadQueue()),e||t.action()),n},_ended:function(e){var t=this,n=e._sprite;if(!t._webAudio&&e._node&&!e._node.paused&&!e._node.ended&&e._node.currentTime<e._stop)return setTimeout(t._ended.bind(t,e),100),t;var o=!(!e._loop&&!t._sprite[n][2]);return t._emit("end",e._id),!t._webAudio&&o&&t.stop(e._id,!0).play(e._id),t._webAudio&&o&&(t._emit("play",e._id),e._seek=e._start||0,e._rateSeek=0,e._playStart=g.ctx.currentTime,n=1e3*(e._stop-e._start)/Math.abs(e._rate),t._endTimers[e._id]=setTimeout(t._ended.bind(t,e),n)),t._webAudio&&!o&&(e._paused=!0,e._ended=!0,e._seek=e._start||0,e._rateSeek=0,t._clearTimer(e._id),t._cleanBuffer(e._node),g._autoSuspend()),t._webAudio||o||t.stop(e._id,!0),t},_clearTimer:function(e){var t,n=this;return n._endTimers[e]&&("function"!=typeof n._endTimers[e]?clearTimeout(n._endTimers[e]):(t=n._soundById(e))&&t._node&&t._node.removeEventListener("ended",n._endTimers[e],!1),delete n._endTimers[e]),n},_soundById:function(e){for(var t=0;t<this._sounds.length;t++)if(e===this._sounds[t]._id)return this._sounds[t];return null},_inactiveSound:function(){var e=this;e._drain();for(var t=0;t<e._sounds.length;t++)if(e._sounds[t]._ended)return e._sounds[t].reset();return new u(e)},_drain:function(){var e=this,t=e._pool,n=0,o=0;if(!(e._sounds.length<t)){for(o=0;o<e._sounds.length;o++)e._sounds[o]._ended&&n++;for(o=e._sounds.length-1;0<=o;o--){if(n<=t)return;e._sounds[o]._ended&&(e._webAudio&&e._sounds[o]._node&&e._sounds[o]._node.disconnect(0),e._sounds.splice(o,1),n--)}}},_getSoundIds:function(e){if(void 0!==e)return[e];for(var t=[],n=0;n<this._sounds.length;n++)t.push(this._sounds[n]._id);return t},_refreshBuffer:function(e){return e._node.bufferSource=g.ctx.createBufferSource(),e._node.bufferSource.buffer=a[this._src],e._panner?e._node.bufferSource.connect(e._panner):e._node.bufferSource.connect(e._node),e._node.bufferSource.loop=e._loop,e._loop&&(e._node.bufferSource.loopStart=e._start||0,e._node.bufferSource.loopEnd=e._stop||0),e._node.bufferSource.playbackRate.setValueAtTime(e._rate,g.ctx.currentTime),this},_cleanBuffer:function(e){var t=g._navigator&&0<=g._navigator.vendor.indexOf("Apple");if(g._scratchBuffer&&e.bufferSource&&(e.bufferSource.onended=null,e.bufferSource.disconnect(0),t))try{e.bufferSource.buffer=g._scratchBuffer}catch(e){}return e.bufferSource=null,this},_clearSound:function(e){/MSIE |Trident\//.test(g._navigator&&g._navigator.userAgent)||(e.src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA")}};var u=function(e){this._parent=e,this.init()};u.prototype={init:function(){var e=this,t=e._parent;return e._muted=t._muted,e._loop=t._loop,e._volume=t._volume,e._rate=t._rate,e._seek=0,e._paused=!0,e._ended=!0,e._sprite="__default",e._id=++g._counter,t._sounds.push(e),e.create(),e},create:function(){var e=this,t=e._parent,n=g._muted||e._muted||e._parent._muted?0:e._volume;return t._webAudio?(e._node=void 0===g.ctx.createGain?g.ctx.createGainNode():g.ctx.createGain(),e._node.gain.setValueAtTime(n,g.ctx.currentTime),e._node.paused=!0,e._node.connect(g.masterGain)):g.noAudio||(e._node=g._obtainHtml5Audio(),e._errorFn=e._errorListener.bind(e),e._node.addEventListener("error",e._errorFn,!1),e._loadFn=e._loadListener.bind(e),e._node.addEventListener(g._canPlayEvent,e._loadFn,!1),e._node.src=t._src,e._node.preload=t._html5?"metadata":"auto",e._node.volume=n*g.volume(),e._node.load()),e},reset:function(){var e=this,t=e._parent;return e._muted=t._muted,e._loop=t._loop,e._volume=t._volume,e._rate=t._rate,e._seek=0,e._rateSeek=0,e._paused=!0,e._ended=!0,e._sprite="__default",e._id=++g._counter,e},_errorListener:function(){var e=this;e._parent._emit("loaderror",e._id,e._node.error?e._node.error.code:0),e._node.removeEventListener("error",e._errorFn,!1)},_loadListener:function(){var e=this._parent;e._duration=Math.ceil(10*this._node.duration)/10,0===Object.keys(e._sprite).length&&(e._sprite={__default:[0,1e3*e._duration]}),"loaded"!==e._state&&(e._state="loaded",e._emit("load"),e._loadQueue()),this._node.removeEventListener(g._canPlayEvent,this._loadFn,!1)}};var a={},i=function(t){var e=t._src;if(a[e])return t._duration=a[e].duration,void _(t);if(/^data:[^;]+;base64,/.test(e)){for(var n=atob(e.split(",")[1]),o=new Uint8Array(n.length),r=0;r<n.length;++r)o[r]=n.charCodeAt(r);s(o.buffer,t)}else{var u=new XMLHttpRequest;u.open("GET",e,!0),u.withCredentials=t._xhrWithCredentials,u.responseType="arraybuffer",t._xhrHeaders&&Object.keys(t._xhrHeaders).forEach(function(e){u.setRequestHeader(e,t._xhrHeaders[e])}),u.onload=function(){var e=(u.status+"")[0];"0"===e||"2"===e||"3"===e?s(u.response,t):t._emit("loaderror",null,"Failed loading audio file with status: "+u.status+".")},u.onerror=function(){t._webAudio&&(t._html5=!0,t._webAudio=!1,t._sounds=[],delete a[e],t.load())},d(u)}},d=function(t){try{t.send()}catch(e){t.onerror()}},s=function(e,t){function n(){t._emit("loaderror",null,"Decoding audio data failed.")}function o(e){e&&0<t._sounds.length?(a[t._src]=e,_(t,e)):n()}"undefined"!=typeof Promise&&1===g.ctx.decodeAudioData.length?g.ctx.decodeAudioData(e).then(o).catch(n):g.ctx.decodeAudioData(e,o,n)},_=function(e,t){t&&!e._duration&&(e._duration=t.duration),0===Object.keys(e._sprite).length&&(e._sprite={__default:[0,1e3*e._duration]}),"loaded"!==e._state&&(e._state="loaded",e._emit("load"),e._loadQueue())},l=function(){if(g.usingWebAudio){try{"undefined"!=typeof AudioContext?g.ctx=new AudioContext:"undefined"!=typeof webkitAudioContext?g.ctx=new webkitAudioContext:g.usingWebAudio=!1}catch(e){g.usingWebAudio=!1}g.ctx||(g.usingWebAudio=!1);var e=/iP(hone|od|ad)/.test(g._navigator&&g._navigator.platform),t=g._navigator&&g._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/),t=t?parseInt(t[1],10):null;e&&t&&t<9&&(t=/safari/.test(g._navigator&&g._navigator.userAgent.toLowerCase()),g._navigator&&!t&&(g.usingWebAudio=!1)),g.usingWebAudio&&(g.masterGain=void 0===g.ctx.createGain?g.ctx.createGainNode():g.ctx.createGain(),g.masterGain||(g.usingWebAudio=!1),g.masterGain.gain.setValueAtTime(g._muted?0:g._volume,g.ctx.currentTime),g.masterGain.connect(g.ctx.destination)),g._setup()}};"function"==typeof define&&define.amd&&define([],function(){return{Howler:g,Howl:t}}),void 0!==o&&(o.Howler=g,o.Howl=t),"undefined"!=typeof window?(window.HowlerGlobal=e,window.Howler=g,window.Howl=t,window.Sound=u):void 0!==n&&(n.HowlerGlobal=e,n.Howler=g,n.Howl=t,n.Sound=u)}()}.call(this)}.call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],2:[function(e,t,n){"use strict";t.exports=function(){var e=new Float32Array(9);return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=1,e[5]=0,e[6]=0,e[7]=0,e[8]=1,e}},{}],3:[function(e,t,n){"use strict";t.exports=function(e,t){return e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[4],e[4]=t[5],e[5]=t[6],e[6]=t[8],e[7]=t[9],e[8]=t[10],e}},{}],4:[function(e,t,n){"use strict";t.exports=function(e,t){return e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15],e}},{}],5:[function(e,t,n){"use strict";t.exports=function(){var e=new Float32Array(16);return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}},{}],6:[function(e,t,n){"use strict";t.exports=function(e){return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}},{}],7:[function(e,t,n){"use strict";t.exports=function(e,t){var n=t[0],o=t[1],r=t[2],u=t[3],a=t[4],i=t[5],d=t[6],s=t[7],_=t[8],l=t[9],c=t[10],f=t[11],p=t[12],m=t[13],h=t[14],v=t[15],y=n*i-o*a,g=n*d-r*a,w=n*s-u*a,A=o*d-r*i,b=o*s-u*i,x=r*s-u*d,T=_*m-l*p,k=_*h-c*p,S=_*v-f*p,I=l*h-c*m,L=l*v-f*m,B=c*v-f*h,t=y*B-g*L+w*I+A*S-b*k+x*T;return t?(t=1/t,e[0]=(i*B-d*L+s*I)*t,e[1]=(r*L-o*B-u*I)*t,e[2]=(m*x-h*b+v*A)*t,e[3]=(c*b-l*x-f*A)*t,e[4]=(d*S-a*B-s*k)*t,e[5]=(n*B-r*S+u*k)*t,e[6]=(h*w-p*x-v*g)*t,e[7]=(_*x-c*w+f*g)*t,e[8]=(a*L-i*S+s*T)*t,e[9]=(o*S-n*L-u*T)*t,e[10]=(p*b-m*w+v*y)*t,e[11]=(l*w-_*b-f*y)*t,e[12]=(i*k-a*I-d*T)*t,e[13]=(n*I-o*k+r*T)*t,e[14]=(m*g-p*A-h*y)*t,e[15]=(_*A-l*g+c*y)*t,e):null}},{}],8:[function(e,t,n){"use strict";var p=e("./identity");t.exports=function(e,t,n,o){var r,u=t[0],a=t[1],i=t[2],d=o[0],s=o[1],_=o[2],l=n[0],c=n[1],f=n[2];if(Math.abs(u-l)<1e-6&&Math.abs(a-c)<1e-6&&Math.abs(i-f)<1e-6)return p(e);r=u-l,t=a-c,o=i-f,n=1/Math.sqrt(r*r+t*t+o*o),l=s*(o*=n)-_*(t*=n),c=_*(r*=n)-d*o,f=d*t-s*r,(n=Math.sqrt(l*l+c*c+f*f))?(l*=n=1/n,c*=n,f*=n):f=c=l=0;_=t*f-o*c,d=o*l-r*f,s=r*c-t*l,(n=Math.sqrt(_*_+d*d+s*s))?(_*=n=1/n,d*=n,s*=n):s=d=_=0;return e[0]=l,e[1]=_,e[2]=r,e[3]=0,e[4]=c,e[5]=d,e[6]=t,e[7]=0,e[8]=f,e[9]=s,e[10]=o,e[11]=0,e[12]=-(l*u+c*a+f*i),e[13]=-(_*u+d*a+s*i),e[14]=-(r*u+t*a+o*i),e[15]=1,e}},{"./identity":6}],9:[function(e,t,n){"use strict";t.exports=function(e,t,n){var o=t[0],r=t[1],u=t[2],a=t[3],i=t[4],d=t[5],s=t[6],_=t[7],l=t[8],c=t[9],f=t[10],p=t[11],m=t[12],h=t[13],v=t[14],y=t[15],g=n[0],w=n[1],A=n[2],t=n[3];return e[0]=g*o+w*i+A*l+t*m,e[1]=g*r+w*d+A*c+t*h,e[2]=g*u+w*s+A*f+t*v,e[3]=g*a+w*_+A*p+t*y,g=n[4],w=n[5],A=n[6],t=n[7],e[4]=g*o+w*i+A*l+t*m,e[5]=g*r+w*d+A*c+t*h,e[6]=g*u+w*s+A*f+t*v,e[7]=g*a+w*_+A*p+t*y,g=n[8],w=n[9],A=n[10],t=n[11],e[8]=g*o+w*i+A*l+t*m,e[9]=g*r+w*d+A*c+t*h,e[10]=g*u+w*s+A*f+t*v,e[11]=g*a+w*_+A*p+t*y,g=n[12],w=n[13],A=n[14],t=n[15],e[12]=g*o+w*i+A*l+t*m,e[13]=g*r+w*d+A*c+t*h,e[14]=g*u+w*s+A*f+t*v,e[15]=g*a+w*_+A*p+t*y,e}},{}],10:[function(e,t,n){"use strict";t.exports=function(e,t,n,o,r){var u=1/Math.tan(t/2),t=1/(o-r);return e[0]=u/n,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=u,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=(r+o)*t,e[11]=-1,e[12]=0,e[13]=0,e[14]=2*r*o*t,e[15]=0,e}},{}],11:[function(e,t,n){"use strict";t.exports=function(e,t){{var n,o,r,u,a,i;e===t?(n=t[1],o=t[2],r=t[3],u=t[6],a=t[7],i=t[11],e[1]=t[4],e[2]=t[8],e[3]=t[12],e[4]=n,e[6]=t[9],e[7]=t[13],e[8]=o,e[9]=u,e[11]=t[14],e[12]=r,e[13]=a,e[14]=i):(e[0]=t[0],e[1]=t[4],e[2]=t[8],e[3]=t[12],e[4]=t[1],e[5]=t[5],e[6]=t[9],e[7]=t[13],e[8]=t[2],e[9]=t[6],e[10]=t[10],e[11]=t[14],e[12]=t[3],e[13]=t[7],e[14]=t[11],e[15]=t[15])}return e}},{}],12:[function(e,t,n){"use strict";var p=e("assert");function o(t,n,o,r){p.equal(typeof n,"number"),p(Array.isArray(t)),p.equal(typeof o,"function"),p.equal(typeof r,"function");var u=t.length,a=u,i=0,d=0,s=[],_=null,l=!1;function c(){for(l=!0;d!==u&&i<n;){var e=d++;++i,o(t[e],f.bind(null,e),e)}a||r(_,s),l=!1}function f(e,t,n){p.equal(s[e],void 0),s[e]=n,t&&(_=_||t),--i,--a,l||c()}c()}function r(e,t,n){o(e,t,function(e,t){e(t)},n)}n.series=function(e,o){var r=e.length;r?function t(n){e[n](function(e){return e?o(e):n<r-1?t(n+1):o()})}(0):o()},n.eachLimit=o,n.each=function(e,t,n){o(e,1/0,t,n)},n.eachSeries=function(e,t,n){o(e,1,t,n)},n.parallelLimit=r,n.parallel=function(e,t){r(e,1/0,t)},n.limiter=function(e){var n=e,o=null,r=null;function t(){var e;o?((o=(e=o).next)||(r=null),u(e)):++n}function u(e){e.cb?e.exec(function(){e.cb.apply(e,arguments),t()}):e.exec(t)}return function(e,t){t={exec:e,cb:t};n?(--n,u(t)):o?(r.next=t,r=t):o=r=t}},Object.keys(n).forEach(function(e){n["async"+e[0].toUpperCase()+e.slice(1)]=n[e]})},{assert:16}],13:[function(e,t,n){"use strict";function o(e){e="function"==typeof e?e:e?function(){var t=0,n=0,o=0,r=1,e=function(){var o=4022871197;return function(e){e=e.toString();for(var t=0;t<e.length;t++){var n=.02519603282416938*(o+=e.charCodeAt(t));n-=o=n>>>0,o=(n*=o)>>>0,o+=4294967296*(n-=o)}return 2.3283064365386963e-10*(o>>>0)}}();t=e(" "),n=e(" "),o=e(" ");for(var u=0;u<arguments.length;u++)(t-=e(arguments[u]))<0&&(t+=1),(n-=e(arguments[u]))<0&&(n+=1),(o-=e(arguments[u]))<0&&(o+=1);return e=null,function(){var e=2091639*t+2.3283064365386963e-10*r;return t=n,n=o,o=e-(r=0|e)}}(e):Math.random;this.p=r(e),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var t=0;t<512;t++)this.perm[t]=this.p[255&t],this.permMod12[t]=this.perm[t]%12}function r(e){for(var t=new Uint8Array(256),n=0;n<256;n++)t[n]=n;for(n=0;n<255;n++){var o=n+~~(e()*(256-n)),r=t[n];t[n]=t[o],t[o]=r}return t}var g,w,L,j,V;g=.5*(Math.sqrt(3)-1),w=(3-Math.sqrt(3))/6,L=1/6,j=(Math.sqrt(5)-1)/4,V=(5-Math.sqrt(5))/20,o.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(e,t){var n,o=this.permMod12,r=this.perm,u=this.grad3,a=0,i=0,d=0,s=(e+t)*g,_=Math.floor(e+s),l=Math.floor(t+s),c=(_+l)*w,f=e-(_-c),p=t-(l-c),m=p<f?(n=1,0):(n=0,1),h=f-n+w,v=p-m+w,y=f-1+2*w,s=p-1+2*w,e=255&_,t=255&l,c=.5-f*f-p*p,_=.5-h*h-v*v,l=.5-y*y-s*s;return 70*((a=0<=c?(c*=c)*c*(u[c=3*o[e+r[t]]]*f+u[1+c]*p):a)+(i=0<=_?(_*=_)*_*(u[m=3*o[e+n+r[t+m]]]*h+u[1+m]*v):i)+(d=0<=l?(l*=l)*l*(u[t=3*o[1+e+r[1+t]]]*y+u[1+t]*s):d))},noise3D:function(e,t,n){var o,r,u,a,i,d=this.permMod12,s=this.perm,_=this.grad3,l=(e+t+n)*(1/3),c=Math.floor(e+l),f=Math.floor(t+l),p=Math.floor(n+l),m=(c+f+p)*L,h=e-(c-m),v=t-(f-m),y=n-(p-m),g=v<=h?y<=v?(a=u=o=1,i=r=0):u=y<=h?(a=i=r=0,o=1):(a=r=o=0,i=1):v<y?(u=r=o=0,a=i=1):h<y?(u=i=o=0,a=r=1):(a=u=r=1,i=o=0),w=h-o+L,A=v-r+L,b=y-i+L,x=h-u+2*L,T=v-a+2*L,k=y-g+2*L,S=h-1+.5,I=v-1+.5,l=y-1+.5,e=255&c,t=255&f,n=255&p,m=.6-h*h-v*v-y*y,c=.6-w*w-A*A-b*b,f=.6-x*x-T*T-k*k,p=.6-S*S-I*I-l*l;return 32*((m<0?0:(m*=m)*m*(_[m=3*d[e+s[t+s[n]]]]*h+_[1+m]*v+_[2+m]*y))+(c<0?0:(c*=c)*c*(_[i=3*d[e+o+s[t+r+s[n+i]]]]*w+_[1+i]*A+_[2+i]*b))+(f<0?0:(f*=f)*f*(_[g=3*d[e+u+s[t+a+s[n+g]]]]*x+_[1+g]*T+_[2+g]*k))+(p<0?0:(p*=p)*p*(_[n=3*d[1+e+s[1+t+s[1+n]]]]*S+_[1+n]*I+_[2+n]*l)))},noise4D:function(e,t,n,o){var r=this.perm,u=this.grad4,a=(e+t+n+o)*j,i=Math.floor(e+a),d=Math.floor(t+a),s=Math.floor(n+a),_=Math.floor(o+a),l=(i+d+s+_)*V,c=e-(i-l),f=t-(d-l),p=n-(s-l),m=o-(_-l),h=0,v=0,y=0,g=0;f<c?h++:v++,p<c?h++:y++,m<c?h++:g++,p<f?v++:y++,m<f?v++:g++,m<p?y++:g++;var w,A,b,x,T,k,S,I,L,B,P,M,E=c-(w=3<=h?1:0)+V,F=f-(A=3<=v?1:0)+V,q=p-(b=3<=y?1:0)+V,C=m-(B=3<=g?1:0)+V,H=c-(x=2<=h?1:0)+2*V,O=f-(T=2<=v?1:0)+2*V,G=p-(k=2<=y?1:0)+2*V,R=m-(P=2<=g?1:0)+2*V,W=c-(S=1<=h?1:0)+3*V,N=f-(I=1<=v?1:0)+3*V,U=p-(L=1<=y?1:0)+3*V,a=m-(M=1<=g?1:0)+3*V,e=c-1+4*V,t=f-1+4*V,n=p-1+4*V,o=m-1+4*V,l=255&i,h=255&d,v=255&s,y=255&_,g=.6-c*c-f*f-p*p-m*m,i=.6-E*E-F*F-q*q-C*C,d=.6-H*H-O*O-G*G-R*R,s=.6-W*W-N*N-U*U-a*a,_=.6-e*e-t*t-n*n-o*o;return 27*((g<0?0:(g*=g)*g*(u[g=r[l+r[h+r[v+r[y]]]]%32*4]*c+u[1+g]*f+u[2+g]*p+u[3+g]*m))+(i<0?0:(i*=i)*i*(u[B=r[l+w+r[h+A+r[v+b+r[y+B]]]]%32*4]*E+u[1+B]*F+u[2+B]*q+u[3+B]*C))+(d<0?0:(d*=d)*d*(u[P=r[l+x+r[h+T+r[v+k+r[y+P]]]]%32*4]*H+u[1+P]*O+u[2+P]*G+u[3+P]*R))+(s<0?0:(s*=s)*s*(u[M=r[l+S+r[h+I+r[v+L+r[y+M]]]]%32*4]*W+u[1+M]*N+u[2+M]*U+u[3+M]*a))+(_<0?0:(_*=_)*_*(u[y=r[1+l+r[1+h+r[1+v+r[1+y]]]]%32*4]*e+u[1+y]*t+u[2+y]*n+u[3+y]*o)))}},o._buildPermutationTable=r,"undefined"!=typeof define&&define.amd&&define(function(){return o}),void 0!==n?n.SimplexNoise=o:"undefined"!=typeof window&&(window.SimplexNoise=o),void 0!==t&&(t.exports=o)},{}],14:[function(e,t,n){"use strict";e("../glov/client/require.js"),deps.assert=e("assert"),deps.buffer=e("buffer"),deps["glov-async"]=e("glov-async"),deps["gl-mat3/create"]=e("gl-mat3/create"),deps["gl-mat3/fromMat4"]=e("gl-mat3/fromMat4"),deps["gl-mat4/copy"]=e("gl-mat4/copy"),deps["gl-mat4/create"]=e("gl-mat4/create"),deps["gl-mat4/invert"]=e("gl-mat4/invert"),deps["gl-mat4/lookAt"]=e("gl-mat4/lookAt"),deps["gl-mat4/multiply"]=e("gl-mat4/multiply"),deps["gl-mat4/perspective"]=e("gl-mat4/perspective"),deps["gl-mat4/transpose"]=e("gl-mat4/transpose"),deps["@jimbly/howler/src/howler.core.js"]=e("@jimbly/howler/src/howler.core.js"),deps["simplex-noise"]=e("simplex-noise")},{"../glov/client/require.js":15,"@jimbly/howler/src/howler.core.js":1,assert:16,buffer:17,"gl-mat3/create":2,"gl-mat3/fromMat4":3,"gl-mat4/copy":4,"gl-mat4/create":5,"gl-mat4/invert":7,"gl-mat4/lookAt":8,"gl-mat4/multiply":9,"gl-mat4/perspective":10,"gl-mat4/transpose":11,"glov-async":12,"simplex-noise":13}],15:[function(e,t,n){"use strict";var o="undefined"==typeof window?self:window,r=o.deps=o.deps||{};o.require=function(e){if(!r[e])throw new Error("Cannot find module '"+e+"' (add it to deps.js or equivalent)");return r[e]}},{}],16:[function(e,t,n){"use strict";function o(e,t){if(!e)throw t=t||(void 0===e||!1===e?"":JSON.stringify(e)),new Error("Assertion failed"+(t?": "+t:""))}t.exports=o,t.exports.ok=o,t.exports.equal=function(e,t){if(e!==t)throw new Error('Assertion failed: "'+e+'"==="'+t+'"')}},{}],17:[function(e,t,n){"use strict";n.__esModule=!0,n.Buffer=void 0;var o={};(n.Buffer=o).isBuffer=function(e){return!1}},{}]},{},[14]);
//# sourceMappingURL=http://localhost:3000/app_deps.bundle.js.map?ver=1729897180586
