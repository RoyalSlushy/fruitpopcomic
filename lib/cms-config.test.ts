import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { problemsIn, writeProblemsIn, readProblemsIn, MIN_PASSWORD, MIN_SECRET } from './cms-config.ts';

const PASSWORD = 'p'.repeat(MIN_PASSWORD);
const SECRET = 'a'.repeat(MIN_SECRET);

describe('problemsIn', () => {
  test('a good configuration reports nothing', () => {
    assert.deepEqual(
      problemsIn({ CMS_ADMIN_PASSWORD: PASSWORD, CMS_SESSION_SECRET: SECRET }),
      [],
    );
  });

  test('nothing set names both variables', () => {
    const p = problemsIn({});
    assert.equal(p.length, 2);
    assert.ok(p.some((s) => s.startsWith('CMS_ADMIN_PASSWORD') && s.endsWith('not set')));
    assert.ok(p.some((s) => s.startsWith('CMS_SESSION_SECRET') && s.endsWith('not set')));
  });

  /* The state a bare "not configured" could never distinguish: both variables
     are present, so the dashboard looks right, but the secret is too weak to
     sign a session with. */
  test('a too-short secret reads as short, not missing', () => {
    assert.deepEqual(
      problemsIn({ CMS_ADMIN_PASSWORD: PASSWORD, CMS_SESSION_SECRET: 'tooshort' }),
      [`CMS_SESSION_SECRET is shorter than ${MIN_SECRET} characters`],
    );
  });

  test('a too-short password reads as short, not missing', () => {
    assert.deepEqual(
      problemsIn({ CMS_ADMIN_PASSWORD: 'abc', CMS_SESSION_SECRET: SECRET }),
      [`CMS_ADMIN_PASSWORD is shorter than ${MIN_PASSWORD} characters`],
    );
  });

  test('an empty string reads as unset, not as too short', () => {
    const p = problemsIn({ CMS_ADMIN_PASSWORD: '', CMS_SESSION_SECRET: '' });
    assert.equal(p.length, 2);
    assert.ok(p.every((s) => s.endsWith('not set')));
  });

  test('one character short is still refused', () => {
    assert.equal(
      problemsIn({ CMS_ADMIN_PASSWORD: PASSWORD, CMS_SESSION_SECRET: 'a'.repeat(MIN_SECRET - 1) }).length,
      1,
    );
  });

  test('exactly the minimum is accepted', () => {
    assert.deepEqual(
      problemsIn({ CMS_ADMIN_PASSWORD: 'a'.repeat(MIN_PASSWORD), CMS_SESSION_SECRET: 'a'.repeat(MIN_SECRET) }),
      [],
    );
  });

  test('it never repeats the values it is complaining about', () => {
    const joined = problemsIn({
      CMS_ADMIN_PASSWORD: 'sup3rsecret',
      CMS_SESSION_SECRET: 'z'.repeat(MIN_SECRET - 1),
    }).join(' ');
    assert.ok(!joined.includes('sup3rsecret'));
    assert.ok(!joined.includes('zzz'));
  });
});

describe('writeProblemsIn', () => {
  const KEY = 'service-role-key';

  test('a good configuration reports nothing', () => {
    assert.deepEqual(
      writeProblemsIn({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: KEY }),
      [],
    );
  });

  test('nothing set names both variables', () => {
    const p = writeProblemsIn({});
    assert.equal(p.length, 2);
    assert.ok(p.some((s) => s.startsWith('SUPABASE_URL')));
    assert.ok(p.some((s) => s.startsWith('SUPABASE_SERVICE_ROLE_KEY')));
  });

  /* The state that produced a bare "Save failed": the site reads and renders
     perfectly off the public variables, and only the write credential is
     missing. Nothing goes wrong until someone presses Save. */
  test('read variables alone still cannot write', () => {
    assert.deepEqual(
      writeProblemsIn({
        SUPABASE_URL: 'https://x.supabase.co',
        NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        SUPABASE_ANON_KEY: 'anon',
      }),
      ['SUPABASE_SERVICE_ROLE_KEY is not set'],
    );
  });

  /* Mirrors lib/supabase.ts, where the public URL is the documented fallback —
     if this drifted, a working deployment would be reported as broken. */
  test('the public URL satisfies the URL requirement', () => {
    assert.deepEqual(
      writeProblemsIn({
        NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: KEY,
      }),
      [],
    );
  });

  test('an empty string reads as unset', () => {
    const p = writeProblemsIn({ SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' });
    assert.equal(p.length, 2);
    assert.ok(p.every((s) => s.endsWith('not set')));
  });

  /* The service-role key bypasses RLS entirely, so this matters more here than
     it does for the password. */
  test('it never repeats the values it is complaining about', () => {
    const joined = writeProblemsIn({ SUPABASE_SERVICE_ROLE_KEY: '' , SUPABASE_URL: '' }).join(' ');
    assert.ok(!joined.includes('supabase.co'));
    const withKey = writeProblemsIn({ SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc123' }).join(' ');
    assert.ok(!withKey.includes('sb_secret_abc123'));
  });
});

describe('readProblemsIn', () => {
  test('a good configuration reports nothing', () => {
    assert.deepEqual(
      readProblemsIn({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' }),
      [],
    );
  });

  /* The silent one: writing is fully configured, reading is not, so a save
     succeeds and the site still renders content/*.ts. */
  test('write credentials alone do not make an edit visible', () => {
    assert.deepEqual(
      readProblemsIn({
        SUPABASE_URL: 'https://x.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }),
      ['SUPABASE_ANON_KEY is not set'],
    );
  });

  /* The state the deployment was actually in: a service-role key and no URL,
     which stops reads and writes alike. */
  test('a missing URL breaks reading as well as writing', () => {
    const env = { SUPABASE_SERVICE_ROLE_KEY: 'service-role-key' };
    assert.ok(readProblemsIn(env).some((s) => s.startsWith('SUPABASE_URL')));
    assert.ok(writeProblemsIn(env).some((s) => s.startsWith('SUPABASE_URL')));
    assert.deepEqual(writeProblemsIn(env), ['SUPABASE_URL is not set']);
  });

  test('the public URL satisfies the URL requirement', () => {
    assert.deepEqual(
      readProblemsIn({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'a' }),
      [],
    );
  });

  test('it never repeats the values it is complaining about', () => {
    const joined = readProblemsIn({ SUPABASE_ANON_KEY: '', SUPABASE_URL: '' }).join(' ');
    assert.ok(!joined.includes('supabase.co'));
  });
});

/* The build-time warning is a standalone .mjs so it runs on any Node the
   deployment happens to use, without type stripping. That means it restates
   these two numbers, so they are pinned here rather than left to drift. */
describe('the build-time check agrees with the runtime rule', () => {
  const script = readFileSync(new URL('../scripts/check-cms-config.mjs', import.meta.url), 'utf8');

  test('thresholds match', () => {
    assert.match(script, new RegExp(`MIN_PASSWORD\\s*=\\s*${MIN_PASSWORD}\\b`));
    assert.match(script, new RegExp(`MIN_SECRET\\s*=\\s*${MIN_SECRET}\\b`));
  });

  test('it checks both variables', () => {
    assert.ok(script.includes('CMS_ADMIN_PASSWORD'));
    assert.ok(script.includes('CMS_SESSION_SECRET'));
  });

  /* The build log is the only place the write configuration can be checked
     without a signed-in session, so it has to cover the same variables
     writeProblemsIn() does — including the public URL fallback, or a working
     deployment gets warned about. */
  test('it checks the write variables too', () => {
    assert.ok(script.includes('SUPABASE_SERVICE_ROLE_KEY'));
    assert.ok(script.includes('SUPABASE_URL'));
    assert.ok(script.includes('NEXT_PUBLIC_SUPABASE_URL'));
  });

  test('it checks the read variables too', () => {
    assert.ok(script.includes('SUPABASE_ANON_KEY'));
  });

  test('it warns rather than failing the build', () => {
    assert.ok(!/process\.exit\(\s*[1-9]/.test(script), 'must not exit non-zero');
  });
});
