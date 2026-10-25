import {
  atomize,
  singleSkills,
  buildKeywordSuggestions,
  computeAnalysisAts,
  scoreKeywordMatch,
  scoreResumeStructure,
  type ParsedResumeLike,
} from './ats-score';

const goodResume: ParsedResumeLike = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1 555 0100',
  location: 'Austin, TX',
  summary: 'Backend engineer with 6 years of experience.',
  skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'React', 'GraphQL', 'Redis'],
  experience: [
    {
      title: 'Senior Engineer',
      company: 'Acme',
      startDate: '2021-01',
      achievements: ['Cut API latency by 40%', 'Led migration of 12 services'],
    },
    { title: 'Engineer', company: 'Beta', startDate: '2019-01', achievements: ['Built 5 REST APIs'] },
  ],
  education: [{ degree: 'BSc' }],
};

// ~400 words of ordinary text so the length check is satisfied
const goodText = Array.from({ length: 80 }, () => 'Built reliable services with TypeScript and Node.js.').join(' ');

describe('scoreResumeStructure', () => {
  it('is deterministic: the same resume always gets the same score', () => {
    const scores = Array.from({ length: 5 }, () => scoreResumeStructure(goodResume, goodText).score);
    expect(new Set(scores).size).toBe(1);
  });

  it('scores a complete resume high and an empty one near zero', () => {
    expect(scoreResumeStructure(goodResume, goodText).score).toBeGreaterThanOrEqual(90);
    expect(scoreResumeStructure({}, '').score).toBeLessThanOrEqual(5);
  });

  it('reports a breakdown that adds up to the score', () => {
    const { score, breakdown } = scoreResumeStructure(goodResume, goodText);
    const sum = breakdown.contact + breakdown.sections + breakdown.content + breakdown.readability;
    expect(Math.abs(sum - score)).toBeLessThanOrEqual(2); // each part is rounded separately
  });

  it('does not punish a resume for lacking certifications', () => {
    const withCert = { ...goodResume, certifications: [{ name: 'AWS SAA' }] } as any;
    expect(scoreResumeStructure(withCert, goodText).score).toBe(scoreResumeStructure(goodResume, goodText).score);
  });

  it('drops the score for missing contact details and unquantified bullets', () => {
    const weak: ParsedResumeLike = {
      ...goodResume,
      email: '',
      phone: undefined,
      experience: goodResume.experience!.map((e) => ({ ...e, achievements: ['Worked on things'] })),
    };
    expect(scoreResumeStructure(weak, goodText).score).toBeLessThan(scoreResumeStructure(goodResume, goodText).score - 10);
  });

  it('penalises garbled or very short extracted text', () => {
    const garbled = '�'.repeat(300) + ' ' + '▯▯ ▯▯ '.repeat(100);
    expect(scoreResumeStructure(goodResume, garbled).breakdown.readability).toBeLessThan(
      scoreResumeStructure(goodResume, goodText).breakdown.readability,
    );
    expect(scoreResumeStructure(goodResume, 'too short').breakdown.readability).toBeLessThan(10);
  });

  it('stays within 0-100 and treats missing raw text as neutral', () => {
    const s = scoreResumeStructure(goodResume).score;
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe('atomize', () => {
  it('replaces a generic heading with the technologies listed in parentheses (job side)', () => {
    expect(atomize('Frontend development (React.js, Next.js, TypeScript, JavaScript ES6+)', 'job')).toEqual([
      'React.js',
      'Next.js',
      'TypeScript',
      'JavaScript',
    ]);
    expect(atomize('Cloud platforms (AWS, GCP, Azure)', 'job')).toEqual(['AWS', 'GCP', 'Azure']);
  });

  it('splits plain lists and drops fillers like "etc." and "or equivalent"', () => {
    expect(atomize('Testing frameworks (Jest, Cypress, etc.)', 'job')).toEqual(['Jest', 'Cypress']);
    expect(atomize('Backend development (Node.js, NestJS, Express.js or equivalent)', 'job')).toEqual(['Node.js', 'NestJS', 'Express.js']);
    expect(atomize('Python, Java or other modern languages', 'job')).toEqual(['Python', 'Java']);
    expect(atomize('RabbitMQ, Kafka, Redis', 'job')).toEqual(['RabbitMQ', 'Kafka', 'Redis']);
  });

  it('keeps names like CI/CD intact and splits "X and Y"', () => {
    expect(atomize('CI/CD pipelines', 'job')).toEqual(['CI/CD pipelines']);
    expect(atomize('RESTful API design and GraphQL', 'job')).toEqual(['RESTful API design', 'GraphQL']);
  });

  it('treats a parenthesised qualifier as part of the heading, not as keywords', () => {
    expect(atomize('Database design (relational and non-relational)', 'job')).toEqual(['Database design']);
  });

  it('ignores version-only parentheses', () => {
    expect(atomize('JavaScript (ES6+)', 'job')).toEqual(['JavaScript']);
    expect(atomize('Next.js 13/14 (App Router)', 'resume')).toContain('Next.js');
  });

  it('keeps both the heading and the list on the resume side', () => {
    expect(atomize('AWS (EC2, S3, IAM)', 'resume')).toEqual(['EC2', 'S3', 'IAM', 'AWS']);
    expect(atomize('Agile/Scrum', 'resume')).toEqual(['Agile', 'Scrum']);
  });
});

describe('skills written as requirement sentences', () => {
  it('strips qualifiers so only the skill is left', () => {
    expect(atomize('Kubernetes experience', 'job')).toEqual(['Kubernetes']);
    expect(atomize('OpenTelemetry familiarity', 'job')).toEqual(['OpenTelemetry']);
    expect(atomize('Strong proficiency in Go', 'job')).toEqual(['Go']);
  });

  it('keeps a named heading together with its list, but not a generic category', () => {
    expect(atomize('Strong proficiency in async Python (FastAPI, Pydantic, asyncio)', 'job')).toEqual(
      expect.arrayContaining(['async Python', 'FastAPI', 'Pydantic', 'asyncio']),
    );
    expect(atomize('Strong proficiency in Go (concurrency, channels, performance)', 'job')).toEqual(
      expect.arrayContaining(['Go', 'concurrency', 'channels', 'performance']),
    );
    expect(atomize('Cloud platforms (AWS, GCP)', 'job')).toEqual(['AWS', 'GCP']);
  });

  it('drops tenure requirements, which are not skills', () => {
    expect(atomize('5-8 years building backend systems in production at product companies', 'job')).toEqual([]);
    expect(atomize('3+ years of experience', 'job')).toEqual([]);
  });

  it('singleSkills de-duplicates (React == React.js) and drops anything too long to be a skill name', () => {
    const skills = singleSkills(['React, React.js', 'Kubernetes experience', 'Kubernetes', 'Ability to ship quickly under pressure to deadlines']);
    expect(skills).toHaveLength(2);
    expect(skills).toContain('Kubernetes');
    expect(skills.some((x) => /^React/.test(x))).toBe(true);
  });
});

describe('scoreKeywordMatch', () => {
  it('matches skills regardless of case and punctuation (Node.js == nodejs == NodeJS)', () => {
    const r = scoreKeywordMatch({ skills: ['NodeJS', 'react'] }, '', ['Node.js', 'React.js'], []);
    expect(r.matched).toEqual(['Node.js', 'React.js']);
    expect(r.score).toBe(100);
  });

  it('does not let "java" match "javascript"', () => {
    const r = scoreKeywordMatch({ skills: ['JavaScript'] }, 'I write JavaScript daily', ['Java'], []);
    expect(r.matched).toEqual([]);
    expect(r.missing).toEqual(['Java']);
    expect(r.score).toBe(0);
  });

  it('finds skills mentioned only in the resume text, but never matches "Go" from ordinary prose', () => {
    const r = scoreKeywordMatch({ skills: [] }, 'Deployed services on Kubernetes and Terraform. Ready to go further.', ['Kubernetes', 'Terraform', 'Go'], []);
    expect(r.matched).toEqual(['Kubernetes', 'Terraform']);
    expect(r.missing).toEqual(['Go']);
  });

  it('handles symbol skills like C++ and C#', () => {
    const r = scoreKeywordMatch({ skills: [] }, 'Experienced in C++ and C# development', ['C++', 'C#'], []);
    expect(r.score).toBe(100);
  });

  it('weights required keywords 70% and preferred 30%', () => {
    const r = scoreKeywordMatch({ skills: ['Alpha', 'Beta'] }, '', ['Alpha', 'Aaron'], ['Beta', 'Bruno']);
    // required 1/2 * 0.7 + preferred 1/2 * 0.3 = 50
    expect(r.score).toBe(50);
    expect(r.missing).toEqual(['Aaron', 'Bruno']); // required first
    expect(r.missingRequired).toEqual(['Aaron']);
  });

  it('uses whichever list exists when the other is empty, and null when the job lists none', () => {
    expect(scoreKeywordMatch({ skills: ['Rust'] }, '', ['Rust', 'Zig'], []).score).toBe(50);
    expect(scoreKeywordMatch({ skills: ['Rust'] }, '', [], ['Rust', 'Zig']).score).toBe(50);
    expect(scoreKeywordMatch({ skills: ['Rust'] }, '', [], []).score).toBeNull();
  });

  it('counts a keyword listed as both required and preferred once', () => {
    const r = scoreKeywordMatch({ skills: ['sql'] }, '', ['SQL'], ['sql']);
    expect(r.totalPreferred).toBe(0);
    expect(r.score).toBe(100);
  });

  it('gives partial credit to multi-word keywords whose words appear, ignores unwritable descriptions', () => {
    const resume: ParsedResumeLike = {
      skills: ['Code Reviews', 'Test-Driven Development (TDD)'],
      experience: [{ achievements: ['Mentored 4 junior engineers and debugged production incidents'] }],
    };
    const r = scoreKeywordMatch(resume, '', ['Code review and coding standards', 'Mentoring and team collaboration', 'Problem-solving and debugging', 'End-to-end feature ownership'], []);
    expect(r.matched).toEqual(expect.arrayContaining(['Mentoring', 'debugging']));
    // "End-to-end feature ownership" is descriptive and absent: neither credited nor listed as missing
    expect(r.missing).not.toContain('End-to-end feature ownership');
  });
});

describe('real-world job with phrase-style skills', () => {
  // Shapes taken from a real job/resume pair that scored a keyword match of 2% before skills were split up
  const jobRequired = [
    'Software engineering fundamentals',
    'Frontend development (React.js, Next.js, TypeScript, JavaScript ES6+)',
    'Backend development (Node.js, NestJS, Express.js or equivalent)',
    'RESTful API design and GraphQL',
    'Database design (relational and non-relational)',
    'SQL query optimization',
    'Clean architecture, SOLID principles, design patterns',
    'Code review and coding standards',
    'Problem-solving and debugging',
    'End-to-end feature ownership',
    'Technical decision-making',
    'Mentoring and team collaboration',
    'Communication with cross-functional stakeholders',
  ];
  const jobPreferred = [
    'React.js, Next.js, TypeScript, JavaScript (ES6+)',
    'HTML5, CSS3, Tailwind CSS, Material UI',
    'Redux Toolkit, React Context API',
    'Node.js, NestJS, Express.js',
    'Python, Java or other modern languages',
    'GraphQL, WebSockets',
    'RabbitMQ, Kafka, Redis',
    'Microservices, event-driven architecture',
    'CI/CD pipelines',
    'Cloud platforms (AWS, GCP, Azure)',
    'Containerization (Docker, Kubernetes)',
    'Testing frameworks (Jest, Cypress, etc.)',
    'Monitoring and logging tools',
  ];
  const resume: ParsedResumeLike = {
    skills: [
      'AWS (EC2, S3, IAM)', 'CI/CD Automation (GitHub Actions, GitLab CI)', 'Docker Containerization', 'React.js',
      'Next.js 13/14 (App Router)', 'TypeScript', 'JavaScript (ES6+)', 'Redux Toolkit', 'Tailwind CSS', 'Node.js',
      'Express.js', 'Microservices Architecture', 'RESTful API Design', 'GraphQL', 'PostgreSQL', 'MySQL', 'MongoDB',
      'Redis Caching', 'Test-Driven Development (TDD)', 'Code Reviews',
    ],
  };

  it('recognises the technologies hidden inside phrase-style skills', () => {
    const r = scoreKeywordMatch(resume, '', jobRequired, jobPreferred);
    expect(r.matched).toEqual(
      expect.arrayContaining(['React.js', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js', 'Express.js', 'GraphQL', 'AWS', 'Docker', 'Redis', 'Tailwind CSS']),
    );
    expect(r.score).toBeGreaterThan(35); // was 2 before phrases were split into keywords
    expect(r.score).toBeLessThan(80); // a 20-skill resume does not cover every technology the job lists
    // genuinely absent skills are still reported
    expect(r.missing).toEqual(expect.arrayContaining(['NestJS', 'Kafka', 'Kubernetes']));
  });
});

describe('computeAnalysisAts', () => {
  it('combines 40% format and 60% keywords', () => {
    const ats = computeAnalysisAts(goodResume, goodText, ['TypeScript', 'Go'], []);
    expect(ats.keyword).toBe(50);
    expect(ats.score).toBe(Math.round(ats.structure * 0.4 + 50 * 0.6));
    expect(ats.missingKeywords).toEqual(['Go']);
  });

  it('falls back to the format score when the job lists no skills', () => {
    const ats = computeAnalysisAts(goodResume, goodText, [], []);
    expect(ats.keyword).toBeNull();
    expect(ats.score).toBe(ats.structure);
  });

  it('shares the same format score as the resume, so the two ATS numbers differ only by keywords', () => {
    const resumeAts = scoreResumeStructure(goodResume, goodText).score;
    const perfectJob = computeAnalysisAts(goodResume, goodText, ['TypeScript', 'Node.js'], []);
    const poorJob = computeAnalysisAts(goodResume, goodText, ['Rust', 'Haskell'], []);
    expect(perfectJob.structure).toBe(resumeAts);
    expect(poorJob.structure).toBe(resumeAts);
    expect(perfectJob.score).toBeGreaterThan(resumeAts - 1);
    expect(poorJob.score).toBeLessThan(resumeAts);
  });
});

describe('buildKeywordSuggestions', () => {
  it('suggests each missing keyword, required ones as HIGH severity', () => {
    const ats = computeAnalysisAts(goodResume, goodText, ['Rust'], ['Haskell']);
    const suggestions = buildKeywordSuggestions(ats);
    expect(suggestions.map((s) => [s.type, s.severity])).toEqual([
      ['KEYWORD_MISSING', 'HIGH'],
      ['KEYWORD_MISSING', 'LOW'],
    ]);
    expect(suggestions[0].message).toContain('Rust');
  });

  it('returns nothing when no keyword is missing and respects the limit', () => {
    const ok = computeAnalysisAts(goodResume, goodText, ['TypeScript'], []);
    expect(buildKeywordSuggestions(ok)).toEqual([]);
    const many = computeAnalysisAts({ skills: [] }, '', ['Alpha', 'Bravo', 'Charlie', 'Delta'], []);
    expect(buildKeywordSuggestions(many, 2)).toHaveLength(2);
  });
});
