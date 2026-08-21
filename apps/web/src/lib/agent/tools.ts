import { parseGithubRepo, readGithubFile, searchGithubRepo, type GithubRepo } from "@/lib/github";
import type { LlmTool } from "@/lib/llm";

export const AGENT_TOOLS: LlmTool[] = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the session's public GitHub repository. Path is relative to the repo root.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path from the repository root" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_repo",
      description: "Search the public GitHub repository for files or code matching a query.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keyword, symbol, or path fragment to search for" },
        },
        required: ["query"],
      },
    },
  },
];

export function summarizeArgs(args: Record<string, unknown>) {
  const entries = Object.entries(args).slice(0, 6);
  if (entries.length === 0) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (typeof value === "string") out[key] = value.slice(0, 200);
    else out[key] = value;
  }
  return out;
}

export function parseToolArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return { raw: raw.slice(0, 400) };
  }
}

export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  repoUrl: string | null
): Promise<string> {
  const repo: GithubRepo | null = parseGithubRepo(repoUrl);
  if (!repo) {
    return "Error: this session has no public GitHub repo URL. Ask the user to set one, or continue from pasted context only.";
  }

  if (name === "read_file") {
    const path = typeof args.path === "string" ? args.path : "";
    return readGithubFile(repo, path);
  }
  if (name === "search_repo") {
    const query = typeof args.query === "string" ? args.query : "";
    return searchGithubRepo(repo, query);
  }
  return `Error: unknown tool ${name}`;
}
