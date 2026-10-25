export interface JobHints {
  title?: string;
  company?: string;
}

const TITLE_LABELS = 'job\\s*title|position(?:\\s*title)?|role|title';
const COMPANY_LABELS = 'company(?:\\s*name)?|employer|organi[sz]ation|hiring\\s*company';

const labelled = (labels: string) =>
  new RegExp(`^[\\s>*#\\-•]*(?:${labels})\\s*[:–—-]\\s*(.+?)\\s*$`, 'im');

/** First lines that are headings rather than a job title. */
const NOT_A_TITLE =
  /^(job\s*description|about\b|overview|summary|responsibilities|requirements|qualifications|who\s+we\s+are|we\s+are|we're|join\b|location|company|salary|apply|description)/i;
/** "About <X>" headings that do not name a company. */
const NOT_A_COMPANY =
  /^(us|you|me|the\s+\w+(\s+\w+)?|this\s+\w+(\s+\w+)?|our\s+\w+(\s+\w+)?|your\s+\w+(\s+\w+)?)$/i;

function clean(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s.,;:|]+$/, '')
    .trim()
    .slice(0, 120);
  return v.length >= 2 ? v : undefined;
}

/**
 * Rule-based guess at the title and company of a job description. No AI: it only reads labelled
 * lines ("Job Title: ...", "Company: ...") and a few common layouts, and returns nothing when
 * it is not sure, so the user fills the field in.
 */
export function extractJobHints(text: string): JobHints {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let title = clean(text.match(labelled(TITLE_LABELS))?.[1]);
  let company = clean(text.match(labelled(COMPANY_LABELS))?.[1]);

  if (!title) {
    for (const line of lines.slice(0, 8)) {
      const words = line.split(/\s+/).length;
      const isLabelLine = /^[\w\s]{2,30}:\s*\S/.test(line);
      if (line.length > 100 || words > 12 || line.endsWith('.') || isLabelLine || NOT_A_TITLE.test(line)) continue;

      // "Senior Engineer at Acme" / "Senior Engineer @ Acme"
      const atMatch = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
      if (atMatch) {
        title = clean(atMatch[1]);
        company = company ?? clean(atMatch[2]);
      } else {
        title = clean(line);
      }
      break;
    }
  }

  if (!company) {
    for (const line of lines) {
      const m = line.match(/^about\s+(.+?)\s*:?$/i);
      const name = m?.[1];
      if (name && name.split(/\s+/).length <= 5 && name.length <= 60 && !NOT_A_COMPANY.test(name)) {
        company = clean(name);
        break;
      }
    }
  }

  return { title, company };
}
