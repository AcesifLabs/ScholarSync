import { describe, expect, it } from 'vitest';
import { groupAnnotationsByPage, isScaledPosition, ScaledPosition, toScaledPosition, toViewport } from './highlight';

const page = { left: 100, top: 50, width: 600, height: 800 };

describe('toScaledPosition', () => {
  it('converts client rects to page coordinates and computes the bounding box', () => {
    const pos = toScaledPosition([
      { left: 150, top: 100, right: 400, bottom: 115 },
      { left: 110, top: 116, right: 300, bottom: 131 },
    ], page, 3)!;

    expect(pos.pageNumber).toBe(3);
    expect(pos.rects).toEqual([
      { x1: 50, y1: 50, x2: 300, y2: 65, width: 600, height: 800 },
      { x1: 10, y1: 66, x2: 200, y2: 81, width: 600, height: 800 },
    ]);
    expect(pos.boundingRect).toEqual({ x1: 10, y1: 50, x2: 300, y2: 81, width: 600, height: 800 });
  });

  it('clips rects that spill outside the page and drops empty ones', () => {
    const pos = toScaledPosition([
      { left: 650, top: 840, right: 900, bottom: 900 },
      { left: 0, top: 0, right: 50, bottom: 40 },
      { left: 200, top: 200, right: 200, bottom: 220 },
    ], page, 1)!;
    expect(pos.rects).toEqual([{ x1: 550, y1: 790, x2: 600, y2: 800, width: 600, height: 800 }]);
  });

  it('returns null when nothing lies on the page', () => {
    expect(toScaledPosition([], page, 1)).toBeNull();
    expect(toScaledPosition([{ left: 0, top: 0, right: 10, bottom: 10 }], page, 1)).toBeNull();
  });
});

describe('toViewport', () => {
  const rect = { x1: 60, y1: 80, x2: 120, y2: 100, width: 600, height: 800 };

  it('is the identity at the capture size', () => {
    expect(toViewport(rect, 600, 800)).toEqual({ left: 60, top: 80, width: 60, height: 20 });
  });

  it('scales with the rendered page size', () => {
    expect(toViewport(rect, 1200, 1600)).toEqual({ left: 120, top: 160, width: 120, height: 40 });
    expect(toViewport(rect, 300, 400)).toEqual({ left: 30, top: 40, width: 30, height: 10 });
  });
});

describe('groupAnnotationsByPage', () => {
  const at = (id: string, pageNumber: number, y1: number) => ({
    id,
    position: { pageNumber, boundingRect: { x1: 0, y1, x2: 1, y2: y1 + 1, width: 1, height: 1 }, rects: [] } as ScaledPosition,
  });

  it('groups by page ascending and sorts each page top to bottom', () => {
    const grouped = groupAnnotationsByPage([at('c', 2, 5), at('b', 1, 300), at('a', 1, 10), at('d', 2, 1)]);
    expect([...grouped.keys()]).toEqual([1, 2]);
    expect(grouped.get(1)!.map(a => a.id)).toEqual(['a', 'b']);
    expect(grouped.get(2)!.map(a => a.id)).toEqual(['d', 'c']);
  });

  it('handles an empty list', () => {
    expect(groupAnnotationsByPage([]).size).toBe(0);
  });
});

describe('isScaledPosition', () => {
  const valid = { pageNumber: 1, boundingRect: { x1: 0, y1: 0, x2: 1, y2: 1, width: 1, height: 1 }, rects: [{ x1: 0, y1: 0, x2: 1, y2: 1, width: 1, height: 1 }] };

  it.each([
    [valid, true],
    [{ ...valid, rects: [] }, true],
    [null, false],
    [{}, false],
    [{ ...valid, pageNumber: '1' }, false],
    [{ ...valid, rects: undefined }, false],
    [{ ...valid, rects: [{ x1: 0, width: 0 }] }, false],
  ])('%j → %s', (value, expected) => {
    expect(isScaledPosition(value)).toBe(expected);
  });
});
