/**
 * Utility to check if a range is within any of the current selections.
 */
import { EditorState } from '@codemirror/state';

/**
 * Checks if any of the selections within the given EditorState has overlap with
 * the provided range.
 *
 * @param state The state to draw selections from
 * @param rangeFrom The start position of the range
 * @param rangeTo The end position of the range
 * @return True if any selection overlaps with the range
 */
export function rangeInSelection(state: EditorState, rangeFrom: number, rangeTo: number): boolean {
  return state.selection.ranges
    .map(range => [range.from, range.to])
    .filter(([from, to]) => !(to <= rangeFrom || from >= rangeTo))
    .length > 0;
}