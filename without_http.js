const net = require('net');

(async function () {

    const web = net.createServer();
    web.on('connection', s => {
        console.log('web connected');
        s.on('data', d => {
            console.log('web data: ' + d);
            s.write('NEW DATA FROM WEB');
        });
        s.on('error', err => console.log('web err: ' + err));
        s.on('end', () => console.log('web end'));
    });
    web.listen(3002);

    const web_socket = net.createConnection({ host: '127.0.0.1', port: 3002 });
    await new Promise(resolve => {
        web_socket.on('connect', () => {
            console.log('web_socket connected');
            resolve();
        });
    });

    const proxy = net.createServer();
    proxy.on('connection', s => {
        console.log('proxy connected');
        s.on('data', d => {
            console.log('proxy data: ' + d);
            if ('CONNECT' == d)
                s.write('OK');
            else
                web_socket.write(d);
        });
        s.on('error', err => console.log('proxy err: ' + err));
        s.on('end', () => console.log('proxy end'));
        web_socket.pipe(s);
    });
    proxy.listen(3001);

    const client = net.createConnection({ host: '127.0.0.1', port: 3001 });
    client.on('data', d => {
        console.log('client data: ' + d);

        if (d == 'OK')
            client.write('some data');
        else {
            client.end();
            web_socket.end();
            proxy.close();
            web.close();
        }
    });
    client.on('error', err => console.log('client err: ' + err));
    client.on('end', () => console.log('client end'));

    client.write('CONNECT');
})();
