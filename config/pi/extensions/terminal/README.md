# Terminal

A persistent shell in a floating Pi overlay. Pi continues running while you use
the shell. **Pi does not need to be started inside tmux.** The extension uses
an isolated, detached tmux server for its PTY and terminal emulation, then
renders the terminal's screen in Pi. No native Node dependencies are required.

## Start

Install tmux (the repository's `25-tmux` installer provides it; on macOS,
`brew install tmux`). Load the extension via `30-link`, or directly:

```bash
pi -e ./config/pi/extensions/terminal/index.ts
```

For an already running Pi with the extension installed, use `/reload`.
Then type `/terminal` or press `Ctrl+Alt+T`.

## Controls

| Action | Result |
| --- | --- |
| `/terminal` | Open the shell overlay, or reopen the existing shell |
| `Ctrl+Alt+T` | Show/hide the overlay |
| `Ctrl+]` in the overlay | Hide it and return to Pi; shell keeps running |
| `Esc`, `Ctrl+C`, arrow keys, typing | Send input to the shell/application |
| `exit` in the shell | Exit; press any key to dismiss the finished terminal |
| `/terminal close` | Stop the shell and remove its private tmux server |
| `/terminal help` | Show usage |

A new shell starts in Pi's working directory using `$SHELL` (or `/bin/sh`).
Reopening preserves variables, directory changes, and running commands. Commands
and output are not sent to the model. Closing/reloading Pi cleans up the private
server; to keep a shell beyond Pi's lifetime, use the optional split mode below.

The overlay shows the current terminal screen, including colors and full-screen
applications such as vim/top. It refreshes about every 150 ms while visible and
adapts the PTY size to the overlay. It currently has no scrollback navigation or
mouse forwarding. Use keyboard controls in terminal programs. It does not
suspend Pi's TUI, abort the agent, or take over Pi's stdin/stdout.

## Optional tmux split mode

If Pi already runs inside a normal tmux session:

- `/terminal down` or `/terminal right`: open/focus a sibling shell pane.
- `/terminal split-close`: close that pane.
- Use tmux's `Ctrl+B` then an arrow to return to Pi.

The split shell persists after Pi exits. Existing tmux settings and unrelated
panes are preserved. `/terminal` always selects overlay mode by default.

## Tests

```bash
node --test tests/test-pi-terminal.mjs tests/test-pi-terminal-embedded.mjs
PI_PACKAGE_ROOT="$(npm root -g)/@earendil-works/pi-coding-agent" \
  node --test tests/test-pi-terminal-sdk.mjs
PI_TERMINAL_LIVE=1 node --test tests/test-pi-terminal-live.mjs tests/test-pi-terminal-embedded.mjs
PI_TERMINAL_LIVE=1 PI_PACKAGE_ROOT="$(npm root -g)/@earendil-works/pi-coding-agent" \
  node --test tests/test-pi-terminal-overlay.mjs
```

Live tests use private tmux servers and no model API calls. They verify shell
input, Ctrl+C, alternate-screen rendering, resize, hidden-shell persistence,
overlay frame widths, reopen, cleanup, and continued execution of the parent.
Tested with tmux 3.5a and Pi 0.85.1 on macOS; the backend also targets Linux.
