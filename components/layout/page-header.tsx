type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="text-heading-md lg:text-heading-lg">{title}</h1>
      </div>
      {action ? (
        <div className="w-full lg:w-auto [&_[data-slot=button]]:w-full lg:[&_[data-slot=button]]:w-auto">
          {action}
        </div>
      ) : null}
    </div>
  );
}
