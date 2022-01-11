# Use Twilio Video to create a Dog or Security Camera

There are multiple existing apps and services that you can use as a dog cam or security cam. However, most of these apps and services require you to pay for new devices or a subscription (or both!). When I recently adopted a puppy, I used Twilio Video and a few old phones to create my own dog cam.

![Image of DogCam in action](Image of DogCam in action)

In this blog post, we'll build a dog/security cam using:

1. a Twilio account – [sign up for free](https://www.twilio.com/try-twilio)
2. Python 3.x
3. the micro web framework Flask
4. the Twilio Python helper library
5. A [free ngrok account](https://ngrok.com/)
6. An old phone or tablet

Before we start, please ensure you have Python 3 and ngrok installed. To be able to use ngrok to build your dog or security cam, you have to also sign up for a free ngrok account. We will set up everything else as we go.

**If you would prefer to see the finished code for the dog cam right away, you can find it at [github.com/npentrel/dogcam](https://github.com/npentrel/dogcam).**

## Getting started

Create a directory for your project with the name `dogcam`.

### Set up environment variables

In your project directory, create a file with the name `.env` to store your environment variables. Copy the following code and fill in the respective variables:

```bash
TWILIO_ACCOUNT_SID=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
```
You can obtain your `TWILIO_ACCOUNT_SID` in the [Twilio Console](https://console.twilio.com/). To get the `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET`, [generate a standard API Key](https://www.twilio.com/console/project/api-keys).

### Install & configure virtualenv

We are going to use Virtualenv to set up a virtual environment for this project, in order to isolate the dependencies of this project from your other projects. Please create a file in your project directory named `requirements.txt`, with the following as its contents:

```
certifi==2020.4.5.1
chardet==3.0.4
click==7.1.1
Flask==1.1.2
idna==2.9
itsdangerous==1.1.0
Jinja2==2.11.2
MarkupSafe==1.1.1
PyJWT==1.7.1
pyngrok==4.1.5
python-dotenv==0.12.0
pytz==2019.3
requests==2.23.0
six==1.14.0
twilio==6.38.1
urllib3==1.25.8
Werkzeug==1.0.1
```

These are the dependencies we would like to install in our virtual environment. Next we will install virtualenv to create and activate your virtual environment. Once this is done we will install the dependencies from the dependencies file you created above into your virtual environment. Run the following commands in your command-line:

```
# installs virtualenv (use pip3 if you are using python3)
python3 -m pip install --user virtualenv
# sets up the environment
python3 -m venv env
# activates the environment
source env/bin/activate

# installs our dependencies
pip3 install -r requirements.txt
```

### Run ngrok

In a different terminal window, let’s start `ngrok`. Ngrok will allow us to expose your localhost at port 8080 to incoming requests. We will be using this to allow Twilio to communicate with our local python server. It is important that you do not close this window, so please have two terminal windows open – one for python and the other for ngrok.

```bash
ngrok http 8080
```

Once you type in the above your terminal window should show you output similar to this:

```bash
ngrok by @inconshreveable                                       (Ctrl+C to quit)

Session Status                online
Account                       Naomi Pentrel (Plan: Free)
Version                       2.3.40
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    http://cffb-82-217-150-167.ngrok.io -> http://loca
Forwarding                    https://cffb-82-217-150-167.ngrok.io -> http://loc

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### Create `templates/index.html`

In your project directory, create a folder with the name `templates`. Inside the `templates` folder create a file with the name `index.html` with the following contents:

```html
<!doctype html>
<html>
    <head>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
      <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.12.1/css/all.css" crossorigin="anonymous">
      <link rel="stylesheet" type="text/css" href="{{ url_for('static', filename='styles.css') }}">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title> Dog Cam</title>
    </head>
    <body>
        <div class="navbar navbar-expand-md" id="navbar">
          <div class="container-fluid">
            <form class="d-flex">
              <input class="form-control me-2" type="text" id="camera_name" placeholder="Camera Name" aria-label="Camera Name">
              <button class="btn btn-outline-primary" id="join" type="submit"><i class="fas fa-sign-in-alt"></i></button>
            </form>
            <div class="justify-content-end">
              <button id="changeCamera" class="btn btn-secondary" hidden><i class="fas fa-sync-alt"></i></button>
              <button id="rotateVideo" class="btn btn-secondary"><i class="fas fa-undo"></i></button>
              <button id="mute_audio" class="btn btn-secondary" hidden><i class="fas fa-microphone"></i></button>
              <button id="mute_video" class="btn btn-secondary" hidden><i class="fas fa-video"></i></button>
              <button id="leave" class="btn btn-danger" hidden><i class="fas fa-sign-out-alt"></i></button>
            </div>
          </div>
        </div>
        <div id="participant-container">
          <div id="local" class="participant"><div class="video-container"></div><div class="label participantLabel">Me</div></div>
          <!-- more participants will be added dynamically here -->
        </div>
        <script src="https://media.twiliocdn.com/sdk/js/video/releases/2.18.1/twilio-video.min.js"></script>
        <script type="module" src="{{ url_for('static', filename='app.js') }}"></script>
    </body>
</html>
```

### Create static resources

In your project directory, create a folder with the name `static`. Inside the `static` folder:

- Create a file with the name `styles.css` with [these contents](https://github.com/npentrel/dogcam/blob/main/static/styles.css). We won't make any changes to this file in this tutorial.
- Create a file with the name `resize.js` with [these contents](https://github.com/npentrel/dogcam/blob/main/static/resize.js). This file contains some functions used to make the videos in the app take up the maximum possible space. We won't make any changes to this file in this tutorial.
- Create an empty file with the name `app.js`. This is the file in which we will add the application logic later.

### Create `app.py`

Next, we will create the Python Flask server that we will use to host this web application. By default the code for this application will create a free [WebRTC Go Room](https://www.twilio.com/docs/video/tutorials/understanding-video-rooms#video-webrtc-go-rooms) which is limited to **two** participants. If you would like to use this with more participants, please change the Room type in the function `find_or_create_room` to one of the paid Room types (`peer-to-peer` or `group`).

In your project directory, create a file with the name `app.py` with these contents:

```python
import os
import twilio.rest

from dotenv import load_dotenv
from flask import Flask, render_template, request, abort
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

load_dotenv()
twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
twilio_api_key_sid = os.environ.get('TWILIO_API_KEY_SID')
twilio_api_key_secret = os.environ.get('TWILIO_API_KEY_SECRET')
twilio_client = twilio.rest.Client(
    twilio_api_key_sid,
    twilio_api_key_secret,
    twilio_account_sid)

app = Flask(__name__)
room_name = 'Dog Cam'


# if you would like to add more than 2 participants/cameras set the room type
# to "peer-to-peer" or "group"

def find_or_create_room(room_name):
    try:
        # try to fetch an in-progress room with room_name
        twilio_client.video.rooms(room_name).fetch()
    except twilio.base.exceptions.TwilioRestException:
        # a room with room_name does not exist, so we create it
        twilio_client.video.rooms.create(unique_name=room_name, type="go")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/login', methods=['POST'])
def login():
    camera_name = request.get_json(force=True).get('camera_name')
    if not camera_name:
        abort(401)

    find_or_create_room(room_name)

    token = AccessToken(
        twilio_account_sid,
        twilio_api_key_sid,
        twilio_api_key_secret,
        identity=camera_name)
    token.add_grant(VideoGrant(room=room_name))

    return {'token': token.to_jwt().decode()}


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Write the application logic

Now we're ready to write the application logic:

### Set up variables and helper functions

Open the `app.js` file. At the top of the file, insert these lines:

```javascript
import { resizeVideos, zoomTrack, rotateVideo } from './resize.js';

const camera_name_input = document.getElementById('camera_name');
const join_button = document.getElementById('join');
const leave_button = document.getElementById('leave');
const audio_mute_button = document.getElementById('mute_audio');
const video_mute_button = document.getElementById('mute_video');
const change_camera_button = document.getElementById('changeCamera');
const rotate_video_button = document.getElementById('rotateVideo');
const container = document.getElementById('participant-container');
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
let muted = false;

function resizeVideosHelper() {
    resizeVideos(document, container, style);
}

function rotateLocalVideo(v) {
    rotateVideo(document.getElementById('local').firstElementChild.getElementsByTagName("video")[0]);
}

// THE CODE TO CONNECT TO TWILIO VIDEO WILL GO HERE!

join_button.addEventListener('click', connectButtonHandler);
leave_button.addEventListener('click', connectButtonHandler);
audio_mute_button.addEventListener('click', audioButtonHandler);
video_mute_button.addEventListener('click', videoButtonHandler);
change_camera_button.addEventListener('click', changeCameraHandler);
rotate_video_button.addEventListener('click', rotateLocalVideo);
window.addEventListener('resize', resizeVideosHelper, true);

```

The first part of the above code declares the variables you will use in the rest of the code:

- The first set of variables make it easier for you to access DOM elements.
- The second set of variables store the state of the application, such as whether your audio is muted.
- The `resizeVideosHelper` function will be used to resize videos whenever cameras get added or removed from the call or when the window size changes.
- The `rotateLocalVideo` function enables you to rotate the video elements you are seeing on your screen. Note that these do not rotate the video elements for other participants in the Twilio Video call.
- The last set of function calls sets up the event listeners for the buttons and for window resize events.

### Connect to Twilio Video

Inside the Python code, you created a Twilio Video Room. Now we will add the code that allows participants to join. A Participant represents a client (an end-user) that is connected to a Room and can use the Room’s communication capabilities. For our dog or security camera, that means each "dog or security camera" that we use in the application is seen by the application as a participant.

Twilio Rooms are based on a publish/subscribe model. This means that a Participant can publish media tracks to the Room. A Track is a stream of bytes that contain the data generated by a multimedia source such as a microphone or a camera.

In the next piece of code, we will add code to publish a participant's local audio and video, as well as a data track. The audio and video is necessary so that you can see and hear what happens on each camera. We will use the data track later to allow participants to mute and unmute participants.

Add this code below the variables you defined:

```javascript
function addLocalAudioTrack() {
    Twilio.Video.createLocalAudioTrack().then(track => {
        audio_track = track;
    });
};

function addLocalDataTrack() {
    data_track = Twilio.Video.LocalDataTrack();
};

async function addLocalVideo() {
    video = document.getElementById('local').firstChild;
    await Twilio.Video.createLocalVideoTrack().then(track => {
        let trackElement = track.attach();
        trackElement.addEventListener('click', () => { zoomTrack(trackElement, document, container, style); });
        if (video.hasChildNodes()) {
            video.removeChild(video.firstChild);
        }
        trackElement.className = "deg0";
        video.appendChild(trackElement);
        video_track = track;
    });
    return video_track;
};

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
    tracksDiv.setAttribute('class', 'video-container');
    participantDiv.appendChild(tracksDiv);

    let labelDiv = document.createElement('div');
    labelDiv.setAttribute('class', 'label participantLabel');
    labelDiv.innerHTML = participant.identity;
    participantDiv.appendChild(labelDiv);

    let rotateButton = document.createElement('button');
    rotateButton.setAttribute('class', 'rotateVideo label');
    rotateButton.innerHTML = '<i class="fas fa-undo"></i>';
    rotateButton.addEventListener('click', () => {
        let v = participantDiv.firstElementChild.getElementsByTagName("video")[0];
        rotateVideo(v);
    });
    participantDiv.appendChild(rotateButton);

    let muteAudioButton = document.createElement('button');
    muteAudioButton.setAttribute('class', 'muteParticipantAudio label');
    muteAudioButton.innerHTML = '<i class="fas fa-microphone"></i>';
    // THE CODE FOR THE MUTE AUDIO BUTTON GOES HERE
    participantDiv.appendChild(muteAudioButton);

    container.appendChild(participantDiv);

    participant.tracks.forEach(publication => {
        if (publication.isSubscribed) {
            trackSubscribed(tracksDiv, publication.track, participantDiv);
        }
        publication.on('subscribed', track => handleTrackDisabled(track, participantDiv));
    });
    participant.on('trackSubscribed', track => trackSubscribed(tracksDiv, track, participantDiv));
    participant.on('trackUnsubscribed', track => trackUnsubscribed(track, participantDiv));

    resizeVideosHelper();
};

function participantDisconnected(participant) {
    let p = document.getElementById(participant.sid);
    if (p.classList.contains("participantZoomed")) {
        zoomOut(document, container, style)
    }
    p.remove();
    resizeVideosHelper();
};

function trackSubscribed(div, track, participantDiv) {
    let trackElement = track.attach();
    if (track.kind === 'video') {
        trackElement.className = "deg0";
    }
    trackElement.addEventListener('click', () => { zoomTrack(trackElement, document, container, style); });
    div.appendChild(trackElement);
    handleTrackDisabled(track, participantDiv);
};


function trackUnsubscribed(track, participantDiv) {
    if (track.kind == 'video') {
        if (participantDiv.classList.contains('participantZoomed')) {
            zoomOut(document, container, style);
        }
        track.detach().forEach(element => {
            element.remove()
        });
    }
};

function disconnect() {
    room.disconnect();
    while (container.lastChild.id != 'local')
        container.removeChild(container.lastChild);
    // in case the participant was hidden this resets it.
    container.lastChild.className = "participant";
    connected = false;
    resizeVideosHelper();
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

// THE CODE TO CHANGE THE CAMERA INPUT WILL GO HERE
function changeCameraHandler(event) { }

// THE CODE TO MUTE AND UNMUTE YOURSELF AND OTHERS WILL GO HERE
function audioButtonHandler(event) { }
function videoButtonHandler(event) { }

addLocalVideo();
addLocalAudioTrack();
addLocalDataTrack();
```

If you want to, you can test the app now! Run `python app.py` in your terminal and go to the ngrok address that uses https. You can now enter a camera name and join the call.

### Changing the camera input on a device

If you run the application as is you are most of the way there. However, if you try to use it on a mobile device you may notice that you can't change the camera. So let's change that.

To be able to change the camera input on a mobile device you need to make some changes to the code we just added. The first thing we need to change is to pass a specific `deviceId` to the `addLocalVideo`  function. The `deviceId` identifies which camera the application should use.

Replace the `addLocalVideo` function with the following code:

```javascript
async function addLocalVideo(id) {
    let options = {}
    if(id){
        options = { deviceId: id };
    }
    video = document.getElementById('local').firstChild;
    await Twilio.Video.createLocalVideoTrack(options).then(track => {
        let trackElement = track.attach();
        trackElement.addEventListener('click', () => { zoomTrack(trackElement, document, container, style); });
        if (video.hasChildNodes()) {
            video.removeChild(video.firstChild);
        }
        trackElement.className = "deg0";
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
```

The other change we need to make is to replace the `changeCameraHandler` function with the following code:

```javascript
async function changeCameraHandler(event) {
    event.preventDefault();

    if (current_camera == null) {
        current_camera = video_track.mediaStreamTrack.label;
    }

    let video_devices = await navigator.mediaDevices.enumerateDevices();
    video_devices = video_devices.filter(d => d.kind == 'videoinput');

    let new_video_device = null;
    for (let i = 0; i < video_devices.length; i++) {
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
```

When you click on the change camera button the `changeCameraHandler` selects the next camera that is available. Next, the function calls the `addLocalVideo` function with the `deviceId` of the new camera. If the participant has already joined a room, the `changeCameraHandler` unpublishes the old `video_track` before creating the new video track and then publishes the new `video_track`.


### Mute and unmute yourself or your security cameras



```javascript
    muteAudioButton.addEventListener('click', () => {
        if (muteAudioButton.innerHTML == '<i class="fas fa-microphone"></i>') {
            data_track.send("mute " + participant.sid);
        } else {
            data_track.send("unmute " + participant.sid);
        }
    });
```

```javascript
function audioButtonHandler(event) {
    if (event) {
       event.preventDefault();
    }

    room.localParticipant.audioTracks.forEach(publication => {
        if (publication.isTrackEnabled) {
            publication.track.disable()
            audio_mute_button.firstChild.className = 'fas fa-microphone-slash';
            muted = true;
        } else {
            publication.track.enable()
            audio_mute_button.firstChild.className = 'fas fa-microphone';
            muted = false;
        }
    });

    // send sid and action to listeners so they know our audio state
    if (muted) {
        data_track.send("mute " + room.localParticipant.sid);
    } else {
        data_track.send("unmute " + room.localParticipant.sid);
    }

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
```

```javascript
const receiveMuteInstructions = (data) => {
    let action;
    let sid;
    [action, sid] = data.split(" ");

    if (action == "state") {
        if (muted) {
            data_track.send("mute " + room.localParticipant.sid);
        }
    } else {
        if (sid == room.localParticipant.sid) {
            audioButtonHandler();
        } else {
            let participant = document.getElementById(sid);
            if (action == "mute") {
                participant.lastChild.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            } else {
                participant.lastChild.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }

}

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
```

```javascript
function trackSubscribed(div, track, participantDiv) {
    if (track.kind === 'data') {
        track.on('message', data => receiveMuteInstructions(data));
        data_track.send('state');
    } else {
        let trackElement = track.attach();
        if (track.kind === 'video') {
            trackElement.className = "deg0";
        }
        trackElement.addEventListener('click', () => { zoomTrack(trackElement, document, container, style); });
        div.appendChild(trackElement);
    }
    handleTrackDisabled(track, participantDiv);
};
```
