import { css, cx } from "@shadow-panda/styled-system/css";
import { icon } from "@shadow-panda/styled-system/recipes";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowUpCircle, Github, Globe, LogOut, Moon, Music, RotateCw, Settings, Sun, Zap } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import { langNameTable, supportedLangCodes } from "../locales/i18n";
import { myAccountDataAtom, useHardReload, useLogout, useWriteOpsEnabled } from "../states/nostr";
import { AccountMetadata } from "../states/nostrModels";
import { ColorTheme, colorThemeAtom } from "../states/theme";
import { menuItem } from "../styles/recipes";
import { AppAvatar } from "./AppAvatar";
import { ShareMusicDialog } from "./ShareMusicDialog";
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
  return () => {
    setOpen(false);
    document.querySelector("body")?.style.removeProperty("pointer-events");
  };
};

export const HeaderMenu: React.FC = () => {
  const myData = useAtomValue(myAccountDataAtom);
  return myData !== undefined ? <LoggedInHeaderMenuBody myData={myData} /> : <LoggedOutHeaderMenuBody />;
};

type HeaderMenuBodyProps = {
  myData: AccountMetadata;
};

const LoggedInHeaderMenuBody: React.FC<HeaderMenuBodyProps> = ({ myData }) => {
  const [open, setOpen] = useAtom(isHeaderMenuOpenAtom);
  const writeOpsEnabled = useWriteOpsEnabled();
  const myName = myData.profile.displayName || myData.profile.name || "???";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={css({ cursor: "pointer" })}>
        <AppAvatar imgSrc={myData.profile.picture} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={css({ w: "14rem" })} align="start" collisionPadding={8}>
        <DropdownMenuLabel>
          <Trans i18nKey="loggedInAs" values={{ myName }}>
            <div className={css({ fontWeight: "normal", fontSize: "xs" })}>Logged in as</div>
            <div
              className={css({
                fontWeight: "bold",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              })}
            >
              {myName}
            </div>
          </Trans>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <MenuItemUpdateStatus disabled={!writeOpsEnabled} />
        <MenuItemShareMusic disabled={!writeOpsEnabled} />
        <DropdownMenuSeparator />
        <MenuItemToggleColorTheme />
        <MenuItemSwitchLanguage />
        <DropdownMenuSeparator />
        <MenuItemZap />
        <MenuItemGitHubRepo />
        <DropdownMenuSeparator />
        <MenuItemHardReload />
        <MenuItemLogout />
        <DropdownMenuSeparator />
        <MenuLabelBuildId />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const LoggedOutHeaderMenuBody: React.FC = () => {
  const [open, setOpen] = useAtom(isHeaderMenuOpenAtom);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className={css({ cursor: "pointer" })}>
        <Settings className={cx(icon({ size: "xl" }), css({ mx: "1" }))} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={css({ w: "14rem" })} align="start" collisionPadding={8}>
        <MenuItemToggleColorTheme />
        <MenuItemSwitchLanguage />
        <DropdownMenuSeparator />
        <MenuLabelBuildId />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type MenuItemUpdateStatusProps = {
  disabled: boolean;
};

// If `disabled === true`, completely omit the dialog.
// Just setting DropdownMenuItem's `disabled` prop to `true` doesn't prevent the dialog from being opened.
const MenuItemUpdateStatus: React.FC<MenuItemUpdateStatusProps> = ({ disabled }) => {
  const { t } = useTranslation();

  const menuItemBody = (
    <DropdownMenuItem
      className={menuItem({ color: "primary" })}
      disabled={disabled}
      onSelect={(e) => e.preventDefault()}
    >
      <ArrowUpCircle className={icon()} />
      <span>{t("Update Status")}</span>
    </DropdownMenuItem>
  );

  return disabled ? menuItemBody : <UpdateStatusDialog trigger={menuItemBody} />;
};

type MenuItemShareMusicProps = {
  disabled: boolean;
};

// If `disabled === true`, completely omit the dialog.
// Just setting DropdownMenuItem's `disabled` prop to `true` doesn't prevent the dialog from being opened.
const MenuItemShareMusic: React.FC<MenuItemShareMusicProps> = ({ disabled }) => {
  const { t } = useTranslation();

  const menuItemBody = (
    <DropdownMenuItem
      className={menuItem({ color: "primary" })}
      disabled={disabled}
      onSelect={(e) => e.preventDefault()}
    >
      <Music className={icon()} />
      <span>{t("Share Music")}</span>
    </DropdownMenuItem>
  );

  return disabled ? menuItemBody : <ShareMusicDialog trigger={menuItemBody} />;
};

const radioItemClassNames = css({ display: "flex", gap: "1.5", cursor: "pointer" });

const MenuItemToggleColorTheme: React.FC = () => {
  const [theme, setTheme] = useAtom(colorThemeAtom);

  const { t } = useTranslation();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {theme === "light" ? <Sun className={icon()} /> : <Moon className={icon()} />}
        <span>{t("Color Theme")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ColorTheme)}>
            <DropdownMenuRadioItem className={radioItemClassNames} value="light">
              <Sun className={icon()} />
              <span>{t("Light")}</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem className={radioItemClassNames} value="dark">
              <Moon className={icon()} />
              <span>{t("Dark")}</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
};

const MenuItemSwitchLanguage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const onLangChange = (v: string) => {
    i18n.changeLanguage(v);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Globe className={icon()} />
        <span>{t("Language")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={i18n.language} onValueChange={(v) => onLangChange(v)}>
            {supportedLangCodes.map((lang) => (
              <DropdownMenuRadioItem key={lang} className={radioItemClassNames} value={lang}>
                <span>{langNameTable[lang]}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
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

  const { t } = useTranslation();

  return (
    <DropdownMenuItem
      ref={menuItemRef}
      className={menuItem()}
      data-npub="npub168ghgug469n4r2tuyw05dmqhqv5jcwm7nxytn67afmz8qkc4a4zqsu2dlc"
      data-relays="wss://relay.nostr.band,wss://relayable.org,wss://relay.damus.io,wss://relay.nostr.wirednet.jp"
    >
      <Zap className={icon()} />
      <span>{t("Zap Author")}</span>
    </DropdownMenuItem>
  );
};

const MenuItemGitHubRepo = () => {
  const { t } = useTranslation();

  return (
    <DropdownMenuItem asChild>
      <a
        className={menuItem()}
        href="https://github.com/jiftechnify/nostatus"
        target="_blank"
        rel="external noreferrer"
      >
        <Github className={icon()} />
        <span>{t("View Code on GitHub")}</span>
      </a>
    </DropdownMenuItem>
  );
};

const MenuItemHardReload = () => {
  const hardReload = useHardReload();

  const { t } = useTranslation();

  return (
    <DropdownMenuItem className={menuItem({ color: "destructive" })} onSelect={hardReload}>
      <RotateCw className={icon()} />
      <span>{t("Hard Reload")}</span>
    </DropdownMenuItem>
  );
};

const MenuItemLogout = () => {
  const logout = useLogout();

  const { t } = useTranslation();

  return (
    <DropdownMenuItem className={menuItem({ color: "destructive" })} onSelect={logout}>
      <LogOut className={icon()} />
      <span>{t("Logout")}</span>
    </DropdownMenuItem>
  );
};

const buildIdStyle = { fontWeight: "light", color: "muted.foreground" };
const MenuLabelBuildId = () => {
  const { t } = useTranslation();

  return (
    <DropdownMenuLabel>
      <p className={css(buildIdStyle)}>{t("Build ID")}:</p>
      <p className={css(buildIdStyle)}>{import.meta.env.VITE_BUILD_ID}</p>
    </DropdownMenuLabel>
  );
};
