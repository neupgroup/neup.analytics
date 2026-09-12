#!/usr/bin/env bash
set -euo pipefail
if [[ "$#" -gt 1 ]]; then
  echo 'Usage: bash generate.key.sh [output-directory]' >&2
  exit 2
fi
output_dir="${1:-.}"
umask 077
mkdir -p "$output_dir"
node - "$output_dir/neup-analytics.env" <<'JS'
const fs = require('node:fs');
const crypto = require('node:crypto');
fs.writeFileSync(process.argv[2], 'NEUP_ANALYTICS_PROJECT_KEY="' + crypto.randomBytes(32).toString('hex') + '"\n', { mode: 0o600, flag: 'wx' });
console.log('Generated a 256-bit project secret. Register the same secret on the analytics server before use.');
JS
