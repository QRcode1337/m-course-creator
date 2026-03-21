import { createContext, useContext, useState, ReactNode } from "react";

interface StyleThemeContextType {
  styleTheme: string;
  setStyleTheme: (theme: string) => void;
}

const StyleThemeContext = createContext<StyleThemeContextType | undefined>(undefined);

export function StyleThemeProvider({ children, defaultTheme = "default" }: { children: ReactNode; defaultTheme?: string }) {
  const [styleTheme, setStyleTheme] = useState(defaultTheme);

  return (
    <StyleThemeContext.Provider value={{ styleTheme, setStyleTheme }}>
      {children}
    </StyleThemeContext.Provider>
  );
}

export function useStyleTheme() {
  const context = useContext(StyleThemeContext);
  if (!context) throw new Error("useStyleTheme must be used within StyleThemeProvider");
  return context;
}
