/**
 * Rate Limiter para Airtable API
 *
 * Airtable tiene un límite de 5 requests por segundo para el plan estándar.
 * Este rate limiter encola las requests y las procesa con un delay mínimo
 * de 220ms entre cada una para evitar errores 429 (Too Many Requests).
 */

type QueueItem<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

class AirtableRateLimiter {
  private queue: QueueItem<unknown>[] = [];
  private processing = false;
  private lastRequest = 0;
  private minDelay = 220; // 5 requests/sec = 200ms + 20ms margen de seguridad

  /**
   * Encola una función para ser ejecutada respetando el rate limit
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  /**
   * Procesa la cola de requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;

      // Esperar si no ha pasado suficiente tiempo desde la última request
      if (timeSinceLastRequest < this.minDelay) {
        await this.sleep(this.minDelay - timeSinceLastRequest);
      }

      const item = this.queue.shift();
      if (item) {
        this.lastRequest = Date.now();
        try {
          const result = await item.fn();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Helper para sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtiene el número de items pendientes en la cola
   */
  get pendingCount(): number {
    return this.queue.length;
  }

  /**
   * Limpia la cola (útil para cancelar operaciones pendientes)
   */
  clear(): void {
    this.queue.forEach((item) => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

// Singleton para uso en toda la aplicación
export const airtableRateLimiter = new AirtableRateLimiter();
