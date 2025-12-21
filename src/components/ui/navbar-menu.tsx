"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const transition = {
  type: "spring" as const,
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-foreground/80 hover:text-foreground font-medium text-sm"
      >
        {item}
      </motion.p>
      <AnimatePresence>
        {active !== null && active === item && children && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={transition}
          >
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 pt-4">
              <motion.div
                transition={transition}
                layoutId="active"
                className="bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-black/10"
              >
                <motion.div layout className="w-max h-full p-4">
                  {children}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative rounded-full border border-border/50 bg-card/80 backdrop-blur-xl shadow-lg flex justify-center space-x-8 px-8 py-4"
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
  fallback,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
  fallback?: string;
}) => {
  const [imgSrc, setImgSrc] = React.useState(src);
  const [hasError, setHasError] = React.useState(false);

  const handleError = () => {
    if (!hasError && fallback) {
      setImgSrc(fallback);
      setHasError(true);
    }
  };

  return (
    <Link to={href} className="flex space-x-3 group">
      <img
        src={imgSrc}
        width={140}
        height={80}
        alt={title}
        onError={handleError}
        className="shrink-0 rounded-lg shadow-md object-cover w-[140px] h-[80px] group-hover:shadow-lg transition-shadow"
      />
      <div className="flex flex-col justify-center">
        <h4 className="text-sm font-bold mb-1 text-foreground group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-muted-foreground text-xs max-w-[160px] leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
};

export const HoveredLink = ({
  children,
  href,
  ...rest
}: {
  children: React.ReactNode;
  href: string;
  [key: string]: any;
}) => {
  // Check if it's an anchor link or external
  const isAnchor = href.startsWith('#');
  const isExternal = href.startsWith('http');

  if (isAnchor || isExternal) {
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2 block"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={href}
      className="text-muted-foreground hover:text-foreground transition-colors text-sm py-2 block"
      {...rest}
    >
      {children}
    </Link>
  );
};
