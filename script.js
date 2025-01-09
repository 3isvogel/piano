const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeKeys = {}; // To keep track of currently active keys
const activeSounds = {};
const shift_register = document.getElementById("shift-register");
// maybe a better way exixts, IDC, I will do how you do in microcontrollers + the toggle
const shift_octaves = 2;
let shift_toggle = false;
let shift_state = false;
let shift_prev_state = false;

function oct(note, octaves) {
    const mult = 2 ** octaves;
    return note * mult;
}

const step_size = 2 ** (1 / 12)
function stp(note, steps) {
    return note * step_size ** steps;
}

// Tune the A4 and then tune the whole piano
// on it shifting the available register up "BASE" octaves
const A4 = 440;
const BASE = 2;

const A0 = oct(A4, -4);
// this way the frequencies are define once, to raise/lower all the keys just change the base number
const A = oct(A0, BASE);
const As = stp(A, 1);
const B = stp(A, 2);
const C = stp(A, -9);
const Cs = stp(A, -8);
const D = stp(A, -7);
const Ds = stp(A, -6);
const E = stp(A, -5);
const F = stp(A, -4);
const Fs = stp(A, -3);
const G = stp(A, -2);
const Gs = stp(A, -1);

// Map of keys to frequencies
// FIXME: Using toggle switch makes every key work regardless if they are latin or symbols,
//        however some keys don't make any sound when shift key is pressed, since they send a different keycode

// TODO: Provide different keymapping layout to choose from, and save them as separate files
const keyFrequencyMap = {

    // Lower scale: C tones
    '`': oct(F, 0),
    'z': oct(G, 0),
    'x': oct(A, 0),
    'c': oct(B, 0),
    'v': oct(C, 1),
    'b': oct(D, 1),
    'n': oct(E, 1),
    'm': oct(F, 1),
    ',': oct(G, 1),
    '.': oct(A, 1),
    '/': oct(B, 1),

    // Lower scale: C semitones
    'a': oct(Fs, 0),
    's': oct(Gs, 0),
    'd': oct(As, 0),
    'g': oct(Cs, 1),
    'h': oct(Ds, 1),
    'k': oct(Fs, 1),
    'l': oct(Gs, 1),
    ';': oct(As, 1),

    // Higher scale: C tones
    'q': oct(F, 1),
    'w': oct(G, 1),
    'e': oct(A, 1),
    'r': oct(B, 1),
    't': oct(C, 2),
    'y': oct(D, 2),
    'u': oct(E, 2),
    'i': oct(F, 2),
    'o': oct(G, 2),
    'p': oct(A, 2),
    '[': oct(B, 2),

    // Higher scale: C semitones
    '2': oct(Fs, 1),
    '3': oct(Gs, 1),
    '4': oct(As, 1),
    '6': oct(Cs, 2),
    '7': oct(Ds, 2),
    '9': oct(Fs, 2),
    '0': oct(Gs, 2),
    '-': oct(As, 2),

    '§': A4 // A4 standard tuning
};

let keySoundMap = {
    '\\': "sounds/kick.ogg",
    ']': "sounds/snare.ogg",
    '=': "sounds/crash.ogg",
};

function playAudio(name) {
    const audio = new Audio(name);
    audio.play().catch(error => {
        console.error("Error playing audio:", error);
    });
}

function playPianoKey(frequency) {
    // Create new gain nodes and oscillators for each note

    const fadeOutDuration = 5; // Time before starting to fade out

    const harmonicGains = new Array(harmonics);
    const harmonicOscillators = new Array(harmonics);
    const now = audioContext.currentTime;

    for (let i = 0; i < harmonics; i++) {
        harmonicGains[i] = audioContext.createGain();
        harmonicOscillators[i] = audioContext.createOscillator();
        harmonicOscillators[i].type = document.querySelector(`input[name="h${i}-shape"]:checked`).value;
        harmonicOscillators[i].frequency.setValueAtTime(oct(frequency, i), now);
        harmonicOscillators[i].connect(harmonicGains[i]);
        harmonicGains[i].gain.setValueAtTime(1 / (2 ** i), now);
        // cascadian connect to destination
        if (i == 0) {
            harmonicGains[i].connect(audioContext.destination);
        } else {
            harmonicGains[i].connect(harmonicGains[i - 1]);
        }
        harmonicOscillators[i].start();
        // Fade out over 5 seconds
        harmonicOscillators[i].stop(now + fadeOutDuration);
    }

    // only set to 0 the main gain node as the other are connected to it will fade out at the same time
    harmonicGains[0].gain.linearRampToValueAtTime(0, now + fadeOutDuration);

    activeKeys[frequency] = { harmonics, harmonicGains, harmonicOscillators };
}

function stopPianoKey(frequency) {
    if (activeKeys[frequency]) {
        const { harmonics, harmonicGains, harmonicOscillators } = activeKeys[frequency];

        const now = audioContext.currentTime;

        // when key is released fade out quicker
        harmonicGains[0].gain.linearRampToValueAtTime(0, now + 0.2);
        for (let i = 0; i < harmonics; i++) {
            harmonicOscillators[i].stop(now + 0.2)
        }

        delete activeKeys[frequency];
    }
}

// Event listeners for key press
document.addEventListener('keydown', function (event) {
    // prevent default actions from triggering (eg: "/" for quicksearch)
    event.preventDefault();
    const key = event.key.toLowerCase();

    // Handle audio samples
    const sound = keySoundMap[key];
    if (sound && !activeSounds[key]) {
        activeSounds[key] = true;
        playAudio(sound)
        return;
    }

    // TODO: add a text field to provide file path, allowing binding key to sound
    // TODO: extend functionality to any key, allowing drop-in configuration for all settings (to allow user-specific conf)
    // ideally, provide a parsed box of test where each eintry is a line in the form of:
    // <s|k><_sep_><key><_sep_><resource|frequency>
    //   s: sound -> populate soundNameMap, k: key -> populate keyFrequencyMap
    //   key: the key to bind
    //   resource: an URI to the specified resource, frequency: frequency to play
    //   <sep> still to decide if universal or user-specific, in this case the first line is something like: "sep:<sep>"

    // Handle frequencies
    const frequency = keyFrequencyMap[key];

    // Double state check on shift key for toggle
    shift_state = event.shiftKey;
    if (shift_state && !shift_prev_state) {
        shift_toggle = !shift_toggle;
        const shift_register = document.getElementById("shift-register");
        shift_register.innerText = shift_toggle ? "↑ High" : "↓ Low";
        shift_register.style["color"] = shift_toggle ? "blue" : "green";
    } // well... toggle the toggle
    shift_prev_state = shift_state;

    const adjustedFrequency = oct(frequency, shift_toggle * shift_octaves);

    if (frequency && !activeKeys[adjustedFrequency]) {
        playPianoKey(adjustedFrequency); // Play the note if it's not already active
    }
});

document.addEventListener('keyup', function (event) {
    const key = event.key.toLowerCase();
    const frequency = keyFrequencyMap[key];

    shift_state = event.shiftKey;
    if (shift_prev_state && !shift_state)
        shift_prev_state = shift_state;
    if (frequency) {
        // Calculate the adjusted frequency for release
        const adjustedFrequency = oct(frequency, shift_toggle * shift_octaves);

        stopPianoKey(adjustedFrequency); // Stop the note
    }

    if (activeSounds[key]) activeSounds[key] = null;
});

let clamp = ((x, m, M) => { return x < m ? m : x > M ? M : x })

// Start harmonics
let harmonics = 2;
const MIN_HARMONICS = 1;
const MAX_HARMONICS = 4;
function setHarmonics(modify) {
    harmonics += modify;
    harmonics = clamp(harmonics, MIN_HARMONICS, MAX_HARMONICS);
    let e = document.getElementById("oscillator-shape")
    e.innerHTML = ""
    for (let h = 0; h < harmonics; h++) {
        oscillator_selector =
            `<div id="h${h}-shape">
            <h3>Harmonic[${h}] shape</h3>
            <form id="h${h}-shapes" class="vertical">
            <label><input type="radio" value="sine" name="h${h}-shape" checked>Sine</label>
            <label><input type="radio" value="square" name="h${h}-shape">Square</label>
            <label><input type="radio" value="triangle" name="h${h}-shape">Triangle</label>
            <label><input type="radio" value="sawtooth" name="h${h}-shape">Sawtooth</label>
            </form>
        </div>`
        e.innerHTML += oscillator_selector
    }

}