import pLimit from "p-limit";

export interface BatchConfig {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

export async function batchApiCalls<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  config: BatchConfig = {}
): Promise<R[]> {
  const { concurrency = 5, onProgress } = config;
  const limit = pLimit(concurrency);

  const promises = items.map((item, index) =>
    limit(async () => {
      const result = await operation(item);
      if (onProgress) {
        onProgress(index + 1, items.length);
      }
      return result;
    })
  );

  return Promise.all(promises);
}

export async function batchApiCallsWithErrors<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  config: BatchConfig = {}
): Promise<Array<{ item: T; result?: R; error?: Error }>> {
  const { concurrency = 5, onProgress } = config;
  const limit = pLimit(concurrency);

  const promises = items.map((item, index) =>
    limit(async () => {
      try {
        const result = await operation(item);
        if (onProgress) {
          onProgress(index + 1, items.length);
        }
        return { item, result };
      } catch (error) {
        if (onProgress) {
          onProgress(index + 1, items.length);
        }
        return { item, error: error as Error };
      }
    })
  );

  return Promise.all(promises);
}
