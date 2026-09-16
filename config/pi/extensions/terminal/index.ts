import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';
import { CURSOR_MARKER, matchesKey, isKeyRelease, parseKey, decodeKittyPrintable, sliceByColumn, truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';
import { EmbeddedTerminal, terminalInput } from './embedded.mjs';
import { createTerminal } from './tmux.mjs';

export default function terminalExtension(pi: ExtensionAPI) {
  const embedded = new EmbeddedTerminal();
  const split = createTerminal();
  let showing = false;
  let hide: (() => void) | undefined;
  const help = '/terminal: persistent shell overlay (no tmux session needed). Ctrl+Alt+T or Ctrl+] hides it; reopen to continue. /terminal close terminates the shell. /terminal down|right opens an optional split when Pi is inside tmux.';
  const open = async (args: string, ctx: ExtensionContext) => {
    if (ctx.mode !== 'tui') { ctx.ui.notify('Terminal requires interactive Pi.', 'warning'); return; }
    args = args.trim();
    let ownsOverlay = false;
    try {
      if (args === 'help') { ctx.ui.notify(help, 'info'); return; }
      if (args === 'down' || args === 'right' || args === 'split-close') {
        ctx.ui.notify(await split(args === 'split-close' ? 'close' : args, ctx.cwd), 'info'); return;
      }
      if (args === 'close') { hide?.(); await embedded.close(); ctx.ui.notify('Terminal closed.', 'info'); return; }
      if (args) { ctx.ui.notify(help, 'warning'); return; }
      if (showing) { hide?.(); return; }
      showing = true;
      ownsOverlay = true;
      await embedded.open(ctx.cwd);
      await ctx.ui.custom<void>((tui, theme, _keys, done) => {
        let disposed = false, polling = false, timer: ReturnType<typeof setTimeout> | undefined;
        let snapshot: Awaited<ReturnType<EmbeddedTerminal['snapshot']>> | undefined;
        let width = 80, height = 20, problem = '';
        const finish = () => { if (!disposed) done(); };
        hide = finish;
        const poll = async () => {
          if (disposed || polling) return;
          polling = true;
          try {
            await embedded.resize(width, height);
            snapshot = await embedded.snapshot();
            if (!disposed) tui.requestRender();
          } catch (error) {
            problem = error instanceof Error ? error.message : String(error);
            if (!disposed) tui.requestRender();
          } finally {
            polling = false;
            if (!disposed && !problem && !snapshot?.dead) timer = setTimeout(poll, 150);
          }
        };
        const component = {
          focused: true,
          handleInput(data: string) {
            if (isKeyRelease(data)) return;
            if (matchesKey(data, 'ctrl+alt+t') || matchesKey(data, 'ctrl+]')) { finish(); return; }
            if (snapshot?.dead || problem) { finish(); return; }
            void embedded.send(terminalInput(data, parseKey(data), decodeKittyPrintable(data))).catch((error) => {
              problem = error.message; tui.requestRender();
            });
          },
          render(columns: number) {
            width = Math.max(1, columns - 2);
            height = Math.max(3, Math.floor(tui.terminal.rows * 0.7) - 2);
            const frame = (text: string) => {
              const clipped = truncateToWidth(text, width, '');
              return theme.fg('border', '│') + clipped + '\x1b[0m' + ' '.repeat(Math.max(0, width - visibleWidth(clipped))) + theme.fg('border', '│');
            };
            const title = ' Terminal · Ctrl+] hide · /terminal close stops shell ';
            const lines = [theme.fg('border', '╭' + truncateToWidth(title.padEnd(width, '─'), width, '') + '╮')];
            for (let row = 0; row < height; row++) {
              let text = snapshot?.lines[row] ?? '';
              if (component.focused && snapshot?.visible && !snapshot.dead && snapshot.y === row && snapshot.x < width) {
                const before = sliceByColumn(text, 0, snapshot.x, true);
                const padding = ' '.repeat(Math.max(0, snapshot.x - visibleWidth(before)));
                text = before + padding + CURSOR_MARKER + sliceByColumn(text, snapshot.x, width, true);
              }
              if (row === 0 && problem) text = problem;
              if (row === 0 && !snapshot && !problem) text = 'Starting shell…';
              lines.push(frame(text));
            }
            const footer = snapshot?.dead ? ` Shell exited (${snapshot.exitCode}); press any key ` : ' Pi continues running · Esc/Ctrl+C go to shell ';
            lines.push(theme.fg('border', '╰' + truncateToWidth(footer.padEnd(width, '─'), width, '') + '╯'));
            return lines;
          },
          invalidate() {},
          dispose() { disposed = true; if (timer) clearTimeout(timer); hide = undefined; },
        };
        void poll();
        return component;
      }, { overlay: true, overlayOptions: { width: '90%', maxHeight: '75%', anchor: 'center' } });
      const state = await embedded.snapshot().catch(() => undefined);
      if (state?.dead) await embedded.close();
    } catch (error) {
      ctx.ui.notify(error instanceof Error ? error.message : String(error), 'error');
    } finally { if (ownsOverlay) showing = false; }
  };
  pi.registerCommand('terminal', { description: 'Open an independent shell overlay: /terminal [close|help|down|right]', handler: open });
  pi.registerShortcut('ctrl+alt+t', { description: 'Show/hide the shell while Pi keeps running', handler: (ctx) => open('', ctx) });
  pi.on('session_shutdown', async () => { hide?.(); await embedded.close(); });
}
