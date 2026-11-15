import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center font-sans transition-colors disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-primary font-semibold text-white hover:bg-primary-hover disabled:border-0 disabled:bg-transparent disabled:text-disabled-text",
        secondary:
          "border border-line-strong bg-sheet text-sm font-medium text-ink hover:bg-desk-highlight disabled:bg-transparent disabled:text-disabled-text",
        "secondary-strong":
          "border border-input-border bg-sheet text-[15px] font-medium text-ink hover:bg-desk-highlight disabled:bg-transparent disabled:text-disabled-text",
        "outline-primary":
          "border border-primary bg-sheet text-sm font-semibold text-primary hover:bg-primary-tint disabled:border-line disabled:bg-transparent disabled:text-disabled-text",
        "outline-dialect":
          "border border-dialect bg-sheet text-sm font-semibold text-dialect hover:bg-dialect-tint disabled:border-line disabled:bg-transparent disabled:text-disabled-text",
        dialect:
          "bg-dialect text-sm font-semibold text-white hover:opacity-90 disabled:bg-transparent disabled:text-disabled-text",
        text: "bg-transparent px-1 text-sm font-medium text-primary hover:text-primary-hover disabled:text-disabled-text",
        quiet:
          "bg-transparent px-1 text-sm font-normal text-muted underline hover:text-ink disabled:text-disabled-text disabled:no-underline",
        "quiet-ink":
          "bg-transparent px-1 text-sm font-normal text-ink underline hover:text-primary disabled:text-disabled-text disabled:no-underline",
      },
      size: {
        md: "min-h-touch px-4",
        lg: "min-h-btn px-6 text-base",
        "block-mobile": "min-h-btn-mobile w-full px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
