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

    # find_or_create_room(room_name)

    token = AccessToken(
        twilio_account_sid,
        twilio_api_key_sid,
        twilio_api_key_secret,
        identity=camera_name)
    token.add_grant(VideoGrant(room=room_name))

    return {'token': token.to_jwt().decode()}


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
