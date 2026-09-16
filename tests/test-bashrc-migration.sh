#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$REPO_ROOT/scripts/migrate_bashrc.sh"
test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT
cat > "$test_dir/bashrc" <<'FIXTURE'
# Simple settings and literal multiline values should survive.
export DEMO_SIMPLE=hello
export DEMO_PATH="$HOME/bin:$PATH"
export DEMO_MULTI="first
second"
alias demo-alias='printf "%s\n" hello'
if false; then
  export DEMO_CONDITIONAL=unexpected
fi
demo_function() {
  export DEMO_FUNCTION=unexpected
}
case x in
  x) export DEMO_CASE=unexpected ;;
esac
cat <<'HEREDOC'
export DEMO_HEREDOC=unexpected
HEREDOC
export DEMO_SUBSTITUTION="$(touch SHOULD_NOT_EXIST)"
export DEMO_BASH_ONLY="${DEMO_SIMPLE^^}"
export DEMO_ARRAY=(one two)
export DEMO_CHAIN=unexpected; touch SHOULD_NOT_EXIST
export DEMO_CONTINUED=one \
  && touch SHOULD_NOT_EXIST
export DEMO_AFTER=good
FIXTURE
migrate_bashrc "$test_dir/bashrc" "$test_dir/migrated.zsh"
cat > "$test_dir/expected" <<'EXPECTED'
# Generated from ~/.bashrc during dotfiles installation.
# Only standalone portable export and alias declarations are included.
export DEMO_SIMPLE=hello
export DEMO_PATH="$HOME/bin:$PATH"
export DEMO_MULTI="first
second"
alias demo-alias='printf "%s\n" hello'
export DEMO_AFTER=good
EXPECTED
diff -u "$test_dir/expected" "$test_dir/migrated.zsh"
zsh -f -c '
  source "$1"
  [[ "$DEMO_SIMPLE" == hello && "$DEMO_MULTI" == $'"'"'first\nsecond'"'"' && "$DEMO_AFTER" == good ]]
' zsh "$test_dir/migrated.zsh"
# A truncated declaration must not break the generated configuration.
printf 'export DEMO_OK=yes\nexport DEMO_BROKEN="unterminated' > "$test_dir/bashrc"
migrate_bashrc "$test_dir/bashrc" "$test_dir/migrated.zsh"
zsh -f -n "$test_dir/migrated.zsh"
grep -q '^export DEMO_OK=yes$' "$test_dir/migrated.zsh"
if grep -q DEMO_BROKEN "$test_dir/migrated.zsh"; then exit 1; fi
printf '%s\n' 'Bashrc migration tests passed'
