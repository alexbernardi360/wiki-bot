import * as axiosPkg from 'axios/package.json';
import * as pkg from '../../../package.json';

/**
 * Generates a standard User-Agent string for the application.
 * Identifies the bot and its version, along with a contact email for Wikimedia compliance.
 *
 * @returns {string} The formatted User-Agent string.
 */
export function getUserAgent(): string {
  const contactEmail = process.env.WIKI_CONTACT_EMAIL || 'no-email-set';
  return `${pkg.name}/${pkg.version} (${contactEmail}) ${axiosPkg.name}/${axiosPkg.version}`;
}
