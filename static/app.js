const usernameInput = document.getElementById('username');
const codeInput = document.getElementById('code');
const button = document.getElementById('join_leave');
const verifyForm = document.getElementById('verify');
const container = document.getElementById('container');
const count = document.getElementById('count');
var connected = false;
var room;

function addLocalVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        var video = document.getElementById('local').firstChild;
        video.appendChild(track.attach());
    });
};

function connectButtonHandler(event) {
    event.preventDefault();
    if (!connected) {
        var username = usernameInput.value;
        if (!username) {
            alert('Enter your name before connecting');
            return;
        }
        button.disabled = true;
        button.innerHTML = 'Connecting...';

        connect(username).then(() => {
            verifyForm.style.display = "";
        }).catch(() => {
            alert("Error - invalid or unknown user");
            button.innerHTML = 'Join call';
            button.disabled = false;
        });
    } else {
        disconnect();
        button.innerHTML = 'Join call';
        connected = false;
    }
}

function verifyButtonHandler(event) {
    event.preventDefault();
    var code = codeInput.value;
    verify(code).then(() => {
        verifyForm.style.display = "none";
        button.innerHTML = 'Leave call';
        button.disabled = false;
    }).catch(() => {
        alert("Error - invalid code");
        button.innerHTML = 'Join call';
        button.disabled = false;
    });
};

function connect(username) {
    var promise = new Promise((resolve, reject) => {
        // start the phone verification process
        fetch('/login', {
            method: 'POST',
            body: JSON.stringify({'username': username})
        }).then(res => res.json()).then(data => {
            count.innerHTML = `Sent code to phone number ${data.phone}. Enter the code to verify.`;
            resolve();
        }).catch(() => {
            reject();
        });
    });
    return promise;
};

function verify(code) {
    var promise = new Promise((resolve, reject) => {
        // get a token from the back end
        fetch('/verify', {
            method: 'POST',
            body: JSON.stringify({'code': code})
        }).then(res => res.json()).then(data => {
            // join video call
            return Twilio.Video.connect(data.token);
        }).then(_room => {
            room = _room;
            room.participants.forEach(participantConnected);
            room.on('participantConnected', participantConnected);
            room.on('participantDisconnected', participantDisconnected);
            connected = true;
            updateParticipantCount();
            resolve();
        }).catch(() => {
            reject();
        });
    });
    return promise;
};

function updateParticipantCount() {
    if (!connected)
        count.innerHTML = 'Disconnected.';
    else
        count.innerHTML = (room.participants.size + 1) + ' participants online.';
};


function participantConnected(participant) {
    var participant_div = document.createElement('div');
    participant_div.setAttribute('id', participant.sid);
    participant_div.setAttribute('class', 'participant');

    var tracks_div = document.createElement('div');
    participant_div.appendChild(tracks_div);

    var label_div = document.createElement('div');
    label_div.innerHTML = participant.identity;
    participant_div.appendChild(label_div);

    container.appendChild(participant_div);

    participant.tracks.forEach(publication => {
        if (publication.isSubscribed)
            trackSubscribed(tracks_div, publication.track);
    });
    participant.on('trackSubscribed', track => trackSubscribed(tracks_div, track));
    participant.on('trackUnsubscribed', trackUnsubscribed);

    updateParticipantCount();
};

function participantDisconnected(participant) {
    document.getElementById(participant.sid).remove();
    updateParticipantCount();
};

function trackSubscribed(div, track) {
    div.appendChild(track.attach());
};

function trackUnsubscribed(track) {
    track.detach().forEach(element => element.remove());
};

function disconnect() {
    room.disconnect();
    while (container.lastChild.id != 'local')
        container.removeChild(container.lastChild);
    button.innerHTML = 'Join call';
    connected = false;
    updateParticipantCount();
};

addLocalVideo();
button.addEventListener('click', connectButtonHandler);
verifyForm.addEventListener('submit', verifyButtonHandler);
