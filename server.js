const WebSocket = require('ws');

const PORT = 8080;
const HOST = '0.0.0.0'; // Listen on all interfaces

const wss = new WebSocket.Server({ host: HOST, port: PORT });

// Store connected clients: Map<WebSocket, ClientData>
const clients = new Map();

console.log(`--------------------------------------------------`);
console.log(`Jungle Computing Server Running`);
console.log(`Listening on: ws://${HOST}:${PORT}`);
console.log(`Access via:   ws://127.0.0.1:${PORT} (Local)`);
console.log(`--------------------------------------------------`);

wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[${new Date().toLocaleTimeString()}] New connection from ${ip}`);

    // Initialize
    clients.set(ws, {
        userId: null,
        instanceId: null,
        nickname: 'Anonymous',
        socket: ws
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (e) {
            console.error('Invalid JSON:', e);
        }
    });

    ws.on('close', () => {
        console.log(`[${new Date().toLocaleTimeString()}] Client disconnected`);
        clients.delete(ws);
        broadcastPresence();
    });

    ws.on('error', (err) => {
        console.error('Client error:', err);
    });
});

function handleMessage(ws, data) {
    const client = clients.get(ws);

    switch (data.type) {
        case 'join':
            client.userId = data.userId;
            client.instanceId = data.instanceId;
            client.nickname = data.nickname;
            console.log(`User Joined: ${client.nickname} (${client.userId})`);
            broadcastPresence();
            break;

        case 'chat':
            handleChat(ws, data);
            break;
    }
}

function broadcastPresence() {
    const nodes = [];
    for (const client of clients.values()) {
        if (client.userId) {
            nodes.push({
                userId: client.userId,
                instanceId: client.instanceId,
                nickname: client.nickname
            });
        }
    }

    const message = JSON.stringify({
        type: 'presence',
        nodes: nodes
    });

    broadcast(message);
}

function handleChat(senderWs, data) {
    const payload = JSON.stringify(data);

    if (data.mode === 'broadcast') {
        broadcast(payload);
    } else if (data.mode === 'direct') {
        // Direct Message Logic
        for (const client of clients.values()) {
            if (client.userId === data.toUserId || client.userId === data.from.userId) {
                if (client.socket.readyState === WebSocket.OPEN) {
                    client.socket.send(payload);
                }
            }
        }
    }
}

function broadcast(message) {
    for (const client of clients.values()) {
        if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(message);
        }
    }
}
