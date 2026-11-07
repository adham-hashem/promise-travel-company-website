import { useEffect, useRef, useState } from 'react';

/** Hook for the small "copied" toast the design uses. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const say = (m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 1800);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = msg ? <div className="pm-toast" role="status">{msg}</div> : null;
  return { say, node };
}
