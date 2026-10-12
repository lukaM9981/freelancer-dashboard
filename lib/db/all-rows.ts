const PAGE_SIZE = 1000;

type Page<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Reads every row. PostgREST stops at 1,000 unless the caller pages, and a month
 * report can be larger than that (Tech.md §10).
 */
export async function fetchAllRows<T>(
  load: (from: number, to: number) => PromiseLike<Page<T>>,
  label: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await load(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}
