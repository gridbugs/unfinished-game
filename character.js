function Character(position, size, centre) {
    this.position = position;
    this.centre = centre;
    this.rectangle = new Rectangle(size, this.centre);

    this.vertices = [
        [0, 0],
        [0, size[1]],
        [size[0], size[1]],
        [size[0], 0]
    ];
    this.segments = [
        [[0, 0], [0, size[1]]],
        [[0, size[1]],[size[0], size[1]]],
        [[size[0], size[1]],[size[0], 0]],
        [[size[0], 0], [0, 0]]
    ];

    var jump_delta = 0.5;
    this.jump_checks = [
        [[0, size[1]], [0, size[1]+jump_delta]],
        [[size[0], size[1]], [size[0], size[1]+jump_delta]]
    ];
    
    this.line_segments_array = new LineSegmentArray(this.segments);

    this.velocity = [0, 0];

    this.run_acceleration = 800;
    this.run_deceleration = 1200;
    this.max_run_velocity = 200;
    this.gravity_acceleration = 400;
    this.jump_velocity = 150;
    this.climb_speed = 60;
    this.jump_key_cleared = true;

    this.animation_value = 0;

    this.facing_left = false;
    this.climbing = false;
}

Character.prototype.can_jump = function() {
    var checks = this.jump_checks.map(function(s) {
        var ret = [vec2.create(), vec2.create()];
        vec2.add(ret[0], s[0], this.position);
        vec2.add(ret[1], s[1], this.position);
        return ret;
    }.bind(this));

    var intersection = vec2.create();
    for (var i = 0;i<2;i++) {
        var check = checks[i];
        for (var j = 0;j<WorldSegments.segments.length;j++) {
            var world_segment = WorldSegments.segments[j];
            if (seg2.intersection(intersection, check, world_segment)) {
                return true;
            }
        }
    }

    return false;
}

Character.prototype.move = function(time_delta) {
    if (time_delta == 0) {
        return;
    }

    var multiplier = time_delta / 1000;

    var move = vec2.clone(this.velocity);
    if (this.climbing) {
        move[1] = Math.min(move[1], -this.climb_speed);
    }
    vec2.scale(move, move, multiplier);

    var dest = CollisionProcessor.process(WorldSegments, this, this.position, move);


    vec2.sub(this.velocity, dest, this.position);

    vec2.scale(this.velocity, this.velocity, 1/multiplier);
    vec2.copy(this.position, dest);

//    vec2.add(this.position, this.position, [this.velocity[0]*multiplier, this.velocity[1]*multiplier]);
}

Character.prototype.run_tick = function(time_delta, direction) {
    var acceleration = this.run_acceleration * time_delta / 1000;

    if (this.velocity[0] * direction < this.max_run_velocity) {
        var x_velocity_candidate = this.velocity[0] + acceleration * direction;
        if (x_velocity_candidate * direction < this.max_run_velocity) {
            this.velocity[0] = x_velocity_candidate;
        } else {
            this.velocity[0] = this.max_run_velocity * direction;
        }
    }
}

Character.prototype.no_run_tick = function(time_delta) {
    if (this.velocity[0] == 0) {
        return;
    }

    var direction;
    if (this.velocity[0] < 0) {
        direction = -1;
    } else {
        direction = 1;
    }

    var deceleration = this.run_deceleration * time_delta / 1000;
    var x_velocity_candidate = this.velocity[0] - deceleration * direction;
    if (x_velocity_candidate * direction < 0) {
        this.velocity[0] = 0;
    } else {
        this.velocity[0] = x_velocity_candidate;
    }

}

Character.prototype.control = function(time_delta) {
    
    var running = false;
    if (Control.is_key_down('A')) {
        this.run_tick(time_delta, -1);
        running = true;
        this.facing_left = true;
    }
    if (Control.is_key_down('E') || Control.is_key_down('D')) {
        this.run_tick(time_delta, 1);
        running = true;
        this.facing_left = false;
    }

    if (running) {
        this.animation_value += (Math.abs(this.velocity[0]) * 0.04 * time_delta / 1000);
        if (this.animation_value >= 4) {
            this.animation_value = 0;
        }

    } else {
        this.no_run_tick(time_delta);
    }

    this.velocity[1] += (this.gravity_acceleration * time_delta / 1000);

    if (Control.is_key_down(' ')) {
        if ((this.climbing || this.can_jump()) && this.jump_key_cleared) {
            this.velocity[1] = -this.jump_velocity;
        }
        this.jump_key_cleared = false;
    } else {
        this.jump_key_cleared = true;
    }


    if ((Control.is_key_down('W') || Control.is_key_down("¼")) && this.is_at_ladder()) {
        this.climbing = true;
    } else {
        this.climbing = false;
    }
}

Character.prototype.world_space_segments = function() {
    return this.segments.map(function(s) {
        var ret = [vec2.create(), vec2.create()];
        vec2.add(ret[0], s[0], this.position);
        vec2.add(ret[1], s[1], this.position);
        return ret;
    }.bind(this));

}

Character.prototype.is_at_ladder = function() {
    var segments = this.world_space_segments();
    var intersection = vec2.create();
    for (var i = 0;i < segments.length;i++) {
        for (var j = 0;j < WorldSegments.ladders.length;j++) {
            if (seg2.intersection(intersection, segments[i], WorldSegments.ladders[j])) {
                return true;
            }
        }
    }
    return false;
}

Character.prototype.set_images = function(o) {
    this.walk_images = [o.walk0, o.walk1, o.walk2, o.walk3];
}

Character.prototype.get_image = function() {
    var image = this.walk_images[Math.floor(this.animation_value)];
    if (image == undefined) {
        console.debug(this.velocity);
        console.debug(this.animation_value);
    }
    if (this.facing_left) {
        return image.reversed;
    } else {
        return image;
    }
}


