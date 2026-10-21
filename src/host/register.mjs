/**
 * register.mjs —— 把路由表批量注册到 webServer，返回统一 disposer。
 *
 * 单个路由注册失败（如路径冲突）只 warn，不中断其余路由。
 * 返回的 disposer 会按注册顺序反向调用所有 webServer.register 的 disposer。
 */

import { json, isAuthorized } from './http.mjs'

export function registerRoutes(webCtx, routes, routePrefix) {
  const disposers = []

  for (const route of routes) {
    const fullPath = `${routePrefix}${route.path}`
    try {
      const dispose = webCtx.webServer.register({
        kind: 'exact',
        method: route.method,
        path: fullPath,
        handler: async (req, res) => {
          if (!isAuthorized(req)) {
            json(res, 403, { ok: false, error: 'unauthorized' })
            return
          }
          try {
            const [status, body] = await route.handle(req)
            json(res, status, body)
          } catch (e) {
            json(res, 500, { ok: false, error: String(e?.message ?? e) })
          }
        },
      })
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (err) {
      console.warn(`[project-cockpit] ${route.method} ${fullPath} register failed`, err)
    }
  }

  return () => {
    for (let i = disposers.length - 1; i >= 0; i--) {
      try { disposers[i]() } catch { /* noop */ }
    }
    disposers.length = 0
  }
}