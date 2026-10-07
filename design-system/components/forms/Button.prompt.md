**Button** — the primary call-to-action. Pill-shaped with a serif label; the primary variant inverts yellow→ink on hover (Olifant's signature move).

```jsx
<Button variant="primary" size="lg">Get Started</Button>
<Button variant="secondary">Get Started</Button>
<Button variant="tertiary" size="sm">Learn more</Button>
<Button variant="primary" loading>Saving</Button>
```

Variants: `primary` (yellow), `secondary` (solid ink), `tertiary` (outlined, UPPERCASE sans). Sizes: `sm` / `md` / `lg`. Props: `disabled`, `loading`, `iconLeft`, `iconRight`, `fullWidth`. Use primary once per view; tertiary for low-emphasis actions.
