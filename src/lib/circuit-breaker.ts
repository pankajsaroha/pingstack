export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Consecutive failures before opening circuit (default: 5)
  cooldownMs?: number;       // Cooldown duration in ms before half-open state (default: 30000ms)
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class MetaCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private nextAttemptTime = 0;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30000;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  public checkState(): void {
    const currentState = this.getState();
    if (currentState === 'OPEN') {
      const remainingSec = Math.ceil((this.nextAttemptTime - Date.now()) / 1000);
      throw new CircuitBreakerOpenError(
        `Meta API Circuit Breaker is OPEN due to ${this.consecutiveFailures} consecutive failures. Pausing API requests for ${remainingSec}s.`
      );
    }
  }

  public recordSuccess(): void {
    if (this.state !== 'CLOSED') {
      console.log('✅ [Circuit Breaker] Meta API request succeeded. Resetting Circuit Breaker state to CLOSED.');
    }
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.nextAttemptTime = 0;
  }

  public recordFailure(isTransient: boolean): void {
    if (!isTransient) {
      // Non-transient errors (e.g. 400 Bad Request, invalid payload) do not trip the circuit breaker
      return;
    }

    this.consecutiveFailures += 1;
    console.warn(
      `⚠️ [Circuit Breaker] Recorded consecutive Meta API transient failure (${this.consecutiveFailures}/${this.failureThreshold})`
    );

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.cooldownMs;
      console.error(
        `🚨 [Circuit Breaker] Failure threshold reached (${this.consecutiveFailures}). Circuit Breaker switched to OPEN for ${this.cooldownMs / 1000}s.`
      );
    }
  }
}

export const metaCircuitBreaker = new MetaCircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 30000,
});
