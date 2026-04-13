# better-auth migrations

`auth` schema is owned by **this repo** (frontend/Nitro) via better-auth.
Spring Boot's Flyway only manages the `public` schema — see
[backend/src/main/resources/db/migration/](../../../../backend/src/main/resources/db/migration/).

## First-time setup order

The cross-repo migration order **matters** because Flyway V5 adds a hard FK
from `public.users(id)` → `auth."user"(id)`. If the `auth` schema does not
exist yet, V5 fails fast with a clear error.

1. Set `DATABASE_URL` in your `.env`:
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/TERA_WORLD?search_path=auth,public
   ```

2. Provision the `auth` schema via the project script:
   ```bash
   bun run db:init
   ```

3. Verify:
   ```bash
   bun run db:verify
   ```
   Should list: account, jwks, session, user, verification.

4. Let Spring Flyway migrate `public.*` on its next boot:
   ```bash
   cd ../backend && ./gradlew bootRun
   ```
   Flyway will run V1..V5 in order. V5 adds the FK to `auth."user"`.

5. Start the frontend dev server:
   ```bash
   cd ../frontend && bun run dev
   ```

## Regenerating after schema changes

If `server/lib/auth.ts` adds/removes plugins or `user.additionalFields`,
re-run the generator and **manually re-scope to the `auth` schema**:

```bash
bunx @better-auth/cli@latest generate \
  --config server/lib/auth.ts \
  --output server/db/migrations/002_whatever.sql \
  --yes
```

Then wrap the output in `CREATE SCHEMA IF NOT EXISTS auth; SET search_path
TO auth; ... RESET search_path;` blocks to keep everything scoped.
