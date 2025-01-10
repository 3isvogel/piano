const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeKeys = {}; // To keep track of currently active keys
const activeSounds = {};
const shift_register = document.getElementById("shift-register");
// maybe a better way exixts, IDC, I will do how you do in microcontrollers + the toggle
const shift_octaves = 2;
let shift_toggle = false;
let shift_state = false;
let shift_prev_state = false;

// Tune the A4 and then tune the whole piano
// on it shifting the available register up "BASE" octaves
const A0 = 27.5;
const A4 = oct(A0, 4);

// note: notes are repeted for ease of representaiton in the config file
const notes = {
    'A': A0,
    'As': stp(A0, 1),
    'B': stp(A0, 2),
    'C': stp(A0, -9),
    'Cs': stp(A0, -8),
    'D': stp(A0, -7),
    'Ds': stp(A0, -6),
    'E': stp(A0, -5),
    'F': stp(A0, -4),
    'Fs': stp(A0, -3),
    'G': stp(A0, -2),
    'Gs': stp(A0, -1)
}
// semitones on the B and E
notes['Bs'] = oct(notes['C'], 1);
notes['Es'] = notes['F'];
// flat name for all notes
notes['Ab'] = notes['Gs'];
notes['Bb'] = notes['As'];
notes['Cb'] = oct(notes['B'], -1);
notes['Db'] = notes['Cs'];
notes['Eb'] = notes['Ds'];
notes['Fb'] = notes['E'];
notes['Gb'] = notes['As'];

let keyFrequencyMap = {};
function updateKeyMap(l) {
    keyFrequencyMap = selectKeyMap(l);
}
updateKeyMap('default');

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