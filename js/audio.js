// --- Audio Manager ---
const audioManager = {
    audioContext: null, sounds: {}, masterVolume: 0.5, musicVolume: 0.3, sfxVolume: 0.5, audioInitialized: false, currentMusic: null,
    async initAudio() { if(this.audioContext&&this.audioContext.state!=='closed')return;try{this.audioContext=new(window.AudioContext||window.webkitAudioContext)();if(this.audioContext.state==='suspended'){await this.audioContext.resume();}this.audioInitialized=true;console.log("AudioContext initialized.");}catch(e){console.error("Error initializing AudioContext:",e);this.audioInitialized=false;}},
    async loadSound(name,url,isMusic=false){if(!this.audioInitialized||!this.audioContext){return;}if(this.sounds[name])return;try{const response=await fetch(url);if(!response.ok)throw new Error(`Fetch failed: ${url}`);const arrayBuffer=await response.arrayBuffer();const audioBuffer=await this.audioContext.decodeAudioData(arrayBuffer);this.sounds[name]={buffer:audioBuffer,sourceNode:null,gainNode:null,isMusic:isMusic,name:name};console.log(`Sound loaded: ${name}`);}catch(e){console.error(`Error loading ${name}:`,e);}},
    playSound(name,loop=false){if(!this.audioInitialized||!this.sounds[name]||!this.sounds[name].buffer)return;if(this.sounds[name].isMusic){this.stopAllMusic(name);this.currentMusic=name;}else if(this.sounds[name].sourceNode&&!this.sounds[name].isMusic){try{this.sounds[name].sourceNode.stop();}catch(e){/*ignore*/}}const sourceNode=this.audioContext.createBufferSource();sourceNode.buffer=this.sounds[name].buffer;sourceNode.loop=loop;const gainNode=this.audioContext.createGain();const volume=this.sounds[name].isMusic?this.musicVolume:this.sfxVolume;gainNode.gain.setValueAtTime(volume*this.masterVolume,this.audioContext.currentTime);sourceNode.connect(gainNode).connect(this.audioContext.destination);sourceNode.start(0);this.sounds[name].sourceNode=sourceNode;this.sounds[name].gainNode=gainNode;sourceNode.onended=()=>{if(this.sounds[name]&&this.sounds[name].sourceNode===sourceNode){this.sounds[name].sourceNode=null;this.sounds[name].gainNode=null;}if(this.sounds[name]&&this.sounds[name].isMusic&&this.currentMusic===name&&!loop){this.currentMusic=null;}};},
    stopSound(name){if(this.sounds[name]&&this.sounds[name].sourceNode){try{this.sounds[name].sourceNode.stop(0);}catch(e){/*ignore*/}this.sounds[name].sourceNode=null;this.sounds[name].gainNode=null;if(this.sounds[name].isMusic&&this.currentMusic===name){this.currentMusic=null;}}},
    stopAllMusic(exceptTrackName=null){for(const soundName in this.sounds){if(this.sounds[soundName].isMusic&&this.sounds[soundName].sourceNode&&soundName!==exceptTrackName){this.stopSound(soundName);}}if(exceptTrackName===null&&this.currentMusic&&(!exceptTrackName||this.currentMusic!==exceptTrackName)){this.currentMusic=null;}else if(exceptTrackName&&this.currentMusic===exceptTrackName){}else if(this.currentMusic&&this.currentMusic!==exceptTrackName){}},
    setMasterVolume(volume){this.masterVolume=Math.max(0,Math.min(1,volume));for(const soundName in this.sounds){if(this.sounds[soundName]&&this.sounds[soundName].gainNode){const baseVolume=this.sounds[soundName].isMusic?this.musicVolume:this.sfxVolume;this.sounds[soundName].gainNode.gain.setValueAtTime(baseVolume*this.masterVolume,this.audioContext.currentTime);}}}
};

async function preloadGameAudio(){
    if(!audioManager.audioInitialized){
        await audioManager.initAudio();
    }
    if(!audioManager.audioInitialized){ // Check again if init failed
        console.error("Audio initialization failed. Cannot preload sounds.");
        return;
    }
    // Paths to audio files need to be correct. Assuming a 'sounds/' directory.
    await audioManager.loadSound('musicReef','sounds/music_reef.mp3',true);
    await audioManager.loadSound('musicKelp','sounds/music_kelp.mp3',true);
    await audioManager.loadSound('musicOcean','sounds/music_ocean.mp3',true);
    await audioManager.loadSound('sfxCollect','sounds/sfx_collect.mp3',false);
    await audioManager.loadSound('sfxPlayerHurt','sounds/sfx_player_hurt.mp3',false);
    await audioManager.loadSound('sfxEnemyHit','sounds/sfx_enemy_hit.mp3',false);
    await audioManager.loadSound('sfxEnemyDestroy','sounds/sfx_enemy_destroy.mp3',false);
    // await audioManager.loadSound('sfxSealCharge', 'sounds/sfx_seal_charge.mp3', false); // Example, if you have this sound
    console.log("Audio preloading function executed.");
}
