function add_video_resource_body(tab_id) {
    var tab_body = $(`
        <div data-tab-id="${tab_id}" id="` + tab_id + `_body" class="resource_pane_tab_content">
            <form data-tab-id="${tab_id}" id="video-upload-form` + tab_id +`" action="/upload-video" method="POST" enctype="multipart/form-data">
                <input data-tab-id="${tab_id}" id="video-upload`+ tab_id +`" type="file" style="display: none;" onchange="fetch_transcript('${tab_id}');" name="video" accept="video/*" required />
                <button data-tab-id="${tab_id}" onclick="document.getElementById('video-upload${tab_id}').click()" type="submit">Upload Video</button>

                <button data-tab-id="${tab_id}" type="button" class="btn btn-default" onclick="document.getElementById('fileLoader${tab_id}').click()" title="Load saved tab">
                    <i class="fa fa-upload fa-fw fa-lg"></i>
                </button>
                <input data-tab-id="${tab_id}" type="file" id="fileLoader`+ tab_id +`" accept=".json" style="display: none;" onchange="load_video_resource_tab(event,'${tab_id}')">

                <button type="button" class="btn btn-default" onclick="remove_tab()" title="Remove this tab from the resource pane">
                    <i class="fa fa-trash fa-fw fa-lg"></i>
                </button>
            </form>
            <div data-tab-id="${tab_id}" id="transcript`+ tab_id +`"></div>
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
                                <div class="timestamp" onclick="skipTo('${item.timestamp[0]}', '${id}')" >
                                    [${item.timestamp.join(' - ')}]
                                </div>
                                <div class="transcript-text" data-videoId="${id}" data-timestamp="${item.timestamp[0]}" contenteditable="true">${item.text}</div>
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
}

//Adding new atom nodes from transcripted text
function new_atom_video_resource_button() {
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedNode = range.commonAncestorContainer;

        //const timestamp
        //const videoId

        const targetElements = document.getElementsByClassName("transcript-text");


        for (let element of targetElements) {
            //console.log(element.getAttribute("data-videoId"));
            //console.log(element.getAttribute("data-timestamp"));

            if (element.contains(selectedNode)) {
                let text = selection.toString();
                const videoId = element.getAttribute("data-videoId");
                const timestamp = element.getAttribute("data-timestamp");


                //console.log(text);

                // Attempt to get the text color of the selection
                let textColor = null;

                // Check if the selected text is wrapped in a span or other styled element
                if (selectedNode.nodeType === Node.ELEMENT_NODE) {
                    textColor = window.getComputedStyle(selectedNode).color;
                } else if (selectedNode.parentElement) {
                    textColor = window.getComputedStyle(selectedNode.parentElement).color;
                }

                add_new_atom_node(text, textColor, videoId, timestamp);
            }
        }
    }
}

//Function to replaces tab IDs
function updateTabId(oldId, newId) {

    //Update the button
    const tab_button = document.getElementById(`${oldId}_btn`);
    tab_button.id = `${newId}_btn`;
    tab_button.setAttribute('onclick', tab_button.getAttribute('onclick').replace(oldId, newId));

    const elements = document.querySelectorAll(`[data-tab-id="${oldId}"]`);

    elements.forEach((element) => {
        element.setAttribute('data-tab-id', newId);

        if (element.id) {
            element.id = element.id.replace(oldId, newId);
        }
        if (element.getAttribute('onclick')) {
            element.setAttribute('onclick', element.getAttribute('onclick').replace(oldId, newId));
        }
    });
}

//Saving video resource tab
function save_video_resource_tab(tab_id) {
    //const tab = $(`#transcript-data + ${tab_id}`);

    const tab = document.getElementById(`transcript${tab_id}`);
    console.log(tab_id);

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
            const newId = savedData.tabId;

            const tab = document.getElementById(`transcript${tab_id}`);
            //alert(tab_id);

            //console.log(content);

            //Check to see if a tab like this has already been loaded
            const existingVideo = document.getElementById(`video${newId}`);

            if(existingVideo){
                alert("This tab has already been loaded");
            }

            else{
                //Remove video upload form
                $(`#video-upload-form${tab_id}`).html("");

                tab.innerHTML = content;
                //Replace the IDs
                 updateTabId(tab_id, newId);
                 set_active_tab(`${newId}_body`)


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