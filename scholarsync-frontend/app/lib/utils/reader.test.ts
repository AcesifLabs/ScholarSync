import { describe, expect, it } from 'vitest';
import { clampPage, initialPage, shouldMarkInProgress, stepZoom } from './reader';

describe('stepZoom', () => {
  it('moves one step and stops at the ends', () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(3, 1)).toBe(3);
    expect(stepZoom(0.5, -1)).toBe(0.5);
    expect(stepZoom(1.05, 1)).toBe(1.1);
    expect(stepZoom(1.05, -1)).toBe(1);
  });
});

describe('clampPage', () => {
  it.each([
    ['3', 10, 3], [' 7 ', 10, 7], ['0', 10, 1], ['99', 10, 10], [4.6, 10, 5],
    ['', 10, null], ['abc', 10, null], [null, 10, null], ['3', 0, null],
  ] as const)('%j of %i → %j', (raw, pages, expected) => {
    expect(clampPage(raw, pages)).toBe(expected);
  });
});

describe('initialPage', () => {
  it('prefers a linked annotation, then the URL page, then the saved page', () => {
    expect(initialPage({ annotationPage: 8, pageParam: '3', lastPage: 5, numPages: 10 })).toBe(8);
    expect(initialPage({ pageParam: '3', lastPage: 5, numPages: 10 })).toBe(3);
    expect(initialPage({ pageParam: 'x', lastPage: 5, numPages: 10 })).toBe(5);
    expect(initialPage({ lastPage: 50, numPages: 10 })).toBe(10);
    expect(initialPage({ numPages: 10 })).toBe(1);
  });
});

describe('shouldMarkInProgress', () => {
  it.each([
    ['TO_READ', 2, true],
    ['TO_READ', 1, false],
    ['IN_PROGRESS', 5, false],
    ['DONE', 5, false],
    [undefined, 5, false],
  ] as const)('%s on page %i -> %s', (status, page, expected) => {
    expect(shouldMarkInProgress(status, page)).toBe(expected);
  });
});
