# 0.17 Architecture Knowledge Base

**Source:** Sagesheep/NarrativeEngine-M (ORIGINAL upstream main)

## Architecture Snapshot

### Layers (10) — NO candidate ports/adapters
| Layer | Files |
|-------|-------|
| domain (services/) | 137 |
| ui (components/) | 65 |
| state (store/) | 12 |
| persistence (services/storage/) | 10 |
| infrastructure | 8 |
| utils | 8 |
| ui-hooks | 3 |
| types | 2 |
| entry | 2 |
| other | 2 |

### Key Metrics (ORIGINAL codebase)
| Metric | Value |
|--------|-------|
| Files | 249 |
| Lines | 44,278 |
| Exports | 1,029 |
| Import edges | 1,196 |
| Coupling ratio | 17.25% |
| State fields | 425 (8 slices) |
| Dynamic imports | 73 |
| Callback patterns | 624 |
| Store operations | 174 |
| idb-keyval access points | 11 (no gateway) |
| God Files (>500 lines) | 13 |

### Violations (REAL — no candidate ports to hide behind)
| Direction | Count |
|-----------|-------|
| state → domain | 28 |
| domain → state | 16 |
| domain → ui | 6 |
| state → ui | 3 |
| **Total** | **53** |

This is the TRUE architecture. Every violation is real.
