import Image from "next/image";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={475}
        height={276}
        className="h-auto w-16"
      />
      <h2 className="mt-6 text-heading-xs">{title}</h2>
      <p className="mt-2 max-w-sm text-body-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
