import { useCallback, useEffect, useState } from "react";
import { applyTheme, getInitialTheme, type ThemeMode } from "@/lib/theme";

function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    setTheme,
    toggleTheme,
  };
}

export { useTheme };
export default useTheme;
