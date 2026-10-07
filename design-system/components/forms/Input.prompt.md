**Input** — labeled single-line text field with helper text and validation states.

```jsx
<Input label="Email address" placeholder="Enter your email" helperText="We'll never share your email." />
<Input label="Email address" state="error" errorText="Please enter a valid email address." />
```

States: `default` / `error` / `success`. Focus → ink border, pine label, soft yellow ring. Pass `iconLeft` for a leading icon. See also `Textarea`, `Select`.
