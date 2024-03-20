#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import https from 'https';
import http from 'http';
import fs from 'fs';
import * as map from 'lib0/map';
import { ArgumentParser } from 'argparse';

const wsReadyStateConnecting = 0;
const wsReadyStateOpen = 1;
const pingTimeout = 30000;

const parser = new ArgumentParser({
  description: 'Signaling server for WebRTC communication',
});
parser.add_argument('--port', { type: 'int', default: 4444, help: 'Port number to listen on' });
parser.add_argument('--host', { type: 'str', default: 'localhost', help: 'Host to listen on (e.g., localhost, 0.0.0.0)' });
parser.add_argument('--ssl-cert', { help: 'Path to SSL certificate file' });
parser.add_argument('--ssl-key', { help: 'Path to SSL private key file' });
const args = parser.parse_args();
console.log("Running with args:", args);

const port = args.port;
const host = args.host;
const ssl_cert = args.ssl_cert;
const ssl_key = args.ssl_key;
const wss = new WebSocketServer({ noServer: true });

const server = ssl_cert && ssl_key
  ? https.createServer(
      {
        cert: fs.readFileSync(ssl_cert),
        key: fs.readFileSync(ssl_key),
      },
      (request, response) => {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('okay');
      }
    )
  : http.createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('okay');
    });

/**
 * Map from topic-name to set of subscribed clients.
 * @type {Map<string, Set<any>>}
 */
const topics = new Map();

/**
 * Send a message to a WebSocket connection.
 * @param {WebSocket} conn - The WebSocket connection.
 * @param {object} message - The message to send.
 */
function send(conn, message) {
  if (conn.readyState !== wsReadyStateConnecting && conn.readyState !== wsReadyStateOpen) {
    conn.close();
  }
  try {
    conn.send(JSON.stringify(message));
  } catch (e) {
    conn.close();
  }
}

/**
 * Setup a new client connection.
 * @param {WebSocket} conn - The WebSocket connection.
 */
function onconnection(conn) {
  /**
   * @type {Set<string>}
   */
  const subscribedTopics = new Set();
  let closed = false;
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        conn.close();
      }
    }
  }, pingTimeout);
  conn.on('pong', () => {
    pongReceived = true;
  });
  conn.on('close', () => {
    subscribedTopics.forEach(topicName => {
      const subs = topics.get(topicName) || new Set();
      subs.delete(conn);
      if (subs.size === 0) {
        topics.delete(topicName);
      }
    });
    subscribedTopics.clear();
    closed = true;
  });
  conn.on('message', message => {
    if (typeof message === 'string' || message instanceof Buffer) {
      message = JSON.parse(message);
    }
    if (message && message.type && !closed) {
      switch (message.type) {
        case 'subscribe':
          (message.topics || []).forEach(topicName => {
            if (typeof topicName === 'string') {
              const topic = map.setIfUndefined(topics, topicName, () => new Set());
              topic.add(conn);
              subscribedTopics.add(topicName);
            }
          });
          break;
        case 'unsubscribe':
          (message.topics || []).forEach(topicName => {
            const subs = topics.get(topicName);
            if (subs) {
              subs.delete(conn);
            }
          });
          break;
        case 'publish':
          if (message.topic) {
            const receivers = topics.get(message.topic);
            if (receivers) {
              message.clients = receivers.size;
              receivers.forEach(receiver => send(receiver, message));
            }
          }
          break;
        case 'ping':
          send(conn, { type: 'pong' });
          break;
      }
    }
  });
}

wss.on('connection', onconnection);

server.on('upgrade', (request, socket, head) => {
  const handleAuth = ws => {
    wss.emit('connection', ws, request);
  };
  wss.handleUpgrade(request, socket, head, handleAuth);
});

server.listen(port, host, () => {
  console.log(`Signaling server running on ${host}:${port}`);
});