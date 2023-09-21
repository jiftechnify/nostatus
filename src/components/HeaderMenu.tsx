import { css } from "@shadow-panda/styled-system/css";
import { icon } from "@shadow-panda/styled-system/recipes";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowUpCircle, Github, LogOut, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { myAccountDataAtom, useLogout, useMyPubkey, usePubkeyInNip07 } from "../states/atoms";
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
};

export const HeaderMenu: React.FC = () => {
  const [open, setOpen] = useAtom(isHeaderMenuOpenAtom);

  const myData = useAtomValue(myAccountDataAtom);

  // disable write operations if the pubkey doesn't match with NIP-07 pubkey
  const myPubkey = useMyPubkey();
  const nip07Pubkey = usePubkeyInNip07();
  const disableWriteOps = myPubkey !== nip07Pubkey;

  return myData !== undefined ? (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={css({ cursor: "pointer" })}>
        <AppAvatar imgSrc={myData.profile.picture} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent forceMount>
        <DropdownMenuLabel>
          <span className={css({ mr: "1.5", fontWeight: "normal" })}>Logged in as</span>
          {myData.profile.displayName || myData.profile.name || "???"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <MenuItemUpdateStatus disabled={disableWriteOps} />
        <DropdownMenuSeparator />
        <MenuItemZap />
        <MenuItemGitHubRepo />
        <DropdownMenuSeparator />
        <MenuItemLogout />
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
};

type UpdateStatusMenuItemProps = {
  disabled: boolean;
};

// If `disabled === true`, completely omit the dialog.
// Just setting DropdownMenuItem's `disabled` prop to `true` doesn't prevent the dialog from being opened.
const MenuItemUpdateStatus: React.FC<UpdateStatusMenuItemProps> = ({ disabled }) => {
  const menuItem = (
    <DropdownMenuItem className={css({ cursor: "pointer" })} disabled={disabled} onSelect={(e) => e.preventDefault()}>
      <ArrowUpCircle className={icon()} />
      <span>Update Status</span>
    </DropdownMenuItem>
  );

  return disabled ? menuItem : <UpdateStatusDialog trigger={menuItem} />;
};

const MenuItemLogout = () => {
  const logout = useLogout();

  return (
    <DropdownMenuItem className={css({ cursor: "pointer", color: "danger" })} onSelect={logout}>
      <LogOut className={icon()} />
      <span>Logout</span>
    </DropdownMenuItem>
  );
};

const MenuItemZap = () => {
  // initialize click handler which opens zap dialog
  const menuItem = useRef<HTMLDivElement>(null);
  const handlerInitialized = useRef(false);
  useEffect(() => {
    if (handlerInitialized.current || menuItem.current === null) {
      return;
    }

    // remove zap dialogs created by previous render 
    document.querySelectorAll("dialog.nostr-zap-dialog").forEach((e) => e.remove());

    window.nostrZap.initTarget(menuItem.current)
    handlerInitialized.current = true;
  }, [])

  return (
    <DropdownMenuItem
      ref={menuItem}
      data-npub="npub168ghgug469n4r2tuyw05dmqhqv5jcwm7nxytn67afmz8qkc4a4zqsu2dlc"
      data-relays="wss://relay.nostr.band,wss://relayable.org,wss://relay.damus.io,wss://relay.nostr.wirednet.jp"
      className={css({ cursor: "pointer" })}
    >
      <Zap className={icon()} />
      <span>Zap Author</span>
    </DropdownMenuItem>
  );
};

const MenuItemGitHubRepo = () => {
  return (
    <DropdownMenuItem asChild>
      <a
        className={css({ cursor: "pointer" })}
        href="https://github.com/jiftechnify/nostatus"
        target="_blank"
        rel="external noreferrer"
      >
        <Github className={icon()} />
        <span>View Code on GitHub</span>
      </a>
    </DropdownMenuItem>
  );
};
