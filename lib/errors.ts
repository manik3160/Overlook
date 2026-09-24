// Thrown when a provider says "slow down" (HTTP 429/503). The batch stops and the asset stays pending.
export class RateLimitError extends Error {
  constructor(public provider: string, detail: string) {
    super(`${provider} rate limited: ${detail}`)
    this.name = "RateLimitError"
  }
}
