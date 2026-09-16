import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const exec = promisify(execFile);

// tmux owns the PTY and terminal emulation. It runs on a private socket with no
// attached client, so Pi itself does not need to run inside tmux.
export class EmbeddedTerminal {
  constructor({ shell = process.env.SHELL || '/bin/sh' } = {}) {
    this.shell = shell;
    this.directory = undefined;
    this.queue = Promise.resolve();
    this.cols = 80;
    this.rows = 20;
  }
  serial(operation) {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  async command(args) {
    const env = { ...process.env };
    delete env.TMUX;
    delete env.TMUX_PANE;
    try {
      return (await exec('tmux', ['-u', '-S', join(this.directory, 's'), '-f', '/dev/null', ...args], {
        env, timeout: 5000, maxBuffer: 2 * 1024 * 1024,
      })).stdout;
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error('tmux is missing. Install it with the 25-tmux installer (macOS: brew install tmux).');
      throw new Error(`Terminal backend: ${String(error.stderr || error.message).trim()}`);
    }
  }
  open(cwd, cols = 80, rows = 20) {
    return this.serial(async () => {
      if (this.directory) return;
      this.directory = await mkdtemp(join(tmpdir(), 'pi-term-'));
      this.cols = Math.max(10, cols);
      this.rows = Math.max(3, rows);
      try {
        await this.command(['new-session', '-d', '-s', 'shell', '-x', String(this.cols), '-y', String(this.rows), '-c', cwd.replaceAll('#', '##'), this.shell, '-l',
          ';', 'set-option', '-w', '-t', 'shell', 'remain-on-exit', 'on',
          ';', 'set-option', '-w', '-t', 'shell', 'window-size', 'manual']);
      } catch (error) { await this.cleanup(); throw error; }
    });
  }
  resize(cols, rows) {
    return this.serial(async () => {
      cols = Math.max(10, cols); rows = Math.max(3, rows);
      if (!this.directory || (cols === this.cols && rows === this.rows)) return;
      await this.command(['resize-window', '-t', 'shell', '-x', String(cols), '-y', String(rows)]);
      this.cols = cols; this.rows = rows;
    });
  }
  send(data) {
    return this.serial(async () => {
      if (!this.directory || !data) return;
      const bytes = Buffer.from(data);
      if (bytes.length > 65536) throw new Error('Paste is too large (maximum 64 KiB).');
      for (let offset = 0; offset < bytes.length; offset += 512) {
        const hex = [...bytes.subarray(offset, offset + 512)].map((byte) => byte.toString(16).padStart(2, '0'));
        await this.command(['send-keys', '-t', 'shell', '-H', ...hex]);
      }
    });
  }
  snapshot() {
    return this.serial(async () => {
      if (!this.directory) throw new Error('Terminal is closed.');
      const output = await this.command(['capture-pane', '-p', '-e', '-N', '-t', 'shell',
        ';', 'display-message', '-p', '-t', 'shell', '#{cursor_x} #{cursor_y} #{cursor_flag} #{pane_dead} #{pane_dead_status}']);
      const lines = output.replace(/\n$/, '').split('\n');
      const [x, y, visible, dead, status] = lines.pop().split(' ').map(Number);
      return { lines, x, y, visible: visible === 1, dead: dead === 1, exitCode: status, cols: this.cols, rows: this.rows };
    });
  }
  async cleanup() {
    if (!this.directory) return;
    const directory = this.directory;
    try { await this.command(['kill-server']); } catch { /* already exited */ }
    this.directory = undefined;
    await rm(directory, { recursive: true, force: true });
  }
  close() { return this.serial(() => this.cleanup()); }
}

// Convert common host keyboard encodings into ordinary terminal input. Kitty
// key-release events are filtered by the UI; release bytes must not reach sh.
export function terminalInput(data, key, printable) {
  const keys = { enter: '\r', return: '\r', tab: '\t', backspace: '\x7f', escape: '\x1b',
    up: '\x1b[A', down: '\x1b[B', right: '\x1b[C', left: '\x1b[D',
    home: '\x1b[H', end: '\x1b[F', delete: '\x1b[3~', insert: '\x1b[2~', pageUp: '\x1b[5~', pageDown: '\x1b[6~',
    f1: '\x1bOP', f2: '\x1bOQ', f3: '\x1bOR', f4: '\x1bOS', f5: '\x1b[15~', f6: '\x1b[17~',
    f7: '\x1b[18~', f8: '\x1b[19~', f9: '\x1b[20~', f10: '\x1b[21~', f11: '\x1b[23~', f12: '\x1b[24~',
    'shift+tab': '\x1b[Z', 'shift+enter': '\r', 'ctrl+space': '\0' };
  if (keys[key]) return keys[key];
  if (/^ctrl\+[a-z]$/.test(key || '')) return String.fromCharCode(key.at(-1).charCodeAt(0) - 96);
  if (/^alt\+[a-z]$/.test(key || '')) return '\x1b' + key.at(-1);
  if (printable) return printable;
  return data;
}
