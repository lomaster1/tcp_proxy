const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const request = require('request');
const tls = require('tls');
const url = require('url');

(async function () {

    const web_res = (req, res) => {
        res.writeHead(200);
        let r = { method: req.method, headers: req.headers };
        res.end(`<html><body><pre>${JSON.stringify(r, null, 2)}</pre></body></html>`);
    };
    const web_on_connection = s => console.log('client connected to web server');

    // -- http web server --
    const web_server = http.createServer(web_res);
    web_server.on('connection', web_on_connection);
    web_server.listen(80);

    // -- https web server --
    const webs_opt = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') };
    const webs_server = https.createServer(webs_opt, web_res);
    webs_server.on('connection', web_on_connection);
    webs_server.listen(443);

    // -- tcp proxy --
    const tcp_proxy = net.createServer(s => {
        s.on('data', buf => {
            console.log('proxy data:', buf.slice(0, 7), buf.toString('utf8', 0, 7));
            if ('CONNECT' == buf.toString('utf8', 0, 7)) {
                s.write('HTTP/1.1 200 OK\r\n\r\n');
            } else {
                if (!web_socket.destroyed)
                    web_socket.write(buf);
            }
        });
        web_socket.pipe(s);
    });
    tcp_proxy.listen(3000);

    // -- client request --

    const request_url = 'https://localhost'; // 'https://httpbin.org/get?q=1';
    const request_url_parts = url.parse(request_url);
    request_url_parts.port = request_url_parts.protocol == 'https:' ? 443 : 80;

    // -- socket to web --
    const web_socket = net.createConnection({ host: request_url_parts.hostname, port: request_url_parts.port });
    await new Promise(resolve => {
        web_socket.on('connect', s => { console.log('web_socket connected'); resolve(); });
    });
    web_socket.on('data', buf => console.log('web_socket data:', buf.slice(0, 7), buf.toString('utf8', 0, 7)));

    request.get({ url: request_url, proxy: 'http://127.0.0.1:3000', strictSSL: false }, (err, res) => {
        if (err) {
            console.log('REQ ERROR', err);
        } else {
            console.log('REQ OK', res.body);
        }
        web_server.close();
        webs_server.close();
        tcp_proxy.close();
    });
})();
