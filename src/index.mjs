/**
 * dsh-project-cockpit · 插件入口（host 侧）。
 *
 * 把四个引擎暴露为 DSH webServer 路由。所有路由均要求 x-dsh-request 授权头。
 * 路由注册统一走 ctx.effect，webServer 热替换或插件 dispose 时自动清理。
 */

import { routes } from './host/routes/index.mjs'
import { registerRoutes } from './host/register.mjs'

export const name = 'dsh-project-cockpit'

const ROUTE_PREFIX = '/__dsh/project-cockpit'

export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    ctx.effect(
      () => registerRoutes(webCtx, routes, ROUTE_PREFIX),
      'cockpit:routes',
    )
  })
}

export { isAuthorized } from './host/http.mjs'