import { useEffect, useState } from "react";

interface CountdownProps {
  seconds: number;
  onComplete: () => void;
}

export function Countdown({ seconds, onComplete }: CountdownProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return undefined;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [onComplete, remaining]);

  return (
    <div className="countdown" aria-live="off">
      <p>답변을 생각해 보세요.</p>
      <div className="countdownNumber" aria-hidden="true">
        {remaining}
      </div>
      <span className="srOnly">{remaining}초 남았습니다.</span>
    </div>
  );
}
