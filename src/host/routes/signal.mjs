import { assessSignal } from '../../engines/signal.mjs'
import { ok, bad, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/signal',
  async handle(req) {
    const input = await readJsonBody(req)
    if (!input || typeof input.sourceVerifiability !== 'string') {
      return bad('signal requires sourceVerifiability (high|medium|low)')
    }
    return ok({ assessment: assessSignal(input) })
  },
}