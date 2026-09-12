#!/usr/bin/env bash
set -euo pipefail

output_dir="${1:-.}"
mkdir -p "$output_dir"
private_key="$output_dir/neup-analytics-private.key"
public_key="$output_dir/neup-analytics-public.key"
env_file="$output_dir/neup-analytics.env"

if [[ -e "$private_key" || -e "$public_key" || -e "$env_file" ]]; then
  echo "Refusing to overwrite existing key files in: $output_dir" >&2
  exit 1
fi

umask 077
node - "$private_key" "$public_key" "$env_file" <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const [privatePath, publicPath, envPath] = process.argv.slice(2);
const pair = crypto.generateKeyPairSync('x25519');
const privateDer = pair.privateKey.export({ type: 'pkcs8', format: 'der' });
const publicDer = pair.publicKey.export({ type: 'spki', format: 'der' });
fs.writeFileSync(privatePath, pair.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
fs.writeFileSync(publicPath, pair.publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644 });
fs.writeFileSync(envPath, `NEUP_ANALYTICS_PROJECT_KEY="${privateDer.toString('base64')}"\nNEXT_PUBLIC_NEUP_ANALYTICS_PROJECT_PUBLIC_KEY="${publicDer.toString('base64')}"\n`, { mode: 0o600 });
NODE

chmod 600 "$private_key" "$env_file"
chmod 644 "$public_key"
echo "Generated X25519 trace encryption credentials in $output_dir"
