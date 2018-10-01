/*
    connect to server with:
        - GET  for incomming data
        - POST for outgoing data

        - if one get is done do another one, so remote has a connection to send data

        local: app -> tcp | transport https | server: tcp -> client
*/

'use strict';

const APP_PORT = 22;
const SERVER_HTTPS_HOST = '0.0.0.0';
const SERVER_HTTPS_PORT = 2222;

const clients = {};

const net = require('net');
const https = require('https');
const crypto = require('crypto');

function createRemoteGet() {
    const clientId = `/${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;

    const getReq = https.request({
        hostname: SERVER_HTTPS_HOST,
        port: SERVER_HTTPS_PORT,
        method: 'GET',
        timeout: 3600 * 1000,
        path: clientId,
        rejectUnauthorized: false
    });
    getReq.end();

    // receiving data from server -> open connection to APP PORT and pipe data to it
    getReq.on('response', (getRes) => {
        const socket = net.connect(APP_PORT, '127.0.0.1');

        getRes.on('data', (d) => socket.write(d));

        const postReq = https.request({
            hostname: SERVER_HTTPS_HOST,
            port: SERVER_HTTPS_PORT,
            method: 'POST',
            timeout: 3600 * 1000,
            path: clientId,
            rejectUnauthorized: false
        });

        socket.on('data', (d) => postReq.write(d));
    });
}

createRemoteGet();
