import net from 'net';
import { execSync } from 'child_process';

let wslIp = '172.18.135.247';
try {
  const out = execSync('wsl hostname -I', { encoding: 'utf8' });
  wslIp = out.trim().split(' ')[0] || wslIp;
} catch {}

const server = net.createServer((clientSocket) => {
  const wslSocket = net.connect(5432, wslIp);
  clientSocket.pipe(wslSocket);
  wslSocket.pipe(clientSocket);
  clientSocket.on('error', () => wslSocket.destroy());
  wslSocket.on('error', () => clientSocket.destroy());
});

server.listen(5432, '127.0.0.1', () => {
  console.log(`[PG-Proxy] Forwarding 127.0.0.1:5432 -> ${wslIp}:5432`);
});
