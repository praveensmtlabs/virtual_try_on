"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FloatingButtonProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function FloatingButton({
  children,
  active,
  className = "",
  type = "button",
  ...props
}: FloatingButtonProps) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`studio-btn ${active ? "is-active" : ""} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
