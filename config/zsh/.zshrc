########################################
# Base environment
########################################

export PATH="${PATH}:${HOME}/bin:${HOME}/.local/bin"

# Locale (uncomment if needed)
# export LANG=en_US.UTF-8
# export LC_ALL=en_US.UTF-8

########################################
# History
########################################

HISTFILE="$HOME/.zsh_history"
HISTSIZE=10000
SAVEHIST=10000

setopt HIST_IGNORE_ALL_DUPS
setopt HIST_REDUCE_BLANKS
setopt EXTENDED_GLOB

########################################
# Completion
########################################

autoload -U compinit && compinit

########################################
# zplug plugin manager
########################################

export ZPLUG_HOME="${HOME}/.zplug"
if [[ ! -d "$ZPLUG_HOME" ]]; then
  # Use zsh -f to avoid sourcing rc files during installer, preventing recursion
  curl -sL --proto-redir -all,https https://raw.githubusercontent.com/zplug/installer/master/installer.zsh | zsh -f
fi
source "$ZPLUG_HOME/init.zsh"

# Core plugins
zplug "zsh-users/zsh-autosuggestions"
zplug "zsh-users/zsh-syntax-highlighting", defer:2
zplug "zsh-users/zsh-completions"

# themes
zplug "themes/crunch", from:oh-my-zsh, as:theme

# Optional: fast directory navigation and helpful tools
zplug "rupa/z", as:plugin, use:"*.zsh"
zplug "plugins/git", from:oh-my-zsh
zplug "plugins/docker", from:oh-my-zsh

# Install plugins if not present, then load
if ! zplug check --verbose; then
  zplug install
fi
zplug load

########################################
# Aliases (add your own below)
########################################

alias ll='ls -lah'
alias gs='git status'


