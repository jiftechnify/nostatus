import { css } from "@shadow-panda/styled-system/css";
import { circle } from "@shadow-panda/styled-system/patterns";
import { useAtomValue } from "jotai";
import { LogOut } from "lucide-react";
import { myAccountDataAtom } from "../states/atoms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type HeaderMenuProps = {
  onLogout: () => void;
};

export const HeaderMenu: React.FC<HeaderMenuProps> = ({ onLogout }) => {
  const myData = useAtomValue(myAccountDataAtom);

  return myData !== undefined ? (
    <DropdownMenu>
      <DropdownMenuTrigger className={css({ cursor: "pointer" })}>
        <img
          className={circle({
            size: "10",
            maxWidth: "none",
            objectFit: "cover",
          })}
          src={myData.profile.picture}
          alt="my avatar"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className={css({ mr: "1.5", fontWeight: "normal" })}>Logged in as</span>
          {myData.profile.displayName ?? myData.profile.name ?? "???"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={css({ cursor: "pointer" })} onClick={onLogout}>
          <LogOut size="1rem" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
};
