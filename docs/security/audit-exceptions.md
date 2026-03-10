# Audit Exceptions

## Active Exception: Prisma Transitive Audit Findings

Status: Active
Owner: Maintainers
Last reviewed: 2026-03-10
Review cadence: Biweekly or after any Prisma dependency update
Target closure: Remove when upstream dependency chain is patched and audits pass without force-based downgrades

### Scope

Current findings are transitive to Prisma tooling dependencies and are not directly declared by this project.

Affected chain:
- `prisma@7.4.2`
- `@prisma/dev@0.20.0` (transitive)
- `hono@4.11.4` (transitive)
- `@mrleebo/prisma-ast@0.13.1` (transitive)
- `chevrotain@10.5.0` (transitive)
- `lodash@4.17.21` (transitive)

### Why This Is Not Auto-Remediated

`npm audit fix` has no non-breaking remediations for this dependency chain.
`npm audit fix --force` currently proposes a Prisma downgrade to `6.19.2`, which conflicts with the current Prisma 7 migration and introduces avoidable regression risk.

Chosen strategy:
- Keep Prisma on `7.4.2`.
- Do not use `--force` downgrade.
- Do not apply transitive overrides at this time.

### Compensating Controls

- Keep runtime dependencies and app code updated normally.
- Continue server-side authorization checks and origin checks for unsafe API methods.
- Re-run audit checks at the defined cadence and after dependency updates.
- Re-evaluate override strategy only if risk profile changes or upstream fix timeline stalls.

### Verification Commands

Run both commands and compare output against this exception scope:

```bash
npm run audit:full
npm run audit:prod
```

### Exit Criteria

Close this exception only when all conditions are true:
- Prisma publishes an update that removes vulnerable transitive packages, or a vetted non-breaking path exists.
- `npm run audit:full` no longer reports this Prisma transitive chain.
- `npm run audit:prod` no longer reports this Prisma transitive chain.
- The project still passes standard checks (`npm run lint`, `npx tsc --noEmit`).
