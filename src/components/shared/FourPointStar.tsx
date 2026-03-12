interface FourPointStarProps {
  size?: number;
  className?: string;
}

export function FourPointStar({ size = 16, className }: FourPointStarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* 4-pointed star: sharp points N/E/S/W with inward-curved sides */}
      <path d="M12 0 Q12 12 24 12 Q12 12 12 24 Q12 12 0 12 Q12 12 12 0Z" />
    </svg>
  );
}
