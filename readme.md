# 레포지토리 설명
WebRTC - WebSocket 간 성능 차이를 벤치마킹하기 위한 서버입니다. 
클라이언트로 접속한다면 RTT 지연시간을 측정하고, CSV 파일로 내보낼 수 있습니다. 
node.js와 express.js를 이용하였습니다.

RTT 는 웹 브라우저에서 정밀하게 지연시간을 측정할 수 있는 기능인 `performance` API를 사용하여 timestamp 를 찍어 측정합니다.

# 어떻게 배포하나?
Ubuntu 등 Debian 계열 OS를 추천합니다. 그러나 Windows에서도 구동은 가능합니다.

node, nvm, npm 등이 설치되어있어야 합니다.

## 1. 패키지 설치 : express.js 등 필요한 패키지가 자동으로 설치됩니다.
```bash
npm install
```

## 2. 서버 시작
```bash
npm start
```
`package.json` 에 `start` script를 지정했습니다. 위 명령어를 실행하면 express.js 기반 서버가 구동됩니다.

## 3. 웹페이지 접속
![image](https://github.com/user-attachments/assets/8bf603ff-baa6-4606-9227-6b5371c36e11)

별도의 환경변수 `PORT`를 지정하지 않았다면, 기본 `3000` 포트에서 서버가 열립니다. 만약 local 환경이라면 `localhost:3000` 에서 접속이 가능합니다. 

## 4. 실험 실시
벤치마킹을 위해서는 두개의 웹 브라우저에서 접속이 되어있어야 합니다. 또한 WebRTC가 지원되는 최신 웹 표준을 준수하는 웹 브라우저를 사용해야 합니다.

![image](https://github.com/user-attachments/assets/8bf603ff-baa6-4606-9227-6b5371c36e11)


### ID 생성
두 웹 브라우저에서 각각 UUID를 생성합니다. 

### 상대 UUID 입력
전송하는 쪽에서 수신하는 쪽의 UUID를 입력합니다.

### RTT 횟수 입력
숫자 입력 폼에 RTT 를 실행할 횟수를 입력하면 됩니다. 

### RTT 전송 시작
전송을 시작하면, 아래 로그에서 RTT 결과를 받아볼 수 있습니다.

### CSV 파일 포맷 다운로드
CSV 파일 포맷으로 다운로드도 가능합니다.

ID - 출발시간 - 도착시간 - RTT delay

