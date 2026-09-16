import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent';
import { createTerminal } from './tmux.mjs';

export default function terminalExtension(pi: ExtensionAPI) {
  const terminal = createTerminal();
  const open = async (args: string, ctx: ExtensionContext) => {
    if (ctx.mode !== 'tui') {
      ctx.ui.notify('The terminal extension requires interactive Pi inside tmux.', 'warning');
      return;
    }
    try {
      const message = await terminal(args, ctx.cwd);
      ctx.ui.notify(message, 'info');
    } catch (error) {
      ctx.ui.notify(error instanceof Error ? error.message : String(error), 'error');
    }
  };
  pi.registerCommand('terminal', {
    description: 'Open/focus an independent tmux shell: /terminal [down|right|close|help]',
    handler: (args, ctx) => open(args, ctx),
  });
  pi.registerShortcut('ctrl+alt+t', {
    description: 'Open or focus the terminal without pausing Pi',
    handler: (ctx) => open('', ctx),
  });
}
