// Filter values the backend understands; keep in sync with the backend's Vocabulary.java (fields, types) and
// Source.java (source keys). Fields travel as OpenAlex field ids because four of the names contain commas.
export const FIELDS_OF_STUDY: { value: string; label: string }[] = [
  { value: '11', label: 'Agricultural and Biological Sciences' },
  { value: '12', label: 'Arts and Humanities' },
  { value: '13', label: 'Biochemistry, Genetics and Molecular Biology' },
  { value: '14', label: 'Business, Management and Accounting' },
  { value: '15', label: 'Chemical Engineering' },
  { value: '16', label: 'Chemistry' },
  { value: '17', label: 'Computer Science' },
  { value: '18', label: 'Decision Sciences' },
  { value: '35', label: 'Dentistry' },
  { value: '19', label: 'Earth and Planetary Sciences' },
  { value: '20', label: 'Economics, Econometrics and Finance' },
  { value: '21', label: 'Energy' },
  { value: '22', label: 'Engineering' },
  { value: '23', label: 'Environmental Science' },
  { value: '36', label: 'Health Professions' },
  { value: '24', label: 'Immunology and Microbiology' },
  { value: '25', label: 'Materials Science' },
  { value: '26', label: 'Mathematics' },
  { value: '27', label: 'Medicine' },
  { value: '28', label: 'Neuroscience' },
  { value: '29', label: 'Nursing' },
  { value: '30', label: 'Pharmacology, Toxicology and Pharmaceutics' },
  { value: '31', label: 'Physics and Astronomy' },
  { value: '32', label: 'Psychology' },
  { value: '33', label: 'Social Sciences' },
  { value: '34', label: 'Veterinary' },
];

export const PUBLICATION_TYPES: { value: string; label: string }[] = [
  { value: 'article', label: 'Article' },
  { value: 'preprint', label: 'Preprint' },
  { value: 'review', label: 'Review' },
  { value: 'book', label: 'Book' },
  { value: 'book-chapter', label: 'Book chapter' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'dissertation', label: 'Dissertation' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'letter', label: 'Letter' },
  { value: 'report', label: 'Report' },
  { value: 'other', label: 'Other' },
];

/** Display names for the keys in a paper's `sources` list. */
export const SOURCE_LABELS: Record<string, string> = {
  openalex: 'OpenAlex',
  crossref: 'Crossref',
  europepmc: 'Europe PMC',
  arxiv: 'arXiv',
  opencitations: 'OpenCitations',
  unpaywall: 'Unpaywall',
  semanticscholar: 'Semantic Scholar',
};

/** Keys of a paper's externalIds; keep in sync with the ID_* constants on the backend's PaperDetail. */
export const EXTERNAL_ID = { DOI: 'DOI', ARXIV: 'ArXiv', PUBMED: 'PubMed', OPENALEX: 'OpenAlex' } as const;
