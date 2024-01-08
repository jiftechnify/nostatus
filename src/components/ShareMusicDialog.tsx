import { css } from "@shadow-panda/styled-system/css";
import { divider, hstack } from "@shadow-panda/styled-system/patterns";
import { t } from "i18next";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { loadable } from "jotai/utils";
import { useMemo, useState } from "react";
import { myMusicStatusAtom, updateMyStatus } from "../states/nostr";
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
  }),
);

type ShareMusicDialogProps = {
  trigger: React.ReactNode;
};

const stepsStyle = css({ ml: "4", fontSize: "sm", display: "list-item", listStyleType: "decimal" });

export const ShareMusicDialog: React.FC<ShareMusicDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const closeHeaderMenu = useCloseHeaderMenu();

  const [musicLinkInput, setMusicLinkInput] = useState("");
  const setMusicLink = useSetAtom(musicLinkAtom);
  const musicData = useAtomValue(musicDataLoadableAtom);
  const newMusicStatus = useMemo(() => {
    if (musicData.state !== "hasData" || musicData.data === undefined) {
      return undefined;
    }
    return {
      content: `${musicData.data.title || "???"} - ${(musicData.data.artists ?? []).join(", ")}`,
      linkUrl: musicData.data.url,
    };
  }, [musicData]);

  const currMusicStatus = useAtomValue(myMusicStatusAtom);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setMusicLinkInput("");
      setMusicLink(undefined);
    }
    setOpen(open);
  };

  const closeDialog = () => {
    setOpen(false);
    setMusicLink(undefined);

    closeHeaderMenu();
  };

  const handleClickShare = async () => {
    if (newMusicStatus === undefined) {
      return;
    }

    const { content, linkUrl } = newMusicStatus;
    await updateMyStatus({ category: "music", content, linkUrl, ttl: undefined });

    closeDialog();
  };

  const handleClickStopSharing = async () => {
    await updateMyStatus({ category: "music", content: "", linkUrl: "", ttl: undefined });

    closeDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={css({ w: "100%" })}>{trigger}</DialogTrigger>
      <DialogContent className={css({ bg: "card" })}>
        <DialogHeader>
          <DialogTitle>{t("Share Music")}</DialogTitle>
        </DialogHeader>

        <ol>
          <li className={stepsStyle}>{t("shareMusicStep1")}</li>
          <li className={stepsStyle}>{t("shareMusicStep2")}</li>
          <li className={stepsStyle}>{t("shareMusicStep3")}</li>
        </ol>

        <Label htmlFor="music-share-link">{t("musicShareLink")}</Label>
        <div className={hstack({})}>
          <Input
            id="music-share-link"
            type="text"
            autoComplete="off"
            value={musicLinkInput}
            onChange={(e) => setMusicLinkInput(e.target.value)}
          />

          <button
            className={css(button.raw({ color: "primary" }), { flexShrink: "0" })}
            type="button"
            disabled={musicData.state === "loading"}
            onClick={() => setMusicLink(musicLinkInput)}
          >
            {t("getMusicDataButton")}
          </button>
        </div>

        {(musicData.state !== "hasData" || newMusicStatus !== undefined) && (
          <p className={css({ textStyle: "dialog-label-like" })}>{t("musicStatusPreview")}</p>
        )}
        {musicData.state === "loading" && <p>{t("musicDataLoading")}</p>}
        {newMusicStatus !== undefined && <MusicStatusView {...newMusicStatus} />}

        {musicData.state === "hasError" && (
          <p className={css({ fontSize: "sm", color: "destructive.text" })}>{t("fetchingMusicDataFailed")}</p>
        )}

        <DialogFooter>
          {newMusicStatus !== undefined && (
            <button className={button({ expand: true })} onClick={handleClickShare}>
              {t("shareMusicButton")}
            </button>
          )}
        </DialogFooter>

        {currMusicStatus !== undefined && (
          <>
            <div className={divider({ orientation: "horizontal" })} />

            <p className={css({ mt: "2", textStyle: "dialog-label-like" })}>{t("currSharingMusic")}</p>
            <MusicStatusView {...currMusicStatus} />

            <DialogFooter>
              <button className={button({ color: "destructiveSubtle" })} onClick={handleClickStopSharing}>
                {t("cancelSharingMusicButton")}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
