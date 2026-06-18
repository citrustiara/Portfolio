const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" }
];
const CHUNK_SIZE = 16 * 1024;
const HIGH_WATER_MARK = 1024 * 1024;
const LOW_WATER_MARK = 256 * 1024;

const elements = {
  signalingStatus: document.querySelector("#signalingStatus"),
  peerStatus: document.querySelector("#peerStatus"),
  channelStatus: document.querySelector("#channelStatus"),
  notice: document.querySelector("#notice"),
  createRoomButton: document.querySelector("#createRoomButton"),
  createdRoomCode: document.querySelector("#createdRoomCode"),
  roomLink: document.querySelector("#roomLink"),
  copyCodeButton: document.querySelector("#copyCodeButton"),
  copyLinkButton: document.querySelector("#copyLinkButton"),
  joinForm: document.querySelector("#joinForm"),
  joinRoomInput: document.querySelector("#joinRoomInput"),
  activeRoom: document.querySelector("#activeRoom"),
  leaveRoomButton: document.querySelector("#leaveRoomButton"),
  fileInput: document.querySelector("#fileInput"),
  fileLabel: document.querySelector("#fileLabel"),
  selectedFile: document.querySelector("#selectedFile"),
  sendFileButton: document.querySelector("#sendFileButton"),
  sendProgress: document.querySelector("#sendProgress"),
  sendProgressText: document.querySelector("#sendProgressText"),
  incomingName: document.querySelector("#incomingName"),
  incomingSize: document.querySelector("#incomingSize"),
  receiveProgress: document.querySelector("#receiveProgress"),
  receiveProgressText: document.querySelector("#receiveProgressText"),
  downloadLink: document.querySelector("#downloadLink"),
  iceServersInput: document.querySelector("#iceServersInput"),
  resetIceButton: document.querySelector("#resetIceButton"),
  saveIceButton: document.querySelector("#saveIceButton")
};

let peer = null;
let dataConnection = null;
let reconnectTimer = null;

let role = null;
let roomCode = null;
let selectedFile = null;
let sending = false;
let receiveState = null;
let receivedObjectUrl = null;

function setStatus(element, label, state) {
  element.textContent = label;
  element.dataset.state = state;
}

function showNotice(message, tone = "bad") {
  elements.notice.textContent = message;
  elements.notice.dataset.tone = tone;
  elements.notice.hidden = false;
}

function clearNotice() {
  elements.notice.hidden = true;
  elements.notice.textContent = "";
}

function formatBytes(value) {
  if (value === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** exponent;
  return `${amount.toFixed(amount >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function makeRoomLink(code) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", code);
  return url.toString();
}

function parseRoomCode(value) {
  const trimmed = String(value || "").trim();

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("room");
    if (fromQuery) {
      return normalizeRoomCode(fromQuery);
    }
  } catch {
    // Plain room code.
  }

  return normalizeRoomCode(trimmed);
}

function normalizeRoomCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function peerIdForRoom(code) {
  return normalizeRoomCode(code).toLowerCase();
}

async function copyText(value, button) {
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const scratch = document.createElement("textarea");
    scratch.value = value;
    scratch.style.position = "fixed";
    scratch.style.left = "-9999px";
    document.body.append(scratch);
    scratch.focus();
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
  }

  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function readIceServers() {
  try {
    const parsed = JSON.parse(elements.iceServersInput.value);
    if (!Array.isArray(parsed)) {
      throw new Error("ICE servers must be a JSON array.");
    }
    return parsed.filter((server) => server && (typeof server.urls === "string" || Array.isArray(server.urls)));
  } catch (error) {
    showNotice(error.message || "Invalid ICE server JSON.");
    return DEFAULT_ICE_SERVERS;
  }
}

function peerOptions() {
  return {
    host: "0.peerjs.com",
    port: 443,
    path: "/",
    secure: true,
    debug: 1,
    config: {
      iceServers: readIceServers(),
      iceCandidatePoolSize: 10,
      sdpSemantics: "unified-plan"
    }
  };
}

function resetIceServers() {
  elements.iceServersInput.value = JSON.stringify(DEFAULT_ICE_SERVERS, null, 2);
  localStorage.removeItem("blink:iceServers");
  showNotice("ICE servers reset.", "ok");
}

function saveIceServers() {
  try {
    const parsed = JSON.parse(elements.iceServersInput.value);
    if (!Array.isArray(parsed)) {
      throw new Error("ICE servers must be a JSON array.");
    }

    localStorage.setItem("blink:iceServers", JSON.stringify(parsed));
    showNotice(roomCode ? "ICE servers saved for the next room." : "ICE servers applied.", "ok");
  } catch (error) {
    showNotice(error.message || "Invalid ICE server JSON.");
  }
}

function loadIceServers() {
  const stored = localStorage.getItem("blink:iceServers");
  elements.iceServersInput.value = stored || JSON.stringify(DEFAULT_ICE_SERVERS, null, 2);
}

function renderRoom() {
  const code = roomCode || "";
  const link = code ? makeRoomLink(code) : "";

  elements.createdRoomCode.value = code;
  elements.roomLink.value = link;
  elements.activeRoom.textContent = code || "None";
  elements.leaveRoomButton.disabled = !peer && !dataConnection && !code;
  elements.copyCodeButton.disabled = !code;
  elements.copyLinkButton.disabled = !link;
}

function supportsPeerJs() {
  return typeof window.Peer === "function";
}

function closePeerSession(showMessage = false) {
  clearTimeout(reconnectTimer);
  reconnectTimer = null;

  if (dataConnection) {
    dataConnection.off?.("open");
    dataConnection.off?.("data");
    dataConnection.off?.("close");
    dataConnection.off?.("error");
    if (dataConnection.open) {
      dataConnection.close();
    }
  }

  if (peer) {
    peer.off?.("open");
    peer.off?.("connection");
    peer.off?.("disconnected");
    peer.off?.("close");
    peer.off?.("error");
    if (!peer.destroyed) {
      peer.destroy();
    }
  }

  dataConnection = null;
  peer = null;
  role = null;
  roomCode = null;
  setStatus(elements.signalingStatus, "Broker offline", "idle");
  setStatus(elements.peerStatus, "Peer idle", "idle");
  setStatus(elements.channelStatus, "Channel closed", "idle");
  renderRoom();
  updateSendControls();

  if (showMessage) {
    showNotice("Left room.", "ok");
  }
}

function handlePeerLifecycle(nextPeer) {
  nextPeer.on("disconnected", () => {
    setStatus(elements.signalingStatus, "Broker reconnecting", "warn");
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (peer && !peer.destroyed && peer.disconnected) {
        try {
          peer.reconnect();
        } catch {
          setStatus(elements.signalingStatus, "Broker error", "bad");
        }
      }
    }, 1200);
  });

  nextPeer.on("close", () => {
    setStatus(elements.signalingStatus, "Broker closed", "idle");
  });

  nextPeer.on("error", (error) => {
    setStatus(elements.signalingStatus, "Broker error", "bad");
    showNotice(peerErrorMessage(error));
  });
}

function peerErrorMessage(error) {
  if (!error) {
    return "Connection broker error.";
  }

  if (error.type === "unavailable-id") {
    return "That room is already in use.";
  }

  if (error.type === "peer-unavailable") {
    return "Room not found.";
  }

  if (error.type === "network") {
    return "Connection broker failed. Try another network or disable VPN/adblock.";
  }

  return `Connection broker: ${error.type || error.message || "error"}.`;
}

function createRoom() {
  if (!supportsPeerJs()) {
    showNotice("PeerJS failed to load.");
    return;
  }

  clearNotice();
  closePeerSession(false);
  role = "host";
  startHost(makeRoomCode(), 0);
}

function startHost(code, attempt) {
  roomCode = code;
  setStatus(elements.signalingStatus, "Broker connecting", "warn");
  setStatus(elements.peerStatus, "Waiting for peer", "warn");
  setStatus(elements.channelStatus, "Channel closed", "idle");
  renderRoom();

  peer = new Peer(peerIdForRoom(code), peerOptions());
  handlePeerLifecycle(peer);

  peer.on("open", () => {
    setStatus(elements.signalingStatus, "Broker online", "ok");
    setStatus(elements.peerStatus, "Room ready", "warn");
    renderRoom();
    showNotice("Room ready.", "ok");
  });

  peer.on("connection", (connection) => {
    if (dataConnection && dataConnection !== connection) {
      connection.close();
      return;
    }

    attachDataConnection(connection);
  });

  peer.on("error", (error) => {
    if (error?.type === "unavailable-id" && attempt < 5) {
      peer.destroy();
      peer = null;
      startHost(makeRoomCode(), attempt + 1);
    }
  });
}

function joinRoom(inputValue) {
  if (!supportsPeerJs()) {
    showNotice("PeerJS failed to load.");
    return;
  }

  const code = parseRoomCode(inputValue);
  if (!code) {
    showNotice("Enter a room code or link.");
    return;
  }

  clearNotice();
  closePeerSession(false);
  role = "guest";
  roomCode = code;
  setStatus(elements.signalingStatus, "Broker connecting", "warn");
  setStatus(elements.peerStatus, "Joining room", "warn");
  setStatus(elements.channelStatus, "Channel closed", "idle");
  renderRoom();

  peer = new Peer(undefined, peerOptions());
  handlePeerLifecycle(peer);

  peer.on("open", () => {
    setStatus(elements.signalingStatus, "Broker online", "ok");
    attachDataConnection(peer.connect(peerIdForRoom(code), { reliable: true }));
  });
}

function leaveRoom() {
  closePeerSession(true);
}

function nativeDataChannel() {
  return dataConnection?.dataChannel || dataConnection?._dc || dataConnection?._dataChannel || null;
}

function configureBackpressure() {
  const channel = nativeDataChannel();
  if (channel && "bufferedAmountLowThreshold" in channel) {
    channel.bufferedAmountLowThreshold = LOW_WATER_MARK;
  }
}

function attachDataConnection(connection) {
  dataConnection = connection;
  configureBackpressure();
  setStatus(elements.peerStatus, "Peer connecting", "warn");
  setStatus(elements.channelStatus, "Channel connecting", "warn");
  updateSendControls();

  connection.on("open", () => {
    configureBackpressure();
    setStatus(elements.peerStatus, "Peer connected", "ok");
    setStatus(elements.channelStatus, "Channel open", "ok");
    clearNotice();
    renderRoom();
    updateSendControls();
  });

  connection.on("data", (payload) => {
    handleDataPayload(payload).catch((error) => {
      console.error(error);
      showNotice(error.message || "Receive failed.");
    });
  });

  connection.on("close", () => {
    dataConnection = null;
    setStatus(elements.peerStatus, roomCode ? "Peer left" : "Peer idle", roomCode ? "warn" : "idle");
    setStatus(elements.channelStatus, "Channel closed", "idle");
    showNotice("Peer disconnected.", "warn");
    updateSendControls();
  });

  connection.on("error", () => {
    setStatus(elements.peerStatus, "Peer error", "bad");
    setStatus(elements.channelStatus, "Channel error", "bad");
    showNotice("Peer connection error. Different networks may need TURN.");
    updateSendControls();
  });
}

function isDataChannelOpen() {
  return Boolean(dataConnection?.open);
}

function sendData(payload) {
  if (!isDataChannelOpen()) {
    throw new Error("Data channel is closed.");
  }
  dataConnection.send(payload);
}

function updateSendControls() {
  elements.sendFileButton.disabled = !selectedFile || !isDataChannelOpen() || sending;
}

function updateProgress(progress, label, bytes, total) {
  const percent = total > 0 ? Math.min(100, Math.round((bytes / total) * 100)) : 100;
  progress.value = percent;
  label.textContent = `${percent}%`;
}

function makeTransferId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function bufferedAmount() {
  const channel = nativeDataChannel();
  return channel && typeof channel.bufferedAmount === "number" ? channel.bufferedAmount : 0;
}

function waitForBufferLow() {
  if (!isDataChannelOpen()) {
    return Promise.reject(new Error("Data channel is closed."));
  }

  const channel = nativeDataChannel();
  if (!channel || bufferedAmount() <= LOW_WATER_MARK) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      channel.removeEventListener("bufferedamountlow", handleLow);
      channel.removeEventListener("close", handleClose);
      channel.removeEventListener("error", handleClose);
    };

    const handleLow = () => {
      cleanup();
      resolve();
    };

    const handleClose = () => {
      cleanup();
      reject(new Error("Data channel closed during send."));
    };

    channel.addEventListener("bufferedamountlow", handleLow);
    channel.addEventListener("close", handleClose);
    channel.addEventListener("error", handleClose);
  });
}

async function sendSelectedFile() {
  if (!selectedFile || !isDataChannelOpen() || sending) {
    return;
  }

  sending = true;
  updateSendControls();
  updateProgress(elements.sendProgress, elements.sendProgressText, 0, selectedFile.size);

  const metadata = {
    type: "meta",
    id: makeTransferId(),
    name: selectedFile.name || "download",
    size: selectedFile.size,
    mime: selectedFile.type || "application/octet-stream",
    lastModified: selectedFile.lastModified
  };

  try {
    sendData(metadata);

    let offset = 0;
    while (offset < selectedFile.size) {
      if (bufferedAmount() > HIGH_WATER_MARK) {
        await waitForBufferLow();
      }

      const chunk = await selectedFile.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
      sendData(chunk);
      offset += chunk.byteLength;
      updateProgress(elements.sendProgress, elements.sendProgressText, offset, selectedFile.size);
    }

    if (bufferedAmount() > HIGH_WATER_MARK) {
      await waitForBufferLow();
    }

    sendData({ type: "done", id: metadata.id });
    updateProgress(elements.sendProgress, elements.sendProgressText, selectedFile.size, selectedFile.size);
    showNotice("File sent.", "ok");
  } catch (error) {
    showNotice(error.message || "Send failed.");
  } finally {
    sending = false;
    updateSendControls();
  }
}

function isBinaryPayload(payload) {
  return payload instanceof ArrayBuffer || payload instanceof Blob || ArrayBuffer.isView(payload);
}

async function payloadToArrayBuffer(payload) {
  if (payload instanceof ArrayBuffer) {
    return payload;
  }

  if (payload instanceof Blob) {
    return payload.arrayBuffer();
  }

  if (ArrayBuffer.isView(payload)) {
    return payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
  }

  throw new Error("Unsupported binary payload.");
}

async function handleDataPayload(payload) {
  if (typeof payload === "string") {
    handleControlMessage(JSON.parse(payload));
    return;
  }

  if (payload && typeof payload === "object" && !isBinaryPayload(payload) && payload.type) {
    handleControlMessage(payload);
    return;
  }

  const buffer = await payloadToArrayBuffer(payload);
  if (!receiveState) {
    throw new Error("Received file bytes before metadata.");
  }

  receiveState.chunks.push(buffer);
  receiveState.received += buffer.byteLength;
  updateProgress(elements.receiveProgress, elements.receiveProgressText, receiveState.received, receiveState.size);
}

function handleControlMessage(message) {
  if (message.type === "meta") {
    if (receivedObjectUrl) {
      URL.revokeObjectURL(receivedObjectUrl);
      receivedObjectUrl = null;
    }

    receiveState = {
      id: message.id,
      name: message.name || "download",
      mime: message.mime || "application/octet-stream",
      size: Number(message.size || 0),
      received: 0,
      chunks: []
    };

    elements.incomingName.textContent = receiveState.name;
    elements.incomingSize.textContent = formatBytes(receiveState.size);
    elements.downloadLink.hidden = true;
    elements.downloadLink.removeAttribute("href");
    updateProgress(elements.receiveProgress, elements.receiveProgressText, 0, receiveState.size);
    return;
  }

  if (message.type === "done") {
    if (!receiveState || receiveState.id !== message.id) {
      showNotice("Transfer finished with no active file.", "warn");
      return;
    }

    if (receiveState.received !== receiveState.size) {
      showNotice("Transfer finished with missing bytes.");
      return;
    }

    const blob = new Blob(receiveState.chunks, { type: receiveState.mime });
    receivedObjectUrl = URL.createObjectURL(blob);
    elements.downloadLink.href = receivedObjectUrl;
    elements.downloadLink.download = receiveState.name;
    elements.downloadLink.hidden = false;
    updateProgress(elements.receiveProgress, elements.receiveProgressText, receiveState.size, receiveState.size);
    showNotice("File ready.", "ok");
  }
}

elements.createRoomButton.addEventListener("click", createRoom);
elements.joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  joinRoom(elements.joinRoomInput.value);
});
elements.leaveRoomButton.addEventListener("click", leaveRoom);
elements.copyCodeButton.addEventListener("click", () => copyText(elements.createdRoomCode.value, elements.copyCodeButton));
elements.copyLinkButton.addEventListener("click", () => copyText(elements.roomLink.value, elements.copyLinkButton));
elements.fileInput.addEventListener("change", () => {
  selectedFile = elements.fileInput.files[0] || null;
  elements.fileLabel.textContent = selectedFile ? selectedFile.name : "Choose a file";
  elements.selectedFile.textContent = selectedFile ? `${selectedFile.name} - ${formatBytes(selectedFile.size)}` : "No file selected";
  updateProgress(elements.sendProgress, elements.sendProgressText, 0, selectedFile ? selectedFile.size : 0);
  updateSendControls();
});
elements.sendFileButton.addEventListener("click", sendSelectedFile);
elements.resetIceButton.addEventListener("click", resetIceServers);
elements.saveIceButton.addEventListener("click", saveIceServers);

loadIceServers();
renderRoom();
setStatus(elements.signalingStatus, supportsPeerJs() ? "Broker ready" : "Broker missing", supportsPeerJs() ? "idle" : "bad");
setStatus(elements.peerStatus, "Peer idle", "idle");
setStatus(elements.channelStatus, "Channel closed", "idle");

const initialCode = parseRoomCode(new URLSearchParams(window.location.search).get("room"));
if (initialCode) {
  elements.joinRoomInput.value = initialCode;
  joinRoom(initialCode);
}
