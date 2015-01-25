function load_images(image_sources, then) {
    var count = 0;
    var images = [];
    for (var i = 0;i<image_sources.length;i++) {
        images[i] = document.createElement('img');
        images[i].src = image_sources[i];
        images[i].onload = function() {
            count++;
            if (count == images.length) {
                then(images);
            }
        }

    }
}

var renderer;
$(function() {

    load_images(['level.png', 'player.png'], function(images) {

        var bg_image = images[0];
        var player_image = images[1];

        var canvas = document.getElementById('canvas');

        function set_canvas_size_fullscreen() {
            canvas.width = $(window).width();
            canvas.height = $(window).height();
        }
        
        set_canvas_size_fullscreen();
        
        renderer = new Renderer(canvas);

        $(window).resize(set_canvas_size_fullscreen);

        var player = new Character([60, 182], [8, 16], [4, 16]);
        
        var zoom = [4, 4];
        
        var bg_tex = new TextureImage(bg_image);
        var bg_rect = new SimpleTexturedRectangle([2048, 2048], [167, 120], bg_tex);
        
        var player_atlas = new SpriteAtlas(player_image, [16, 24], {
            walk0: [0, 0],
            walk1: [16, 0],
            walk2: [32, 0],
            walk3: [48, 0]
        });

        var walk0 = new TexturedRectangle([16, 20], [4, 4], player_atlas, 'walk0');
        var walk1 = new TexturedRectangle([16, 20], [4, 4], player_atlas, 'walk1');
        var walk2 = new TexturedRectangle([16, 20], [4, 4], player_atlas, 'walk2');
        var walk3 = new TexturedRectangle([16, 20], [4, 4], player_atlas, 'walk3');

        player.set_images({
            walk0: walk0,
            walk1: walk1,
            walk2: walk2,
            walk3: walk3
        });

        var level = new LineSegmentArray(WorldSegments.segments, [0, 0]);
        
        renderer.set_objects([
            player.rectangle,
            player.line_segments_array,
            level,
            bg_rect,
            walk0,
            walk1,
            walk2,
            walk3
        ]);

        renderer.set_textures([
            bg_tex,
            player_atlas.texture
        ]);


        renderer.prepare_drawing();

        var last_time = Date.now();

        var scroll_offset = [-100, -70];
        var scroll_border = [canvas.width / 3, canvas.height / 3];
        var zero_vector = vec3.fromValues(0, 0, 1);
        var model_view_snapshot = mat3.create(); 
        var screen_coord = vec2.create();

        function frame() {

            var current_time = Date.now();
            var time_delta = current_time - last_time;
            last_time = current_time;

            player.control(time_delta);

            player.move(time_delta);

            var position = [player.position[0], player.position[1], 1];
            
            // check if the player's new position requires a scroll
            mat3.multiply(screen_coord, model_view_snapshot, position);

            var scroll = [0, 0];
            if (screen_coord[0] < scroll_border[0]) {
                scroll[0] = (screen_coord[0] - scroll_border[0])/zoom[0];
            } else if (screen_coord[0] > canvas.width - scroll_border[0]) {
                scroll[0] = (screen_coord[0] - (canvas.width - scroll_border[0]))/zoom[0];
            }

            if (screen_coord[1] < scroll_border[1]) {
                scroll[1] = (screen_coord[1] - scroll_border[1])/zoom[1];
            } else if (screen_coord[1] > canvas.height - scroll_border[1]) {
                scroll[1] = (screen_coord[1] - (canvas.height - scroll_border[1]))/zoom[1];
            }

            vec2.sub(scroll_offset, scroll_offset, scroll);



            renderer.set_static();
            

               
            renderer.save();

            renderer.scale(zoom);
            renderer.translate(scroll_offset);
        
            // take snapshot of model view
            mat3.copy(model_view_snapshot, renderer.model_view);

        
            renderer.upload_model_view();
            renderer.enable_texture(true);
            renderer.bind_texture(bg_tex);
            renderer.draw_object_triangles(bg_rect);
            renderer.enable_texture(false);


            renderer.set_colour([0,0,0,1]);


            //renderer.draw_object_lines(level);
            

            renderer.save();
            
            renderer.translate(player.position);


            renderer.upload_model_view();
            
            renderer.enable_texture(true);
            renderer.bind_texture(player_atlas.texture);
            renderer.draw_object_triangles(player.get_image());
            renderer.enable_texture(false);
            
            renderer.restore();

            renderer.restore();
        
            renderer.sync_gpu();

            requestAnimationFrame(frame);
        }

        frame();

    });
})
