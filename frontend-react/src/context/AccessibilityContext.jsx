import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AccessibilityContext = createContext();

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

export function AccessibilityProvider({ children }) {
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);

  const speak = useCallback(
    (text) => {
      if (!screenReaderActive || !text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES";
      u.rate = speechRate;
      window.speechSynthesis.speak(u);
    },
    [screenReaderActive, speechRate]
  );

  useEffect(() => {
    if (!screenReaderActive) return;

    function handleGlobalClick(e) {
      const el = e.target.closest(
        "button, [role='button'], a, select, input[type='checkbox'], input[type='radio']"
      );
      if (!el) return;

      const text =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.textContent?.trim();

      if (text) speak(text);
    }

    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, [screenReaderActive, speak]);

  return (
    <AccessibilityContext.Provider
      value={{ screenReaderActive, setScreenReaderActive, speechRate, setSpeechRate, speak }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}