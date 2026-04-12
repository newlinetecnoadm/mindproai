import { useState, useEffect } from "react";
import logoHorizontalColor from "@/assets/logo-horizontal-color.png";
import logoHorizontalColor2 from "@/assets/logo-horizontal-color-2.png";
import logoIconFull from "@/assets/logo-icon-full.png";
import logoIconColor2 from "@/assets/logo-icon-color-2.png";

interface LogoProps {
  variant?: "horizontal" | "icon";
  className?: string;
  /** Forçar versão para fundo claro (laranja + cinza) */
  forceColor2?: boolean;
  /** Forçar versão para fundo escuro (laranja + branco) — ideal para sidebars escuras */
  forceDark?: boolean;
}

const Logo = ({ variant = "horizontal", className, forceColor2, forceDark }: LogoProps) => {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const useColor2 = !forceDark && (forceColor2 || !isDark);

  const getSrc = () => {
    if (variant === "horizontal") {
      return useColor2 ? logoHorizontalColor2 : logoHorizontalColor;
    }
    return useColor2 ? logoIconColor2 : logoIconFull;
  };

  return (
    <img
      src={getSrc()}
      alt="MindPro AI"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
};

export default Logo;
