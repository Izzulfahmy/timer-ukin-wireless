const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// HTTP Server sederhana untuk menyajikan file index.html dan remote.html
const server = http.createServer((req, res) => {
    let filePath = '.';
    if (req.url === '/' || req.url === '/index.html') {
        filePath = './index.html';
    } else if (req.url === '/remote' || req.url === '/remote.html') {
        filePath = './remote.html';
    } else {
        filePath = '.' + req.url;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 File Not Found', 'utf-8');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

let roomPin = Math.floor(1000 + Math.random() * 9000).toString();
let currentTimerState = null;

console.log('==================================================');
console.log('       SERVER TIMER UKIN OFFLINE BERJALAN         ');
console.log(`       PIN KONEKSI REMOTE HP: [ ${roomPin} ]     `);
console.log('==================================================');

wss.on('connection', (ws) => {
    // Kirim PIN aktif & status timer terakhir saat ada koneksi baru
    ws.send(JSON.stringify({ type: 'INIT_PIN', pin: roomPin }));
    if (currentTimerState) {
        ws.send(JSON.stringify({ type: 'STATE_UPDATE', data: currentTimerState }));
    }

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);
            
            // Broadcast state update dari laptop ke semua HP remote
            if (parsed.type === 'STATE_UPDATE') {
                currentTimerState = parsed.data;
                broadcast({ type: 'STATE_UPDATE', data: currentTimerState });
            }
            
            // Forward command dari HP remote ke Laptop
            if (parsed.type === 'COMMAND') {
                broadcast({ type: 'COMMAND', pin: parsed.pin, action: parsed.action });
            }
        } catch (err) {
            console.error('Error parsing WS message:', err);
        }
    });
});

function broadcast(data) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server aktif di Port ${PORT}`);
    console.log(`Buka di Laptop: http://localhost:${PORT}`);
    console.log(`Buka di HP    : http://<IP_LAPTOP>:${PORT}/remote.html`);
});