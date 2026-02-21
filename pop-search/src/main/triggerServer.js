import http from 'http';
import { URL } from 'url';
import { screen } from 'electron';
import { createPopup, getMainWindow } from './windowManager.js';

export function startServer() {
    const server = http.createServer((req, res) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);

            if (url.pathname === '/search') {
                const query = url.searchParams.get('q');
                const mainWindow = getMainWindow();

                // Prevent popup if settings window is focused
                if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
                    res.writeHead(200);
                    res.end('Ignored: Settings focused');
                    return;
                }

                const cursorPosition = screen.getCursorScreenPoint();
                createPopup(query || '', cursorPosition.x, cursorPosition.y + 20);
                res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('OK');
                return;
            }

            if (url.pathname === '/settings') {
                const mainWindow = getMainWindow();
                if (mainWindow) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.focus();
                }
                res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('OK');
                return;
            }
        } catch (err) {
            console.error('Server error:', err);
        }

        res.writeHead(404);
        res.end();
    });

    server.on('error', (e) => {
        if (e.code !== 'EADDRINUSE') {
            console.error('Server error:', e);
        }
    });

    server.listen(49152, '127.0.0.1', () => {
        console.log('Internal IPC server listening on http://127.0.0.1:49152');
    });
}
