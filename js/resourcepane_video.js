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

        var formData = new FormData();
        formData.append('tab_id', tab_id);

        // Append the file from the form input
        var fileInput = $('#video-upload-form input[type="file"]')[0];
        if (fileInput && fileInput.files.length > 0){
            formData.append('video', fileInput.files[0]);
        }

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
                console.log(response);
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
                                        <button type="button" class="btn btn-default" title="Add node from text selection" onclick="new_atom_video_resource_button();">
                                            <i class="fa fa-puzzle-piece fa-fw fa-lg"></i>
                                        </button>
                                </div>
                                <div>
                                    <video id="video" width="100%" height="100%" controls>
                                        <source src="../uploads/${id}.mp4" type="video/mp4">
                                    </video>
                                </div>
                                <div class="form-group">
                                    <label>Title</label>
                                    <textarea id="title_` + tab_id + `" type="text" rows="1" class="form-control resource_pane_title_text" placeholder="The name of this resource..." onchange="change_title('` + tab_id + `')"></textarea>                 </div>
                                <div class="form-group" id="contentgroup_`+ tab_id +`">
                                    <label>Content</label>
                                    <div id="textarea">
                                        <div id="` + tab_id + `" class="form-control resource_pane_textarea_content" placeholder="Enter your source text here..." onchange="change_textarea('` + tab_id + `')" onfocus="set_focus(this)" readonly></div>
                                    </div>  
                                </div> 
                            </form>
                        </div>`)

                    // Dissplay transcript
                    $('#transcript').html(tab_transcript_tools);
                    var processedTranscript = response.transcript.map(function(item) {
                        return `
                            <div id="transcript" class="trancsript-line">
                                <div class="timestamp" onclick=skipTo(${item.timestamp[0]}) data-timestamp="${item.timestamp}">
                                    [${item.timestamp.join(' - ')}]
                                </div>
                                <div class="transcript-text">${item.text}</div>
                            </div>
                            `;
                    }).join('\n');

                    $('#' + tab_id).html(processedTranscript);

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

function skipTo(time) {
    var video = document.getElementById('video');
    video.currentTime = time;
    video.play();
}

function new_atom_video_resource_button() {
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedNode = range.commonAncestorContainer;

        const targetElements = document.getElementsByClassName("transcript-text");

        for (let element of targetElements) {
            if (element.contains(selectedNode)) {
                const text = selection.toString();
                //console.log(text);
                add_new_atom_node(text);
            }
        }
    }
}