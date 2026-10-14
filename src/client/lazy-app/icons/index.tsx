import { h } from 'preact';

/**
 * One icon family: 24x24 grid, 2px round-stroke outlines, no fills.
 * Stroke attributes live on an inner <g> so they win over any `fill`/`stroke`
 * inherited from CSS on the <svg>; colour comes from `currentColor`.
 */
const Glyph = ({ children }: { children?: preact.ComponentChildren }) => (
  <g
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {children}
  </g>
);

const Icon = ({ children, ...props }: preact.JSX.HTMLAttributes) => (
  // @ts-ignore - TS bug https://github.com/microsoft/TypeScript/issues/16019
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <Glyph>{children}</Glyph>
  </svg>
);

/** Same family, but without a fixed size (sized by the surrounding CSS). */
const FlexIcon = ({ children }: { children?: preact.ComponentChildren }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <Glyph>{children}</Glyph>
  </svg>
);

type IconProps = preact.JSX.HTMLAttributes;

/** Pixel grid, smooth. */
export const ToggleAliasingIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 4v16M4 12h16" />
  </Icon>
);

/** Pixel grid, sharp pixels on. */
export const ToggleAliasingActiveIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 4v16M4 12h16" />
    <path d="M7.5 7.5h.01M16.5 16.5h.01" stroke-width="3" />
  </Icon>
);

/** Checkerboard square, plain background. */
export const ToggleBackgroundIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M3 12h9V3M12 12h9v9h-9z" />
  </Icon>
);

/** Checkerboard square, checker background on. */
export const ToggleBackgroundActiveIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M3 12h18M12 3v18" />
    <path d="M7.5 7.5h.01M16.5 16.5h.01" stroke-width="3" />
  </Icon>
);

export const RotateIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
  </Icon>
);

export const AddIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const RemoveIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
);

export const UncheckedIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
  </Icon>
);

export const CheckedIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <path d="m8 12.5 3 3 5-6" />
  </Icon>
);

export const ExpandIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

/** Back arrow, pointing left. */
export const BackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

/** Chevron pointing down. Sized by CSS. */
export const Arrow = () => (
  <FlexIcon>
    <path d="m6 9 6 6 6-6" />
  </FlexIcon>
);

/** Arrow into a tray. Sized by CSS. */
export const DownloadIcon = () => (
  <FlexIcon>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </FlexIcon>
);

/** Two arrows chasing each other. Sized by CSS. */
export const ConvertIcon = () => (
  <FlexIcon>
    <path d="M20 11a8 8 0 0 0-14-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14 4.5l2-2M20 20v-4.5h-4.5" />
  </FlexIcon>
);

/** Left-right arrows. Sized by CSS. */
export const SwapIcon = () => (
  <FlexIcon>
    <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />
  </FlexIcon>
);

export const SaveIcon = () => (
  <FlexIcon>
    <path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" />
  </FlexIcon>
);

export const ImportIcon = () => (
  <FlexIcon>
    <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
  </FlexIcon>
);

/** Small leaf badge shown when a side finishes compressing. */
export const LeafIcon = () => (
  <FlexIcon>
    <path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z" />
    <path d="M8 16c3-4.5 6-7.5 10-9" />
  </FlexIcon>
);

export const LockIcon = () => (
  <FlexIcon>
    <rect x="5" y="11" width="14" height="10" rx="3" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </FlexIcon>
);
