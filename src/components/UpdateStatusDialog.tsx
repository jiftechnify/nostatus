import { css } from "@shadow-panda/styled-system/css";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { myGeneralStatusAtom, updateMyStatus } from "../states/nostr";
import { button } from "../styles/recipes";
import { useCloseHeaderMenu } from "./HeaderMenu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const ttlTable = {
  never: undefined,
  "10min": 10 * 60,
  "30min": 30 * 60,
  "1hr": 60 * 60,
  "4hr": 4 * 60 * 60,
  "8hr": 8 * 60 * 60,
  "1day": 24 * 60 * 60,
} as const;

type TtlKey = keyof typeof ttlTable;

type UpdateStatusDialogProps = {
  trigger: React.ReactNode;
};

export const UpdateStatusDialog: React.FC<UpdateStatusDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const closeHeaderMenu = useCloseHeaderMenu();

  const myGeneralStatus = useAtomValue(myGeneralStatusAtom);

  const initContent = myGeneralStatus?.content ?? "";
  const initLinkUrl = myGeneralStatus?.linkUrl ?? "";

  const [content, setContent] = useState<string>(initContent);
  const [linkUrl, setLinkUrl] = useState<string>(initLinkUrl);
  const [ttlKey, setTtlKey] = useState<string>("never");

  const isDirty = content.trim() !== initContent || (initContent !== "" && linkUrl !== initLinkUrl);
  const isClearStatus = initContent !== "" && content.trim() === "";

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // reset my current general status on open dialog
      setContent(myGeneralStatus?.content ?? "");
      setLinkUrl(myGeneralStatus?.linkUrl ?? "");
    }
    setOpen(open);
  };

  const closeDialog = () => {
    setOpen(false);
    closeHeaderMenu();
  };

  const handleClickUpdate = async () => {
    const ttl = ttlTable[ttlKey as TtlKey];
    await updateMyStatus({ category: "general", content: content.trim(), linkUrl: linkUrl.trim(), ttl });

    closeDialog();
  };

  const handleClickClear = async () => {
    await updateMyStatus({ category: "general", content: "", linkUrl: "", ttl: undefined });

    closeDialog();
  };

  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={css({ w: "100%" })}>{trigger}</DialogTrigger>
      <DialogContent className={css({ bg: "card" })}>
        <DialogHeader>
          <DialogTitle>{t("Update Your Status")}</DialogTitle>
        </DialogHeader>
        <Label htmlFor="content">{t("Status")}</Label>
        <Input id="content" type="text" value={content} onChange={(e) => setContent(e.target.value)} />

        <Label htmlFor="link-url">{t("Link URL")}</Label>
        <Input
          id="link-url"
          type="url"
          disabled={isClearStatus}
          placeholder="https://"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />

        <Label htmlFor="clear-after">{t("Clear status after")}</Label>
        <Select disabled={isClearStatus} value={ttlKey} onValueChange={setTtlKey}>
          <SelectTrigger id="clear-after">
            <SelectValue placeholder="Please Select" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(ttlTable).map((ttlKey) => (
              <SelectItem key={ttlKey} value={ttlKey}>
                {t(`ttl.${ttlKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          {isClearStatus ? (
            <button className={button({ color: "destructive" })} type="button" onClick={handleClickClear}>
              {t("Clear")}
            </button>
          ) : (
            <button className={button()} type="button" disabled={!isDirty} onClick={handleClickUpdate}>
              {t("Update")}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
