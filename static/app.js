import { resizeVideos, zoomTrack, rotateVideo } from "./resize.js";

const camera_name_input = document.getElementById("camera_name");
const join_button = document.getElementById("join");
const leave_button = document.getElementById("leave");
const audio_mute_button = document.getElementById("mute_audio");
const video_mute_button = document.getElementById("mute_video");
const change_camera_button = document.getElementById("changeCamera");
const rotate_video_button = document.getElementById("rotateVideo");
const container = document.getElementById("participant-container");
const count = document.getElementById("count");
const style = document.createElement("style");
document.head.appendChild(style);

const app = {
    connected: false,
    muted: false,
    room: null,
    video_track: null,
    audio_track: null,
    data_track: null,
    current_camera: null,
    video: null
}

// add tracks

function addLocalAudioTrack() {
    Twilio.Video.createLocalAudioTrack().then(track => {
        app.audio_track = track;
    });
};

function addLocalDataTrack() {
    app.data_track = Twilio.Video.LocalDataTrack();
};

async function addLocalVideo(id) {
    let options = {}
    if(id){
        options = { deviceId: id };
    }
    app.video = document.getElementById("local").firstChild;
    await Twilio.Video.createLocalVideoTrack(options).then(track => {
        let trackElement = track.attach();
        trackElement.addEventListener("click", () => { zoomTrack(trackElement, document, container, style); });
        if (app.video.hasChildNodes()) {
            app.video.removeChild(app.video.firstChild);
        }
        trackElement.className = "deg0";
        app.video.appendChild(trackElement);
        app.video_track = track;

        // enable change camera button if there are multiple video devices
        let video_devices = navigator.mediaDevices.enumerateDevices().then(devices => {
            video_devices = devices.filter(d => d.kind == "videoinput");
            if (video_devices.length > 1) {
                change_camera_button.hidden = false;
            }
        });
    });
    return app.video_track;
};

// connect to Twilio Video

function connect(camera_name) {
    let promise = new Promise((resolve, reject) => {
        // get a token from the back end
        let data;
        fetch("/login", {
            method: "POST",
            body: JSON.stringify({"camera_name": camera_name})
        }).then(res => res.json()).then(_data => {
            // join video call
            data = _data;
            return Twilio.Video.connect(data.token, {tracks: [app.video_track, app.audio_track, app.data_track]});
        }).then(_room => {
            app.room = _room;
            app.room.participants.forEach(participantConnected);
            app.room.on("participantConnected", participantConnected);
            app.room.on("participantDisconnected", participantDisconnected);
            app.connected = true;
            updateParticipantCount();
            resolve();
        }).catch(e => {
            console.log(e);
            reject();
        });
    });
    return promise;
};


function participantConnected(participant) {
    let participantDiv = document.createElement("div");
    participantDiv.setAttribute("id", participant.sid);
    participantDiv.setAttribute("class", "participant");

    let tracksDiv = document.createElement("div");
    tracksDiv.setAttribute("class", "video-container");
    participantDiv.appendChild(tracksDiv);

    let labelDiv = document.createElement("div");
    labelDiv.setAttribute("class", "label participantLabel");
    labelDiv.innerHTML = participant.identity;
    participantDiv.appendChild(labelDiv);

    let rotateButton = document.createElement("button");
    rotateButton.setAttribute("class", "rotateVideo label");
    rotateButton.innerHTML = "<i class='fas fa-undo'></i>";
    rotateButton.addEventListener("click", () => {
        let v = participantDiv.firstElementChild.getElementsByTagName("video")[0];
        rotateVideo(v);
    });
    participantDiv.appendChild(rotateButton);

    let muteAudioButton = document.createElement("button");
    muteAudioButton.setAttribute("class", "muteParticipantAudio label");
    muteAudioButton.innerHTML = "<i class='fas fa-microphone'></i>";
    muteAudioButton.addEventListener("click", () => {
        if (muteAudioButton.innerHTML == "<i class='fas fa-microphone'></i>") {
            app.data_track.send("mute " + participant.sid);
        } else {
            app.data_track.send("unmute " + participant.sid);
        }
    });
    participantDiv.appendChild(muteAudioButton);

    container.appendChild(participantDiv);

    participant.tracks.forEach(publication => {
        if (publication.isSubscribed) {
            trackSubscribed(tracksDiv, publication.track, participantDiv);
        }
        publication.on("subscribed", track => handleTrackDisabled(track, participantDiv));
    });
    participant.on("trackSubscribed", track => trackSubscribed(tracksDiv, track, participantDiv));
    participant.on("trackUnsubscribed", track => trackUnsubscribed(track, participantDiv));

    updateParticipantCount();
    resizeVideosHelper();
};

function participantDisconnected(participant) {
    let p = document.getElementById(participant.sid);
    if (p.classList.contains("participantZoomed")) {
        zoomOut(document, container, style)
    }
    p.remove();
    updateParticipantCount();
    resizeVideosHelper();
};

function trackSubscribed(div, track, participantDiv) {
    if (track.kind === "data") {
        track.on("message", data => receiveMuteInstructions(data));
        app.data_track.send("sendState");
    } else {
        let trackElement = track.attach();
        if (track.kind === "video") {
            trackElement.className = "deg0";
        }
        trackElement.addEventListener("click", () => { zoomTrack(trackElement, document, container, style); });
        div.appendChild(trackElement);
    }
    handleTrackDisabled(track, participantDiv);
};

function trackUnsubscribed(track, participantDiv) {
    if (track.kind == "video") {
        if (participantDiv.classList.contains("participantZoomed")) {
            zoomOut(document, container, style);
        }
        track.detach().forEach(element => {
            element.remove()
        });
    }
};

function disconnect() {
    app.room.disconnect();
    while (container.lastChild.id != "local")
        container.removeChild(container.lastChild);
    // in case the participant was hidden this resets it.
    container.lastChild.className = "participant";
    app.connected = false;
    updateParticipantCount();
    resizeVideosHelper();
};

// button handlers

function connectButtonHandler(event) {
    event.preventDefault();
    if (!app.connected) {
        let camera_name = camera_name_input.value;
        if (!camera_name) {
            alert("Enter a camera name before connecting");
            return;
        }

        // add spinner
        join_button.children[0].className = "spinner-border spinner-border-sm"
        join_button.disabled = true;

        connect(camera_name).then(() => {
            // change navbar to joined view
            camera_name_input.hidden = true;
            join_button.children[0].className = "fas fa-sign-in-alt";
            join_button.hidden = true;
            leave_button.hidden = false;
            leave_button.disabled = false;
            audio_mute_button.hidden = false;
            video_mute_button.hidden = false;
        }).catch(() => {
            alert("Connection failed. Is the backend running?");
            // reset navbar
            join_button.disabled = false;
            join_button.hidden = false;
            join_button.children[0].className = "fas fa-sign-in-alt";
        });
    } else {
        disconnect();
        camera_name_input.hidden = false;
        join_button.disabled = false;
        join_button.hidden = false;
        leave_button.hidden = true;
        leave_button.disabled = true;
        audio_mute_button.hidden = true;
        video_mute_button.hidden = true;
        app.connected = false;
    }
};

function audioButtonHandler(event) {
    if (event) {
       event.preventDefault();
    }

    app.room.localParticipant.audioTracks.forEach(publication => {
        if (publication.isTrackEnabled) {
            publication.track.disable()
            audio_mute_button.firstChild.className = "fas fa-microphone-slash";
            app.muted = true;
        } else {
            publication.track.enable()
            audio_mute_button.firstChild.className = "fas fa-microphone";
            app.muted = false;
        }
    });

    // send sid and action to listeners so they know our audio state
    if (app.muted) {
        app.data_track.send("mute " + app.room.localParticipant.sid);
    } else {
        app.data_track.send("unmute " + app.room.localParticipant.sid);
    }

}

function videoButtonHandler(event) {
    event.preventDefault();

    app.room.localParticipant.videoTracks.forEach(publication => {
        if (publication.isTrackEnabled) {
            publication.track.disable();
            video_mute_button.firstChild.className = "fas fa-video-slash";
            document.getElementById("local").hidden = true;
        } else {
            publication.track.enable()
            video_mute_button.firstChild.className = "fas fa-video";
            document.getElementById("local").hidden = false;
        }
    });
    resizeVideosHelper();
}


const receiveMuteInstructions = (data) => {
    let action;
    let sid;
    [action, sid] = data.split(" ");

    if (action == "sendState") {
        if (app.muted) {
            app.data_track.send("mute " + app.room.localParticipant.sid);
        }
    } else {
        if (sid == app.room.localParticipant.sid) {
            audioButtonHandler();
        } else {
            let participant = document.getElementById(sid);
            if (action == "mute") {
                participant.lastChild.innerHTML = "<i class='fas fa-microphone-slash'></i>";
            } else {
                participant.lastChild.innerHTML = "<i class='fas fa-microphone'></i>";
            }
        }
    }

}

function updateParticipantCount() {
    if (!app.connected)
        count.innerHTML = "Disconnected.";
    else
        count.innerHTML = (app.room.participants.size + 1) + " participants online.";
};

function handleTrackDisabled(track, participantDiv) {
    track.on("disabled", () => {
        /* Hide the associated <video> element. */
        if (track.kind == "video") {
            participantDiv.hidden = true;
            resizeVideosHelper();
        }
    });
    track.on("enabled", () => {
        /* Hide the associated <video> element. */
        if (track.kind == "video") {
            participantDiv.hidden = false;
            resizeVideosHelper();
        }
    });
}

async function changeCameraHandler(event) {
    event.preventDefault();

    if (app.current_camera == null) {
        app.current_camera = app.video_track.mediaStreamTrack.label;
    }

    let video_devices = await navigator.mediaDevices.enumerateDevices();
    video_devices = video_devices.filter(d => d.kind == "videoinput");

    let new_video_device = null;
    for (let i = 0; i < video_devices.length; i++) {
        if (video_devices[i].label == app.current_camera) {
            new_video_device = video_devices[(i+1)%video_devices.length];
        }
    }
    if (app.room) {
        app.room.localParticipant.unpublishTrack(app.video_track);
    }
    app.video_track = await addLocalVideo(new_video_device.deviceId);
    if (app.room) {
        app.room.localParticipant.publishTrack(app.video_track);
    }

    app.current_camera = new_video_device.label;
}

function resizeVideosHelper() {
    resizeVideos(document, container, style);
}

function rotateLocalVideo(v) {
    rotateVideo(document.getElementById("local").firstElementChild.getElementsByTagName("video")[0]);
}

addLocalVideo();
addLocalAudioTrack();
addLocalDataTrack();

join_button.addEventListener("click", connectButtonHandler);
leave_button.addEventListener("click", connectButtonHandler);
audio_mute_button.addEventListener("click", audioButtonHandler);
video_mute_button.addEventListener("click", videoButtonHandler);
change_camera_button.addEventListener("click", changeCameraHandler);
rotate_video_button.addEventListener("click", rotateLocalVideo);
window.addEventListener("resize", resizeVideosHelper, true);