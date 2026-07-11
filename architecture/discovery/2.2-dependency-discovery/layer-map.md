# 2.2 Dependency Discovery — Layer Map

## Layers (discovered from directory structure, not assumed)

| Layer | Directory | Files | Role |
|-------|-----------|-------|------|
| entry | src/main.tsx, src/App.tsx | 2 | Bootstrap, routing, hydration |
| ui | src/components/ | 68 | React components |
| ui-hooks | src/components/hooks/, src/hooks/ | 7 | React hooks |
| state | src/store/ | 12 | Zustand store + slices + campaignStore |
| domain | src/services/ | ~180 | Business logic |
| types | src/types/ | 6 | Type definitions |
| utils | src/utils/ | 7 | Pure utilities |
| i18n | src/i18n/ | 3 | Translation |
| candidate-ports | src/ports/ | 10 | Candidate architecture (hypothesis) |
| candidate-adapters | src/adapters/ | 10 | Candidate architecture (hypothesis) |

## Dependency Matrix (who depends on whom)

```
              → entry  ui   state  domain  types  utils  i18n  ports  adapters
entry    →       -     ✓    ✓      ✓       ✓      -      ✓     ✓      ✓
ui       →       -     -    ✓      ✓       ✓      ✓      ✓     -      -
state    →       -     -    -      ✓✓✓     ✓      -      -     ✓      -
domain   →       -     -    -      -       ✓✓✓    ✓✓✓    -     ✓✓✓   -
types    →       -     -    -      -       -      -      -     -      -
utils    →       -     -    -      -       ✓      -      -     -      -
i18n     →       -     -    -      -       -      -      -     -      -
ports    →       -     -    -      -       ✓      -      -     -      -
adapters →       -     -    ✓✓✓   ✓✓✓     ✓      -      -     ✓✓✓   -
```

Legend: ✓ = few imports, ✓✓✓ = many imports

## Key Observations

1. **state → domain: 10 static + 13 dynamic = 23 runtime dependencies**
   This is the dominant coupling. Store is not just state — it's an orchestrator.

2. **domain → state: 0 direct (via candidate ports only)**
   Services don't know about store directly. All access goes through candidate ports.

3. **adapters → state: many**
   Adapters are the bridge. They import store and forward to ports.

4. **ui → state: 18 imports**
   Expected. Components read state via Zustand hooks.

5. **ui → domain: 22 imports**
   Expected. Components trigger domain logic (runTurn, generateImage, etc.)

6. **state → ports: 4 imports**
   Store slices import `notify` from ports/notification. This is the candidate NotificationPort.

7. **domain → ports: 26 imports**
   Services import from candidate ports. This is the candidate architecture layer.

## Dependency Direction (arrow = "depends on")

```
entry ──→ ui ──→ state ──→ domain
  │         │       │          │
  │         │       │          ├──→ types
  │         │       ├──→ ports ←──┘
  │         │       │      ↑
  │         │       └──→ adapters ──→ state
  │         ├──→ domain
  │         ├──→ utils
  │         └──→ i18n
  ├──→ state
  ├──→ ports
  └──→ adapters
```

## Critical Finding

The `state → domain` dependency (23 edges) means **store is not a pure state layer**. It contains:
- Embedding triggers (warmupEmbedder, runFullReindex)
- API calls (api.backup, api.campaigns)
- Data migration (migrateV1ToV2)
- Lore processing (upgradeVectorOnlyDefault)
- NPC operations (buildNPCEmbeddingText, affinityToPcRelation)
- Persistence (offlineStorage, imageStorage, embeddingStorage)
- Turn orchestration (commitPendingTurn)
- Background queue (backgroundQueue)
- Token counting (countTokens)
- Settings encryption (encryptSettingsProviders)
- Theme resolution (resolveTheme)

This is 11 distinct domain concerns living inside the state layer.
