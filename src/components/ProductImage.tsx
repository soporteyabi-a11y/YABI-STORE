import React, {useState} from 'react';
import {Coffee, Footprints, Home, Package, Shirt, Watch} from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  category: string;
  className?: string;
}

function getCategoryIcon(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('ropa')) return Shirt;
  if (cat.includes('calzado')) return Footprints;
  if (cat.includes('alimento') || cat.includes('café')) return Coffee;
  if (cat.includes('hogar')) return Home;
  if (cat.includes('accesorio')) return Watch;
  return Package;
}

export const ProductImage: React.FC<ProductImageProps> = ({src, alt, category, className = ''}) => {
  const [failed, setFailed] = useState(false);
  const Icon = getCategoryIcon(category);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-400 dark:text-slate-500 ${className}`}
        aria-label={alt}
      >
        <Icon className="w-7 h-7 stroke-[1.5]" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
      loading="lazy"
    />
  );
};
