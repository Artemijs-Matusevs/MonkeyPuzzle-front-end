function add_video_resource_body(tab_id) {
    var tab_body = $(`
        <div id="` + tab_id + `_body" class="resource_pane_tab_content">
            <form id="video-upload-form` + tab_id +`" action="/upload-video" method="POST" enctype="multipart/form-data">
                <input id="video-upload`+ tab_id +`" type="file" style="display: none;" onchange="fetch_transcript('${tab_id}');" name="video" accept="video/*" required />
                <button onclick="document.getElementById('video-upload${tab_id}').click()" type="submit">Upload Video</button>

                <button type="button" class="btn btn-default" onclick="document.getElementById('fileLoader${tab_id}').click()" title="Load saved tab">
                    <i class="fa fa-upload fa-fw fa-lg"></i>
                </button>
                <input type="file" id="fileLoader`+ tab_id +`" accept=".json" style="display: none;" onchange="load_video_resource_tab(event,'${tab_id}')">

                <button type="button" class="btn btn-default" onclick="remove_tab()" title="Remove this tab from the resource pane">
                    <i class="fa fa-trash fa-fw fa-lg"></i>
                </button>
            </form>
            <div id="transcript`+ tab_id +`"></div>
        </div>

    `); 
    
    $(".tab_body").append(tab_body);
}

function fetch_transcript(tab_id){

        var formData = new FormData();
        formData.append('tab_id', tab_id);

        // Append the file from the form input
        var fileInput = $(`#video-upload-form${tab_id} input[type="file"]`)[0];
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
                $(`#transcript${tab_id}`).text('Processing...');
                pollTranscription(transcriptId);
            },
            error: function(xhr, status, error){
                console.error('Error:', error);
                $(`#transcript${tab_id}`).text('Error during upload or transcription');
            }
        })}

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
                        <div id="transcript-data + ${id}">
                            <form>
                                <div class="form-group">
                                        <button type="button" class="btn btn-default" onclick="remove_tab()" title="Remove this tab from the resource pane">
                                            <i class="fa fa-trash fa-fw fa-lg"></i>
                                        </button>
                                        <button type="button" class="btn btn-default" onclick="save_video_resource_tab('${id}')" title="Save this tab">
                                            <i class="fa fa-download fa-fw fa-lg"></i>
                                        </button>
                                        <button type="button" class="btn btn-default" title="Add node from text selection" onclick="new_atom_video_resource_button();">
                                            <i class="fa fa-puzzle-piece fa-fw fa-lg"></i>
                                        </button>

                                        <div class="speaker-selection">
                                        <button type="button" class="btn btn-default" onclick="highlight_speaker('#555555')" title="Highlight default">
                                            <i style="color: black;" class="fa fa-regular fa-user fa-fw fa-lg"></i>
                                        </button>

                                        <button type="button" class="btn btn-default" onclick="highlight_speaker('red')" title="Highlight speaker 1">
                                            <i style="color: red;" class="fa fa-regular fa-user fa-fw fa-lg"></i>
                                        </button>

                                        <button type="button" class="btn btn-default" onclick="highlight_speaker('blue')" title="Highlight speaker 2">
                                            <i style="color: blue;" class="fa fa-regular fa-user fa-fw fa-lg"></i>
                                        </button>

                                        <button type="button" class="btn btn-default" onclick="highlight_speaker('green')" title="Highlight speaker 3">
                                            <i style="color: green;" class="fa fa-regular fa-user fa-fw fa-lg"></i>
                                        </button>
                                        </div>
                                </div>
                                <div>
                                    <video id="video${id}" width="100%" height="100%" controls>
                                        <source src="../uploads/${id}.mp4" type="video/mp4">
                                    </video>
                                </div>

                                <div class="form-group" id="contentgroup_`+ id +`">
                                    <label>Content</label>
                                    <div id="textarea">
                                        <div id="` + id + `" class="form-control resource_pane_textarea_content" placeholder="Enter your source text here..." onchange="change_textarea('` + tab_id + `')" onfocus="set_focus(this)" readonly></div>
                                    </div>  
                                </div> 
                            </form>
                        </div>`)

                    //Remove video upload form
                    $(`#video-upload-form${id}`).html("");

                    // Dissplay transcript
                    $(`#transcript${id}`).html(tab_transcript_tools);
                    var processedTranscript = response.transcript.map(function(item) {
                        return `
                            <div id="transcript" class="trancsript-line">
                                <div class="timestamp" onclick="skipTo('${item.timestamp[0]}', '${id}')" data-timestamp="${item.timestamp}">
                                    [${item.timestamp.join(' - ')}]
                                </div>
                                <div class="transcript-text">${item.text}</div>
                            </div>
                            `;
                    }).join('\n');

                    $('#' + id).html(processedTranscript);

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

//Skip to specific time in the video
function skipTo(time, id) {
    var video = document.getElementById(`video${id}`);
    video.currentTime = time;
    video.play();
}

//Adding new atom nodes from transcripted text
function new_atom_video_resource_button() {
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedNode = range.commonAncestorContainer;

        const targetElements = document.getElementsByClassName("resource_pane_textarea_content");

        for (let element of targetElements) {
            if (element.contains(selectedNode)) {
                let text = selection.toString();
                //console.log(text);
                text = text.replace(/\[\d+(\.\d+)?\s*-\s*\d+(\.\d+)?\]\s*/g, "").trim(); // Remove timestamps

                add_new_atom_node(text);
            }
        }
    }
}

//Saving video resource tab
function save_video_resource_tab(tab_id) {
    //const tab = $(`#transcript-data + ${tab_id}`);

    const tab = document.getElementById(`transcript-data + ${tab_id}`);

    //console.log(tab.innerHTML);

    //Get the html content
    const content = tab.innerHTML;


    //Object to hold this data
    const savedData = {
        tabId: tab_id,
        tabContent: content
    };

    // Convert the data to JSON format
    const savedDataJSON = JSON.stringify(savedData);

    const blob = new Blob([savedDataJSON], {type: "application/json"});

    // Save the JSON file
    saveAs(blob, `tab_${tab_id}_data.json`);
} 

//Loading video resource tab
function load_video_resource_tab(event, tab_id) {
    const file = event.target.files[0];

    if(!file) {
        alert("No file selected");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try{
            const savedData = JSON.parse(e.target.result);

            const content = savedData.tabContent;
            const videoId = savedData.tabId;
            const tab = document.getElementById(`transcript${tab_id}`);
            //alert(tab_id);

            console.log(content);

            //Check to see if a tab like this has already been loaded
            const existingVideo = document.getElementById(`video${videoId}`);

            if(existingVideo){
                alert("This tab has already been loaded");
            }

            else{
                //Remove video upload form
                $(`#video-upload-form${tab_id}`).html("");

                tab.innerHTML = content;


                alert("Tab loaded successfully");
            }

        }catch (error) {
            console.error("Error loading tab:", error);
            alert("Failed to load tab");
        }
    }

    reader.readAsText(file);
}

//Highlight different speaker
function highlight_speaker(color){
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedNode = range.commonAncestorContainer;

        const targetElements = document.getElementsByClassName("transcript-text");

        for (let element of targetElements) {
            if (element.contains(selectedNode)) {
                const text = selection.toString();

                //Create a span element to replace the selected text
                const span = document.createElement("span");
                span.style.color = color;
                span.textContent = text;

                //Replace the text
                range.deleteContents();
                range.insertNode(span);
            }
        }
    }
}