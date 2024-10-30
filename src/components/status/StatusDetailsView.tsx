import { css } from "@shadow-panda/styled-system/css";
import { vstack } from "@shadow-panda/styled-system/patterns";
import { nip19 } from "nostr-tools";
import { useTranslation } from "react-i18next";
import { getFirstTagValueByName } from "../../nostr";
import {
  type StatusData,
  type UserStatus,
  type UserStatusCategory,
  userStatusCategories,
} from "../../states/nostrModels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const tabsListStyle = css({
  w: "full",
  p: "0",
  justifyContent: "flex-start",
  rounded: "0",
  bg: "transparent",
  gap: "4",
});

const tabsTrigStyle = css({
  position: "relative",
  h: "9",
  rounded: "0",
  borderBottom: "2px solid transparent",
  bg: "transparent",
  px: "2",
  pb: "3",
  pt: "2",
  fontWeight: "semibold",
  color: "muted.foreground",
  shadow: "none",
  transition: "none",
  cursor: "pointer",

  "&[data-state=active]": {
    borderBottomColor: "primary",
    color: "foreground",
    shadow: "none",
  },
});

const categoryLabelTable: Record<UserStatusCategory, string> = {
  general: "General",
  music: "Music",
};

type StatusDetailsViewProps = {
  status: UserStatus;
};

export const StatusDetailsView: React.FC<StatusDetailsViewProps> = ({ status }) => {
  const availableCategories = userStatusCategories.filter((cat) => status[cat] !== undefined);

  const { t } = useTranslation();

  return (
    <div className={css({ w: "95vw", maxW: "800px" })}>
      <h2 className={css({ mb: "1.5", textStyle: "detail-title", border: "none" })}>{t("Details")}</h2>
      <Tabs defaultValue={availableCategories[0]}>
        <TabsList className={tabsListStyle}>
          {availableCategories.map((cat) => (
            <TabsTrigger className={tabsTrigStyle} key={cat} value={cat}>
              {categoryLabelTable[cat]}
            </TabsTrigger>
          ))}
        </TabsList>
        {userStatusCategories.map((cat) => {
          const data = status[cat];
          if (data === undefined) {
            return null;
          }
          return (
            <TabsContent key={cat} value={cat}>
              <StatusDetailsContent data={data} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

type StatusDetailsContentProps = {
  data: StatusData;
};
const subjectStyle = css({ textStyle: "detail-subject", mb: "1" });

const StatusDetailsContent: React.FC<StatusDetailsContentProps> = ({ data }) => {
  const { srcEvent } = data;
  const nevent = nip19.neventEncode({ id: srcEvent.id, author: srcEvent.pubkey });
  const naddr = nip19.naddrEncode({
    kind: srcEvent.kind,
    pubkey: srcEvent.pubkey,
    identifier: getFirstTagValueByName(srcEvent, "d"),
  });

  const { t } = useTranslation();

  return (
    <div className={vstack({ pt: "1", gap: "3.5", alignItems: "start" })}>
      <div className={css({ maxW: "100%" })}>
        <h3 className={subjectStyle}>{t("Lifetime")}</h3>
        <p>
          <span>{new Date(data.createdAt * 1000).toLocaleString()}</span> -{" "}
          {data.expiration && <span>{new Date(data.expiration * 1000).toLocaleString()}</span>}
        </p>
      </div>
      <div className={css({ maxW: "100%" })}>
        <h3 className={subjectStyle}>{t("Event Identifiers")}</h3>
        <div className={vstack({ gap: "1.5", alignItems: "start" })}>
          <EventIdentifier id={nevent} />
          <EventIdentifier id={naddr} />
        </div>
      </div>
      <div className={css({ maxW: "100%" })}>
        <h3 className={subjectStyle}>{t("Raw Event")}</h3>
        <pre className={css({ maxH: "300px", overflow: "scroll", fontFamily: "monospace", lineHeight: "1.05" })}>
          {JSON.stringify(srcEvent, undefined, 2)}
        </pre>
      </div>
    </div>
  );
};

const EventIdentifier: React.FC<{ id: string }> = ({ id }) => {
  return (
    <p
      className={css({
        w: "100%",
        whiteSpace: "nowrap",
        overflowX: "scroll",
      })}
    >
      <code className={css({ textStyle: "mono" })}>{id}</code>
    </p>
  );
};
