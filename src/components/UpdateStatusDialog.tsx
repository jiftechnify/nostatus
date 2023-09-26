import { css } from "@shadow-panda/styled-system/css";
import { useAtomValue } from "jotai";
import { useState } from "react";
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

const ttlLabels = {
  never: "Never",
  "10min": "10 Minutes",
  "30min": "30 Minutes",
  "1hr": "1 Hour",
  "4hr": "4 Hours",
  "8hr": "8 Hours",
  "1day": "1 Day",
} satisfies Record<TtlKey, string>;

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

  const onClickUpdate = async () => {
    const ttl = ttlTable[ttlKey as TtlKey];
    await updateMyStatus({ content: content.trim(), linkUrl: linkUrl.trim(), ttl });

    setOpen(false);
    closeHeaderMenu();
  };

  const onClickClear = async () => {
    await updateMyStatus({ content: "", linkUrl: "", ttl: undefined });
    setOpen(false);
    closeHeaderMenu();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={css({ w: "100%" })}>{trigger}</DialogTrigger>
      <DialogContent className={css({bg: "card"})}>
        <DialogHeader>
          <DialogTitle>Update Your Status</DialogTitle>
        </DialogHeader>
        <Label htmlFor="content">Status</Label>
        <Input id="content" type="text" value={content} onChange={(e) => setContent(e.target.value)} />

        <Label htmlFor="link-url">Link URL</Label>
        <Input
          id="link-url"
          type="url"
          disabled={isClearStatus}
          placeholder="https://"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />

        <Label htmlFor="clear-after">Clear status after...</Label>
        <Select disabled={isClearStatus} value={ttlKey} onValueChange={setTtlKey}>
          <SelectTrigger id="clear-after">
            <SelectValue placeholder="Please Select" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ttlLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          {isClearStatus ? (
            <button className={button({ color: "destructive" })} onClick={onClickClear}>
              Clear
            </button>
          ) : (
            <button className={button()} disabled={!isDirty} onClick={onClickUpdate}>
              Update
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
