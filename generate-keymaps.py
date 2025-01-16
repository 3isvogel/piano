import os
import sys
import re

line_num = 0
current_file = ""
def ERROR(msg):
    sys.exit(f'Error parsing {current_file}:{line_num}: {msg}')

f_reg = r'^([+-]?(\d+(\.\d*)?)|(.\d+)(e[+-]?\d+)?)'
def first_float(string):
    tmp = re.findall(f_reg, string)
    if not tmp:
        ERROR(f'Expcted float, found: {string}')
    return tmp[0]

def first_int(string):
    tmp = re.findall(r'^\d+', string)
    if not tmp:
        ERROR(f'Expcted integer, found: {string}')
    return tmp[0]

def makeEntry(string):
    key = string[0].lower()
    tone = None
    type = None
    shift_mode = None
    shift_amount = None
    string = string[2:]
    sel = string[0]
    string = string[1:]
    if sel not in 'nf':
        ERROR(f'Unknown tune selector: "{sel}"')
    if sel == 'n':
        type = "NOTE"
        tone = string[0:2].lower()
        tone = tone[0].upper() + tone[1:]
        if tone[0] not in 'ABCDEFG':
            ERROR(f'Unknown note: {tone}')
        if tone[1] == '#':
            tone = tone[0] + 's'
        if tone[1] not in 'sb':
            tone=tone[0]
        string = string[3:]
        shift_mode = string[0]
        string = string[1:]
        if shift_mode not in 'os':
            ERROR(f'Unknow note modifier: "{shift_mode}"')
        if shift_mode == 'o':
            shift_mode = "OCTAVE"
            shift_amount = first_int(string)
        if shift_mode == 's':
            shift_mode = "STEPS"
            shift_amount = first_float(string)
    elif sel == 'f':
        type = "FREQUENCY"
        tone = float(first_float(string)[0])
    
    val = ''
    if type == 'FREQUENCY':
        val = 'f', tone
    elif type == 'NOTE':
        mod = ''
        if shift_mode == 'OCTAVE':
            mod = 'o'
        elif shift_mode == 'STEPS':
            mod = 's'
        val = f'{mod}("{tone}", {shift_amount})'
        val = 'n', tone, mod, float(shift_amount)

    return key,val


def loadConf(name):
    # Nice error handling man...
    global line_num
    line_num = 0
    global current_file
    current_file = name
    maps = {}
    conf_name = ""
    conf_description = ""
    with open(name) as file:
        for line in file:
            line_num+=1;
            if line_num == 1:
                conf_name = line[:-1]
            elif line_num == 2:
                conf_description = line[:-1]
            else:
                if (line == '\n' or line == ''):
                    continue
                if(len(line) <6):
                    ERROR("Unexpected line length")
                key, val = makeEntry(line)
                maps[key] = val
    return conf_name, maps, conf_description

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit('specify directory with keymap configs')
    directory = sys.argv[1]
    file_list = [file for file in os.listdir(directory) if file.endswith('.keys')]
    configs = {name.split('/')[-1][:-5]: loadConf(os.path.join(directory, name)) for name in file_list}

    keys = list(configs.keys())
    keys.sort()

    with open('keymaps.js', 'w') as file:
        file.writelines([
            '// This file was generated using "generate-keymaps.py"\n',
            '// Do not modify this fil directly, instead edit "config/keymaps/*.keys" to change layouts\n',
            '\n',
            f'let availablLayouts={[[i, configs[i][0]] for i in keys]};\n'])
        file.write('let layoutDescription={\n')
        for layout, description in configs.items():
            description = description[2]
            file.write(f"'{layout}': '{description}',\n")
        file.write('};\n')
        file.write('let keyboardLayouts={\n')
        for layout, mapping in configs.items():
            mapping = mapping[1]
            file.write(f'"{layout}":[')
            for key, val in mapping.items():
                values = list(val)
                values.insert(0,key)
                file.write(f'{values},'.replace(', ', ','))
            file.write('],\n')
        file.write('};')