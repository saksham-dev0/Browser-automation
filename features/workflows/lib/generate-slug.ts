import { adjectives, animals, uniqueNamesGenerator } from "unique-names-generator";

/**
 * Generates a random hyphenated slug from an adjective and an animal.
 *
 * @example
 * generateSlug(); // "brave-otter"
 */
export function generateSlug(): string {
    return uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: "-",
        length: 2,
        style: "lowerCase",
    });
}
