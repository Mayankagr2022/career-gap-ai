import { extractJobHints } from './jd-field-extractor';

describe('extractJobHints', () => {
  it('reads labelled title and company lines', () => {
    const text = 'Job Title: Senior Backend Engineer\nCompany: Acme Corp\nLocation: Remote\n\nWe are hiring...';
    expect(extractJobHints(text)).toEqual({ title: 'Senior Backend Engineer', company: 'Acme Corp' });
  });

  it('accepts alternative labels and dash separators', () => {
    const text = 'Position - Data Analyst\nEmployer: Globex\nBody text here';
    expect(extractJobHints(text)).toEqual({ title: 'Data Analyst', company: 'Globex' });
  });

  it('falls back to the first heading line for the title', () => {
    const text = 'Staff Platform Engineer\n\nAbout Initech\nInitech builds software for offices.';
    expect(extractJobHints(text)).toEqual({ title: 'Staff Platform Engineer', company: 'Initech' });
  });

  it('splits "Title at Company" on the first line', () => {
    const text = 'Product Designer at Umbrella\n\nResponsibilities include design work.';
    expect(extractJobHints(text)).toEqual({ title: 'Product Designer', company: 'Umbrella' });
  });

  it('skips generic headings when looking for a title', () => {
    const text = 'Job Description\nAbout the Role\nQA Engineer\nYou will test things.';
    expect(extractJobHints(text).title).toBe('QA Engineer');
  });

  it('does not treat "About Us" style headings as a company', () => {
    const text = 'Software Engineer\nAbout Us\nWe like code.\nAbout the Role\nBuild things.';
    expect(extractJobHints(text).company).toBeUndefined();
  });

  it('returns nothing rather than guessing from prose', () => {
    const text =
      'We are looking for an experienced engineer to join our growing team and help us build great products for customers.';
    expect(extractJobHints(text)).toEqual({ title: undefined, company: undefined });
  });

  it('strips markdown decoration and trailing punctuation', () => {
    const text = '**Job Title:** Cloud Architect.\n**Company:** Hooli,';
    expect(extractJobHints(text)).toEqual({ title: 'Cloud Architect', company: 'Hooli' });
  });
});
