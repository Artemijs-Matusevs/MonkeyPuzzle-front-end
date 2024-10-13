function add_video_resource_body(tab_id) {
    var tab_body = $(`
        <div id="` + tab_id + `_body" class="resource_pane_tab_content">
            <form id="video-upload-form" action="/upload-video" method="POST" enctype="multipart/form-data">
                <input type="file" name="video" accept="video/*" required />
                <button type="submit">Upload Video</button>
            </form>
            <div id="transcript"></div>
        </div>

    `); 
    
    $(".tab_body").append(tab_body);
    fetch_transcript(tab_id);
}

function fetch_transcript(tab_id){
    $('#video-upload-form').on('submit', function(e) {
        e.preventDefault();

        var formData = new FormData(this);
        formData.append('tab_id', tab_id);

        $.ajax({
            url: '/upload-video',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                var transcriptId= response.transcriptId;

                //Start polling for the transcript status
                $('#transcript').text('Processing...');
                pollTranscription(transcriptId);
            },
            error: function(xhr, status, error){
                console.error('Error:', error);
                $('#transcript').text('Error during upload or transcription');
            }
        })
    } )
}

function pollTranscription(id){


    var pollInterval = setInterval(function() {
        $.ajax({
            url: '/transcript-status/' + id,
            type: 'GET',
            success: function(response) {
                if (response.status === 'done'){

                    // Stop polling
                    clearInterval(pollInterval);

                    //Create new HTML structure with the transcript text
                    var tab_transcript_tools = (`
                        <div id="transcript-data" + ${id}>
                            <form>
                                <div class="form-group">
                                        <button type="button" class="btn btn-default" onclick="remove_tab()" title="Remove this tab from the resource pane">
                                            <i class="fa fa-trash fa-fw fa-lg"></i>
                                        </button>
                                        <button type="button" class="btn btn-default" onclick="filemanager('save','txt','` + tab_id + `')" title="Save this resource tab to a text file">
                                            <i class="fa fa-download fa-fw fa-lg"></i>
                                        </button>
                                        <button id="toggle_edit_lock_button" type="button" class="btn btn-default" title="Toggle editability of the content area" onclick="toggle_edit_lock();">
                                            <i id="toggle_edit_lock_icon_` + tab_id + `" class="fa fa-lock fa-fw fa-lg"></i>
                                        </button>
                                        <button type="button" class="btn btn-default" title="Add node from text selection" onclick="new_atom_txt_resource_button();">
                                            <i class="fa fa-puzzle-piece fa-fw fa-lg"></i>
                                        </button>
                                </div>
                                <div class="form-group">
                                    <label>Title</label>
                                    <textarea id="title_` + tab_id + `" type="text" rows="1" class="form-control resource_pane_title_text" placeholder="The name of this resource..." onchange="change_title('` + tab_id + `')"></textarea>                 </div>
                                <div class="form-group" id="contentgroup_`+ tab_id +`">
                                    <label>Content</label>
                                    <div id="textarea">
                                        <textarea id="content_${tab_id}" class="form-control resource_pane_textarea_content" placeholder="Enter your source text here..." onchange="change_textarea('` + tab_id + `')" onfocus="set_focus(this)" readonly></textarea>
                                    </div>  
                                </div> 
                            </form>
                        </div>`)

                    // Dissplay transcript
                    $('#transcript').html(tab_transcript_tools);
                    var processedTranscript = response.transcript.map(function(item) {
                        return `\n[${item.timestamp.join(' - ')}] ${item.text}`;
                    }).join('\n');

                    $('#content_' + tab_id).val(processedTranscript);

                }else if(response.status === 'error'){
                    clearInterval(pollInterval);
                    $('#transcript-data').text('Error: ' + response.error);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
            }
        });
    }, 5000);//Poll every 5 sec
}