// Build a seed nameBank.json with a small curated set of common given names
// across several cultures. This is NOT the full original bank (which had
// thousands of names from reviewed asset files under Upgrade/FablePlans/),
// but it's enough for the NPC name detection / culture classification /
// gender hint features to actually function instead of being silently
// no-ops on an empty bank.
//
// Run: node scripts/buildSeedNameBank.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data', 'nameBank.json');

// Format: { n: name, c: culture, g: gender } where g ∈ {m, f, u}.
// Cultures kept short (lowercase) to match the original bank's convention.
const ENTRIES = [
    // English / Anglo
    { n: "John", c: "english", g: "m" },
    { n: "William", c: "english", g: "m" },
    { n: "James", c: "english", g: "m" },
    { n: "Robert", c: "english", g: "m" },
    { n: "Thomas", c: "english", g: "m" },
    { n: "Charles", c: "english", g: "m" },
    { n: "Henry", c: "english", g: "m" },
    { n: "Edward", c: "english", g: "m" },
    { n: "Mary", c: "english", g: "f" },
    { n: "Elizabeth", c: "english", g: "f" },
    { n: "Margaret", c: "english", g: "f" },
    { n: "Catherine", c: "english", g: "f" },
    { n: "Anne", c: "english", g: "f" },
    { n: "Jane", c: "english", g: "f" },
    { n: "Alice", c: "english", g: "f" },

    // Nordic / Scandinavian
    { n: "Erik", c: "nordic", g: "m" },
    { n: "Magnus", c: "nordic", g: "m" },
    { n: "Bjorn", c: "nordic", g: "m" },
    { n: "Olaf", c: "nordic", g: "m" },
    { n: "Sven", c: "nordic", g: "m" },
    { n: "Ragnar", c: "nordic", g: "m" },
    { n: "Astrid", c: "nordic", g: "f" },
    { n: "Freya", c: "nordic", g: "f" },
    { n: "Ingrid", c: "nordic", g: "f" },
    { n: "Hilda", c: "nordic", g: "f" },
    { n: "Sigrid", c: "nordic", g: "f" },

    // Japanese
    { n: "Hiroshi", c: "japan", g: "m" },
    { n: "Takeshi", c: "japan", g: "m" },
    { n: "Kenji", c: "japan", g: "m" },
    { n: "Akira", c: "japan", g: "m" },
    { n: "Daisuke", c: "japan", g: "m" },
    { n: "Yuki", c: "japan", g: "u" },
    { n: "Sakura", c: "japan", g: "f" },
    { n: "Aiko", c: "japan", g: "f" },
    { n: "Haruka", c: "japan", g: "u" },
    { n: "Naoko", c: "japan", g: "f" },

    // Arabic / Persian
    { n: "Ahmed", c: "arabic", g: "m" },
    { n: "Omar", c: "arabic", g: "m" },
    { n: "Khalid", c: "arabic", g: "m" },
    { n: "Hassan", c: "arabic", g: "m" },
    { n: "Yusuf", c: "arabic", g: "m" },
    { n: "Ali", c: "arabic", g: "m" },
    { n: "Fatima", c: "arabic", g: "f" },
    { n: "Aisha", c: "arabic", g: "f" },
    { n: "Layla", c: "arabic", g: "f" },
    { n: "Zainab", c: "arabic", g: "f" },
    { n: "Maryam", c: "arabic", g: "f" },

    // Persian
    { n: "Cyrus", c: "persian", g: "m" },
    { n: "Darius", c: "persian", g: "m" },
    { n: "Kamran", c: "persian", g: "m" },
    { n: "Bahram", c: "persian", g: "m" },
    { n: "Farhad", c: "persian", g: "m" },
    { n: "Sohrab", c: "persian", g: "m" },
    { n: "Rostam", c: "persian", g: "m" },
    { n: "Shirin", c: "persian", g: "f" },
    { n: "Parvaneh", c: "persian", g: "f" },
    { n: "Roxana", c: "persian", g: "f" },
    { n: "Mitra", c: "persian", g: "f" },
    { n: "Yasaman", c: "persian", g: "f" },

    // Celtic / Gaelic
    { n: "Liam", c: "celtic", g: "m" },
    { n: "Sean", c: "celtic", g: "m" },
    { n: "Connor", c: "celtic", g: "m" },
    { n: "Declan", c: "celtic", g: "m" },
    { n: "Finn", c: "celtic", g: "m" },
    { n: "Maeve", c: "celtic", g: "f" },
    { n: "Bridget", c: "celtic", g: "f" },
    { n: "Aoife", c: "celtic", g: "f" },
    { n: "Niamh", c: "celtic", g: "f" },

    // Slavic
    { n: "Ivan", c: "slavic", g: "m" },
    { n: "Dmitri", c: "slavic", g: "m" },
    { n: "Sergei", c: "slavic", g: "m" },
    { n: "Vladimir", c: "slavic", g: "m" },
    { n: "Boris", c: "slavic", g: "m" },
    { n: "Anya", c: "slavic", g: "f" },
    { n: "Natasha", c: "slavic", g: "f" },
    { n: "Olga", c: "slavic", g: "f" },
    { n: "Svetlana", c: "slavic", g: "f" },

    // Latin / Roman
    { n: "Marcus", c: "roman", g: "m" },
    { n: "Lucius", c: "roman", g: "m" },
    { n: "Gaius", c: "roman", g: "m" },
    { n: "Quintus", c: "roman", g: "m" },
    { n: "Julia", c: "roman", g: "f" },
    { n: "Livia", c: "roman", g: "f" },
    { n: "Aurelia", c: "roman", g: "f" },
    { n: "Octavia", c: "roman", g: "f" },

    // German
    { n: "Hans", c: "german", g: "m" },
    { n: "Klaus", c: "german", g: "m" },
    { n: "Werner", c: "german", g: "m" },
    { n: "Heinrich", c: "german", g: "m" },
    { n: "Helga", c: "german", g: "f" },
    { n: "Greta", c: "german", g: "f" },
    { n: "Brunhild", c: "german", g: "f" },

    // French
    { n: "Pierre", c: "french", g: "m" },
    { n: "Jean", c: "french", g: "m" },
    { n: "Luc", c: "french", g: "m" },
    { n: "Antoine", c: "french", g: "m" },
    { n: "Marie", c: "french", g: "f" },
    { n: "Sophie", c: "french", g: "f" },
    { n: "Claire", c: "french", g: "f" },
    { n: "Celeste", c: "french", g: "f" },

    // Spanish
    { n: "Diego", c: "spanish", g: "m" },
    { n: "Carlos", c: "spanish", g: "m" },
    { n: "Mateo", c: "spanish", g: "m" },
    { n: "Javier", c: "spanish", g: "m" },
    { n: "Elena", c: "spanish", g: "f" },
    { n: "Carmen", c: "spanish", g: "f" },
    { n: "Lucia", c: "spanish", g: "f" },
    { n: "Isabella", c: "spanish", g: "f" },

    // Fantasy (TTRPG staple)
    { n: "Elaria", c: "fantasy", g: "f" },
    { n: "Galadriel", c: "fantasy", g: "f" },
    { n: "Lirael", c: "fantasy", g: "f" },
    { n: "Sylas", c: "fantasy", g: "m" },
    { n: "Aric", c: "fantasy", g: "m" },
    { n: "Theron", c: "fantasy", g: "m" },
    { n: "Kael", c: "fantasy", g: "m" },
    { n: "Draven", c: "fantasy", g: "m" },
];

writeFileSync(OUT, JSON.stringify(ENTRIES, null, 2) + '\n', 'utf8');
console.log(`Wrote ${ENTRIES.length} name entries → ${OUT}`);
