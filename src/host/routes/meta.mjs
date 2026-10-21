import { loadModels, loadCareers, SCENES } from '../../engines/cost.mjs'
import { ok } from '../http.mjs'

export default {
  method: 'POST',
  path: '/meta',
  async handle() {
    const models = loadModels()
    const careers = loadCareers()
    const modelOptions = Object.entries(models).map(([key, m]) => ({
      key,
      name: m.name,
      api_price: m.api_price,
      ref_cost: m.ref_cost,
      ref_hardware: m.ref_hardware,
    }))
    const careerOptions = Object.entries(careers).map(([key, c]) => ({
      key,
      name: c.name,
      desc: c.desc,
      daily_default: c.daily_default,
    }))
    const scenes = Object.entries(SCENES).map(([key, s]) => ({ key, label: s.label }))
    return ok({ models: modelOptions, careers: careerOptions, scenes })
  },
}