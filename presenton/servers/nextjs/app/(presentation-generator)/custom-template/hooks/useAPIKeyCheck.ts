import { useState, useEffect } from "react";

export const useAPIKeyCheck = () => {
  const [hasRequiredKey, setHasRequiredKey] = useState(false);
  const [isRequiredKeyLoading, setIsRequiredKeyLoading] = useState(true);

  useEffect(() => {
    fetch("/api/has-required-key")
      .then((res) => res.json())
      .then((data) => {
        setHasRequiredKey(Boolean(data.hasKey));
        setIsRequiredKeyLoading(false);
      })
      .catch(() => setIsRequiredKeyLoading(false));
  }, []);

  return { hasRequiredKey, isRequiredKeyLoading };
}; 