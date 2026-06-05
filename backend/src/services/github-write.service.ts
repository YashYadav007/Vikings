export interface GitHubWriteResult {
  branchName: string;
  commitSha: string;
  prUrl: string;
}

export interface FileUpdateInput {
  path: string;
  content: string;
}

export class GitHubWriteService {
  private readonly apiBase = "https://api.github.com";
  private readonly token = process.env.GITHUB_TOKEN;
  private readonly mockWrite = process.env.MOCK_GITHUB_WRITE !== "false";

  isMockWrite(): boolean {
    return this.mockWrite;
  }

  hasToken(): boolean {
    return Boolean(this.token);
  }

  async applyPatch(params: {
    owner?: string;
    repo?: string;
    baseBranch?: string;
    branchName: string;
    title: string;
    body: string;
    files: FileUpdateInput[];
  }): Promise<GitHubWriteResult> {
    if (this.mockWrite) {
      return {
        branchName: params.branchName,
        commitSha: `mock-${Date.now().toString(16)}`,
        prUrl: `https://github.com/${params.owner ?? "mock"}/${params.repo ?? "repo"}/pull/devcontext-mock`,
      };
    }

    if (!this.token) {
      throw new Error("GITHUB_TOKEN missing or repo not writable");
    }
    if (!params.owner || !params.repo || !params.baseBranch) {
      throw new Error("Imported GitHub project metadata is required for apply.");
    }

    await this.checkRepoWriteAccess(params.owner, params.repo);
    await this.createBranch(params.owner, params.repo, params.baseBranch, params.branchName);

    let lastCommitSha = "";
    for (const file of params.files) {
      const sha = await this.getFileSha(params.owner, params.repo, file.path, params.branchName);
      lastCommitSha = await this.updateFile(params.owner, params.repo, file.path, file.content, params.title, params.branchName, sha);
    }

    const prUrl = await this.createPullRequest(
      params.owner,
      params.repo,
      params.title,
      params.body,
      params.branchName,
      params.baseBranch,
    );

    return {
      branchName: params.branchName,
      commitSha: lastCommitSha,
      prUrl,
    };
  }

  async checkRepoWriteAccess(owner: string, repo: string): Promise<void> {
    await this.githubRequest(`/repos/${owner}/${repo}`, { method: "GET" });
  }

  async getDefaultBranchRef(owner: string, repo: string, branch: string): Promise<string> {
    const response = await this.githubRequest<{ object?: { sha?: string } }>(
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      { method: "GET" },
    );
    if (!response.object?.sha) throw new Error("Could not resolve default branch ref.");
    return response.object.sha;
  }

  async createBranch(owner: string, repo: string, baseBranch: string, newBranch: string): Promise<void> {
    const sha = await this.getDefaultBranchRef(owner, repo, baseBranch);
    await this.githubRequest(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha,
      }),
    });
  }

  async getFileSha(owner: string, repo: string, path: string, branch: string): Promise<string> {
    const response = await this.githubRequest<{ sha?: string }>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
      { method: "GET" },
    );
    if (!response.sha) throw new Error(`Could not get file sha for ${path}.`);
    return response.sha;
  }

  async updateFile(owner: string, repo: string, path: string, content: string, message: string, branch: string, sha: string): Promise<string> {
    const response = await this.githubRequest<{ commit?: { sha?: string } }>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
          sha,
        }),
      },
    );
    return response.commit?.sha ?? "";
  }

  async createPullRequest(owner: string, repo: string, title: string, body: string, head: string, base: string): Promise<string> {
    const response = await this.githubRequest<{ html_url?: string }>(`/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title, body, head, base }),
    });
    return response.html_url ?? "";
  }

  private async githubRequest<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const body = (await response.json()) as unknown;
    if (!response.ok) {
      const message = typeof (body as { message?: unknown }).message === "string" ? (body as { message: string }).message : response.statusText;
      throw new Error(`GitHub write failed ${response.status}: ${message}`);
    }
    return body as T;
  }
}
