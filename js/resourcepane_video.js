function add_video_resource_body(tab_id) {
    var tab_body = $(`
        <div id="` + tab_id + `_body" class="resource_pane_tab_content">
            <form action="/upload-video" method="POST" enctype="multipart/form-data id="video-form">
                <input type="file" name="video" accept="video/*" required>
                <button type="submit"> Upload Video </button> 
            </form>
        </div>
    `); 
    
    $(".tab_body").append(tab_body);
}