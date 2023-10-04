import { useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

export type ColorTheme = "light" | "dark";

const getSystemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
const getInitialTheme = (): ColorTheme => {
  const theme = localStorage.getItem("color-theme");
  return theme !== null ? (JSON.parse(theme) as ColorTheme) : getSystemTheme();
};

// "manually" get value from localStorage on initializing atom value
// to prevent the app view from flickering if system theme and theme stored in the storage differ.
export const colorThemeAtom = atomWithStorage<ColorTheme>("color-theme", getInitialTheme());

export const useColorTheme = () => {
  const colorTheme = useAtomValue(colorThemeAtom);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(colorTheme);

    root.style.setProperty("color-scheme", colorTheme);
  }, [colorTheme]);
};
