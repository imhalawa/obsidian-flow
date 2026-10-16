/** Returns the indexes of the middle crumbs to hide so the path fits: the first and last crumbs always stay and hiding starts at the second. */
export function hiddenCrumbs(
	widths: readonly number[],
	ellipsisWidth: number,
	available: number,
): number[] {
	const hidden: number[] = [];
	let total = widths.reduce((sum, width) => sum + width, 0);
	if (total <= available) return hidden;
	let next = 1;
	let shown = total;
	while (next < widths.length - 1 && shown > available) {
		total -= widths[next] ?? 0;
		hidden.push(next);
		next += 1;
		shown = total + ellipsisWidth;
	}
	return hidden;
}
