
var _mouse_pos = [0, 0];
$(document).mousemove(function(e) {
    _mouse_pos[0] = e.pageX;
    _mouse_pos[1] = e.pageY;
})

function get_cursor() {
    return _mouse_pos.slice();
}

var between_exclusive = function(a, b, c) {
    return (a < b && b < c) || (a > b && b > c);
}
var between_inclusive = function(a, b, c) {
    return (a <= b && b <= c) || (a >= b && b >= c);
}

vec2.aligned_ratio = function(v0, v1) {
    if (v0[0] == 0) {
        return v1[1]/v0[1];
    } else {
        return v1[0]/v0[0];
    }
}
var line2 = {};
line2.create = function() {
    return [[0, 0], [1, 0]];
}
line2.intersection = function(r, l0, l1) {
    // check if the lines are parallel
    if (l0[1][0]*l1[1][1] == l0[1][1]*l1[1][0]) {
        return false;
    }

    vec2.sub(r, l0[0], l1[0]);
    var mat = [
        -l0[1][0], -l0[1][1],
        l1[1][0], l1[1][1]
    ];
    mat2.invert(mat, mat);
    mat2.multiply(r, mat, r);
    vec2.scale(r, l0[1], r[0]);
    vec2.add(r, r, l0[0]);
    return true;
}

var seg2 = {};
seg2.create = function() {
    return [[0, 0], [1, 0]];
}
seg2.to_line = function(l, s) {
    vec2.copy(l[0], s[0]);
    vec2.sub(l[1], s[0], s[1]);
}
seg2.to_vector = function(v, s) {
    vec2.sub(v, s[1], s[0]);
}
seg2.aligned_ratio = function(s, v) {
    var v0 = vec2.create();
    var v1 = vec2.create();
    seg2.to_vector(v0, s);
    vec2.sub(v1, v, s[0]);
    return vec2.aligned_ratio(v0, v1);
}

seg2.contains_colinear = function(s, v) {
    return between_inclusive(0, seg2.aligned_ratio(s, v), 1);
}
seg2.intersection = function(r, s0, s1) {
    // check if either segment has 0 length
    if ((s0[0][0] == s0[1][0] && s0[0][1] == s0[1][1]) ||
        (s1[0][0] == s1[1][0] && s1[0][1] == s1[1][1])) {

        return false;
    }

    var l0 = line2.create();
    var l1 = line2.create();

    seg2.to_line(l0, s0);
    seg2.to_line(l1, s1);
    var line_intersects = line2.intersection(r, l0, l1);

    if (!line_intersects) {
        return false;
    }


    if (seg2.contains_colinear(s0, r) && seg2.contains_colinear(s1, r)) {
        return true;
    }

    return false;
}

vec2.project = function(ret, v0, v1) {
    vec2.scale(ret, v0, vec2.dot(v0, v1)/vec2.sqrLen(v0));
}

vec2.to_unit = function(ret, v0) {
    vec2.scale(ret, v0, 1/vec2.len(v0));
}
