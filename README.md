# dog cam

This is a simple web-based dog video conferencing application that can be used for dog monitoring using Flask and Twilio Programmable Video. It is based on [flask-twilio-video](https://github.com/miguelgrinberg/flask-twilio-video).


## Installation Instructions

To install the application on your system follow these steps:

1. [Create a Twilio account](https://www.twilio.com/referral/7fB3Je) (if you don't have one yet). It's free!
2. [Generate an API Key](https://www.twilio.com/console/project/api-keys) for your account.
3. Clone this repository
4. Create a virtualenv and install the requirements

   ```sh
   python3 -m venv env
   source env/bin/activate
   pip3 install -r requirements.txt
   ```

5. Create a *.env* file by copying the *.env.template* file. Fill out the values for your Twilio account's SID, API Key SID and API Key Secret.
6. Execute `python app.py` to start the server.
7. Navigate to *http://localhost:8080* on your web browser. Connecting to the service from a phone or another computer may not work, as browsers require a secure (HTTPS) connection to give access to the media APIs. In that case, I suggest you use [ngrok](https://ngrok.com/) to give your application a temporary HTTPS URL.
