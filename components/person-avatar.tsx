import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PersonAvatarProps = {
  name: string;
  /** Signed URL of the person's photo. Initials show when this is missing or fails to load. */
  src?: string | null;
  size?: React.ComponentProps<typeof Avatar>["size"];
};

export function PersonAvatar({ name, src, size = "sm" }: PersonAvatarProps) {
  return (
    <Avatar size={size}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
