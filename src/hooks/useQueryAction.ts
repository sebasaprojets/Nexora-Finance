import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Executa `action` quando a URL tem `?<param>=1` (ex.: links do checklist) e limpa o parâmetro. */
export function useQueryAction(param: string, action: () => void) {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get(param) !== '1') return;
    action();
    params.delete(param);
    setParams(params, { replace: true });
  }, [params, setParams, param, action]);
}
