'use client';

import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type ComponentProps } from 'react';

/** Warm only a route the user points to or focuses, including during local development. */
export default function NavigationLink({ onPointerEnter, onFocus, ...props }: ComponentProps<typeof NextLink>) {
  const router = useRouter();
  const warmed = useRef<string | null>(null);
  const warm = () => {
    const href = typeof props.href === 'string' ? props.href : props.href.pathname;
    if (href?.startsWith('/') && !href.startsWith('//') && warmed.current !== href) {
      warmed.current = href;
      router.prefetch(href);
    }
  };
  return <NextLink {...props} onPointerEnter={(event) => { warm(); onPointerEnter?.(event); }} onFocus={(event) => { warm(); onFocus?.(event); }} />;
}
