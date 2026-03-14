export function Button({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  href, 
  className = '', 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all duration-200 active:scale-[0.98]";
  
  const variants = {
    primary: "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
    secondary: "bg-transparent text-zinc-600 border border-zinc-200 hover:border-black hover:text-black dark:text-zinc-400 dark:border-zinc-800 dark:hover:border-white dark:hover:text-white",
    ghost: "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
  };

  const styles = `${baseStyles} ${variants[variant]} ${className}`;
  const Element = href ? 'a' : 'button';

  return (
    <Element href={href} className={styles} {...props}>
      {Icon && <Icon size={16} />}
      {children}
    </Element>
  );
}