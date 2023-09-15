import { useAtomValue } from "jotai";
import { myAccountDataAtom } from "../states/atoms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type HeaderMenuProps = {
  onLogout: () => void;
};

export const HeaderMenu: React.FC<HeaderMenuProps> = ({ onLogout }) => {
  const myData = useAtomValue(myAccountDataAtom);

  return myData !== undefined ? (
    <DropdownMenu>
      <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{myData.profile.displayName ?? myData.profile.name ?? "???"}</DropdownMenuLabel>
        <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger>no menu</DropdownMenuTrigger>
    </DropdownMenu>
  );
};
