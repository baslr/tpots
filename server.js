/*
    listen on server port
    forward traffic via https to ip:port
    client -> tcp | transport https | remote: tcp -> app
*/

'use strict';

const SERVER_APP_HOST = '0.0.0.0';
const SERVER_APP_PORT = 12345;

const SERVER_HTTPS_HOST = '0.0.0.0';
const SERVER_HTTPS_PORT = 12345;


const clients = {};
const fs = require('fs');
const net = require('net');
const https = require('https');

// https for remote <-> server communication
const httpsServer = https.createServer(
    {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  }
);
httpsServer.listen(SERVER_HTTPS_PORT, SERVER_HTTPS_HOST);
httpsServer.on('request', (req, res) => {
    console.log('request', req.method, req.url);

    // FIRST: remote opens connections for receiving data
    if ('GET' === req.method) {
        if (!clients[req.url])
            clients[req.url] = {free:true};
        clients[req.url].remoteSend = res;

    // SECOND: when connection is established, remote will send data to server
    } else if ('POST' === req.method) {
        // forward data to the connected client
        req.on('data', (d) => clients[req.url].localSend.write(d));
    }
});

// tcp connection for client x <-> raspi communication
const tcpServer = net.createServer();
tcpServer.listen(SERVER_APP_PORT, SERVER_APP_HOST);

tcpServer.on('connection', (socket) => {
    console.log('new client connection');

    // find free client for communication

    const [key, client] = Object.entries(clients).find(val => val[1].free === true);

    if (undefined === key || undefined === client) {
        console.log('no free connection to remote');
        return;
    }

    client.free = false;
    client.localSend = socket;

    socket.on('data', (d) => client.remoteSend.write(d));
});
