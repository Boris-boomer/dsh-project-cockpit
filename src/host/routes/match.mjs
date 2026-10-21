import { scoreMatch } from '../../engines/match.mjs'
import { ok, bad, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/match',
  async handle(req) {
    const { opportunity, project, capabilities } = await readJsonBody(req)
    if (!opportunity || !project) return bad('match requires opportunity and project')
    return ok({ match: scoreMatch(opportunity, project, capabilities ?? []) })
  },
}