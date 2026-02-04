export class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private minDelayMs: number;
  private lastRequestTime = 0;

  constructor(requestsPerMinute: number = 60) {
    this.minDelayMs = (60 * 1000) / requestsPerMinute;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minDelayMs) {
        await this.sleep(this.minDelayMs - timeSinceLastRequest);
      }

      const task = this.queue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export async function withRateLimit<T>(
  limiter: RateLimiter,
  fn: () => Promise<T>
): Promise<T> {
  return limiter.execute(fn);
}
