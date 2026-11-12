import type { Schemas } from '@/app/api/client';
import type { ScaledPosition } from '@/app/lib/utils/highlight';

/** An annotation whose position passed isScaledPosition, so it can be drawn on the PDF. */
export type PositionedAnnotation = Schemas['AnnotationResponse'] & { position: ScaledPosition };

export type VisibilityOption = { value: string; label: string };
