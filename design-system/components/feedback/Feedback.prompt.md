**Feedback** — `Dialog`, `Toast`, `Tooltip`.

```jsx
<Dialog open={open} onClose={close} title="Delete project?" footer={<><Button variant="tertiary" onClick={close}>Cancel</Button><Button>Delete</Button></>}>This can't be undone.</Dialog>
<Toast variant="success" title="Saved" message="Your campaign is live." onClose={dismiss} />
<Tooltip label="Export CSV"><IconButton label="Export"><i data-lucide="download"></i></IconButton></Tooltip>
```

All flat, warm-shadowed. Toast carries a left status accent. Tooltip is an ink bubble on hover/focus.
