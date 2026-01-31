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
        className="cursor-pointer text-white/90 hover:text-prime-gold font-nav font-medium text-sm tracking-wide transition-colors"
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
            className="absolute top-full left-0 z-[60]"
          >
            {/* Invisible bridge to maintain hover continuity */}
            <div className="h-4 w-full" />
            <motion.div
              transition={transition}
              className="bg-white rounded-2xl overflow-hidden border border-prime-gold/20 shadow-2xl shadow-prime-900/20"
            >
              <motion.div layout className="w-max h-full p-4">
                {children}
              </motion.div>
            </motion.div>
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
      className="relative rounded-full border border-prime-gold/30 bg-prime-900/95 backdrop-blur-xl shadow-lg shadow-prime-gold/5 flex justify-center space-x-4 lg:space-x-8 px-4 lg:px-8 py-3 lg:py-4 font-nav"
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
        className="shrink-0 rounded-lg shadow-md object-cover w-[140px] h-[80px] group-hover:shadow-xl group-hover:shadow-prime-gold/10 border border-transparent group-hover:border-prime-gold/30 transition-all duration-300"
      />
      <div className="flex flex-col justify-center">
        <h4 className="text-sm font-bold mb-1 text-prime-900 group-hover:text-prime-gold font-nav transition-colors">
          {title}
        </h4>
        <p className="text-prime-900/60 text-xs max-w-[160px] leading-relaxed">
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
        className="text-prime-900/70 hover:text-prime-gold transition-colors text-sm py-2 block font-nav border-l-2 border-transparent hover:border-prime-gold/50 hover:pl-2"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={href}
      className="text-prime-900/70 hover:text-prime-gold transition-colors text-sm py-2 block font-nav border-l-2 border-transparent hover:border-prime-gold/50 hover:pl-2"
      {...rest}
    >
      {children}
    </Link>
  );
};
