const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeKeys = {}; // To keep track of currently active keys

// Map of keys to frequencies
const keyFrequencyMap = {
    'z': 130.81,  // C3
    's': 138.59,  // C#3/D♭3
    'x': 146.83,  // D3
    'd': 155.56,  // D#3/E♭3
    'c': 164.81,  // E3
    'v': 174.61,  // F3
    'g': 185.00,  // F#3/G♭3
    'b': 196.00,  // G3
    'h': 207.65,  // G#3/A♭3
    'n': 220.00,  // A3
    'j': 233.08,  // A#3/B♭3
    'm': 246.94,  // B3

    'q': 261.63,  // C4
    '2': 277.18,  // C#4/D♭4
    '@': 277.18,  // C#4/D♭4
    'w': 293.66,  // D4
    '3': 311.13,  // D#4/E♭4
    '#': 311.13,  // D#4/E♭4
    'e': 329.63,  // E4
    'r': 349.23,  // F4
    '5': 369.99,  // F#4/G♭4
    '%': 369.99,  // F#4/G♭4
    't': 392.00,  // G4
    '6': 415.30,  // G#4/A♭4
    '^': 415.30,  // G#4/A♭4
    'y': 440.00,  // A4
    '7': 466.16,  // A#4/B♭4
    '&': 466.16,  // A#4/B♭4
    'u': 493.88,  // B4
};

// TODO: implement percussions

function playPianoKey(frequency) {
    // Create new gain nodes and oscillators for each note
    const gainNode = audioContext.createGain();
    const harmonicGain = audioContext.createGain();
    const oscillator1 = audioContext.createOscillator(); // Fundamental
    const oscillator2 = audioContext.createOscillator(); // Harmonics

    // Set oscillator types
    oscillator1.type = 'sine'; // Fundamental frequency
    oscillator2.type = 'triangle'; // Harmonics

    // Set frequencies
    oscillator1.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator2.frequency.setValueAtTime(frequency * 2, audioContext.currentTime); // Second harmonic

    // Connect oscillators to gains
    oscillator1.connect(gainNode);
    oscillator2.connect(harmonicGain);
    harmonicGain.gain.setValueAtTime(0.05, audioContext.currentTime); // Set harmonics volume
    harmonicGain.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start playing the sound
    oscillator1.start();
    oscillator2.start();

    // Set the gain node to full volume immediately
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);

    // Store the gainNode for later use when stopping the sound
    activeKeys[frequency] = { gainNode, oscillator1, oscillator2 };

    // Set a timed fade-out after a specified duration
    const fadeOutDuration = 5; // Time before starting to fade out (in seconds)

    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutDuration); // Fade out over 5 seconds
    oscillator1.stop(audioContext.currentTime + fadeOutDuration);
    oscillator2.stop(audioContext.currentTime + fadeOutDuration);
}

function stopPianoKey(frequency) {
    if (activeKeys[frequency]) {
        const { gainNode, oscillator1, oscillator2 } = activeKeys[frequency];
        const now = audioContext.currentTime;

        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        oscillator1.stop(now + 0.2);
        oscillator2.stop(now + 0.2);

        delete activeKeys[frequency];
    }
}

// Event listeners for key press
document.addEventListener('keydown', function (event) {
    const key = event.key.toLowerCase();
    const frequency = keyFrequencyMap[key];

    // Check if the Shift key is pressed
    const shiftPressed = event.shiftKey;
    const adjustedFrequency = shiftPressed ? frequency * 4 : frequency; // Raise by 2 octaves (2^2 = 4)

    if (frequency && !activeKeys[adjustedFrequency]) {
        playPianoKey(adjustedFrequency); // Play the note if it's not already active
    }
});

document.addEventListener('keyup', function (event) {
    const key = event.key.toLowerCase();
    const frequency = keyFrequencyMap[key];

    if (frequency) {
        // Calculate the adjusted frequency for release
        const shiftPressed = event.shiftKey;
        const adjustedFrequency = shiftPressed ? frequency * 4 : frequency; // Raise by 2 octaves

        stopPianoKey(adjustedFrequency); // Stop the note
    }
});