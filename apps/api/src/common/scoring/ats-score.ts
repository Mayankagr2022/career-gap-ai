/**
 * Deterministic ATS scoring.
 *
 * Two numbers, both computed in code so the same inputs always give the same score
 * (the AI model used to be asked to "guess" an ATS score, which varied per run and per model):
 *
 *  - structure: how machine-readable and complete the resume is. Independent of any job.
 *               This is the "ATS readiness" shown on the resume.
 *  - keyword:   how many of the job's required / preferred keywords the resume actually contains.
 *
 * An analysis' ATS score for a specific job combines both. These are heuristics that estimate how an
 * applicant tracking system would treat the resume; they are not output from a real ATS.
 */

export interface ParsedResumeLike {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    description?: string;
    skills?: string[];
    achievements?: string[];
  }>;
  education?: unknown[];
}

export interface StructureBreakdown {
  contact: number; // /20
  sections: number; // /30
  content: number; // /30
  readability: number; // /20
}

export interface StructureScore {
  score: number;
  breakdown: StructureBreakdown;
}

export interface KeywordScore {
  /** null when the job lists no usable keywords, so there is nothing to match against */
  score: number | null;
  matched: string[];
  /** Required keywords first, then preferred */
  missing: string[];
  /** The subset of `missing` that the job lists as required */
  missingRequired: string[];
  matchedRequired: number;
  totalRequired: number;
  matchedPreferred: number;
  totalPreferred: number;
}

export interface AtsBreakdown {
  /** Final ATS score for this resume against this job (0-100). */
  score: number;
  /** Resume format and completeness (0-100). */
  structure: number;
  /** Required/preferred keyword coverage (0-100), null if the job has no usable keywords. */
  keyword: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  missingRequiredKeywords: string[];
  structureBreakdown: StructureBreakdown;
}

export const ATS_WEIGHTS = { structure: 0.4, keyword: 0.6 } as const;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round = (n: number) => Math.round(n);
const nonEmpty = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const fraction = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

// ---------------------------------------------------------------------------------------- structure

/** Resume format and completeness, 0-100. */
export function scoreResumeStructure(parsed: ParsedResumeLike, rawText?: string | null): StructureScore {
  const skills = (parsed.skills ?? []).filter(nonEmpty);
  const experience = parsed.experience ?? [];
  const education = parsed.education ?? [];

  // Contact details an ATS needs to create a candidate record (20)
  const contact =
    (nonEmpty(parsed.email) ? 8 : 0) +
    (nonEmpty(parsed.phone) ? 6 : 0) +
    (nonEmpty(parsed.location) ? 3 : 0) +
    (nonEmpty(parsed.name) ? 3 : 0);

  // Standard sections that ATS parsers look for (30)
  const sections =
    (nonEmpty(parsed.summary) ? 8 : 0) +
    (experience.length > 0 ? 12 : 0) +
    (education.length > 0 ? 5 : 0) +
    (skills.length > 0 ? 5 : 0);

  // Content quality (30): skills depth, dated roles, achievements, and numbers backing them up
  const skillsDepth = Math.min(10, (skills.length / 8) * 10);
  const dated = fraction(experience.filter((e) => nonEmpty(e.startDate)).length, experience.length);
  const withAchievements = fraction(
    experience.filter((e) => (e.achievements ?? []).some(nonEmpty)).length,
    experience.length,
  );
  const bulletLines = experience.flatMap((e) => (e.achievements ?? []).filter(nonEmpty));
  const quantified = fraction(bulletLines.filter((l) => /\d/.test(l)).length, bulletLines.length);
  const content = skillsDepth + dated * 8 + withAchievements * 6 + quantified * 6;

  // Readability (20): sensible length and text that extracted cleanly (garbled text suggests scans or tables)
  let readability: number;
  if (rawText === undefined || rawText === null) {
    readability = 10; // no raw text available: neutral
  } else {
    const words = rawText.split(/\s+/).filter(Boolean).length;
    const length =
      words >= 250 && words <= 1000 ? 10 : (words >= 150 && words < 250) || (words > 1000 && words <= 1500) ? 6 : words > 0 ? 3 : 0;
    const visible = rawText.replace(/\s/g, '');
    const letters = (visible.match(/[\p{L}\p{N}.,;:()\-_/@+#%&'"]/gu) ?? []).length;
    const cleanliness = visible.length > 0 ? Math.min(1, letters / visible.length / 0.9) : 0;
    // Clean text only earns its points once there is a meaningful amount of it
    readability = length + cleanliness * 10 * Math.min(1, words / 150);
  }

  const breakdown: StructureBreakdown = {
    contact: round(contact),
    sections: round(sections),
    content: round(content),
    readability: round(readability),
  };
  return { score: clamp(round(contact + sections + content + readability), 0, 100), breakdown };
}

// ---------------------------------------------------------------------------------------- keywords

/** Lowercase, drop punctuation: "Node.js" -> "nodejs", "C++" -> "c++". */
const canon = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '');
/** "reactjs" / "react.js" / "React", "HTML5" / "HTML" all compare equal. */
const canonKey = (s: string) => {
  const c = canon(s);
  if (/^(html|css)\d$/.test(c)) return c.slice(0, -1);
  return c.length > 4 && c.endsWith('js') ? c.slice(0, -2) : c;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'for', 'with', 'from', 'into', 'etc', 'other', 'others', 'equivalent', 'similar',
  'using', 'including', 'based', 'strong', 'good', 'excellent', 'knowledge', 'experience', 'skills',
  'ability', 'understanding', 'of', 'in', 'on', 'to', 'a', 'an', 'such', 'as',
]);

/** Words reduced to a rough stem so "debugging"/"debug" and "mentoring"/"mentored" line up. */
const stem = (w: string) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w);
const wordsOf = (s: string) => (s.toLowerCase().match(/[a-z0-9+#]+/g) ?? []).filter((w) => !STOP_WORDS.has(w));

/** Version-only text such as "ES6+", "13/14", "v2" says nothing about which skill it is. */
const isVersionLike = (s: string) => /^(es\d+\+?|v?\d[\d./+]*)$/i.test(s.trim());

/** Split on commas, semicolons, " and ", " or " and "&", never inside parentheses. */
function splitTopLevel(text: string, alsoSlash = false): string[] {
  const parts: string[] = [];
  const separators = alsoSlash ? /[,;/]/ : /[,;]/;
  const wordSeparator = /^\s+(?:and|or|&)\s+/i;
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0) {
      if (separators.test(ch)) {
        parts.push(current);
        current = '';
        continue;
      }
      const word = text.slice(i).match(wordSeparator);
      if (word) {
        parts.push(current);
        current = '';
        i += word[0].length - 1;
        continue;
      }
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** "Strong proficiency in Go" -> "Go", "Kubernetes experience" -> "Kubernetes", "experience with Kafka" -> "Kafka". */
function stripQualifiers(text: string): string {
  const stripped = text
    .replace(/^(?:(?:strong|solid|good|deep|hands-on|proven|excellent|working|basic|advanced|demonstrated|extensive|practical|prior)\s+)+/i, '')
    .replace(/^(?:proficiency|knowledge|experience|expertise|understanding|familiarity|background|command|skills?)\s+(?:in|with|of|on|using)\s+/i, '')
    .replace(/\s+(?:experience|expertise|familiarity|knowledge|proficiency|skills?|background)$/i, '')
    .trim();
  return stripped || text;
}

/** A requirement about tenure ("5-8 years building backend systems") is not a skill. */
const isYearsRequirement = (s: string) => /\b\d+\s*(?:[-–]\s*\d+\s*)?\+?\s*years?\b/i.test(s);

/** Drop fillers like "etc.", "or equivalent", "other modern languages" and version-only fragments. */
function cleanAtom(atom: string): string | null {
  if (isYearsRequirement(atom)) return null;
  let a = stripQualifiers(atom)
    .replace(/\b(or|and)\s+(equivalent|similar|other\b.*|more)\s*$/i, '')
    .replace(/\s+(ES\d+\+?|v?\d+(?:[./]\d+)*\+?)\s*$/i, '') // trailing version: "JavaScript ES6+", "Next.js 13/14"
    .replace(/^[\s\-–•*]+|[\s.\-–:]+$/g, '')
    .trim();
  if (!a || /^(etc|equivalent|similar|more|others?)$/i.test(a) || /^other\b/i.test(a) || isVersionLike(a)) return null;
  a = a.replace(/\s+/g, ' ');
  return a.length > 60 ? null : a;
}

/** Headings that only categorise the technologies listed after them. */
const GENERIC_HEADING =
  /\b(development|platforms?|frameworks?|tools?|languages?|design|engineering|databases?|services?|technologies|systems?|testing|monitoring|architecture|practices|methodologies|libraries|stack|infrastructure|protocols?|APIs?)\s*$/i;

/**
 * Turn a stored skill phrase into individual keywords.
 * Job skills are often whole phrases ("Frontend development (React.js, Next.js, TypeScript)"), which no resume
 * contains verbatim, so they are matched keyword by keyword.
 *
 *  - job side: a parenthesised list replaces its generic heading ("Cloud platforms (AWS, GCP)" -> AWS, GCP);
 *  - resume side: the heading and the list are both kept ("AWS (EC2, S3)" -> AWS, EC2, S3).
 */
export function atomize(phrase: string, side: 'job' | 'resume'): string[] {
  const atoms: string[] = [];
  const push = (raw: string) => {
    const cleaned = cleanAtom(raw);
    if (cleaned) atoms.push(cleaned);
  };

  for (const piece of splitTopLevel(phrase, side === 'resume')) {
    const m = piece.match(/^(.*?)\s*\(([^()]*)\)\s*(.*)$/);
    if (!m) {
      push(piece);
      continue;
    }
    const [, head, inner, tail] = m;
    const innerAtoms = splitTopLevel(inner, true).map(cleanAtom).filter((x): x is string => !!x);
    // A technology list uses separators; "(relational and non-relational)" is just a qualifier of the heading
    const listLike = /[,;/]/.test(inner);
    if (listLike) {
      innerAtoms.forEach((a) => atoms.push(a));
      // The heading of a list is a skill itself when it names one ("Strong proficiency in Go (...)"), but
      // just a category when generic ("Cloud platforms (AWS, GCP)") and then only the list matters.
      const named = cleanAtom(head);
      if (named && (side === 'resume' || (named.split(/\s+/).length <= 2 && !GENERIC_HEADING.test(named)))) atoms.push(named);
    } else {
      push(head); // "JavaScript (ES6+)", "Database design (relational and non-relational)"
      if (side === 'resume' && innerAtoms.length === 1) atoms.push(innerAtoms[0]);
    }
    if (tail) push(tail);
  }
  return [...new Map(atoms.map((a) => [canonKey(a), a])).values()];
}

interface ResumeIndex {
  keys: Set<string>;
  lowerText: string;
  stems: Set<string>;
}

function indexResume(parsed: ParsedResumeLike, rawText: string | null | undefined): ResumeIndex {
  const skillPhrases = [...(parsed.skills ?? []), ...(parsed.experience ?? []).flatMap((e) => e.skills ?? [])].filter(nonEmpty);
  const keys = new Set<string>();
  for (const phrase of skillPhrases) {
    keys.add(canonKey(phrase));
    atomize(phrase, 'resume').forEach((a) => keys.add(canonKey(a)));
  }
  const corpus = [
    rawText ?? '',
    parsed.summary ?? '',
    ...skillPhrases,
    ...(parsed.experience ?? []).flatMap((e) => [e.title ?? '', e.description ?? '', ...(e.achievements ?? [])]),
  ].join(' ');
  return {
    keys,
    lowerText: (rawText ?? '').toLowerCase(),
    stems: new Set(wordsOf(corpus).map(stem)),
  };
}

/** Whether the keyword is described rather than named ("End-to-end feature ownership"). */
const isDescriptive = (atom: string) => wordsOf(atom).length >= 3;

/**
 * Credit 0..1 for one keyword.
 * Exact skill or whole-word text match = 1. Otherwise partial credit for multi-word keywords whose words
 * mostly appear in the resume ("debugging", "problem solving"); single words never match loosely, so
 * "Java" cannot match "JavaScript".
 */
function creditFor(atom: string, idx: ResumeIndex): number {
  if (idx.keys.has(canonKey(atom))) return 1;
  const phrase = atom.toLowerCase();
  // One- or two-letter skills ("Go", "R") are ordinary words in prose; only the skills list can vouch for them
  if ((canon(atom).length > 2 || /[+#]/.test(atom)) && new RegExp(`(?<![a-z0-9])${escapeRegex(phrase)}(?![a-z0-9])`).test(idx.lowerText)) return 1;

  const words = wordsOf(atom).map(stem);
  if (words.length < 2) return words.length === 1 && idx.stems.has(words[0]) && words[0].length >= 5 ? 1 : 0;
  const overlap = fraction(words.filter((w) => idx.stems.has(w)).length, words.length);
  return overlap >= 0.5 ? overlap : 0;
}

/** Required/preferred keyword coverage, 0-100. Required keywords carry 70% of the score, preferred 30%. */
export function scoreKeywordMatch(
  parsed: ParsedResumeLike,
  rawText: string | null | undefined,
  requiredSkills: string[],
  preferredSkills: string[],
): KeywordScore {
  const idx = indexResume(parsed, rawText);

  const requiredAtoms = [...new Map(requiredSkills.filter(nonEmpty).flatMap((s) => atomize(s, 'job')).map((a) => [canonKey(a), a])).values()];
  const requiredKeys = new Set(requiredAtoms.map(canonKey));
  const preferredAtoms = [
    ...new Map(
      preferredSkills.filter(nonEmpty).flatMap((s) => atomize(s, 'job')).map((a) => [canonKey(a), a]),
    ).values(),
  ].filter((a) => !requiredKeys.has(canonKey(a)));

  const evaluate = (atoms: string[]) => {
    const matched: string[] = [];
    const missing: string[] = [];
    let credit = 0;
    let counted = 0;
    for (const atom of atoms) {
      const c = creditFor(atom, idx);
      if (c >= 0.5) {
        matched.push(atom);
        credit += c;
        counted++;
      } else if (!isDescriptive(atom)) {
        // A long descriptive requirement nobody writes verbatim ("End-to-end feature ownership") is neither
        // credited nor held against the resume; named skills that are absent do count against it.
        missing.push(atom);
        counted++;
      }
    }
    return { matched, missing, credit, counted };
  };
  const req = evaluate(requiredAtoms);
  const pref = evaluate(preferredAtoms);

  let score: number | null;
  if (req.counted === 0 && pref.counted === 0) {
    score = null;
  } else if (pref.counted === 0) {
    score = fraction(req.credit, req.counted) * 100;
  } else if (req.counted === 0) {
    score = fraction(pref.credit, pref.counted) * 100;
  } else {
    score = (fraction(req.credit, req.counted) * 0.7 + fraction(pref.credit, pref.counted) * 0.3) * 100;
  }

  return {
    score: score === null ? null : clamp(round(score), 0, 100),
    matched: [...req.matched, ...pref.matched],
    missing: [...req.missing, ...pref.missing],
    missingRequired: req.missing,
    matchedRequired: req.matched.length,
    totalRequired: req.counted,
    matchedPreferred: pref.matched.length,
    totalPreferred: pref.counted,
  };
}

// ---------------------------------------------------------------------------------------- combined

/** ATS score for one resume against one job. */
export function computeAnalysisAts(
  parsed: ParsedResumeLike,
  rawText: string | null | undefined,
  requiredSkills: string[],
  preferredSkills: string[],
): AtsBreakdown {
  const structure = scoreResumeStructure(parsed, rawText);
  const keyword = scoreKeywordMatch(parsed, rawText, requiredSkills, preferredSkills);

  const score =
    keyword.score === null
      ? structure.score
      : round(structure.score * ATS_WEIGHTS.structure + keyword.score * ATS_WEIGHTS.keyword);

  return {
    score: clamp(score, 0, 100),
    structure: structure.score,
    keyword: keyword.score,
    matchedKeywords: keyword.matched,
    missingKeywords: keyword.missing,
    missingRequiredKeywords: keyword.missingRequired,
    structureBreakdown: structure.breakdown,
  };
}

/** One suggestion per missing keyword, required ones first, so the advice always matches the score. */
export function buildKeywordSuggestions(ats: AtsBreakdown, limit = 8) {
  const required = new Set(ats.missingRequiredKeywords);
  return ats.missingKeywords.slice(0, limit).map((keyword) => {
    const isRequired = required.has(keyword);
    return {
      type: 'KEYWORD_MISSING' as const,
      severity: isRequired ? ('HIGH' as const) : ('LOW' as const),
      message: `"${keyword}" is ${isRequired ? 'required' : 'preferred'} by the job but not found in your resume`,
      suggestion: `If you have experience with ${keyword}, add it to your skills section and mention it in a relevant role. Use the job's exact wording.`,
    };
  });
}

/**
 * Individual skills from the phrases a job parser returns, for storing on a job: phrase lists are split,
 * qualifiers dropped ("Kubernetes experience" -> "Kubernetes") and anything too long to be a skill name removed.
 */
export const singleSkills = (skills: string[]): string[] =>
  [...new Set((skills ?? []).flatMap((s) => atomize(s, 'job')).filter((s) => s.split(/\s+/).length <= 4))];
