export function Glass(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className = "", ...rest } = props as any;
  return <div {...rest} className={`glass-panel ${className}`} />;
}
