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
  const timestamp = Date.now();
  const message = {
    type: "ping",
    from: myUUID,
    timestamp,
  };
  dataChannel?.send(JSON.stringify(message));
  document.getElementById("send-result").textContent = `보냄: ping (${timestamp})`;
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
    try {
      const msg = JSON.parse(event.data);
      const now = Date.now();
  
      if (msg.type === "ping") {
        // ping 수신 → pong으로 응답
        const reply = {
          type: "pong",
          from: myUUID,
          timestamp: msg.timestamp, // 원래 ping의 타임스탬프 그대로 보냄
        };
        dataChannel.send(JSON.stringify(reply));
        console.log(`📥 ping 수신 → pong 응답`);
  
      } else if (msg.type === "pong") {
        // pong 수신 → RTT 계산
        const rtt = now - msg.timestamp;
        const text = `📩 pong 수신 | ⏱ 왕복 지연: ${rtt}ms`;
        document.getElementById("receive-result").textContent = text;
        console.log(text);
      }
  
    } catch (err) {
      console.error("onmessage 처리 중 오류:", err);
    }
  };
  
  channel.onerror = (err) => {
    console.error("DataChannel 오류:", err);
  };
}
