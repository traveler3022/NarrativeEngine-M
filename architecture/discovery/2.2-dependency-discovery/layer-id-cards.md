# 2.2 Layer Discovery — Complete Layer ID Cards

This document contains a full identification card for every layer
discovered in the repository. Each card answers: why does this layer
exist, what does it own, who talks to it, and where should its
boundary be.

---

## Layer: Entry (main.tsx + App.tsx)

### Purpose
Bootstrap the React application, wire candidate ports to their
adapters, configure platform integrations (keyboard, back button),
and hydrate campaign state on launch.

### Responsibilities
- React root creation (createRoot)
- Candidate port wiring (10 wireX() calls)
- I18n provider setup
- Platform integration: hardware back button, soft keyboard tracking
- Campaign hydration on launch (loadCampaignState → Zustand)
- UI scale application (documentElement style)
- Pending commit reconciliation on relaunch
- Screen navigation (AnimatedContent between Dashboard / ProviderDetails)

### Capabilities
- App initialization
- Platform event handling (back/keyboard)
- State hydration
- Navigation

### Public API
None — this is the composition root. It consumes everything.

### Dependencies (Incoming)
None. Nothing imports from main.tsx or App.tsx.

### Dependencies (Outgoing)
- → store (useAppStore, campaignStore, slices)
- → services (turn, campaignStore, campaign-state, lore, embedding)
- → components (all screens)
- → adapters (all 10 wire functions)
- → i18n (I18nProvider)
- → Capacitor plugins (App, Keyboard)

### Allowed Connections
Should connect to: adapters (for wiring), store (for hydration),
components (for rendering), i18n (for language).

### Actual Connections
Connects to: everything listed above. Includes direct service calls
(reconcilePendingCommitOnLaunch, loadCampaignState) which bypass
the candidate port layer.

### Violations
1. App.tsx directly calls `reconcilePendingCommitOnLaunch` from
   services/turn — should go through a port or be triggered by store.
2. App.tsx directly calls `loadCampaignState`, `getLoreChunks`,
   `getNPCLedger`, `loadArchiveIndex`, `loadChapters`,
   `loadSemanticFacts`, `loadDivergenceRegister` from
   store/campaignStore — bypasses any abstraction.

### Data Owned
None. Entry layer owns no persistent data.

### Runtime Flow
```
main.tsx
  → wire 10 ports
  → createRoot
    → App.tsx
      → loadSettings()
      → initVoices()
      → Capacitor backButton listener
      → Capacitor keyboard listeners
      → apply uiScale
      → hydrate campaign state (if activeCampaignId)
      → reconcilePendingCommitOnLaunch()
      → render <Scaffold> with screen routing
```

### Lifecycle
Created at: app start (first JS execution)
Destroyed at: app kill (never explicitly — WebView death)

### Why Does This Layer Exist?
Without it: no React tree, no port wiring, no platform integration,
no state hydration. The app would be a blank screen.

### Candidate Boundary
Entry should only: wire ports, create root, render top-level
component. All hydration and platform logic should move to either
a dedicated Hydrator component or be triggered by store init.

### Notes
App.tsx is doing too much — 7 useEffect blocks covering hydration,
keyboard, back button, UI scale, pending commit reconciliation,
and navigation. This is a God Component.

---

## Layer: UI (components/)

### Purpose
Render the user interface and handle user interaction. Translates
user intent into store mutations and service calls.

### Responsibilities
- Render chat messages, input bar, context drawer, settings
- Handle user taps, swipes, long-presses
- Trigger domain operations (send message, test key, generate image)
- Display state changes (streaming, errors, toasts)
- Manage local UI state (dialogs open, search query, edit mode)

### Capabilities
- Chat rendering + interaction
- Campaign management (create, edit, delete)
- Settings UI (providers, presets, global, advanced, debug)
- NPC ledger management
- Context drawer (lore, memory, chapters, bookkeeping)
- PC creation wizard
- Search + filter
- Backup export/import
- Image viewer (fullscreen)

### Public API
React components exported from src/components/*.tsx. Consumed by
App.tsx via direct import.

### Dependencies (Incoming)
- ← entry (App.tsx imports all screens)

### Dependencies (Outgoing)
- → store (useAppStore hooks, campaignStore persistence)
- → services (runTurn, generateImage, api, chunkLoreFile, etc.)
- → types (type imports)
- → utils (llmCall, uid, haptics)
- → i18n (t() function)
- → components/hooks (useMessageEditor, useCondenser, etc.)

### Allowed Connections
Should connect to: store (read state, dispatch actions), services
(trigger domain logic), types, utils, i18n.

### Actual Connections
All above. Also dynamically imports store/campaignStore directly
(ChatArea, LoreTab, Header) for persistence — bypasses any port.

### Violations
1. ChatArea.tsx dynamically imports store/campaignStore for
   saveDivergenceRegister — should go through a repository.
2. LoreTab.tsx dynamically imports store/campaignStore for
   saveLoreChunks (2x) — should go through loreRepository.
3. Header.tsx statically imports store/campaignStore for
   saveCampaignState, saveDivergenceRegister.

### Data Owned
None. UI owns no persistent data. Local state (dialog open, search
query) is transient.

### Runtime Flow
```
User taps "Send"
  → ChatInput → ChatArea.runTurn()
  → services/turn.runTurn()
  → store updates (addMessage, setStreaming)
  → MessageBubble re-renders
  → user sees new message
```

### Lifecycle
Created at: first render by App.tsx
Destroyed at: screen navigation or app kill

### Why Does This Layer Exist?
Without it: the app has logic but no way for the user to interact
with it. All the LLM calls, embedding, NPC generation would have
no trigger and no display.

### Candidate Boundary
UI should only: render state, capture user intent, call domain
operations. It should NOT directly access persistence (campaignStore)
— that should go through ports or services.

### Notes
22 top-level components + 7 subdirectories. Largest subdirectory is
context-drawer (16 files) — it's becoming a mini-app within the app.

---

## Layer: Store (store/)

### Purpose
Centralized in-memory state management via Zustand. Holds the
single source of truth for all reactive UI data.

### Responsibilities (ACTUAL — from code analysis)
1. **State management** (expected): messages, context, settings,
   NPC ledger, lore chunks, archive, UI flags
2. **Persistence** (NOT expected): campaignStore.ts directly calls
   idb-keyval for CRUD on campaigns, lore, NPCs, pressure, archive
3. **API orchestration** (NOT expected): campaignStore calls
   apiClient for backups, campaign save; campaignSlice calls
   apiClient for pre-op backup
4. **Embedding orchestration** (NOT expected): campaignSlice triggers
   warmupEmbedder, runFullReindex, abortForCampaignSwitch
5. **Data migration** (NOT expected): campaignStore calls
   migrateV1ToV2; settingsSlice calls migrateSettings
6. **Lore processing** (NOT expected): campaignStore calls
   upgradeVectorOnlyDefault from loreIndexer
7. **NPC operations** (NOT expected): campaignStore calls
   affinityToPcRelation; npcSlice calls buildNPCEmbeddingText,
   findLedgerMatches, embedText
8. **Turn orchestration** (NOT expected): campaignSlice calls
   commitPendingTurn from services/turn
9. **Settings encryption** (NOT expected): settingsSlice calls
   encryptSettingsProviders, decryptSettingsProviders
10. **Theme resolution** (NOT expected): settingsSlice calls
    resolveTheme from themeService
11. **Token counting** (NOT expected): chatSlice calls countTokens
    from infrastructure

### Capabilities
- Reactive state (Zustand)
- Debounced persistence (saveController, debouncedSaveSettings)
- Campaign CRUD
- Lore chunk storage
- NPC ledger storage
- Settings storage + encryption
- Embedding triggers
- Turn commit trigger

### Public API
- `useAppStore` hook (Zustand)
- `campaignStore.*` functions (listCampaigns, saveCampaign, etc.)
- `defaultContext`, `defaultSettings` constants
- `debouncedSaveCampaignState`, `debouncedSaveSettings`
- `dedupeNPCLedger` utility

### Dependencies (Incoming)
- ← components (18 static + 3 dynamic)
- ← adapters (all 10 adapters import useAppStore)
- ← entry (App.tsx hydrates from campaignStore)
- ← ports/notification (4 store slices import notify)

### Dependencies (Outgoing)
- → services/apiClient (4 dynamic)
- → services/campaign-state (2 static + 1 dynamic)
- → services/embedding (2 static + 2 dynamic)
- → services/storage (3 static + 2 dynamic)
- → services/npc (2 static)
- → services/lore (1 static)
- → services/infrastructure (2 static + 1 dynamic)
- → services/turn (1 dynamic)
- → services/engine/constants (3 static)
- → services/embedding/embeddingScheduler (1 static)
- → services/infrastructure/themeService (1 static)
- → ports/notification (4 static)
- → types (many)
- → idb-keyval (direct persistence)

### Allowed Connections
Should connect to: types, ports/notification (for error reporting).
Should NOT connect to: services (domain logic should not live here).

### Actual Connections
25 dependencies on services. Store is a God Layer.

### Violations
25 violations (see violations.md for full list). Every service
import from store is a violation — store should be a pure state
manager, not an orchestrator.

### Data Owned
- messages: ChatMessage[]
- context: GameContext
- settings: AppSettings
- npcLedger: NPCEntry[]
- loreChunks: LoreChunk[]
- archiveIndex: ArchiveIndexEntry[]
- chapters: ArchiveChapter[]
- semanticFacts: SemanticFact[]
- timeline: TimelineEvent[]
- entities: EntityEntry[]
- divergenceRegister: DivergenceRegister
- npcPressure: Record<string, NPCPressure>
- onStageNpcIds: string[]
- npcSuggestions: NpcSuggestion[]
- pinnedChapterIds: string[]
- pinnedExcerpts: PinnedExcerpt[]
- condenser: CondenserState
- UI flags (drawerOpen, settingsOpen, etc.)

### Runtime Flow
```
User sends message
  → ChatArea calls runTurn()
  → turnOrchestrator calls messaging.appendUserMessage()
  → adapter calls useAppStore.getState().addMessage()
  → Zustand notifies subscribers
  → MessageBubble re-renders

AI streams response
  → turnOrchestrator calls messaging.recordAssistantReply()
  → adapter calls useAppStore.getState().addMessage()
  → streaming updates via updateLastAssistant()
  → MessageBubble re-renders per token

Turn completes
  → pendingCommit calls archive.replaceChapters()
  → adapter calls useAppStore.getState().setChapters()
  → campaignSlice triggers debouncedSaveCampaignState()
  → saveController calls campaignStore.saveCampaignState()
  → campaignStore calls idb-keyval set()
```

### Lifecycle
Created at: main.tsx (useAppStore is a module-level singleton)
Destroyed at: never (lives for app lifetime)
Slices created at: useAppStore initialization
campaignStore: module-level functions, no lifecycle

### Why Does This Layer Exist?
Without it: no reactive state, no UI updates, no persistence.
Every component would need its own data fetching and caching.

### Candidate Boundary
Store should be: pure state (get/set/subscribe). No service calls,
no persistence, no API, no embedding, no migration, no encryption.

All 11 non-state responsibilities should move to:
- services/turn (commitPendingTurn)
- services/embedding (warmup, reindex)
- services/storage (all persistence)
- services/infrastructure (encryption, theme, token counting)
- services/campaign-state (migration)
- services/npc (affinity, embedding text)
- services/lore (chunk upgrade)

### Notes
campaignStore.ts is the worst offender — it's a God Module with
7 responsibilities: persistence, API calls, migration, lore
processing, NPC affinity, image storage, and campaign CRUD.
All via direct idb-keyval access.

---

## Layer: Services (services/)

### Purpose
Domain logic: LLM calls, NPC generation, archive management,
embedding, lore processing, turn orchestration, image generation,
payload building, storage abstraction.

### Responsibilities
- Turn orchestration (runTurn, commitPendingTurn, handlePostTurn)
- NPC generation + agency (generateNPCProfile, populateAgencyFields)
- Archive management (chapter seal, divergence, facts)
- Embedding (embedder, backfill, scheduler)
- LLM communication (llmService, llmRequestQueue)
- Lore processing (chunkLoreFile, enrichLoreKeywords)
- Payload building (payloadBuilder, contextRecommender)
- Image generation (illustrateMessage, generateNPCPortrait)
- Storage abstraction (imageStorage, embeddingStorage, archiveStorage)
- Campaign state management (divergenceRegister, factDeduper)
- Engine (dice, loot, surprise, encounter, world events)
- TTS (speech synthesis)
- API client (gateway communication)
- Infrastructure (backgroundQueue, jsonExtract, settingsCrypto,
  tokenizer, utilityPrompts, themeService, saveFilePicker)
- Campaign bundle (export/import)

### Capabilities
16 service modules with 700+ exports total.

### Public API
Functions exported from src/services/*/index.ts and individual files.
Consumed by: components (22 imports), store (25 imports), adapters
(10 imports), other services (many internal imports).

### Dependencies (Incoming)
- ← components (22 static)
- ← store (25 static + dynamic)
- ← adapters (10 — adapters call store, not services directly)
- ← entry (reconcilePendingCommitOnLaunch)

### Dependencies (Outgoing)
- → ports (26 imports — candidate architecture)
- → types (many)
- → utils (many)
- → other services (many internal — e.g., turn → npc, turn → archive)

### Allowed Connections
Should connect to: types, utils, ports, other services.
Should NOT connect to: store, components.

### Actual Connections
0 direct store imports (non-test). 0 component imports (non-test).
All via candidate ports. ✅

### Violations
0 (non-test). All violations were migrated to candidate ports.

### Data Owned
None persistent. Services are stateless (with some module-level
caches like embedder worker, backfill cursor).

### Runtime Flow
```
Turn pipeline:
  runTurn() → planner → recall → expand → rerank → generate → postProcess
  Each stage calls ports (messaging, npc, archive, etc.)
  Ports → adapters → store → UI re-render
```

### Lifecycle
Created at: first call (lazy module loading)
Destroyed at: never (module-level singletons)
Some workers (embedder) have explicit init/warmup lifecycle.

### Why Does This Layer Exist?
Without it: no AI, no game logic, no embeddings, no images.
The app would be a static UI with no behavior.

### Candidate Boundary
Services should be: pure domain logic. No state management, no
persistence, no UI. They receive input, process, and output via ports.

### Notes
Largest layer (~180 files). npc/ is the biggest subdirectory (32 files,
233 exports). turn/ has 24 files including 13 stage files.

---

## Layer: Candidate Ports (ports/)

### Purpose
Contract interfaces between services and store/components.
Hypothesis — not yet validated by Discovery.

### Responsibilities
- Define contracts for 10 domain areas
- Provide registration mechanism (registerX)
- Provide access objects (notify, messaging, npc, etc.)

### Capabilities
10 ports: notification, messaging, npc, archive, campaignContext,
campaignRepository, settings, loreRepository, chapterRepository,
uiState.

### Public API
Each port exports: interface, register function, access object.

### Dependencies (Incoming)
- ← services (26 imports)
- ← store (4 imports — notification only)
- ← adapters (10 imports)

### Dependencies (Outgoing)
- → types (type imports only)

### Allowed Connections
Should be imported by: services, adapters.
Should NOT be imported by: store, components.

### Actual Connections
Imported by: services (26), store (4 — notification), adapters (10).

### Violations
4 store → ports/notification imports. Store should not know about
ports — but notification is a side-effect, arguably acceptable.

### Data Owned
None. Ports are pure interfaces.

### Runtime Flow
```
Service calls notify.error("msg")
  → ports/notification forwards to registered sink
  → adapters/uiToastAdapter calls toast.error("msg")
  → components/Toast renders snackbar
```

### Lifecycle
Created at: module load (access objects are singletons)
Registered at: main.tsx wireX() calls
Destroyed at: never

### Why Does This Layer Exist?
Without it: services would import store directly (the old
architecture). Ports decouple services from state implementation.

### Candidate Boundary
If validated by Discovery, ports stay. If Discovery finds different
boundaries, ports are restructured or removed.

### Notes
STATUS: HYPOTHESIS. Not validated. Per DISCOVERY_PROTOCOL.md,
these are candidates, not architecture.

---

## Layer: Candidate Adapters (adapters/)

### Purpose
Bridge between candidate ports and store. The only layer allowed
to import both ports AND store.

### Responsibilities
- Implement port interfaces by delegating to useAppStore
- Register implementations at boot (wireX functions)

### Capabilities
10 adapters, each implementing one port interface.

### Public API
Each adapter exports: adapter object + wireX() function.

### Dependencies (Incoming)
- ← entry (main.tsx calls wireX)

### Dependencies (Outgoing)
- → ports (10 imports — to register)
- → store (all adapters import useAppStore or campaignStore)
- → services/campaign-state (archiveAdapter imports toggleChapter,
  toggleCategory)
- → components/Toast (uiToastAdapter imports toast)

### Allowed Connections
Should connect to: ports (register), store (implement).
Should NOT connect to: services, components.

### Actual Connections
Connects to: ports, store, 1 service (campaign-state), 1 component
(Toast).

### Violations
1. archiveAdapter imports from services/campaign-state — adapter
   should only bridge to store, not call domain logic.
2. uiToastAdapter imports from components/Toast — adapter should
   not know about UI components.

### Data Owned
None. Adapters are stateless bridges.

### Runtime Flow
```
Service calls messaging.attachImage(id, img)
  → ports/messaging forwards to registered impl
  → adapters/messagingAdapter calls useAppStore.getState().setMessageImage(id, img)
  → Zustand updates state
  → UI re-renders
```

### Lifecycle
Created at: module load
Registered at: main.tsx wireX() calls
Destroyed at: never

### Why Does This Layer Exist?
Without it: ports have no implementation. Services would crash
with "not wired" errors.

### Candidate Boundary
Adapters should be: thin delegates. No logic, no transformation,
no domain calls. Just `port.method = () => store.method()`.

### Notes
STATUS: HYPOTHESIS. Not validated.

---

## Layer: Persistence (idb-keyval + storage/)

### Purpose
Persist data to IndexedDB via idb-keyval.

### Responsibilities
- Campaign CRUD (campaignStore.ts)
- Settings storage (settingsSlice.ts)
- Image storage (services/storage/imageStorage.ts)
- Embedding storage (services/storage/embeddingStorage.ts)
- Archive storage (services/storage/archiveStorage.ts)
- Backup storage (services/storage/backupStorage.ts)
- Campaign bundle (services/campaignBundle.ts)

### Capabilities
get, set, del, keys, getMany, delMany via idb-keyval.

### Public API
- campaignStore.* (campaign CRUD, lore, NPC, pressure, state)
- imageStorage.* (store, get, delete, deleteAll)
- embeddingStorage.* (store, get, delete, getMany, delMany)
- archiveStorage.* (index, timeline, scenes)
- backupStorage.* (create, restore, list)
- settingsSlice: debouncedSaveSettings (idb set)

### Dependencies (Incoming)
- ← store (campaignStore, settingsSlice, npcSlice, chatSlice)
- ← services (apiClient, campaignBundle, storage/index)
- ← adapters (loreRepositoryAdapter, chapterRepositoryAdapter,
  campaignRepositoryAdapter — via campaignStore)

### Dependencies (Outgoing)
- → idb-keyval (external)
- → services/embedding (storage/index.ts calls embedText)
- → services/lore (campaignStore calls upgradeVectorOnlyDefault)
- → services/npc (campaignStore calls affinityToPcRelation)
- → types (type imports)

### Allowed Connections
Should be: a pure data layer. Get/set/delete. No domain logic.

### Actual Connections
campaignStore contains: migration, API calls, lore processing,
NPC affinity — 4 domain concerns inside the persistence layer.

### Violations
1. campaignStore.ts calls affinityToPcRelation (NPC domain logic
   inside persistence)
2. campaignStore.ts calls upgradeVectorOnlyDefault (lore domain
   logic inside persistence)
3. campaignStore.ts calls apiClient (API orchestration inside
   persistence)
4. campaignStore.ts calls migrateV1ToV2 (migration inside
   persistence)
5. settingsSlice.ts calls encryptSettingsProviders (encryption
   inside persistence — arguably acceptable as a storage concern)

### Data Owned
All persistent data:
- campaigns (list, state, lore, NPCs, pressure, archive, timeline,
  entities, divergence, combat, items, skills)
- settings (encrypted)
- images (base64 data URLs)
- embeddings (Float32Array vectors)
- backups

### Runtime Flow
```
saveCampaignState(id, state)
  → stripEphemeralFields(state)
  → idb-keyval.set(`state_${id}`, state)

loadCampaignState(id)
  → idb-keyval.get(`state_${id}`)
  → migrateV1ToV2(state)  ← domain logic in persistence!
  → return state
```

### Lifecycle
Created at: first idb-keyval call (lazy)
Destroyed at: never (IndexedDB persists across app launches)

### Why Does This Layer Exist?
Without it: all data is lost on app close. No campaign history,
no settings, no images.

### Candidate Boundary
Persistence should be: pure key-value CRUD. No migration, no API,
no domain logic. Just get/set/delete with key names.

### Notes
idb-keyval is accessed from 7 different files across 3 layers
(store, services, adapters). There is no single persistence
gateway — it's scattered.

---

## Layer: Infrastructure (services/infrastructure/)

### Purpose
Cross-cutting concerns: JSON extraction, settings crypto, theme
service, token counting, background queue, utility prompts, file
picker.

### Responsibilities
- JSON extraction from LLM responses (jsonExtract.ts)
- Settings encryption/decryption (settingsCrypto.ts)
- Theme resolution (themeService.ts)
- Token counting (tokenizer.ts)
- Background queue management (backgroundQueue.ts)
- LLM utility prompts (utilityPrompts.ts)
- File picker (saveFilePicker.ts)
- Re-export hub (index.ts)

### Capabilities
8 modules, 42 exports.

### Public API
- extractJson, ANCHOR_BEFORE_INPUT, JSON_ONLY_FOOTER, etc.
- encryptSettingsProviders, decryptSettingsProviders
- resolveTheme
- countTokens
- backgroundQueue
- joinPromptSections

### Dependencies (Incoming)
- ← store (settingsSlice, chatSlice, campaignSlice)
- ← services (apiClient, turn, npc, llm, payload, lore, image)
- ← components (DivergenceEntryModal, PCCreationWizard)

### Dependencies (Outgoing)
- → types
- → utils (none — infrastructure is a leaf)

### Allowed Connections
Should be: imported by anyone who needs cross-cutting utilities.

### Actual Connections
Imported by: store (4 imports), services (many), components (3).

### Violations
None. Infrastructure is a utility layer — it's expected to be
imported from everywhere.

### Data Owned
None. Infrastructure is stateless (except backgroundQueue which
has a module-level queue).

### Runtime Flow
```
LLM returns text → extractJson(text) → parsed JSON
Settings save → encryptSettingsProviders(providers) → encrypted blob
Token budget → countTokens(messages) → number
```

### Lifecycle
Created at: module load
Destroyed at: never

### Why Does This Layer Exist?
Without it: every service would reimplement JSON parsing, token
counting, encryption, etc.

### Candidate Boundary
Infrastructure should be: pure utilities. No state, no side effects
(except backgroundQueue). No domain knowledge.

### Notes
This is a well-formed utility layer. No violations. The only concern
is that store imports from it directly — but infrastructure has no
domain knowledge, so this is acceptable.

---

## Layer: Types (types/)

### Purpose
TypeScript type definitions shared across all layers.

### Responsibilities
- Define all domain types (ChatMessage, NPCEntry, GameContext, etc.)
- Define all config types (AppSettings, AIPreset, etc.)
- Define all persistence types (Campaign, ArchiveChapter, etc.)
- Re-export from domain-specific files (loot.ts, npc.ts, archive.ts,
  store.ts)

### Capabilities
6 files, 82 type exports.

### Public API
All type exports from types/index.ts (re-export hub).

### Dependencies (Incoming)
- ← all layers (everyone imports types)

### Dependencies (Outgoing)
- → types/npc.ts imports SceneEventType from index.ts (circular type
  dependency, but type-only — safe)
- → types/archive.ts imports SceneEvent, WitnessSource from index.ts

### Allowed Connections
Should be imported by: everyone. Types are universal.

### Actual Connections
Imported by: all layers. ✅

### Violations
None. Type-only imports are always safe.

### Data Owned
None. Types are compile-time only.

### Runtime Flow
None. Types are erased at compile time.

### Lifecycle
Created at: compile time
Destroyed at: compile time (erased)

### Why Does This Layer Exist?
Without it: no type safety, no autocomplete, no compile-time
error checking.

### Candidate Boundary
Types should be: pure type definitions. No runtime code, no
constants (except type-related like TIMELINE_PREDICATES).

### Notes
Well-structured after Phase 4 split. 6 files, each with a clear
domain boundary. The re-export hub (index.ts) keeps backward compat.

---

## Layer: Utils (utils/)

### Purpose
Pure utility functions with no domain knowledge.

### Responsibilities
- Unique ID generation (uid.ts)
- LLM call wrapper (llmCall.ts)
- Haptic feedback (haptics.ts)
- LLM API helpers (llmApiHelper.ts)
- Other utilities

### Capabilities
7 files, ~20 exports.

### Public API
- uid(), llmCall(), hapticLight/Medium/Heavy(), etc.

### Dependencies (Incoming)
- ← services (many)
- ← components (some)
- ← store (none)

### Dependencies (Outgoing)
- → types (some type imports)
- → services/llm (llmCall depends on llmService — potential
  circular dependency)

### Allowed Connections
Should be imported by: anyone who needs pure utilities.

### Actual Connections
Imported by: services, components. ✅

### Violations
None. Utils are leaf-level.

### Data Owned
None. Utils are stateless.

### Runtime Flow
```
uid() → returns random string
llmCall(provider, prompt) → calls LLM API → returns text
hapticLight() → triggers Capacitor haptics
```

### Lifecycle
Created at: module load
Destroyed at: never

### Why Does This Layer Exist?
Without it: every module would reimplement UID generation, LLM
calls, haptics.

### Candidate Boundary
Utils should be: pure functions, no state, no side effects
(except haptics which is a platform call).

### Notes
llmCall.ts in utils/ imports from services/llm/ — this is a
circular dependency (utils → services → utils). Should be
resolved by moving llmCall to services/llm/.

---

## Layer: i18n (i18n/)

### Purpose
Internationalization: language detection, translation function.

### Responsibilities
- Detect user language (localStorage + browser locale)
- Provide t() translation function
- Provide tForContext() for non-React contexts
- Language provider (React context)

### Capabilities
2 languages (English, Persian), RTL support.

### Public API
- t(en, fa) — translation function
- tForContext(context, en, fa) — non-React variant
- useLanguage() — React hook
- I18nProvider — React context provider
- LANGUAGES — available languages

### Dependencies (Incoming)
- ← main.tsx (I18nProvider)
- ← components (t() calls)
- ← services (tForContext calls)
- ← store (tForContext calls)

### Dependencies (Outgoing)
- → none (leaf layer)

### Allowed Connections
Should be imported by: everyone who needs translations.

### Actual Connections
Imported by: all layers. ✅

### Violations
None. i18n is a leaf layer.

### Data Owned
- Language preference (localStorage: 'narrative_lang')
- Translation dictionaries (en.ts, fa.ts)

### Runtime Flow
```
Component renders Text(t("Hello", "سلام"))
  → I18nContext provides current language
  → t() returns "Hello" or "سلام" based on language
  → Text renders the string
```

### Lifecycle
Created at: main.tsx (I18nProvider wraps App)
Destroyed at: app kill

### Why Does This Layer Exist?
Without it: no bilingual support, no RTL layout.

### Candidate Boundary
i18n should be: pure translation. No state management, no
side effects (except localStorage for language preference).

### Notes
Well-formed. No violations. The only concern is that tForContext
is used in services and store — but it's a pure function, so
acceptable.

---

## Architecture Map (Summary)

```
Entry
  ├── Wires 10 candidate ports
  ├── Hydrates store from persistence
  ├── Handles platform events (back, keyboard)
  └── Renders UI

UI (Components)
  ├── Reads state from store (18 imports)
  ├── Triggers domain logic (22 imports to services)
  ├── Manages local UI state (dialogs, search)
  └── Persists directly to campaignStore (3 violations)

Store
  ├── Manages reactive state (expected)
  ├── Persists to idb-keyval (NOT expected — 7 files)
  ├── Calls API (NOT expected — 4 dynamic imports)
  ├── Triggers embedding (NOT expected)
  ├── Calls domain logic (NOT expected — 25 total violations)
  └── Is a God Layer

Services
  ├── 16 domain modules (~180 files)
  ├── 0 direct store imports ✅
  ├── 26 candidate port imports
  ├── Contains: LLM, NPC, archive, embedding, lore, turn, image,
  │   payload, engine, TTS, storage, infrastructure
  └── God Files: npcGeneration.ts (1306), turnPostProcess.ts (1237)

Candidate Ports (10)
  ├── Hypothesis — not validated
  ├── Imported by services (26) and store (4 — notification)
  └── Pure interfaces

Candidate Adapters (10)
  ├── Hypothesis — not validated
  ├── Bridge ports → store
  ├── 2 violations (archiveAdapter → services, uiToastAdapter → components)
  └── Should be thin delegates

Persistence
  ├── Scattered across 7 files in 3 layers
  ├── campaignStore is a God Module (7 responsibilities)
  └── No single gateway

Infrastructure
  ├── 8 utility modules
  ├── No violations ✅
  └── Well-formed

Types
  ├── 6 files, 82 exports
  ├── No violations ✅
  └── Well-formed after Phase 4 split

Utils
  ├── 7 pure utility files
  ├── 1 potential circular dep (llmCall → services/llm → utils)
  └── Mostly well-formed

i18n
  ├── 3 files, 2 languages
  ├── No violations ✅
  └── Well-formed
```
