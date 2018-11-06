import Server from './server';

const port = normalizePort(process.env.PORT || 3000);
Server.set('port', port);

console.log(`Server listening on port ${port}`);

const server = Server;
server.listen(port);

function normalizePort(val: number | string): number | string | boolean {
    const portNumber: number = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(portNumber)) return val;
    else if (portNumber >= 0) return portNumber;
    else return false;
}