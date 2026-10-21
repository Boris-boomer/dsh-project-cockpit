import { PIPELINE_STAGES } from '../../pipeline.mjs'
import { ok } from '../http.mjs'

export default {
  method: 'POST',
  path: '/pipeline-stages',
  async handle() {
    return ok({ stages: PIPELINE_STAGES })
  },
}