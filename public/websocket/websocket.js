let socket;
let myUUID = null;
let targetUUID = null;

document.getElementById("generate").addEventListener("click", () => {
  socket = new WebSocket(`ws://${location.host}`);

  socket.addEventListener("open", () => {
    console.log("✅ WebSocket 연결됨");
  });

  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "uuid") {
      myUUID = msg.uuid;
      document.getElementById("uuid").textContent = `내 UUID: ${myUUID}`;
      return;
    }

    if (!msg.type || !msg.payload) return;

    const now = Date.now();

    switch (msg.type) {
      case "ping":
        // ping을 받았을 경우 pong 응답
        const pongMsg = {
          to: msg.from,
          type: "pong",
          payload: {
            timestamp: msg.payload.timestamp, // 그대로 되돌림
          },
        };
        socket.send(JSON.stringify(pongMsg));
        console.log("📨 ping 수신 → pong 전송");
        break;

      case "pong":
        const rtt = now - msg.payload.timestamp;
        const result = `📩 pong 수신 | ⏱ 왕복 지연: ${rtt}ms`;
        document.getElementById("receive-result").textContent = result;
        console.log(result);
        break;
    }
  });
});

document.getElementById("set-uuid").addEventListener("click", () => {
  targetUUID = document.getElementById("uuid-input").value.trim();
  if (targetUUID) {
    console.log(`🎯 대상 UUID 설정됨: ${targetUUID}`);
  }
});

document.getElementById("send").addEventListener("click", () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    alert("WebSocket 연결이 안 되어 있습니다.");
    return;
  }

  if (!targetUUID) {
    alert("대상 UUID를 먼저 설정하세요.");
    return;
  }

  const timestamp = Date.now();
  const message = {
    to: targetUUID,
    type: "ping",
    payload: {
      timestamp,
    },
  };

  socket.send(JSON.stringify(message));
  document.getElementById("send-result").textContent = `보냄: ping (${timestamp})`;
  console.log("📤 ping 전송");
});

document.getElementById("receive").addEventListener("click", () => {
  // WebSocket에서는 수신이 자동 처리됨 → 수동 수신 버튼은 의미 없음
  alert("수신은 자동으로 처리됩니다.");
});
