import { useCallback, useRef, useState } from 'react'
import type { RpcResult } from '../rpc'

export interface RpcState<T> {
  loading: boolean
  data: T | null
  error: string | null
}

export interface UseRpcResult<T> extends RpcState<T> {
  run: () => Promise<RpcResult<T>>
  reset: () => void
}

export function useRpc<T>(fn: () => Promise<RpcResult<T>>): UseRpcResult<T> {
  const [state, setState] = useState<RpcState<T>>({ loading: false, data: null, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async (): Promise<RpcResult<T>> => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const result = await fnRef.current()
    if (result.ok) {
      setState({ loading: false, data: result.data, error: null })
    } else {
      setState({ loading: false, data: null, error: result.error })
    }
    return result
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, data: null, error: null })
  }, [])

  return { ...state, run, reset }
}