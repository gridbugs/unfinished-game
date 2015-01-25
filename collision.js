function CollisionProcessor(){}

CollisionProcessor.process = function(world, shape, start, move, data) {

    //renderer.set_colour([1,0,0,1]);
    //renderer.upload_model_view();

    var world_space_vertices = shape.vertices.map(function(v) {
        var ret = vec2.create();
        vec2.add(ret, v, start);
        return ret;
    });

    var world_space_segments = shape.segments.map(function(s) {
        var ret = [vec2.create(), vec2.create()];
        vec2.add(ret[0], s[0], start);
        vec2.add(ret[1], s[1], start);
        return ret;
    });

    var first_collision = null;
    var shortest_distance = Infinity;

    var collision_vector = vec2.create();
    var dest_vector = vec2.create();
    var surface_direction = vec2.create();
    var move_segment = [null, null];

    for (var i = 0;i<world_space_vertices.length;i++) {
        var character_vertex = world_space_vertices[i];
        vec2.add(dest_vector, character_vertex, move);
        move_segment[0] = character_vertex;
        move_segment[1] = dest_vector;

        //renderer.set_dynamic();
        //renderer.draw_line_segment(move_segment);
        for (var j = 0;j<world.segments.length;j++) {
            var world_segment = world.segments[j];
            if (seg2.intersection(collision_vector, move_segment, world_segment)) {
                //console.debug(world_segment, character_vertex);
                //renderer.set_static();
                //renderer.draw_point(collision_vector);

                vec2.sub(surface_direction, world_segment[0], world_segment[1]);

                var collision = new Collision(character_vertex, 
                                              collision_vector,
                                              move,
                                              surface_direction);


                if (collision.length < shortest_distance) {
                    shortest_distance = collision.length;
                    first_collision = collision;
                }
            }
        }
    }

    var src_vector = dest_vector; // make a reference with a sensible name
    for (var i = 0;i<world.vertices.length;i++) {
        var world_vertex = world.vertices[i];
        vec2.sub(src_vector, world_vertex, move);
        move_segment[0] = src_vector;
        move_segment[1] = world_vertex;

        for (var j = 0;j<world_space_segments.length;j++) {
            var character_segment = world_space_segments[j];
            if (seg2.intersection(collision_vector, move_segment, character_segment)) {
                vec2.sub(surface_direction, character_segment[0], character_segment[1]);

                var collision = new Collision(vec2.clone(collision_vector), 
                                              world_vertex,
                                              move,
                                              surface_direction);


                if (collision.length < shortest_distance) {
                    shortest_distance = collision.length;
                    first_collision = collision;
                }
            }          
        }
    }

    if (first_collision != null) {
        var next_move = first_collision.get_next_move();
        var next_pos = vec2.create();
        vec2.add(next_pos, next_move, first_collision.end);
        //renderer.set_dynamic();
        //renderer.draw_line_segment([first_collision.end, next_pos]);

        var next_start = vec2.create();
        vec2.add(next_start, start, first_collision.get_move());
        //renderer.set_static();
        //renderer.draw_point(next_start);
        return CollisionProcessor.process(world, shape, next_start, next_move);
    }

    var ret = vec2.create();
    vec2.add(ret, start, move);
    return ret;
}

function Collision(start, end, move, surface_direction) {
    this.start = start;
    this.move = move;
    
    this.end = vec2.clone(end);

    this.surface_direction = vec2.clone(surface_direction);

    this.length = vec2.dist(start, end);

}

Collision.prototype.get_move = function() {
    var ret = vec2.create();
    vec2.sub(ret, this.end, this.start);
    
    var gap = vec2.create();
    if (ret[0] == 0 && ret[1] == 0) {
        gap[0] = 0;
        gap[1] = 1;
    } else {
        vec2.to_unit(gap, ret);
    }
    vec2.scale(gap, gap, 0.01);
    vec2.sub(ret, ret, gap);
    return ret;
}

Collision.prototype.get_next_move = function() {
    var remaining_dist = vec2.len(this.move) - this.length;
    var next = vec2.create();
    vec2.to_unit(next, this.move);
    vec2.scale(next, next, remaining_dist);
    vec2.project(next, this.surface_direction, next);
    return next;
}
