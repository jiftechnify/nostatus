import { css } from "@shadow-panda/styled-system/css";
import { divider, hstack } from "@shadow-panda/styled-system/patterns";
import { t } from "i18next";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { loadable } from "jotai/utils";
import { useMemo, useState } from "react";
import { getI18n } from "react-i18next";
import type { LangCode } from "../locales/i18n";
import { myMusicStatusAtom, updateMyStatus } from "../states/nostr";
import { button } from "../styles/recipes";
import { useCloseHeaderMenu } from "./HeaderMenu";
import { MusicStatusView } from "./MusicStatusView";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type SongData = {
  url: string;
  title?: string;
  artist?: string;
};

const langCodeToCountry = (lang: LangCode) => {
  switch (lang) {
    case "ja":
      return "JP";
    case "en":
      return "US";
    default:
      return "US";
  }
};

const fetchSongData = async (musicLink: string, lang: LangCode): Promise<SongData> => {
  const apiUrl = new URL(import.meta.env.VITE_SONGDATA_API_URL);

  const params = new URLSearchParams();
  params.set("url", musicLink);
  params.set("country", langCodeToCountry(lang));
  apiUrl.search = params.toString();

  const resp = await fetch(apiUrl);
  if (!resp.ok) {
    throw Error("failed to fetch song data");
  }
  return resp.json() as Promise<SongData>;
};

const musicLinkAtom = atom<string | undefined>(undefined);

const musicDataLoadableAtom = loadable(
  atom(async (get) => {
    const musicLink = get(musicLinkAtom);
    if (musicLink === undefined) {
      return Promise.resolve(undefined);
    }
    return fetchSongData(musicLink, getI18n().language as LangCode);
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
  const songData = useAtomValue(musicDataLoadableAtom);

  const newMusicStatus = useMemo(() => {
    if (songData.state !== "hasData" || songData.data === undefined) {
      return undefined;
    }
    return {
      content: `${songData.data.title || "???"} - ${songData.data.artist || "???"}`,
      linkUrl: songData.data.url,
    };
  }, [songData]);

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
            disabled={songData.state === "loading"}
            onClick={() => setMusicLink(musicLinkInput)}
          >
            {t("getMusicDataButton")}
          </button>
        </div>

        {(songData.state !== "hasData" || newMusicStatus !== undefined) && (
          <p className={css({ textStyle: "dialog-label-like" })}>{t("musicStatusPreview")}</p>
        )}
        {songData.state === "loading" && <p>{t("musicDataLoading")}</p>}
        {newMusicStatus !== undefined && <MusicStatusView {...newMusicStatus} />}

        {songData.state === "hasError" && (
          <p className={css({ fontSize: "sm", color: "destructive.text" })}>{t("fetchingMusicDataFailed")}</p>
        )}

        <DialogFooter>
          {newMusicStatus !== undefined && (
            <button className={button({ expand: true })} type="button" onClick={handleClickShare}>
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
              <button className={button({ color: "destructiveSubtle" })} type="button" onClick={handleClickStopSharing}>
                {t("cancelSharingMusicButton")}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
