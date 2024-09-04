const startCallButton = document.getElementById('startCall');
const endCallButton = document.getElementById('endCall');
const joinMeetingButton = document.getElementById('joinMeeting');
const meetingIdInput = document.getElementById('meetingIdInput');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;
let signalingServer;
let meetingId = null;
const configuration = { 
    'iceServers': [
        { 'urls': 'stun:stun.l.google.com:19302' },
        { 'urls': 'stun:stun1.l.google.com:19302' }
    ] 
};
function setupWebSocket() {
    if (signalingServer) {
        signalingServer.close();
    }

    signalingServer = new WebSocket('wss://videocalling-1nud.onrender.com/');

    signalingServer.onopen = () => {
        console.log('WebSocket connection established');
        if (meetingId) {
            signalingServer.send(JSON.stringify({ action: 'join', meetingId }));
        }
    };

    signalingServer.onclose = () => {
        console.log('WebSocket connection closed');
    };

    signalingServer.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    signalingServer.onmessage = async (message) => {
        try {
            let data;
            if (message.data instanceof Blob) {
                const text = await message.data.text();
                data = JSON.parse(text);
            } else {
                data = JSON.parse(message.data);
            }
            console.log('Received signaling message:', data);
            await handleSignalingMessage(data);
        } catch (error) {
            console.error('Error processing message:', error);
        }
    };
}


async function handleSignalingMessage(data) {
    try {
        if (!peerConnection) {
            console.log('Creating new peer connection');
            createPeerConnection();
        }

        if (data.meetingId !== meetingId) {
            console.warn('Ignoring signaling message for different meeting ID');
            return;
        }

        if (data.offer) {
            console.log('Received offer. Current state:', peerConnection.signalingState);
            await handleOffer(data.offer);
        } else if (data.answer) {
            console.log('Received answer. Current state:', peerConnection.signalingState);
            await handleAnswer(data.answer);
        } else if (data.candidate) {
            console.log('Received ICE candidate');
            await handleCandidate(data.candidate);
        }
    } catch (error) {
        console.error('Error handling signaling message:', error);
    }
}


function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            signalingServer.send(JSON.stringify({ meetingId, candidate: event.candidate }));
        }
    };
    
    peerConnection.ontrack = event => {
        console.log('Received remote track');
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state changed to:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed') {
            console.log('ICE connection failed, attempting restart...');
            peerConnection.restartIce();
        }
    };

    peerConnection.onsignalingstatechange = () => {
        console.log('Signaling state changed to:', peerConnection.signalingState);
    };

    peerConnection.onnegotiationneeded = async () => {
        console.log('Negotiation needed');
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            signalingServer.send(JSON.stringify({ meetingId, offer: peerConnection.localDescription }));
            console.log('Sent offer. New state:', peerConnection.signalingState);
        } catch (error) {
            console.error('Error during negotiation:', error);
        }
    };
}

async function handleOffer(offer) {
    console.log('Handling offer. Current state:', peerConnection.signalingState);
    if (peerConnection.signalingState !== 'stable') {
        console.log('Signaling state is not stable, rolling back');
        await Promise.all([
            peerConnection.setLocalDescription({type: "rollback"}),
            peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        ]);
    } else {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    }
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signalingServer.send(JSON.stringify({ meetingId, answer: peerConnection.localDescription }));
    console.log('Sent answer. New state:', peerConnection.signalingState);
}
async function handleAnswer(answer) {
    console.log('Handling answer. Current state:', peerConnection.signalingState);
    if (!peerConnection) {
        console.warn('Received answer but peer connection does not exist');
        return;
    }

    try {
        if (peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('Successfully set remote description. New state:', peerConnection.signalingState);
        } else if (peerConnection.signalingState === 'stable') {
            console.warn('Received answer while in stable state. Ignoring.');
        } else {
            console.warn('Received answer in unexpected state:', peerConnection.signalingState);
        }
    } catch (error) {
        console.error('Error setting remote description:', error);
    }
}

async function handleCandidate(candidate) {
    if (!peerConnection) {
        console.warn('Received ICE candidate but peer connection does not exist');
        return;
    }

    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Successfully added ICE candidate');
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

startCallButton.addEventListener('click', async () => {
    if (!meetingId) {
        console.warn('Meeting ID not set');
        return;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        createPeerConnection();
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        console.log('Call started');
    } catch (error) {
        console.error('Error starting call:', error);
    }
});

endCallButton.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
        remoteVideo.srcObject = null;
    }
    console.log('Call ended');
});

joinMeetingButton.addEventListener('click', () => {
    const newMeetingId = meetingIdInput.value.trim();
    if (!newMeetingId) {
        console.warn('Meeting ID is empty');
        return;
    }
    
    // Check if we're trying to join a new meeting
    if (meetingId !== newMeetingId) {
        meetingId = newMeetingId;
        
        // If a signaling server connection exists, close it before creating a new one
        if (signalingServer && signalingServer.readyState === WebSocket.OPEN) {
            signalingServer.close();
        }
        
        // Reinitialize WebSocket connection with the new meeting ID
        setupWebSocket();
        console.log(`Joined meeting with ID: ${meetingId}`);
    } else {
        console.log('Already in this meeting');
    }
});
