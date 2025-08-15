type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  variant?: "default" | "code";
};
export function Input({ className = "", variant = "default", ...rest }: Props) {
  const variantCls = variant === "code" ? " font-mono tracking-wider" : "";
  return <input {...rest} className={`input${variantCls} ${className}`} />;
}
