const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioBuffers = {};

// Background music state
let bgmSource = null;
let bgmGainNode = null;
let bgmStartTime = 0;
const BGM_CONFIG = {
    name: '/Jelly Cascade - Mash for the Candy Crown - Sonauto.ogg',
    duration: 95,
    fadeIn: 15,
    fadeOut: 15,
    maxVolume: 0.3
};

async function loadSound(name) {
    if (audioBuffers[name]) {
        return audioBuffers[name];
    }
    try {
        const response = await fetch(name);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers[name] = audioBuffer;
        return audioBuffer;
    } catch (error) {
        console.error(`Error loading sound: ${name}`, error);
    }
}

export function playSound(name) {
    // Resume context on user gesture
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    loadSound(name).then(audioBuffer => {
        if (!audioBuffer) return;
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);
    });
}

function updateBgmVolume() {
    if (!bgmGainNode || !bgmStartTime) {
        return;
    }

    const { duration, fadeIn, fadeOut, maxVolume } = BGM_CONFIG;
    // Calculate current position in the looping track
    const playbackTime = (audioContext.currentTime - bgmStartTime) % duration;

    let gain = maxVolume;
    if (playbackTime < fadeIn) {
        // Fade in
        gain = maxVolume * (playbackTime / fadeIn);
    } else if (playbackTime > duration - fadeOut) {
        // Fade out
        const timeIntoFadeOut = playbackTime - (duration - fadeOut);
        gain = maxVolume * (1 - (timeIntoFadeOut / fadeOut));
    }

    // Clamp gain value to avoid any potential issues
    gain = Math.max(0, Math.min(maxVolume, gain));
    
    // Use setValueAtTime for smooth transitions
    bgmGainNode.gain.setValueAtTime(gain, audioContext.currentTime);

    requestAnimationFrame(updateBgmVolume);
}

export async function playBackgroundMusic() {
    // Resume context on user gesture if needed
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    if (bgmSource) {
        return; // Already playing
    }
    
    const audioBuffer = await loadSound(BGM_CONFIG.name);
    if (!audioBuffer) {
        console.error("Background music failed to load.");
        return;
    }

    bgmGainNode = audioContext.createGain();
    bgmGainNode.gain.value = 0;
    bgmGainNode.connect(audioContext.destination);

    bgmSource = audioContext.createBufferSource();
    bgmSource.buffer = audioBuffer;
    bgmSource.loop = true;
    bgmSource.connect(bgmGainNode);
    
    bgmSource.start(0);
    bgmStartTime = audioContext.currentTime;

    updateBgmVolume();
}

// Preload common sounds
window.addEventListener('load', () => {
    loadSound('match.mp3');
    loadSound('smash.mp3');
    loadSound(BGM_CONFIG.name); // Preload background music
    loadSound('sweet_mash.mp3');
    loadSound('nice_swipe.mp3');
    loadSound('tasty_trio.mp3');
    loadSound('crunch_combo.mp3');
    loadSound('good_move.mp3');
    loadSound('smash_success.mp3');
    loadSound('combo_6.mp3');
    loadSound('combo_7.mp3');
});