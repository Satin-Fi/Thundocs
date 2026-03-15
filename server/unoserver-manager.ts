import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLibreOfficePath(): string | null {
    const winProgramFiles = process.env.ProgramFiles;
    const winProgramFilesX86 = process.env['ProgramFiles(x86)'];
    const winLocalAppData = process.env.LOCALAPPDATA;

    const candidates = [
        ...(winProgramFiles ? [path.join(winProgramFiles, 'LibreOffice', 'program', 'soffice.exe')] : []),
        ...(winProgramFilesX86 ? [path.join(winProgramFilesX86, 'LibreOffice', 'program', 'soffice.exe')] : []),
        ...(winLocalAppData ? [path.join(winLocalAppData, 'Programs', 'LibreOffice', 'program', 'soffice.exe')] : []),
        '/usr/bin/soffice',
        '/usr/lib/libreoffice/program/soffice',
        '/opt/libreoffice/program/soffice',
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function getLibreOfficePythonPath(): string | null {
    const sofficePath = getLibreOfficePath();
    if (!sofficePath) return null;

    if (process.platform === 'win32') {
        const p = path.join(path.dirname(sofficePath), 'python.exe');
        if (fs.existsSync(p)) return p;
    }
    return 'python';
}

export function startUnoserver() {
    const pythonPath = getLibreOfficePythonPath();

    if (!pythonPath) {
        console.warn('⚠️ Cannot start Unoserver: Missing LibreOffice python.');
        return;
    }

    console.log('🔄 Starting LibreOffice persistent listener...', pythonPath);

    const child = spawn(pythonPath, ['-m', 'unoserver', '--port', '2002'], {
        detached: false,
        windowsHide: true
    });

    child.stdout.on('data', (d) => console.log('[unoserver]', d.toString().trim()));
    child.stderr.on('data', (d) => console.error('[unoserver err]', d.toString().trim()));

    child.on('error', (err) => {
        console.error('❌ Failed to start LibreOffice listener:', err);
    });

    child.on('exit', (code) => {
        console.log(`LibreOffice listener exited with code ${code}`);
    });

    // Kill listener when the node process exits
    process.on('exit', () => child.kill());
    process.on('SIGINT', () => { child.kill(); process.exit(); });
    process.on('SIGTERM', () => { child.kill(); process.exit(); });
}
