import { type RecipeVariantProps, css } from "@shadow-panda/styled-system/css";
import { UserCircle2 } from "lucide-react";
import { avatar } from "../styles/recipes";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type AppAvatarProps = {
  imgSrc?: string | undefined;
  alt?: string;
} & RecipeVariantProps<typeof avatar>;

export const AppAvatar: React.FC<AppAvatarProps> = ({ imgSrc, alt = "avatar", size = "sm" }) => (
  <Avatar className={avatar({ size })}>
    <AvatarImage src={imgSrc} alt={alt} />
    <AvatarFallback className={css({ color: "avatar-fallback" })}>
      <UserCircle2 />
    </AvatarFallback>
  </Avatar>
);
