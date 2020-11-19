import { abstractSuggest } from "./abstract";
import { sanitizeString } from "../text";
import { CityDatabase, StoredCity } from "../cities";

/** main search function in index */
function findMatchesInIndex(db: CityDatabase, query: string): StoredCity[] {
  if (query === "") return [];

  const sanitizedQuery = sanitizeString(query);
  // try to find by direct match
  const hasDirectMatchId = db.index.matches[sanitizedQuery];
  if (hasDirectMatchId) return [db.objects[hasDirectMatchId]];

  const partialMatches = db.index.partials[sanitizedQuery];
  return partialMatches.map((id) => db.objects[id]);
}

export const suggestFromIndex = abstractSuggest(findMatchesInIndex);
