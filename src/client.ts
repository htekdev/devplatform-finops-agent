import { CopilotClient } from '@github/copilot-sdk';

let clientInstance: CopilotClient | null = null;

export async function getCopilotClient(): Promise<CopilotClient> {
  if (!clientInstance) {
    clientInstance = new CopilotClient();
    await clientInstance.start();
  }
  return clientInstance;
}

export async function closeCopilotClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.stop();
    clientInstance = null;
  }
}
