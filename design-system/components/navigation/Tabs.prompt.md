**Tabs** — underline tab bar; the active tab gets a brand-yellow rule.

```jsx
<Tabs tabs={[{label:"Overview",value:"o"},{label:"Results",value:"r"}]} defaultValue="o">
  {(active) => <div>{active} panel</div>}
</Tabs>
```

Controlled via `value`+`onChange` or uncontrolled via `defaultValue`. Children can be a node or a render function of the active value.
