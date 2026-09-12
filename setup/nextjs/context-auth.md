Analytics context authentication
===============================

Apply the database migrations before using this version (`npx prisma migrate deploy`).
Existing asymmetric verifier keys cannot be converted; generate a new key on each
project's configuration page. That action stores the project secret and displays it
once for installation in the client application's server environment:

```
NEUP_ANALYTICS_PROJECT_KEY="<64 lowercase hex characters>"
```

Never expose the secret through NEXT_PUBLIC variables, HTML, or browser code.
Remove the obsolete public-key environment variable from client deployments and
replace the old PKCS#8 value with the newly generated project secret. Update the
installed analytics.ts from the configuration page as well as the environment.

The SDK decodes the hex secret to 32 bytes, derives contextId with
HMAC-SHA256(secret, traceId), and sends a token in the existing context field:
`v1.<contextId hex>.<HMAC-SHA256(secret, "neup-context:v1:" + contextId) hex>`.
The signature uses a distinct message prefix from context derivation.

Both activity endpoints verify supplied tokens with the project's stored secret
and reject invalid tokens with HTTP 403 before writes. The API accepts the aliases
signed_context_id, signedContextId, and contextId; conflicting aliases are rejected.
Unsigned browser events remain anonymous. Server events require a valid token.
When the API receives a trace ID, it checks the HMAC derivation before saving its
context mapping. Browser events resolve this mapping using the verified context.

Tokens authenticate the context, not the complete event body, and are reusable
until the project key is revoked. Revocation clears the server secret, immediately
invalidating old tokens. Generate and install a new secret to resume collection.

Verification: `node --test services/activity/context-token.test.cjs`
