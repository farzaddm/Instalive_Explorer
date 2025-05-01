import { useState, useCallback, useRef } from "react";

const useSession = (warningTime) => {
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const timer = useRef(null);

  const extendSession = useCallback(() => {
    setIsSessionDialogOpen(false); 
    if (timer.current) clearTimeout(timer.current); 
    timer.current = setTimeout(() => {
      setIsSessionDialogOpen(true);
    }, warningTime);
  }, [warningTime]);

  const stopTimer = useCallback(() => {
    setIsSessionDialogOpen(false); 
    if (timer.current) clearTimeout(timer.current); 
  }, []);

  if (!timer.current) {
    timer.current = setTimeout(() => {
      setIsSessionDialogOpen(true);
    }, warningTime);
  }

  return {
    isSessionDialogOpen,
    extendSession,
    stopTimer,
  };
};

export default useSession;
