import { css } from "@shadow-panda/styled-system/css";
import { hstack } from "@shadow-panda/styled-system/patterns";
import { t } from "i18next";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { loadable } from "jotai/utils";
import { useState } from "react";
import { updateMyStatus } from "../states/nostr";
import { button } from "../styles/recipes";
import { useCloseHeaderMenu } from "./HeaderMenu";
import { MusicStatusView } from "./MusicStatusView";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type MusicData = {
  url: string;
  title?: string;
  artists?: string[];
};

const songwhipProxyUrl = "https://songwhip-proxy.c-stellar.net/";

const fetchMusicData = async (musicLink: string): Promise<MusicData> => {
  const resp = await fetch(`${songwhipProxyUrl}?url=${encodeURIComponent(musicLink)}`);
  if (!resp.ok) {
    throw Error("failed to fetch music data");
  }
  return resp.json() as Promise<MusicData>;
};

const musicLinkAtom = atom<string | undefined>(undefined);

const musicDataLoadableAtom = loadable(
  atom(async (get) => {
    const musicLink = get(musicLinkAtom);
    if (musicLink === undefined) {
      return Promise.resolve(undefined);
    }
    return fetchMusicData(musicLink);
  })
);

type ShareMusicDialogProps = {
  trigger: React.ReactNode;
};

export const ShareMusicDialog: React.FC<ShareMusicDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const closeHeaderMenu = useCloseHeaderMenu();

  const [musicLinkInput, setMusicLinkInput] = useState("");
  const setMusicLink = useSetAtom(musicLinkAtom);
  const musicData = useAtomValue(musicDataLoadableAtom);

  const closeDialog = () => {
    setOpen(false);
    setMusicLink(undefined);

    closeHeaderMenu();
  };

  const handleClickUpdate = async () => {
    if (musicData.state !== "hasData" || musicData.data === undefined) {
      return;
    }

    const content = `${musicData.data.title || "???"} - ${(musicData.data.artists ?? []).join(", ")}`;
    await updateMyStatus({ category: "music", content, linkUrl: musicData.data.url, ttl: undefined });

    closeDialog();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={css({ w: "100%" })}>{trigger}</DialogTrigger>
      <DialogContent className={css({ bg: "card" })}>
        <DialogHeader>
          <DialogTitle>{t("Share Music")}</DialogTitle>
        </DialogHeader>
        <Label htmlFor="content">{t("Paste music share link")}</Label>
        <div className={hstack({})}>
          <Input id="content" type="text" value={musicLinkInput} onChange={(e) => setMusicLinkInput(e.target.value)} />
          {musicData.state === "hasData" && (
            <button
              className={css(button.raw({ color: "primary" }), { w: "9rem" })}
              type="button"
              onClick={() => setMusicLink(musicLinkInput)}
            >
              {t("getMusicData")}
            </button>
          )}
          {musicData.state === "loading" && (
            <button className={css(button.raw({ color: "primary" }), { w: "9rem" })} disabled={true}>
              {t("musicDataLoading")}
            </button>
          )}
        </div>

        {musicData.state === "hasData" && musicData.data !== undefined && (
          <>
            <p className={css({ fontSize: "0.875rem", lineHeight: "none", fontWeight: "medium" })}>
              {t("musicStatusPreview")}
            </p>

            <MusicStatusView
              content={`${musicData.data.title || "???"} - ${(musicData.data.artists ?? []).join(", ")}`}
              linkUrl={musicData.data.url}
            />
          </>
        )}

        {musicData.state === "hasData" && musicData.data !== undefined && (
          <DialogFooter>
            <button
              className={button()}
              disabled={musicData.state !== "hasData" || musicData.data === undefined}
              onClick={handleClickUpdate}
            >
              {t("Update")}
            </button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
