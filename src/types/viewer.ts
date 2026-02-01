export interface PdfDisplayProps {
    isPdf: boolean | null;
    pdfUrl: string;
    title: string;
    verifyingPdf: boolean;
}

export interface ViewerHeaderProps {
    title: string;
    authors: string[];
    year: string;
    pdfUrl: string;
    onBack: () => void;
}
