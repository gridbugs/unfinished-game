var gl;

function Renderer(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl');
    gl = this.gl;

    // general webgl init

    gl.clearColor(1,1,1,1); // white
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); // allow transparency
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // nice blendfunc for transparency

    this.shader_program = new ShaderProgram(ShaderSource.basic_vertex,
                                            ShaderSource.texture_fragment);



    this.dynamic_vertex_buffer = gl.createBuffer();
    this.static_vertex_buffer = gl.createBuffer();
    this.texture_vertex_buffer = gl.createBuffer();
    this.index_buffer =         gl.createBuffer();

    this.shader_program.has_position_attribute('a_position', this.static_vertex_buffer);
    this.shader_program.has_texture_attribute('a_tex_coord', this.texture_vertex_buffer);
    
    this.model_view_uniform = this.shader_program.get_uniform('u_model_view');
    this.resulotion_uniform = this.shader_program.get_uniform('u_resolution');
    this.colour_uniform = this.shader_program.get_uniform('u_colour');
    this.use_texture = this.shader_program.get_uniform('u_use_texture');
    this.texture = this.shader_program.get_uniform('u_texture');


    this.transform_stack = [mat3.create()];
    this.model_view = this.transform_stack[0];

    this.pixels = new Uint8Array(4);
}

Renderer.prototype.enable_texture = function(t) {
    gl.uniform1i(this.use_texture, t);
}

Renderer.prototype.save = function() {
    this.model_view = mat3.clone(this.model_view);
    this.transform_stack.push(this.model_view);
}

Renderer.prototype.restore = function() {
    this.transform_stack.pop();
    this.model_view = this.transform_stack[this.transform_stack.length-1];
}

Renderer.prototype.identity = function() {
    mat3.identity(this.model_view);
}
Renderer.prototype.translate = function(t) {
    mat3.translate(this.model_view, this.model_view, t);
}
Renderer.prototype.rotate = function(r) {
    mat3.rotate(this.model_view, this.model_view, r);
}
Renderer.prototype.scale = function(s) {
    mat3.scale(this.model_view, this.model_view, s);
}

Renderer.prototype.set_textures = function(textures) {
    this.textures = [];

    for (var i = 0;i<textures.length;i++) {
        var texture_obj = textures[i];
        var texture = gl.createTexture();
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture_obj.image);

        // set up simple texture wrapping behaviour
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
        texture_obj.texture = texture;
    }
}

Renderer.prototype.set_objects = function(objects) {
    this.objects = [];

    var tmp_index_buffer = [0, 1];
    var tmp_static_vertex_buffer = [0, 0];
    var tmp_texture_vertex_buffer = [0, 0];
    var tmp_dynamic_vertex_buffer = [0, 0, 0, 0];

    

    for (var i = 0,len = objects.length;i<len;i++) {
        if (objects[i].reversed) {
            objects.push(objects[i].reversed);
        }
    }

    for (var i = 0;i<objects.length;i++) {
        var object = objects[i];
        
        object.index_buffer_offset = tmp_index_buffer.length*2;
        object.index_buffer_length = object.index_buffer_data.length;
        this.objects.push(object);

        // add the indices of the object
        for (var j = 0;j<object.index_buffer_data.length;j++)  {

            // add vertex buffer length halved since this is the index of a 2d coord
            var index = object.index_buffer_data[j] +
                        tmp_static_vertex_buffer.length/2;

            tmp_index_buffer.push(index);
        }

        // add the vertices of the object
        for (var j = 0;j<object.static_vertex_buffer_data.length;j++) {
            tmp_static_vertex_buffer.push(object.static_vertex_buffer_data[j]);
            tmp_texture_vertex_buffer.push(object.texture_vertex_buffer_data[j]);
        }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.static_vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmp_static_vertex_buffer), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texture_vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmp_texture_vertex_buffer), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tmp_index_buffer), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamic_vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, tmp_dynamic_vertex_buffer.length*4, gl.DYNAMIC_DRAW);
}


Renderer.prototype.prepare_drawing = function() {

    
    gl.useProgram(this.shader_program.program);
    
    gl.uniform1i(this.texture, 0);

    gl.uniformMatrix3fv(this.model_view_uniform, false, this.model_view);

    var resolution = [this.canvas.width, this.canvas.height];
    gl.uniform2fv(this.resulotion_uniform, resolution);
}

Renderer.prototype.upload_model_view = function() {
    gl.uniformMatrix3fv(this.model_view_uniform, false, this.model_view);
}

Renderer.prototype.set_colour = function(colour) {
    gl.uniform4fv(this.colour_uniform, colour);
}

Renderer.prototype.draw_object_triangles = function(object) {
    gl.drawElements(gl.TRIANGLES, object.index_buffer_length, gl.UNSIGNED_SHORT, object.index_buffer_offset);
}

Renderer.prototype.draw_object_lines = function(object) {
    gl.drawElements(gl.LINES, object.index_buffer_length, gl.UNSIGNED_SHORT, object.index_buffer_offset);
}

Renderer.prototype.draw_line_segment = function(segment) {

    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(
        [segment[0][0], segment[0][1], segment[1][0], segment[1][1]]
    ));
    gl.vertexAttribPointer(this.position_location, 2, gl.FLOAT, false, 0, 0);

    gl.drawElements(gl.LINES, 2, gl.UNSIGNED_SHORT, 0);
}

Renderer.prototype.draw_point = function(point) {
    this.save();
    this.translate(point);
    this.upload_model_view();
    gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 0);
    this.restore();
    this.upload_model_view();
}


function ShaderProgram(vertex_shader_source, fragment_shader_source) {
    // create gl shader program
    this.program = gl.createProgram();

    // create shaders
    this.vertex_shader = gl.createShader(gl.VERTEX_SHADER);
    this.fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);

    // load the shader source code
    gl.shaderSource(this.vertex_shader, vertex_shader_source);
    gl.shaderSource(this.fragment_shader, fragment_shader_source);

    // compile shaders
    gl.compileShader(this.vertex_shader);
    gl.compileShader(this.fragment_shader);
 
    // attach shaders to shader program
    gl.attachShader(this.program, this.vertex_shader);
    gl.attachShader(this.program, this.fragment_shader);

    // link shader program
    gl.linkProgram(this.program);
}

ShaderProgram.prototype.has_position_attribute = function(name, buffer) {
    this.position_location = gl.getAttribLocation(this.program, name);
    gl.enableVertexAttribArray(this.position_location);
}
ShaderProgram.prototype.has_texture_attribute = function(name, buffer) {
    this.texture_location = gl.getAttribLocation(this.program, name);
    gl.enableVertexAttribArray(this.texture_location);
}

ShaderProgram.prototype.vertex_attrib_pointer = function(l) {
    gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
}

Renderer.prototype.set_static = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.static_vertex_buffer);
    this.shader_program.vertex_attrib_pointer(this.shader_program.position_location);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texture_vertex_buffer);
    this.shader_program.vertex_attrib_pointer(this.shader_program.texture_location);
}

Renderer.prototype.set_dynamic = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamic_vertex_buffer);
    this.shader_program.vertex_attrib_pointer();
}

ShaderProgram.prototype.get_uniform = function(name) {
    return gl.getUniformLocation(this.program, name);
}

Renderer.prototype.sync_gpu = function() {
    gl.readPixels( 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels);
}

Renderer.prototype.get_global_offset = function() {
    var ret = vec3.fromValues(0, 0, 1);
    mat3.multiply(ret, this.model_view, ret);
    return ret;
}

function TextureImage(image) {
    this.image = image;
}

Renderer.prototype.bind_texture = function(t) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.texture);
}

function SpriteAtlas(image, size, description) {
    this.image = image;
    this.texture = new TextureImage(image);
    this.size = size;
    this.texture_size = [image.width, image.height];
    this.description = description;
}

function Rectangle(size, centre) {
    this.index_buffer_data = [0, 1, 2, 0, 2, 3];
    this.static_vertex_buffer_data = [
        0-centre[0], 0-centre[1],
        size[0]-centre[0], 0-centre[1],
        size[0]-centre[0], size[1]-centre[1],
        0-centre[0], size[1]-centre[1]
    ];
    this.texture_vertex_buffer_data = [
        0, 0, 1, 0, 1, 1, 0, 1
    ];
}

function TexturedRectangle(size, centre, atlas, name) {
    this.index_buffer_data = [0, 1, 2, 0, 2, 3];
    this.static_vertex_buffer_data = [
        0-centre[0], 0-centre[1],
        size[0]-centre[0], 0-centre[1],
        size[0]-centre[0], size[1]-centre[1],
        0-centre[0], size[1]-centre[1]
    ];

    var texture_position = atlas.description[name];
    var texture_size = atlas.size;
    this.texture_vertex_buffer_data = [
        texture_position[0], texture_position[1],
        texture_position[0] + texture_size[0], texture_position[1],
        texture_position[0] + texture_size[0], texture_position[1] + texture_size[1],
        texture_position[0], texture_position[1] + texture_size[1]
    ];

    for (var i = 0;i<4;i++) {
        this.texture_vertex_buffer_data[i*2] /= atlas.texture_size[0];
        this.texture_vertex_buffer_data[i*2+1] /= atlas.texture_size[1];
    }

    this.reversed = new Object();
    this.reversed.index_buffer_data = this.index_buffer_data;
    this.reversed.static_vertex_buffer_data = this.static_vertex_buffer_data;
    this.reversed.texture_vertex_buffer_data = this.texture_vertex_buffer_data.slice();
    var rev_tex = this.reversed.texture_vertex_buffer_data;
    var tmp = rev_tex[0];
    rev_tex[0] = rev_tex[2];
    rev_tex[2] =  tmp;
    tmp = rev_tex[4];
    rev_tex[4] = rev_tex[6];
    rev_tex[6] = tmp;

}



function SimpleTexturedRectangle(size, centre, texture) {
    this.index_buffer_data = [0, 1, 2, 0, 2, 3];
    this.static_vertex_buffer_data = [
        0-centre[0], 0-centre[1],
        size[0]-centre[0], 0-centre[1],
        size[0]-centre[0], size[1]-centre[1],
        0-centre[0], size[1]-centre[1]
    ];

    this.texture = texture;
    this.texture_vertex_buffer_data = [
        0, 0, 1, 0, 1, 1, 0, 1
    ];
}

function LineSegmentArray(segments, centre) {
    this.index_buffer_data = [];
    for (var i = 0;i<segments.length*2;i++) {
        this.index_buffer_data.push(i);
    }

    this.static_vertex_buffer_data = [];
    this.texture_vertex_buffer_data = [];
    for (var i = 0;i<segments.length;i++) {
        var segment = segments[i];
        this.static_vertex_buffer_data.push(segment[0][0]);
        this.static_vertex_buffer_data.push(segment[0][1]);
        this.static_vertex_buffer_data.push(segment[1][0]);
        this.static_vertex_buffer_data.push(segment[1][1]);

        // maintain offsets in texture buffer
        for (var j = 0;j<4;j++) {
            this.texture_vertex_buffer_data.push(-1);
        }
    }
    

}


