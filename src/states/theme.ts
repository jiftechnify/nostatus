import { atom, useAtomValue } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useEffect } from "react";

type ColorTheme = "light" | "dark";

const getSystemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

const colorThemeAtom = atomWithStorage<ColorTheme>("color-theme", getSystemTheme());

export const useColorTheme = () => {
  const colorTheme = useAtomValue(colorThemeAtom);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(colorTheme);

    root.style.setProperty("color-scheme", colorTheme);
  }, [colorTheme]);
};

export const togglableColorThemeAtom = atom(
  (get) => {
    return get(colorThemeAtom);
  },
  (get, set) => {
    const prev = get(colorThemeAtom);
    const next = prev === "light" ? "dark" : "light";
    set(colorThemeAtom, next);
  }
);
