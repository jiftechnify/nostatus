import { css } from "@shadow-panda/styled-system/css";
import { icon } from "@shadow-panda/styled-system/recipes";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowUpCircle, Github, LogOut, Moon, Sun, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { myAccountDataAtom, useLogout, useMyPubkey, usePubkeyInNip07 } from "../states/nostr";
import { AccountMetadata } from "../states/nostrModels";
import { ColorTheme, colorThemeAtom } from "../states/theme";
import { menuItem } from "../styles/recipes";
import { AppAvatar } from "./AppAvatar";
import { UpdateStatusDialog } from "./UpdateStatusDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const isHeaderMenuOpenAtom = atom(false);
export const useCloseHeaderMenu = () => {
  const setOpen = useSetAtom(isHeaderMenuOpenAtom);
  return () => setOpen(false);
};

export const HeaderMenu: React.FC = () => {
  const myData = useAtomValue(myAccountDataAtom);
  return myData !== undefined ? <HeaderMenuBody myData={myData} /> : null;
};

type HeaderMenuBodyProps = {
  myData: AccountMetadata;
};

const HeaderMenuBody: React.FC<HeaderMenuBodyProps> = ({ myData }) => {
  const [open, setOpen] = useAtom(isHeaderMenuOpenAtom);

  // disable write operations if the pubkey doesn't match with NIP-07 pubkey
  const myPubkey = useMyPubkey();
  const nip07Pubkey = usePubkeyInNip07();
  const disableWriteOps = myPubkey !== nip07Pubkey;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={css({ cursor: "pointer" })}>
        <AppAvatar imgSrc={myData.profile.picture} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" collisionPadding={8}>
        <DropdownMenuLabel>
          <span className={css({ mr: "1.5", fontWeight: "normal" })}>Logged in as</span>
          {myData.profile.displayName || myData.profile.name || "???"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <MenuItemUpdateStatus disabled={disableWriteOps} />
        <MenuItemToggleColorTheme />
        <DropdownMenuSeparator />
        <MenuItemZap />
        <MenuItemGitHubRepo />
        <DropdownMenuSeparator />
        <MenuItemLogout />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type UpdateStatusMenuItemProps = {
  disabled: boolean;
};

// If `disabled === true`, completely omit the dialog.
// Just setting DropdownMenuItem's `disabled` prop to `true` doesn't prevent the dialog from being opened.
const MenuItemUpdateStatus: React.FC<UpdateStatusMenuItemProps> = ({ disabled }) => {
  const menuItemBody = (
    <DropdownMenuItem
      className={menuItem({ color: "primary" })}
      disabled={disabled}
      onSelect={(e) => e.preventDefault()}
    >
      <ArrowUpCircle className={icon()} />
      <span>Update Status</span>
    </DropdownMenuItem>
  );

  return disabled ? menuItemBody : <UpdateStatusDialog trigger={menuItemBody} />;
};

const radioItemClassNames = css({ display: "flex", gap: "1.5", cursor: "pointer" });

const MenuItemToggleColorTheme: React.FC = () => {
  const [theme, setTheme] = useAtom(colorThemeAtom);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {theme === "light" ? <Sun className={icon()} /> : <Moon className={icon()} />}
        <span>Color Theme</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ColorTheme)}>
            <DropdownMenuRadioItem className={radioItemClassNames} value="light">
              <Sun className={icon()} />
              <span>Light</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem className={radioItemClassNames} value="dark">
              <Moon className={icon()} />
              <span>Dark</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};

const MenuItemLogout = () => {
  const logout = useLogout();

  return (
    <DropdownMenuItem className={menuItem({ color: "destructive" })} onSelect={logout}>
      <LogOut className={icon()} />
      <span>Logout</span>
    </DropdownMenuItem>
  );
};

const MenuItemZap = () => {
  // initialize click handler which opens zap dialog
  const menuItemRef = useRef<HTMLDivElement>(null);
  const handlerInitialized = useRef(false);
  useEffect(() => {
    if (handlerInitialized.current || menuItemRef.current === null) {
      return;
    }

    // remove zap dialogs created by previous render
    document.querySelectorAll("dialog.nostr-zap-dialog").forEach((e) => e.remove());

    window.nostrZap.initTarget(menuItemRef.current);
    handlerInitialized.current = true;
  }, []);

  return (
    <DropdownMenuItem
      ref={menuItemRef}
      className={menuItem()}
      data-npub="npub168ghgug469n4r2tuyw05dmqhqv5jcwm7nxytn67afmz8qkc4a4zqsu2dlc"
      data-relays="wss://relay.nostr.band,wss://relayable.org,wss://relay.damus.io,wss://relay.nostr.wirednet.jp"
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
        className={menuItem()}
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
