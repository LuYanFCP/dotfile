#!/usr/bin/env bash

# Read complete Bash commands without executing them. Only copy standalone
# declarations whose values use syntax shared by Bash and Zsh. In particular,
# skip compound commands, substitutions, arrays, and Bash-only expansions.
migrate_bashrc() {
  local source_file="$1" target_file="$2"
  local line command_text='' temporary_file diagnostics
  local variable single_quoted double_quoted word assignment declaration
  variable='\$([A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})'
  single_quoted="'[^']*'"
  double_quoted='"([^"$`\\]|\\["$`\\]|'"${variable}"')*"'
  word="([a-zA-Z0-9_./:@%+,=-]|${variable}|${single_quoted}|${double_quoted})*"
  assignment="[A-Za-z_][A-Za-z0-9_]*=${word}"
  declaration="^[[:space:]]*(export[[:blank:]]+${assignment}([[:blank:]]+${assignment})*|alias[[:blank:]]+[A-Za-z_][A-Za-z0-9_-]*=${word})[[:space:]]*$"

  temporary_file="$(mktemp "${target_file}.XXXXXX")" || return 1
  printf '%s\n' '# Generated from ~/.bashrc during dotfiles installation.' \
    '# Only standalone portable export and alias declarations are included.' > "$temporary_file"
  while IFS= read -r line || [[ -n "$line" ]]; do
    command_text+="${line}"$'\n'
    # bash -n also considers a trailing line continuation complete at EOF.
    [[ "$line" == *\\ ]] && continue
    if ! diagnostics="$(bash -n <<< "$command_text" 2>&1)" || [[ -n "$diagnostics" ]]; then
      continue
    fi
    # Bash 3.2 silently accepts unfinished here-documents at EOF. An
    # unmatched closing parenthesis must fail parsing outside a here-document;
    # if it is consumed as document text, keep collecting the command.
    if bash -n <<< "${command_text}"$'\n)' 2>/dev/null; then
      continue
    fi
    if [[ "$command_text" =~ $declaration ]]; then
      printf '%s' "$command_text" >> "$temporary_file"
    fi
    command_text=''
  done < "$source_file"

  if ! zsh -f -n "$temporary_file"; then
    rm -f "$temporary_file"
    return 1
  fi
  mv "$temporary_file" "$target_file"
}
