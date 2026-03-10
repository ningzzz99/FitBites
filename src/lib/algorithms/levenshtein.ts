import type { TrieNode } from '@/types';

// ─── Trie ─────────────────────────────────────────────────────────────────────

export function buildTrie(words: string[]): TrieNode {
  const root: TrieNode = { children: new Map(), isEnd: false };
  for (const word of words) {
    let node = root;
    for (const ch of word.toLowerCase()) {
      if (!node.children.has(ch)) {
        node.children.set(ch, { children: new Map(), isEnd: false });
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
  }
  return root;
}

/** Return all words in the trie that start with `prefix`. */
export function trieSearch(root: TrieNode, prefix: string): string[] {
  let node = root;
  const lower = prefix.toLowerCase();
  for (const ch of lower) {
    if (!node.children.has(ch)) return [];
    node = node.children.get(ch)!;
  }
  // DFS to collect all completions
  const results: string[] = [];
  function dfs(n: TrieNode, acc: string) {
    if (n.isEnd) results.push(acc);
    for (const [ch, child] of n.children) dfs(child, acc + ch);
  }
  dfs(node, lower);
  return results;
}

// ─── Levenshtein distance ─────────────────────────────────────────────────────

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// ─── Combined suggest ─────────────────────────────────────────────────────────

/**
 * Given a user's partial input and a pre-built trie, return up to `limit`
 * suggestions sorted by edit distance (closest match first).
 *
 * Strategy:
 *  1. Use trie prefix search to cheaply gather candidates.
 *  2. If fewer than `limit` candidates found, fall back to the full word list
 *     and filter by edit distance ≤ threshold.
 *  3. Sort all candidates by edit distance to the input.
 */
export function suggest(
  input: string,
  trie: TrieNode,
  allWords: string[],
  limit = 8,
  distanceThreshold = 3
): string[] {
  if (!input) return [];

  const lower = input.toLowerCase();

  // Phase 1: prefix matches via trie
  let candidates = trieSearch(trie, lower);

  // Phase 2: fuzzy fallback if prefix yields nothing
  if (candidates.length === 0) {
    candidates = allWords.filter(
      (w) => editDistance(lower, w.toLowerCase()) <= distanceThreshold
    );
  }

  // Sort by edit distance to input
  candidates.sort(
    (a, b) => editDistance(lower, a.toLowerCase()) - editDistance(lower, b.toLowerCase())
  );

  return candidates.slice(0, limit);
}
