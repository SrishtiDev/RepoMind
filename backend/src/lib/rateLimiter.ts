/**
 * rateLimiter.ts - Simple in-memory queue to limit API calls and retry on 429s.
 * Ensures we don't exceed the Gemini API free tier limits (15 RPM / 1M TPM).
 */

export class RateLimiter {
  private queue: Array<() => void> = [];
  private isProcessing = false;
  private readonly delayMs: number;

  constructor(maxRequestsPerMinute: number = 4) {
    this.delayMs = 60000 / maxRequestsPerMinute;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next(); // Start execution
        // Enforce exact delay between the START of each call to smooth them out
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }
    }
    
    this.isProcessing = false;
  }

  public async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err: any) {
          const isRateLimit = err?.status === 429 || err?.message?.includes("429");
          if (isRateLimit) {
            console.warn(`[RateLimiter] 429 Too Many Requests encountered. Waiting 60s to retry ONCE...`);
            setTimeout(async () => {
              try {
                const retryResult = await fn();
                resolve(retryResult);
              } catch (retryErr) {
                reject(retryErr);
              }
            }, 60000); // Wait 60s before the single retry
          } else {
            reject(err);
          }
        }
      });
      this.processQueue();
    });
  }
}

// Global singleton instance for all Gemini calls across the app
export const geminiRateLimiter = new RateLimiter(4);
