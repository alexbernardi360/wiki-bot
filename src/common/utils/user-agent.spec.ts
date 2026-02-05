import { getUserAgent } from './user-agent';
import * as pkg from '../../../package.json';
import * as axiosPkg from 'axios/package.json';

describe('getUserAgent', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return a valid User-Agent string with environment email', () => {
    process.env.WIKI_CONTACT_EMAIL = 'test@example.com';
    const ua = getUserAgent();

    expect(ua).toContain(pkg.name);
    expect(ua).toContain(pkg.version);
    expect(ua).toContain('test@example.com');
    expect(ua).toContain(axiosPkg.name);
    expect(ua).toContain(axiosPkg.version);
  });

  it('should fallback to "no-email-set" if WIKI_CONTACT_EMAIL is missing', () => {
    delete process.env.WIKI_CONTACT_EMAIL;
    const ua = getUserAgent();

    expect(ua).toContain('no-email-set');
  });

  it('should follow the format: name/version (email) axios/version', () => {
    process.env.WIKI_CONTACT_EMAIL = 'dev@wiki.bot';
    const ua = getUserAgent();

    const expectedRegex = new RegExp(
      `${pkg.name}/${pkg.version} \\(dev@wiki\\.bot\\) ${axiosPkg.name}/${axiosPkg.version}`,
    );
    expect(ua).toMatch(expectedRegex);
  });
});
