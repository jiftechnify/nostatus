import { css } from "@shadow-panda/styled-system/css";
import { hstack } from "@shadow-panda/styled-system/patterns";
import { t } from "i18next";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { loadable } from "jotai/utils";
import { useMemo, useState } from "react";
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

const stepsStyle = css({ ml: "4", fontSize: "sm", display: "list-item", listStyleType: "decimal" });

export const ShareMusicDialog: React.FC<ShareMusicDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const closeHeaderMenu = useCloseHeaderMenu();

  const [musicLinkInput, setMusicLinkInput] = useState("");
  const setMusicLink = useSetAtom(musicLinkAtom);
  const musicData = useAtomValue(musicDataLoadableAtom);

  console.log(musicData);

  const musicStatus = useMemo(() => {
    if (musicData.state !== "hasData" || musicData.data === undefined) {
      return undefined;
    }
    return {
      content: `${musicData.data.title || "???"} - ${(musicData.data.artists ?? []).join(", ")}`,
      linkUrl: musicData.data.url,
    };
  }, [musicData]);

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

  const handleClickUpdate = async () => {
    if (musicStatus === undefined) {
      return;
    }

    const { content, linkUrl } = musicStatus;
    await updateMyStatus({ category: "music", content, linkUrl, ttl: undefined });

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

        <Label htmlFor="content">{t("musicShareLink")}</Label>
        <div className={hstack({})}>
          <Input
            id="content"
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

        {(musicData.state === "loading" || musicStatus !== undefined) && (
          <p className={css({ fontSize: "0.875rem", lineHeight: "none", fontWeight: "medium" })}>
            {t("musicStatusPreview")}
          </p>
        )}
        {musicData.state === "loading" && <p>Loading...</p>}
        {musicStatus !== undefined && <MusicStatusView {...musicStatus} />}

        {musicData.state === "hasError" && (
          <p className={css({ fontSize: "sm", color: "destructive.text" })}>{t("fetchingMusicDataFailed")}</p>
        )}

        <DialogFooter>
          {musicStatus !== undefined && (
            <button className={button()} onClick={handleClickUpdate}>
              {t("shareMusicButton")}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
