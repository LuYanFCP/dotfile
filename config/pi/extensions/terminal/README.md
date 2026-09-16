# Terminal

Open a real interactive shell beside Pi using tmux. Pi keeps running in its
original pane, including while the agent is generating or executing tools.
The shell has its own PTY and supports programs such as vim, top, and ssh.
This is a tmux pane controlled from Pi, not an embedded terminal emulator.

## Start

The repository's `25-tmux` installer provides tmux. Start Pi inside it:

```bash
tmux new-session -s pi
pi
```

The extension loads automatically after the repository's `30-link` configuration
is installed. To try it directly from the repository root instead:

```bash
pi -e ./config/pi/extensions/terminal/index.ts
```

That command must also run inside tmux. If Pi is already running outside tmux,
leave the current run alone and start a new Pi inside tmux when convenient.
The extension reports this requirement instead of interrupting an active Pi.

## Controls

| Action in Pi | Result |
| --- | --- |
| `/terminal` or `/terminal down` | Open a shell below Pi (35% of its pane), or focus the existing shell |
| `/terminal right` | Open a shell to the right (45%), or focus the existing shell |
| `Ctrl+Alt+T` | Open/focus the shell, including while the agent is busy |
| `/terminal close` | Terminate this Pi process's terminal pane and its running shell |
| `/terminal help` | Show usage |

Once focused on the shell, use tmux's `Ctrl+B` then an arrow to switch back to
Pi. The repository's tmux config also enables mouse selection and Alt+arrow
navigation. Some terminals intercept `Ctrl+Alt+T`; use `/terminal` in that case.
Type `exit` in the shell to close it normally.

## Lifetime and behavior

- A new shell starts in Pi's current working directory. Reopening it preserves
  shell state, running programs, and any `cd` changes.
- Each Pi process owns one terminal pane in its tmux window. `/reload` keeps
  that association. Other tmux panes are not reused or closed.
- The shell is an independent tmux process. Leaving Pi does not kill the shell;
  close it with `exit` when finished. A new Pi process gets a new association.
- Terminal output and commands are not sent to the model. This extension
  registers a user command and shortcut, not an LLM tool.
- The extension does not suspend Pi's UI, wait for the agent to become idle,
  abort generation, or take over Pi's stdin/stdout. Opening a split does resize
  Pi's pane, as with ordinary tmux splits.
- Supports interactive Pi on macOS/Linux with tmux. Print, JSON, and RPC modes
  do not open a terminal. Existing tmux bindings and configuration are preserved.

## Tests

```bash
node --test tests/test-pi-terminal.mjs
PI_PACKAGE_ROOT="$(npm root -g)/@earendil-works/pi-coding-agent" \
  node --test tests/test-pi-terminal-sdk.mjs
PI_TERMINAL_LIVE=1 node --test tests/test-pi-terminal-live.mjs
```

The live test creates a private tmux server, verifies the original process keeps
running while the shell is open, and removes only its own server afterward.
Tested with tmux 3.5a and Pi 0.85.1.
