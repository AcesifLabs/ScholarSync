export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: string;
  source: string;
  pdfUrl: string;
  isOpenAccess: boolean;
  relatedReason?: string;
  openAccessPdf?: string;
}

export interface ReadingList {
  id: string;
  name: string;
  description?: string;
  paperIds: string[];
  createdAt: number;
  color?: string;
}
