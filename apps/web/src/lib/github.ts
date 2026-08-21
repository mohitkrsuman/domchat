export type GithubRepo = { owner: string; repo: string };

const MAX_FILE_CHARS = 20_000;
const USER_AGENT = "DomChat-agent/0.1";

export function parseGithubRepo(url: string | null | undefined): GithubRepo | null {
  if (!url) return null;
  try {
    const trimmed = url.trim();
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function githubHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function githubFetch(url: string) {
  const res = await fetch(url, { headers: githubHeaders() });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep text
  }
  return { ok: res.ok, status: res.status, json, text };
}

function truncate(value: string, max = MAX_FILE_CHARS) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n… truncated (${value.length} chars)`;
}

export async function readGithubFile(repo: GithubRepo, path: string): Promise<string> {
  const clean = path.replace(/^\/+/, "");
  if (!clean) return "Error: path is required";

  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/${encodeURI(clean)}`;
  const { ok, status, json } = await githubFetch(url);
  if (!ok) {
    return `Error: GitHub read_file failed (${status}) ${typeof json === "object" && json && "message" in json ? String((json as { message: string }).message) : ""}`.trim();
  }

  if (Array.isArray(json)) {
    const names = json
      .map((entry) => {
        const item = entry as { type?: string; name?: string };
        return `${item.type === "dir" ? "dir" : "file"} ${item.name ?? ""}`;
      })
      .filter(Boolean);
    return `Directory ${clean}:\n${names.join("\n") || "(empty)"}`;
  }

  const file = json as { type?: string; encoding?: string; content?: string; size?: number; download_url?: string };
  if (file.type !== "file") {
    return `Error: ${clean} is not a file`;
  }
  if ((file.size ?? 0) > 500_000) {
    return `Error: file is too large (${file.size} bytes)`;
  }

  if (file.encoding === "base64" && file.content) {
    const decoded = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
    return truncate(decoded);
  }

  if (file.download_url) {
    const raw = await fetch(file.download_url, { headers: { "User-Agent": USER_AGENT } });
    return truncate(await raw.text());
  }

  return "Error: file content unavailable";
}

export async function searchGithubRepo(repo: GithubRepo, query: string): Promise<string> {
  const q = query.trim();
  if (!q) return "Error: query is required";

  if (process.env.GITHUB_TOKEN) {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(`${q} repo:${repo.owner}/${repo.repo}`)}`;
    const { ok, status, json } = await githubFetch(url);
    if (ok) {
      const items = (json as { items?: Array<{ path?: string; html_url?: string }> }).items ?? [];
      if (items.length === 0) return `No code search matches for “${q}”.`;
      return items
        .slice(0, 15)
        .map((item) => item.path)
        .filter(Boolean)
        .join("\n");
    }
    if (status !== 401 && status !== 403 && status !== 422) {
      return `Error: GitHub search failed (${status})`;
    }
  }

  return searchByTree(repo, q);
}

async function searchByTree(repo: GithubRepo, query: string): Promise<string> {
  const repoUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const meta = await githubFetch(repoUrl);
  if (!meta.ok) {
    return `Error: could not load repo (${meta.status})`;
  }
  const defaultBranch = String((meta.json as { default_branch?: string }).default_branch ?? "main");
  const treeUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`;
  const tree = await githubFetch(treeUrl);
  if (!tree.ok) {
    return `Error: could not list repo tree (${tree.status})`;
  }

  const needle = query.toLowerCase();
  const paths = ((tree.json as { tree?: Array<{ path?: string; type?: string }> }).tree ?? [])
    .filter((entry) => entry.type === "blob" && entry.path?.toLowerCase().includes(needle))
    .map((entry) => entry.path)
    .filter((path): path is string => Boolean(path))
    .slice(0, 30);

  if (paths.length === 0) {
    return `No path matches for “${query}” in ${repo.owner}/${repo.repo}. Try a filename fragment.`;
  }
  return paths.join("\n");
}
