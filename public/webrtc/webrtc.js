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
  const countInput = document.getElementById("ping-count").value;
  totalPings = parseInt(countInput);

  if (isNaN(totalPings) || totalPings <= 0) {
    alert("ping 횟수를 올바르게 입력하세요.");
    return;
  }

  rttResults = [];
  pingCounter = 0;
  sendTimestamps = {};
  clearTable();

  for (let i = 0; i < totalPings; i++) {
    const timestamp = Date.now();
    sendTimestamps[timestamp] = i + 1; // index 저장
    const message = {
      type: "ping",
      from: myUUID,
      timestamp,
    };
    dataChannel?.send(JSON.stringify(message));
  }

  document.getElementById("send-result").textContent = `${totalPings}회 ping 전송`;
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
        const reply = {
          type: "pong",
          from: myUUID,
          timestamp: msg.timestamp,
        };
        dataChannel.send(JSON.stringify(reply));
      } else if (msg.type === "pong") {
        const index = sendTimestamps[msg.timestamp];
        const rtt = now - msg.timestamp;
        rttResults.push({ index, sent: msg.timestamp, received: now, rtt });

        addResultRow(index, msg.timestamp, now, rtt);
        pingCounter++;

        if (pingCounter === totalPings) {
          console.log("모든 pong 수신 완료");
        }
      }
    } catch (err) {
      console.error("onmessage 처리 중 오류:", err);
    }
  };
  
  channel.onerror = (err) => {
    console.error("DataChannel 오류:", err);
  };
}

function clearTable() {
  const tbody = document.querySelector("#rtt-table tbody");
  tbody.innerHTML = "";
}

function addResultRow(index, sent, received, rtt) {
  const tbody = document.querySelector("#rtt-table tbody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${index}</td>
    <td>${new Date(sent).toLocaleTimeString()}.${sent % 1000}</td>
    <td>${new Date(received).toLocaleTimeString()}.${received % 1000}</td>
    <td>${rtt} ms</td>
  `;
  tbody.appendChild(row);
}
