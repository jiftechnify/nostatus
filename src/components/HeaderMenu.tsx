import { css } from "@shadow-panda/styled-system/css";
import { icon } from "@shadow-panda/styled-system/recipes";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowUpCircle, LogOut } from "lucide-react";
import { myAccountDataAtom, myPubkeyAtom, usePubkeyInNip07 } from "../states/atoms";
import { AppAvatar } from "./AppAvatar";
import { UpdateStatusDialog } from "./UpdateStatusDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const isHeaderMenuOpenAtom = atom(false);
export const useCloseHeaderMenu = () => {
  const setOpen = useSetAtom(isHeaderMenuOpenAtom);
  return () => setOpen(false);
}

type HeaderMenuProps = {
  onLogout: () => void;
};

export const HeaderMenu: React.FC<HeaderMenuProps> = ({ onLogout }) => {
  const [open, setOpen] = useAtom(isHeaderMenuOpenAtom);

  const myData = useAtomValue(myAccountDataAtom);

  // disable write operations if the pubkey doesn't match with NIP-07 pubkey
  const myPubkey = useAtomValue(myPubkeyAtom);
  const nip07Pubkey = usePubkeyInNip07();
  const disableWriteOps = myPubkey !== nip07Pubkey;

  return myData !== undefined ? (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={css({ cursor: "pointer" })}>
        <AppAvatar imgSrc={myData.profile.picture} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className={css({ mr: "1.5", fontWeight: "normal" })}>Logged in as</span>
          {myData.profile.displayName ?? myData.profile.name ?? "???"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <UpdateStatusMenuItem disabled={disableWriteOps} />
        <DropdownMenuItem className={css({ cursor: "pointer" })} onSelect={onLogout}>
          <LogOut size="1rem" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
};

type UpdateStatusMenuItemProps = {
  disabled: boolean;
};

// If `disabled === true`, completely omit the dialog.
// Just setting DropdownMenuItem's `disabled` prop to `true` doesn't prevent the dialog from being opened.
const UpdateStatusMenuItem: React.FC<UpdateStatusMenuItemProps> = ({ disabled }) => {
  const menuItem = (
    <DropdownMenuItem className={css({ cursor: "pointer" })} disabled={disabled} onSelect={(e) => e.preventDefault()}>
      <ArrowUpCircle className={icon()} size="1rem" />
      <span>Update Status</span>
    </DropdownMenuItem>
  );

  return disabled ? menuItem : <UpdateStatusDialog trigger={menuItem} />;
};
