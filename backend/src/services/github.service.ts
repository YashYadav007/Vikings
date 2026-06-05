import { GitHubRepoMetadata, GitHubTreeFile, RepoFile } from "../types";

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}

interface GitHubTreeResponse {
  tree?: Array<{
    path?: string;
    type?: string;
    size?: number;
  }>;
}

export class GitHubService {
  private readonly apiBase = "https://api.github.com";
  private readonly token = process.env.GITHUB_TOKEN;

  constructor() {
    if (!this.token) {
      console.warn("GITHUB_TOKEN is not set. Public repo import will use unauthenticated GitHub requests and lower rate limits.");
    }
  }

  parseGitHubUrl(repoUrl: string): ParsedGitHubUrl {
    let parsed: URL;

    try {
      parsed = new URL(repoUrl);
    } catch {
      throw new Error("Invalid GitHub URL. Expected https://github.com/owner/repo.");
    }

    if (parsed.hostname !== "github.com") {
      throw new Error("Only github.com public repository URLs are supported.");
    }

    const [owner, rawRepo] = parsed.pathname.replace(/^\/+/, "").split("/");
    const repo = rawRepo?.replace(/\.git$/, "");

    if (!owner || !repo) {
      throw new Error("Invalid GitHub URL. Expected https://github.com/owner/repo.");
    }

    return { owner, repo };
  }

  async fetchRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
    const response = await this.githubRequest<Record<string, unknown>>(`/repos/${owner}/${repo}`);

    return {
      owner,
      repoName: repo,
      name: this.asString(response.name) ?? repo,
      fullName: this.asString(response.full_name) ?? `${owner}/${repo}`,
      description: this.asString(response.description) ?? "",
      repoUrl: this.asString(response.html_url) ?? `https://github.com/${owner}/${repo}`,
      defaultBranch: this.asString(response.default_branch) ?? "main",
      language: this.asString(response.language),
    };
  }

  async fetchDefaultBranch(owner: string, repo: string): Promise<string> {
    return (await this.fetchRepoMetadata(owner, repo)).defaultBranch;
  }

  async fetchRepoTree(owner: string, repo: string, branch: string): Promise<GitHubTreeFile[]> {
    const response = await this.githubRequest<GitHubTreeResponse>(
      `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    );

    return (response.tree ?? [])
      .filter((item) => item.path && item.type === "blob")
      .map((item) => ({
        path: item.path as string,
        size: item.size ?? 0,
        type: "blob",
      }));
  }

  async fetchFileContent(owner: string, repo: string, path: string, branch: string): Promise<RepoFile> {
    const response = await this.githubRequest<Record<string, unknown>>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
    );
    const encoded = this.asString(response.content);
    const encoding = this.asString(response.encoding);

    if (!encoded || encoding !== "base64") {
      throw new Error(`Could not decode GitHub file content for ${path}.`);
    }

    return {
      path,
      content: Buffer.from(encoded.replace(/\n/g, ""), "base64").toString("utf8"),
      size: Number(response.size ?? 0),
    };
  }

  private async githubRequest<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });

    const body = (await response.json()) as unknown;

    if (!response.ok) {
      const message = this.asString((body as { message?: unknown }).message) ?? response.statusText;
      throw new Error(`GitHub API error ${response.status}: ${message}`);
    }

    return body as T;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }
}
