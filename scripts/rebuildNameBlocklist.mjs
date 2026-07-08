// Rebuild the name blocklist JSON from the hardcoded set in npcDetector.ts,
// so the file isn't empty. This isn't a perfect restoration of the original
// (which had additional entries for titles, ranks, kinship terms, etc.
// generated from Upgrade/FablePlans/assets/clean/), but it covers the
// most common false-positive sources that the hardcoded set already
// defends against.
//
// Run: node scripts/rebuildNameBlocklist.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data', 'nameBlocklist.json');

// Mirrors the NPC_NAME_BLOCKLIST in src/services/npc/npcDetector.ts (lines 18-52).
// If the source set changes, re-run this script.
const WORDS = [
    // articles / connectives / prepositions
    "you", "i", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "about", "like", "through", "over", "before", "between", "after", "since", "without", "under", "within", "along", "following", "across", "behind", "beyond", "plus", "except", "up", "out", "around", "down", "off", "above", "near",
    // pronouns
    "she", "he", "it", "they", "them", "we", "us", "his", "her", "their", "our", "your", "my", "mine",
    // sentence starters / discourse markers
    "then", "suddenly", "meanwhile", "however", "although", "therefore", "otherwise", "inside", "outside", "perhaps", "maybe", "indeed", "certainly", "instead", "still", "also", "only", "just", "even", "yet", "soon", "later", "now", "today", "tomorrow", "yesterday", "finally", "eventually", "overall", "moreover", "furthermore", "nevertheless", "nonetheless", "regardless", "anyway", "anyhow", "besides", "actually", "really", "very", "quite", "rather", "somewhat", "always", "never", "often", "sometimes", "rarely", "seldom", "usually", "occasionally",
    // weekdays / months
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
    // common sentence-initial nouns/adjectives
    "every", "each", "all", "some", "any", "no", "none", "many", "few", "several", "most", "more", "less", "much", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "first", "second", "third", "last", "next", "previous", "another", "other", "same", "different",
    "what", "when", "where", "why", "who", "how", "which", "whose", "that", "this", "these", "those", "here", "there",
    "wait", "well", "okay", "ok", "yes", "yep", "no", "nope", "sure", "fine", "good", "great", "nice", "bad", "right", "wrong", "true", "false",
    "not", "but",
    // dice / mechanics terms
    "catastrophe", "failure", "success", "triumph", "fumble", "critical", "crit", "advantage", "disadvantage", "normal", "natural", "encounter", "surprise", "world", "event", "skill", "check", "save", "saving", "throw", "roll", "rolls", "dice", "die", "result", "outcome", "modifier", "bonus", "penalty",
    // narrative meta words
    "equipment", "inventory", "scene", "chapter", "act", "session", "turn", "round", "phase", "time", "day", "night", "morning", "afternoon", "evening", "dawn", "dusk", "midnight", "noon",
    "academy", "adventure", "story", "tale", "narrative", "system",
    // structures & locations (common nouns capitalized in titles)
    "gate", "wall", "hall", "tower", "bridge", "mouth", "square", "market",
    "outpost", "garrison", "district", "quarter", "road", "path", "bay",
    "canal", "harbor", "harbour", "port", "keep", "fortress", "castle",
    "temple", "shrine", "chapel", "tavern", "inn", "manor", "estate",
    "forest", "mountain", "valley", "river", "lake", "sea", "ocean",
    "north", "south", "east", "west", "northern", "southern", "eastern", "western",
    "upper", "lower", "old", "new", "great", "grand",
    // organizations & institutions (common nouns capitalized in titles)
    "office", "business", "bureau", "department", "agency", "company",
    "corporation", "ministry", "council", "committee", "guild", "union",
    "league", "alliance", "federation", "syndicate", "consortium",
    "headquarters", "bank", "shop", "store", "school", "college",
    "university", "hospital", "library", "prison", "barracks",
    // titles & ranks (common sources of false-positive NPC detection)
    "mr", "mrs", "ms", "miss", "dr", "prof", "professor", "sir", "madam",
    "lord", "lady", "king", "queen", "prince", "princess", "duke", "duchess",
    "count", "countess", "baron", "baroness", "earl", "knight", "squire",
    "captain", "lieutenant", "sergeant", "general", "colonel", "major",
    "admiral", "commander", "officer", "soldier", "guard", "watchman",
    "father", "mother", "brother", "sister", "uncle", "aunt", "cousin",
    "son", "daughter", "child", "elder", "youngster", "boy", "girl",
    "master", "mistress", "teacher", "student", "apprentice", "novice",
];

writeFileSync(OUT, JSON.stringify(WORDS, null, 2) + '\n', 'utf8');
console.log(`Wrote ${WORDS.length} blocklist entries → ${OUT}`);
