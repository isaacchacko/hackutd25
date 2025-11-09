'use client';

import Link from 'next/link';

interface QueryMarqueeProps {
  queries: string[];
  basePath?: string;
}

export default function QueryMarquee({ queries, basePath = '/search' }: QueryMarqueeProps) {
  // Duplicate queries for seamless loop
  const duplicatedQueries = [...queries, ...queries];

  return (
    <div className="relative w-full overflow-hidden py-4">
      <div className="flex animate-scroll gap-4">
        {duplicatedQueries.map((query, index) => (
          <Link
            key={`${query}-${index}`}
            href={`${basePath}?q=${encodeURIComponent(query)}`}
            className="flex-shrink-0 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-all border border-gray-300 text-black hover:border-black whitespace-nowrap"
          >
            {query}
          </Link>
        ))}
      </div>
    </div>
  );
}

