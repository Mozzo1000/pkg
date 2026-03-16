export function Button({ 
  children, 
  variant = 'primary', 
  icon: Icon = null,
  href = null,
  disabled = false,
  className = '', 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-3 md:px-5 md:py-2.5 rounded-md text-base md:text-sm font-medium transition-all duration-200 active:scale-[0.98] w-full md:w-auto whitespace-nowrap";  
  const disabledStyles = "disabled:opacity-50 disabled:pointer-events-none cursor-not-allowed";  
  const variants = {
    primary: "bg-slate-900 text-slate-50 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 shadow-sm",
    secondary: "bg-transparent text-slate-600 border border-slate-200 hover:border-slate-900 hover:text-slate-900 dark:text-slate-400 dark:border-slate-800 dark:hover:border-slate-100 dark:hover:text-slate-100",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"  };

  const styles = `${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} ${className}`;
  const Element = href ? 'a' : 'button';

  return (
   <Element 
      href={disabled ? undefined : href}
      disabled={Element === 'button' ? disabled : undefined} 
      className={styles} 
      {...props}
    >
      {Icon && <Icon size={16} className="md:w-4 md:h-4" />}
      {children}
    </Element>
  );
}