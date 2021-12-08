import { resizeVideos, zoomTrack } from './resize.js';

const root = document.getElementById('root');
const camera_name_input = document.getElementById('camera_name');
const join_button = document.getElementById('join');
const leave_button = document.getElementById('leave');
const audio_mute_button = document.getElementById('mute_audio');
const video_mute_button = document.getElementById('mute_video');
const change_camera_button = document.getElementById('changeCamera');
const container = document.getElementById('participant-container');
const navbar = document.getElementById('navbar');
const count = document.getElementById('count');
const style = document.createElement('style');
document.head.appendChild(style);

let connected = false;
let room;
let video_track;
let audio_track;
let data_track;
let current_camera;
let video;

// add tracks

function addLocalAudioTrack() {
    Twilio.Video.createLocalAudioTrack().then(track => {
        audio_track = track;
    });
};

function addLocalDataTrack() {
    data_track = Twilio.Video.LocalDataTrack();
};

async function addLocalVideo(id) {
    let options = {}
    if(id){
        options = { deviceId: new_video_device.deviceId };
    }
    await Twilio.Video.createLocalVideoTrack(options).then(track => {
        video = document.getElementById('local').firstChild;
        let trackElement = track.attach();
        trackElement.addEventListener('click', () => { zoomTrack(trackElement, document, container, style); });
        if (video.hasChildNodes()) {
            video.removeChild(video.firstChild);
        }
        video.appendChild(trackElement);
        video_track = track;

        // enable change camera button if there are multiple video devices
        let video_devices = navigator.mediaDevices.enumerateDevices().then(devices => {
            video_devices = devices.filter(d => d.kind == 'videoinput');
            if (video_devices.length > 1) {
                change_camera_button.hidden = false;
            }
        });
    });
    return video_track;
};

// button handlers

function connectButtonHandler(event) {
    event.preventDefault();
    if (!connected) {
        let camera_name = camera_name_input.value;
        if (!camera_name) {
            alert('Enter a camera name before connecting');
            return;
        }

        // add spinner
        join_button.children[0].className = "spinner-border spinner-border-sm"
        join_button.disabled = true;

        connect(camera_name).then(() => {
            // change navbar to joined view
            camera_name_input.hidden = true;
            join_button.children[0].className = 'fas fa-sign-in-alt';
            join_button.hidden = true;
            leave_button.hidden = false;
            leave_button.disabled = false;
            audio_mute_button.hidden = false;
            video_mute_button.hidden = false;
        }).catch(() => {
            alert('Connection failed. Is the backend running?');
            // reset navbar
            join_button.disabled = false;
            join_button.hidden = false;
            join_button.children[0].className = 'fas fa-sign-in-alt';
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
        connected = false;
    }
};

function audioButtonHandler(event) {
    if (event) {
       event.preventDefault();
    }

    // send sid to listeners so they know our audio state
    data_track.send(room.localParticipant.sid);

    room.localParticipant.audioTracks.forEach(publication => {
        if (publication.isTrackEnabled) {
            publication.track.disable()
            audio_mute_button.firstChild.className = 'fas fa-microphone-slash';
        } else {
            publication.track.enable()
            audio_mute_button.firstChild.className = 'fas fa-microphone';
        }
    });

}

function videoButtonHandler(event) {
    event.preventDefault();

    room.localParticipant.videoTracks.forEach(publication => {
        if (publication.isTrackEnabled) {
            publication.track.disable();
            video_mute_button.firstChild.className = 'fas fa-video-slash';
            document.getElementById('local').hidden = true;
        } else {
            publication.track.enable()
            video_mute_button.firstChild.className = 'fas fa-video';
            document.getElementById('local').hidden = false;
        }
    });
    resizeVideosHelper();
}

// connect to Twilio Video

function connect(camera_name) {
    let promise = new Promise((resolve, reject) => {
        // get a token from the back end
        let data;
        fetch('/login', {
            method: 'POST',
            body: JSON.stringify({'camera_name': camera_name})
        }).then(res => res.json()).then(_data => {
            // join video call
            data = _data;
            return Twilio.Video.connect(data.token, {tracks: [video_track, audio_track, data_track]});
        }).then(_room => {
            room = _room;
            room.participants.forEach(participantConnected);
            room.on('participantConnected', participantConnected);
            room.on('participantDisconnected', participantDisconnected);
            connected = true;
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
    let participantDiv = document.createElement('div');
    participantDiv.setAttribute('id', participant.sid);
    participantDiv.setAttribute('class', 'participant');

    let tracksDiv = document.createElement('div');
    participantDiv.appendChild(tracksDiv);

    let labelDiv = document.createElement('div');
    labelDiv.setAttribute('class', 'label participantLabel');
    labelDiv.innerHTML = participant.identity;
    participantDiv.appendChild(labelDiv);

    let muteAudioButton = document.createElement('button');
    muteAudioButton.setAttribute('class', 'muteParticipantAudio label');
    muteAudioButton.innerHTML = '<i class="fas fa-microphone"></i>';
    muteAudioButton.addEventListener('click', () => {
        data_track.send(participant.sid);
    });
    participantDiv.appendChild(muteAudioButton);

    container.appendChild(participantDiv);

    participant.tracks.forEach(publication => {
        if (publication.isSubscribed) {
            trackSubscribed(tracksDiv, publication.track);
            handleTrackDisabled(publication.track, participantDiv);
        }
        publication.on('subscribed', track => handleTrackDisabled(track, participantDiv));
    });
    participant.on('trackSubscribed', track => trackSubscribed(tracksDiv, track));
    participant.on('trackUnsubscribed', trackUnsubscribed);

    updateParticipantCount();
    resizeVideosHelper();
};

function participantDisconnected(participant) {
    document.getElementById(participant.sid).remove();
    updateParticipantCount();
    resizeVideosHelper();
};



const receiveMuteInstructions = (sid) => {
    if (sid == room.localParticipant.sid) {
        audioButtonHandler();
    } else {
        participant = document.getElementById(sid);
        if (participant.lastChild.innerHTML == '<i class="fas fa-microphone"></i>') {
            participant.lastChild.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        } else {
            participant.lastChild .innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
}

function trackSubscribed(div, track) {
    if (track.kind === 'data') {
        track.on('message', data => receiveMuteInstructions(data));
    } else {
        let trackElement = track.attach();
        trackElement.addEventListener('click', () => { zoomTrack(trackElement, document, container, style); });
        div.appendChild(trackElement);
    }
};

function trackUnsubscribed(track) {
    if (track.kind == 'video') {
        track.detach().forEach(element => {
            if (element.classList.contains('participantZoomed')) {
                zoomTrack(element, document, container, style);
            }
            element.remove()
        });
    }
};

function disconnect() {
    room.disconnect();
    while (container.lastChild.id != 'local')
        container.removeChild(container.lastChild);
    connected = false;
    updateParticipantCount();
    resizeVideosHelper();
};

function updateParticipantCount() {
    if (!connected)
        count.innerHTML = 'Disconnected.';
    else
        count.innerHTML = (room.participants.size + 1) + ' participants online.';
};

function handleTrackDisabled(track, participantDiv) {
    track.on('disabled', () => {
        /* Hide the associated <video> element. */
        if (track.kind == 'video') {
            participantDiv.hidden = true;
            resizeVideosHelper();
        }
    });
    track.on('enabled', () => {
        /* Hide the associated <video> element. */
        if (track.kind == 'video') {
            participantDiv.hidden = false;
            resizeVideosHelper();
        }
    });
}


async function changeCameraHandler(event) {
    event.preventDefault();

    if (current_camera == null) {
        current_camera = video_track.mediaStreamTrack.label;
    }

    video_devices = await navigator.mediaDevices.enumerateDevices();
    video_devices = video_devices.filter(d => d.kind == 'videoinput');

    new_video_device = null;
    for (i = 0; i < video_devices.length; i++) {
        if (video_devices[i].label == current_camera) {
            new_video_device = video_devices[(i+1)%video_devices.length];
        }
    }
    if (room) {
        room.localParticipant.unpublishTrack(video_track);
    }
    video_track = await addLocalVideo(new_video_device.deviceId);
    if (room) {
        room.localParticipant.publishTrack(video_track);
    }

    current_camera = new_video_device.label;
}

function resizeVideosHelper() {
    resizeVideos(document, container, style);
}

addLocalVideo();
addLocalAudioTrack();
addLocalDataTrack();
join_button.addEventListener('click', connectButtonHandler);
leave_button.addEventListener('click', connectButtonHandler);
audio_mute_button.addEventListener('click', audioButtonHandler);
video_mute_button.addEventListener('click', videoButtonHandler);
change_camera_button.addEventListener('click', changeCameraHandler);
window.addEventListener('resize', resizeVideosHelper, true);