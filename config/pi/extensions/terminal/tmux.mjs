import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

export async function runTmux(args) {
  try {
    const result = await execFileAsync('tmux', args, { timeout: 5000, maxBuffer: 128 * 1024 });
    return result.stdout.trim();
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('tmux is not installed. Run the 25-tmux installer first.');
    throw new Error(`tmux: ${String(error.stderr || error.message).trim()}`);
  }
}

export const HELP = 'Use /terminal [down|right] to open or focus a shell, /terminal close to terminate it. Shortcut: Ctrl+Alt+T. Requires Pi inside tmux (start with: tmux new-session -s pi, then run pi). Switch panes with Ctrl+B then an arrow; exit closes the shell.';

export function createTerminal({ pane = process.env.TMUX_PANE, tmux = process.env.TMUX, pid = process.pid, run = runTmux } = {}) {
  const owner = `pi-${pid}-${pane}`;
  let queue = Promise.resolve();
  const action = async (mode, cwd) => {
    if (!['', 'down', 'right', 'close', 'help'].includes(mode)) throw new Error(HELP);
    if (mode === 'help') return HELP;
    if (!tmux || !/^%\d+$/.test(pane ?? '')) throw new Error(`Pi is not running inside tmux. ${HELP}`);
    // Pane metadata survives /reload and prevents touching unrelated shells.
    const listing = await run(['list-panes', '-t', pane, '-F', '#{pane_id}\t#{@pi_terminal_owner}']);
    const existing = listing.split('\n').map((line) => line.split('\t'))
      .find(([id, tag]) => /^%\d+$/.test(id) && id !== pane && tag === owner)?.[0];
    if (mode === 'close') {
      if (!existing) return 'No terminal pane is open for this Pi process.';
      await run(['kill-pane', '-t', existing]);
      return 'Terminal closed.';
    }
    if (existing) {
      await run(['select-pane', '-t', existing]);
      return 'Focused the existing terminal (its shell and directory are preserved).';
    }
    const created = await run(['split-window', '-d', mode === 'right' ? '-h' : '-v', '-l', mode === 'right' ? '45%' : '35%', '-t', pane, '-c', cwd.replaceAll('#', '##'), '-P', '-F', '#{pane_id}']);
    if (!/^%\d+$/.test(created)) throw new Error(`tmux returned an unexpected pane ID: ${created}`);
    await run(['set-option', '-p', '-t', created, '@pi_terminal_owner', owner]);
    await run(['select-pane', '-t', created]);
    return 'Terminal opened. Pi continues running in its original pane.';
  };
  // Serialize repeated shortcuts so they cannot create duplicate panes.
  return (mode, cwd) => {
    const result = queue.then(() => action(mode.trim(), cwd));
    queue = result.catch(() => {});
    return result;
  };
}
