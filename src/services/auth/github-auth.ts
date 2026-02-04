import { octokitFromAuth } from "octokit-from-auth";

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestedActions: string[],
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AuthenticationError";
  }

  toUserMessage(): string {
    return [
      `Error: ${this.message}`,
      "",
      "To resolve, try one of:",
      ...this.suggestedActions.map((a, i) => `  ${i + 1}. ${a}`),
    ].join("\n");
  }
}

export async function getGitHubClient(): Promise<any> {
  try {
    return await octokitFromAuth();
  } catch (error) {
    throw new AuthenticationError(
      "GitHub authentication failed",
      "GITHUB_AUTH_FAILED",
      [
        "Set GITHUB_TOKEN or GH_TOKEN environment variable",
        "Run 'gh auth login' to authenticate GitHub CLI",
      ],
      error
    );
  }
}

export async function validateGitHubAuth(octokit: any): Promise<string> {
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}
