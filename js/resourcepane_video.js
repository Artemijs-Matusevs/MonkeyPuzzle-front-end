function add_video_resource_body(tab_id) {
    var tab_body = $(`
        <div id="` + tab_id + `_body" class="resource_pane_tab_content">
            <form id="video-upload-form" action="/upload-video" method="POST" enctype="multipart/form-data">
                <input type="file" name="video" accept="video/*" required />
                <button type="submit">Upload Video</button>
            </form>
            <div id="transcript-output"></div>
        </div>

    `); 
    
    $(".tab_body").append(tab_body);
    fetch_transcript();
}

function fetch_transcript(){
    $('#video-upload-form').on('submit', function(e) {
        e.preventDefault();

        var formData = new FormData(this);

        $.ajax({
            url: '/upload-video',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                var transcriptId= response.transcriptId;

                //Start polling for the transcript status
                $('#transcript-output').text('Processing...');
                pollTranscription(transcriptId);
            },
            error: function(xhr, status, error){
                console.error('Error:', error);
                $('#transcript-output').text('Error during upload or transcription');
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
                    // Dissplay transcript
                    $('#transcript-output').text(response.transcript.text);
                }else if(response.status === 'error'){
                    clearInterval(pollInterval);
                    $('#transcript-output').text('Error: ' + response.error);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
            }
        });
    }, 5000);//Poll every 5 sec
}