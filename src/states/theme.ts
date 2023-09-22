import { useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

export type ColorTheme = "light" | "dark";

const getSystemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export const colorThemeAtom = atomWithStorage<ColorTheme>("color-theme", getSystemTheme());

export const useColorTheme = () => {
  const colorTheme = useAtomValue(colorThemeAtom);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(colorTheme);

    root.style.setProperty("color-scheme", colorTheme);
  }, [colorTheme]);
};
