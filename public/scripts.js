let socket;
let myUUID = null;
let targetUUID = null;

let peerConnection;
let dataChannel;
let isOfferer = false;

const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

document.getElementById("generate").addEventListener("click", () => {
  socket = new WebSocket(`ws://${location.host}`);

  socket.addEventListener("open", () => {
    console.log("WebSocket 연결됨");
  });

  socket.addEventListener("message", async (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "uuid") {
      myUUID = msg.uuid;
      document.getElementById("uuid").textContent = `내 UUID: ${myUUID}`;
      return;
    }

    // WebRTC signaling 처리
    switch (msg.type) {
      case "offer":
        await handleOffer(msg);
        break;
      case "answer":
        await handleAnswer(msg);
        break;
      case "ice-candidate":
        await handleCandidate(msg);
        break;
    }
  });
});

document.getElementById("set-uuid").addEventListener("click", () => {
  targetUUID = document.getElementById("uuid-input").value;
  startWebRTCConnection();
});

document.getElementById("send").addEventListener("click", () => {
  const message = `👋 Hello from ${myUUID}`;
  dataChannel?.send(message);
  document.getElementById("send-result").textContent = `보냄: ${message}`;
});

document.getElementById("receive").addEventListener("click", () => {
  // 수신은 RTCDataChannel onmessage 핸들러에서 자동 처리됨
});

function startWebRTCConnection() {
  isOfferer = true;
  peerConnection = new RTCPeerConnection(servers);

  dataChannel = peerConnection.createDataChannel("chat");
  setupDataChannel(dataChannel);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          to: targetUUID,
          type: "ice-candidate",
          payload: event.candidate,
        })
      );
    }
  };

  peerConnection.createOffer().then((offer) => {
    peerConnection.setLocalDescription(offer);
    socket.send(
      JSON.stringify({
        to: targetUUID,
        type: "offer",
        payload: offer,
      })
    );
  });
}

async function handleOffer(msg) {
  peerConnection = new RTCPeerConnection(servers);

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel(dataChannel);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(
        JSON.stringify({
          to: msg.from,
          type: "ice-candidate",
          payload: event.candidate,
        })
      );
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.send(
    JSON.stringify({
      to: msg.from,
      type: "answer",
      payload: answer,
    })
  );
}

async function handleAnswer(msg) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload));
}

async function handleCandidate(msg) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(msg.payload));
  } catch (err) {
    console.error("ICE candidate 추가 실패:", err);
  }
}

function setupDataChannel(channel) {
  channel.onopen = () => {
    console.log("🔗 DataChannel 연결됨");
  };

  channel.onmessage = (event) => {
    const text = `📩 수신: ${event.data}`;
    document.getElementById("receive-result").textContent = text;
    console.log(text);
  };

  channel.onerror = (err) => {
    console.error("DataChannel 오류:", err);
  };
}
