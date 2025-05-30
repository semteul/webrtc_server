// /public/websocket/websocket.js
let socket;
let myUUID = null;
let targetUUID = null;

let pingCounter = 0;
let totalPings = 0;
const results = []; // CSV용 데이터 저장

function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

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

    switch (msg.type) {
      case "ping":
        socket.send(JSON.stringify({
          to: msg.from,
          type: "pong",
          payload: {
            uuid: msg.payload.uuid,
            sentTime: msg.payload.sentTime
          }
        }));
        break;

      case "pong": {
        const { uuid, sentTime } = msg.payload;
        const received = Date.now();

        performance.mark(`end-${uuid}`);
        performance.measure(`measure-${uuid}`, `start-${uuid}`, `end-${uuid}`);

        const measure = performance.getEntriesByName(`measure-${uuid}`)[0];
        const rtt = measure?.duration.toFixed(2);

        addResultRow(uuid, sentTime, received, rtt);
        results.push({ uuid, sentTime, received, rtt });
        pingCounter++;

        if (pingCounter === totalPings) {
          console.log("📩 모든 pong 수신 완료");
        }
        break;
      }
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

  const countInput = document.getElementById("ping-count").value;
  totalPings = parseInt(countInput);

  if (isNaN(totalPings) || totalPings <= 0) {
    alert("ping 횟수를 올바르게 입력하세요.");
    return;
  }

  performance.clearMarks();
  performance.clearMeasures();
  pingCounter = 0;
  clearTable();
  results.length = 0; // 이전 결과 초기화

  const ping = (i) => {
    if (i >= totalPings) return;

    const uuid = generateUUID();
    const sentTime = Date.now();

    const msg = {
      to: targetUUID,
      type: "ping",
      payload: { uuid, sentTime }
    };

    performance.mark(`start-${uuid}`);
    socket.send(JSON.stringify(msg));

    setTimeout(() => ping(i + 1), 10);
  };

  ping(0);
  document.getElementById("send-result").textContent = `${totalPings}회 ping 전송`;
});

document.getElementById("receive").addEventListener("click", () => {
  alert("수신은 자동으로 처리됩니다.");
});

document.getElementById("download-csv").addEventListener("click", () => {
  if (results.length === 0) {
    alert("저장할 데이터가 없습니다.");
    return;
  }

  const headers = ["UUID", "보낸 시각 (ISO)", "수신 시각 (ISO)", "RTT(ms)"];
  const rows = results.map(r =>
    [
      r.uuid,
      new Date(r.sentTime).toISOString(),
      new Date(r.received).toISOString(),
      r.rtt
    ].join(",")
  );

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `rtt_results_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

function clearTable() {
  const tbody = document.querySelector("#rtt-table tbody");
  tbody.innerHTML = "";
}

function addResultRow(uuid, sent, received, rtt) {
  const tbody = document.querySelector("#rtt-table tbody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${uuid}</td>
    <td>${new Date(sent).toISOString()}</td>
    <td>${new Date(received).toISOString()}</td>
    <td>${rtt} ms</td>
  `;
  tbody.appendChild(row);
}
