function oct(note, octaves) {
    const mult = 2 ** octaves;
    return note * mult;
}

const step_size = 2 ** (1 / 12)
function stp(note, steps) {
    return note * step_size ** steps;
}


let clamp = ((x, m, M) => { return x < m ? m : x > M ? M : x })

// Start harmonics
let harmonics = 0;
const MIN_HARMONICS = 1;
const MAX_HARMONICS = 4;
function setHarmonics(modify) {
    harmonics += modify;
    harmonics = clamp(harmonics, MIN_HARMONICS, MAX_HARMONICS);
    let e = document.getElementById("oscillator-shape");
    let now = e.childElementCount;
    if (now < harmonics)
        for (let h = now; h < harmonics; h++) {
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
            e.insertAdjacentHTML('beforeend', oscillator_selector)
        }
    else {
        for (let h = harmonics; h < now; h++) {
            e.removeChild(e.lastChild);
        }
    }
}

function initLayoutSelect() {
    let e = document.getElementById("layoutsel");
    for (let i = 0; i < availablLayouts.length; i++) {
        const entry = availablLayouts[i];
        e.innerHTML += `<option value=${entry[0]}>${entry[1]}</option>`;
    }
}

document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        initLayoutSelect();
        setHarmonics(2);
        // set default shape
        document.getElementsByName('h1-shape')[2].checked = true;
    }
}


function loadKeyMap(keymap) {
    layout = {}
    for (i in keymap) {
        let value = keymap[i]
        let frequency = 0;
        if (value[1] == 'f') {
            frequency = value[2];
        } else {
            frequency = notes[value[2]];
            if (value[3] == 'o')
                frequency = oct(frequency, value[4]);
            else
                frequency = stp(frequency, value[4]);
        }
        layout[value[0]] = frequency;
    }
    return layout
}

function selectKeyMap(layout = '') {
    if (layout == 'default') layout = availablLayouts[0][0];
    else layout = document.getElementById("layoutsel").value;
    if (layout == "custom") {
        alert("custom layout not yet implemented");
        return {}
    }
    if (!layout in keyboardLayouts)
        alert("error selecting the layout")
    document.getElementById('layout-desc').innerText = layoutDescription[layout];
    return loadKeyMap(keyboardLayouts[layout])
}