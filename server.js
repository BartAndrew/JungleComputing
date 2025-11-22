const WebSocket = require('ws');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

// Store connected clients: Map<WebSocket, ClientData>
// ClientData: { userId, instanceId, nickname, socket }
const clients = new Map();

console.log(`Jungle Computing 3 Server started on port ${PORT}`);

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Initialize with temporary data
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
            console.error('Invalid JSON received:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
        broadcastPresence();
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});

function handleMessage(ws, data) {
    const client = clients.get(ws);

    switch (data.type) {
        case 'join':
            client.userId = data.userId;
            client.instanceId = data.instanceId;
            client.nickname = data.nickname;
            console.log(`User joined: ${client.nickname} (${client.userId})`);
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

    console.log(`Broadcasting presence: ${nodes.length} nodes`);
    broadcast(message);
}

function handleChat(senderWs, data) {
    const payload = JSON.stringify(data);

    if (data.mode === 'broadcast') {
        broadcast(payload);
    } else if (data.mode === 'direct') {
        // Send to target(s)
        for (const client of clients.values()) {
            if (client.userId === data.toUserId) {
                if (client.socket.readyState === WebSocket.OPEN) {
                    client.socket.send(payload);
                }
            }
        }
        // Echo to sender's other instances
        const sender = clients.get(senderWs);
        if (sender && sender.userId) {
            for (const client of clients.values()) {
                if (client.userId === sender.userId) { // Send to ALL sender instances including self for simplicity in this version
                    if (client.socket.readyState === WebSocket.OPEN) {
                        client.socket.send(payload);
                    }
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
