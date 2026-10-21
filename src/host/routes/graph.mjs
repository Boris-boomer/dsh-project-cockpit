import { buildProjectGraph } from '../../engines/constellation.mjs'
import { ok, readJsonBody } from '../http.mjs'

export default {
  method: 'POST',
  path: '/graph',
  async handle(req) {
    const { projects, capabilities, projectCaps, projectRelations, rootPath } = await readJsonBody(req)
    const graph = buildProjectGraph(
      projects ?? [],
      capabilities ?? [],
      projectCaps ?? [],
      projectRelations ?? [],
      rootPath ?? '',
    )
    return ok({ graph })
  },
}