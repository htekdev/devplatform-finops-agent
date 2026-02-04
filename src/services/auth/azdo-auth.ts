import { DefaultAzureCredential } from "@azure/identity";
import * as azdev from "azure-devops-node-api";

const AZURE_DEVOPS_RESOURCE_ID = "499b84ac-1321-427f-aa17-267ca6975798";
const AZURE_DEVOPS_SCOPE = `${AZURE_DEVOPS_RESOURCE_ID}/.default`;

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

export interface AzureDevOpsConnection {
  connection: azdev.WebApi;
  authType: "pat" | "entra";
}

export async function getAzureDevOpsClient(
  organization: string
): Promise<AzureDevOpsConnection> {
  const orgUrl = `https://dev.azure.com/${organization}`;

  const pat = process.env.AZURE_DEVOPS_PAT || process.env.AZURE_DEVOPS_EXT_PAT;
  if (pat) {
    const authHandler = azdev.getPersonalAccessTokenHandler(pat);
    return {
      connection: new azdev.WebApi(orgUrl, authHandler),
      authType: "pat",
    };
  }

  try {
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken(AZURE_DEVOPS_SCOPE);

    const authHandler = azdev.getBearerHandler(tokenResponse.token);
    return {
      connection: new azdev.WebApi(orgUrl, authHandler),
      authType: "entra",
    };
  } catch (error) {
    throw new AuthenticationError(
      "Azure DevOps authentication failed",
      "AZDO_AUTH_FAILED",
      [
        "Set AZURE_DEVOPS_PAT environment variable",
        "Run 'az login' to authenticate Azure CLI",
        "Configure managed identity (if running in Azure)",
      ],
      error
    );
  }
}

export async function validateAzureDevOpsAuth(
  connection: azdev.WebApi
): Promise<number> {
  const coreApi = await connection.getCoreApi();
  const projects = await coreApi.getProjects();
  return projects.length;
}
