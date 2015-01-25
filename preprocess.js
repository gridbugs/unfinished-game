#!/usr/bin/nodejs

const SHADER_PATH = 'shaders';

var fs = require('fs')

var geom = require('./geomnode')
geom.setMatrixArrayType(Array)

var xml2js = require('xml2js')


var shader_file_name = process.argv[2]
var shader_object_name = process.argv[3]
var svg_file_name = process.argv[4]
var seg_file_name = process.argv[5]
var seg_object_name = process.argv[6]
var global_translate = process.argv[7] || "0,0"

global_translate = global_translate.split(',').map(function(x){return Math.round(parseFloat(x))})
var svg_xml = fs.readFileSync(svg_file_name).toString()

var svg_js = xml2js.parseString(svg_xml, function(err, result) {
    var image_node;
    if (result.svg.g) {
        image_node = result.svg.g[0];
    } else if (result.svg.image) {
        image_node = result.svg;
    } else {
        throw "irregular svg format";
    }
    console.log(image_node)
    var paths_js = image_node.path
    var paths = [];

    var ladder_flags = [];
    for (var i = 0;i<paths_js.length;i++) {
        if (paths_js[i].$.style.indexOf('dash') != -1) {
            ladder_flags[i] = true;
        } else {
            ladder_flags[i] = false;
        }

        var translate;
        if (paths_js[i].$.transform) {
            translate = paths_js[i].$.transform.replace(/translate|\)|\(/g, '').split(',').map(function(x){return Math.round(parseFloat(x))})
        } else {
            translate = [0, 0];
        }
        vec2.add(translate, translate, global_translate)

        var path_str = paths_js[i].$.d
        var path_arr = path_str.split(' ')
        var path_start = path_arr[1].split(',').map(function(x){return Math.round(parseFloat(x))})
        var loop = false;
        if (path_arr[path_arr.length-1] == 'z') {
            loop = true;
            path_arr = path_arr.slice(0, path_arr.length-1)
        }
        
        var path_vecs = path_arr.slice(2).map(function(str) {return str.split(',').map(function(x){return Math.round(parseFloat(x))})})


        var path = [path_start];
        var last_point = path_start.slice();
        for (var j = 0;j<path_vecs.length;j++) {
            var offset = path_vecs[j]
            vec2.add(last_point, last_point, offset)
            path.push(last_point.slice())
        }
        
        if (loop) {
            path.push(path_start.slice());
        }
     
        path.map(function(v){vec2.add(v, v, translate)})

        paths.push(path)
    }

    var segs = [];
    var vertices = [];
    var ladders = [];
    for (var i = 0;i<paths.length;i++) {
        var path = paths[i];

        if (ladder_flags[i]) {
            ladders.push([path[0], path[1]]);
        } else {
            var last = path[0];
            vertices.push(last);
            for (var j = 1;j<path.length;j++) {
                vertices.push(path[j]);
                var seg = [last, path[j]]
                last = path[j];
                segs.push(seg)
            }
        }
    }

    var segs_obj = new Object();
    segs_obj.segments = segs;
    segs_obj.vertices = vertices;
    segs_obj.ladders = ladders;

    console.log(segs)

    fs.writeFile(seg_file_name, [
        'var ', seg_object_name, ' = ', JSON.stringify(segs_obj)
    ].join(''))
})

var shader_files = fs.readdirSync(SHADER_PATH).filter(function(name) {
    return name.match(/^\./) == null;
})

var shaders_obj = new Object();
shader_files.map(function(file_name) {
    var file_path = [SHADER_PATH, '/', file_name].join('')
    var shader_name = file_name.replace('.glsl', '')

    var shader_source = fs.readFileSync(file_path).toString()
    shaders_obj[shader_name] = shader_source;

    console.log(shader_name)
})

fs.writeFile(shader_file_name, [
    'var ', shader_object_name, ' = ', JSON.stringify(shaders_obj)
].join(''))
