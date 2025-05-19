const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, "public")));

// 라우팅
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ 핵심: HTTP 서버를 직접 생성해서 WebSocket과 공유
const server = http.createServer(app);

// ✅ WebSocket 서버를 동일 포트에 연결
const wss = new WebSocket.Server({ server });

// 클라이언트 관리
const clients = new Map();

wss.on("connection", (ws) => {
  const id = uuidv4();
  clients.set(id, ws);
  ws.send(JSON.stringify({ type: "uuid", uuid: id }));

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error("Invalid JSON:", err);
      return;
    }

    const { to, type, payload } = data;
    if (to && clients.has(to)) {
      clients.get(to).send(JSON.stringify({ from: id, type, payload }));
    } else {
      console.warn(`No target client for message type: ${type}`);
    }
  });

  ws.on("close", () => {
    clients.delete(id);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
    clients.delete(id);
  });
});

// ✅ 서버 실행
server.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
