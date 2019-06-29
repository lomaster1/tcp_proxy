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

    const web_server = http.createServer(web_res);
    web_server.listen(80);

    const webs_opt = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') };
    const webs_server = https.createServer(webs_opt, web_res);
    webs_server.listen(443);

    const _url = 'https://localhost';
    const url_parts = url.parse(_url);
    url_parts.port = url_parts.protocol == 'https:' ? 443 : 80;

    let socket;
    await new Promise(resolve => {
        socket = net.createConnection({
            host: url_parts.hostname,
            port: url_parts.port,
        }, () => { console.log('net connected'); resolve(); });
    });

    const tcp_proxy = net.createServer(s => {
        s.on('data', d => {
            if (('' + d).startsWith('CONNECT')) {
                s.write('HTTP/1.1 200 OK\r\n\r\n');
            } else {
                if (!socket.destroyed)
                    socket.write(d);
            }
        });
        socket.pipe(s);
    });
    tcp_proxy.listen(3000);


    request.get({ url: _url, proxy: 'http://127.0.0.1:3000', strictSSL: false }, (err, res) => {
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
