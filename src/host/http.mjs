/**
 * http.mjs —— 路由共享的 HTTP 工具（授权、JSON 响应、body 解析）。
 */

export const REQUIRED_HEADER = 'project-cockpit'

/** 请求是否携带合法授权头（OPTIONS 预检不要求） */
export function isAuthorized(req) {
  if (req?.method === 'OPTIONS') return false
  return req?.headers?.['x-dsh-request'] === REQUIRED_HEADER
}

/** 写 JSON 响应 */
export function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

/** 成功响应的 [status, body] 元组 */
export function ok(body = {}) {
  return [200, { ok: true, ...body }]
}

/** 失败响应的 [status, body] 元组 */
export function bad(msg, code = 400) {
  return [code, { ok: false, error: msg }]
}

/**
 * 读取请求 body 并 JSON.parse。
 * 兼容两种宿主：已解析的 req.body（对象）/ 未解析的 stream。
 * 解析失败一律 resolve 空对象，由 handler 自己校验必填字段。
 */
export function readJsonBody(req) {
  return new Promise((resolve) => {
    if (req?.body && typeof req.body === 'object') return resolve(req.body)
    if (req && typeof req.on === 'function') {
      let buf = ''
      req.on('data', (chunk) => { buf += String(chunk) })
      req.on('end', () => {
        try {
          resolve(buf ? JSON.parse(buf) : {})
        } catch {
          resolve({})
        }
      })
      req.on('error', () => resolve({}))
    } else {
      resolve({})
    }
  })
}