/**
 * RPC 封装 —— 统一超时、授权头、错误语义。
 * 返回值是 discriminated union，调用方无需再判 data.error。
 */

export const ROUTE = '/__dsh/project-cockpit'
export const AUTH_HEADER = 'project-cockpit'
export const REGISTRY_ID = 'project-cockpit'
export const SETTINGS_NS = 'code-constellation'

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function callRpc<T = unknown>(method: string, payload: unknown): Promise<RpcResult<T>> {
  try {
    const res = await fetch(`${ROUTE}/${method}`, {
      method: 'POST',
      headers: {
        'X-DSH-Request': AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = await res.json()
    if (data && typeof data === 'object' && (data as any).ok === false) {
      return { ok: false, error: String((data as any).error ?? 'rpc error') }
    }
    return { ok: true, data: data as T }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : String(cause) }
  }
}