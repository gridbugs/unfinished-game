function Control(){}

Control.down_keys = [];

for (var i = 0;i<256;i++) {
    Control.down_keys[i] = false;
}

Control.keycode_to_ascii = function(code) {
    return Control.char_to_ascii(String.fromCharCode(code));
}

Control.char_to_ascii = function(character) {
    return character.charCodeAt(0);
}

Control.set_keycode_down = function(code) {
    Control.down_keys[Control.keycode_to_ascii(code)] = true;
}
Control.set_keycode_up = function(code) {
    Control.down_keys[Control.keycode_to_ascii(code)] = false;
}

Control.is_key_down = function(character) {
    return Control.down_keys[Control.char_to_ascii(character)];
}

$(document).keydown(function(e) {
    Control.set_keycode_down(Control.keycode_to_ascii(e.keyCode));
});
$(document).keyup(function(e) {
    Control.set_keycode_up(Control.keycode_to_ascii(e.keyCode));
});
