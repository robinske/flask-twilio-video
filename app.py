import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, abort, session
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
from twilio.rest import Client

load_dotenv()
twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
twilio_api_key_sid = os.environ.get('TWILIO_API_KEY_SID')
twilio_api_key_secret = os.environ.get('TWILIO_API_KEY_SECRET')
verify_service_sid = os.environ.get('VERIFY_SERVICE_SID')

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')


# Hard coded for demo purposes
# Use your customer DB in production!
KNOWN_PARTICIPANTS = {
    'blathers': '+18005559876',
    'mabel': '+18005554321',
    'tommy': '+18005556789'
}


@app.route('/')
def index():
    return render_template('index.html')


def _get_verify_service():
    client = Client(twilio_account_sid, twilio_auth_token)
    return client.verify.services(verify_service_sid)


def start_verification(to):
    service = _get_verify_service()
    service.verifications.create(to=to, channel='sms')


def check_verification(to, code):
    service = _get_verify_service()
    check = service.verification_checks.create(to=to, code=code)
    return check.status == 'approved'


@app.route('/login', methods=['POST'])
def login():
    username = request.get_json(force=True).get('username')
    if not username:
        abort(401)
    
    session['username'] = username
    
    phone_number = KNOWN_PARTICIPANTS.get(username)
    session['phone'] = phone_number
    if not phone_number:
        abort(401)
    
    start_verification(phone_number)
    return {'phone': '********{}'.format(phone_number[-2:])}


@app.route('/verify', methods=['POST'])
def verify():
    username = session['username']
    phone_number = session['phone']
    code = request.get_json(force=True).get('code')
    if not check_verification(phone_number, code):
        abort(401)

    token = AccessToken(twilio_account_sid, twilio_api_key_sid,
                        twilio_api_key_secret, identity=username)
    token.add_grant(VideoGrant(room='My Room'))

    return {'token': token.to_jwt().decode()}


if __name__ == '__main__':
    app.run(host='0.0.0.0')
