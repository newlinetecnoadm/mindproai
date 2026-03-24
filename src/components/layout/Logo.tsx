import { useTheme } from "next-themes";
import logoHorizontalColor from "@/assets/logo-horizontal-color.png";
import logoHorizontalColor2 from "@/assets/logo-horizontal-color-2.png";
import logoIconFull from "@/assets/logo-icon-full.png";
import logoIconColor2 from "@/assets/logo-icon-color-2.png";

interface LogoProps {
  variant?: "horizontal" | "icon";
  className?: string;
  forceColor2?: boolean;
}

const Logo = ({ variant = "horizontal", className, forceColor2 }: LogoProps) => {
  const { theme } = useTheme();
  
  // Se for fundo claro (ou explicitamente pedido), usa a versão color-2 (laranja e cinza)
  const useColor2 = forceColor2 || theme === "light";

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
      style={{ objectFit: 'contain' }}
    />
  );
};

export default Logo;
