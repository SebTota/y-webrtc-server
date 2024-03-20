# Y-Webrtc Server

This is a signaling server for WebRTC communication implemented in Node.js based on the server implementation of y-webrtc found [here](https://github.com/yjs/y-webrtc/tree/master). All credit of the original work goes to the author of that package.

## Prerequisites

- Node.js
- npm

## Local Environment Setup

1. Clone the repository:

`git clone https://github.com/SebTota/y-webrtc-server`


2. Navigate to the project directory:

`cd y-webrtc-server`


3. Install the dependencies:

`npm install`


4. Start the server:

`npm start`


By default, the server will run on port 4444. You can specify a different port using the `--port` argument:

`npm start -- --port 8080` or `node index.js --port 8080`


To use SSL encryption, provide the paths to your SSL certificate and private key files using the `--ssl-cert` and `--ssl-key` arguments:

`npm start -- --ssl-cert /path/to/your/cert.pem --ssl-key /path/to/your/key.pem`


5. The server should now be running locally.

## Production Environment Setup

1. Clone the repository on your production server:

`git clone https://github.com/SebTota/y-webrtc-server`


2. Navigate to the project directory:

`cd y-webrtc-server`


3. Install the dependencies:

`npm install --production`


4. Create a systemctl service file named `signaling-server.service` with the following content:

```
[Unit]
Description=Signaling Server
After=network.target

[Service]
ExecStart=/usr/bin/node /path/to/your/y-webrtc-server/index.js --port 443 --ssl-cert /path/to/your/cert.pem --ssl-key /path/to/your/key.pem
Restart=always
User=root
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
WorkingDirectory=/path/to/your/y-webrtc-server

[Install]
WantedBy=multi-user.target
```

Replace `/path/to/your/y-webrtc-server` with the actual path to your signaling server directory, and `/path/to/your/cert.pem` and `/path/to/your/key.pem` with the paths to your SSL certificate and private key files.
We have to set the user to `root` to allow the server to run on port 443, which is a privileged port.

5. Move the `signaling-server.service` file to the systemd directory:

`sudo mv signaling-server.service /etc/systemd/system/`


6. Start the signaling server service:

`sudo systemctl start signaling-server`


7. Enable the service to start automatically on system boot:

`sudo systemctl enable signaling-server`


8. Check the status of the service:

`sudo systemctl status signaling-server`


Your signaling server should now be running as a systemctl service on your production host.
