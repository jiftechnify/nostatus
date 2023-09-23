import { css } from "@shadow-panda/styled-system/css";
import { vstack } from "@shadow-panda/styled-system/patterns";
import { nip19 } from "nostr-tools";
import { getFirstTagValueByName } from "../nostr";
import { StatusData, UserStatus, UserStatusCategory, userStatusCategories } from "../states/nostrModels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type StatusDetailViewProps = {
  status: UserStatus;
};

const categoryLabelTable: Record<UserStatusCategory, string> = {
  general: "General",
  music: "Music",
};

export const StatusDetailView: React.FC<StatusDetailViewProps> = ({ status }) => {
  const availableCategories = userStatusCategories.filter((cat) => status[cat] !== undefined);
  console.log(availableCategories);

  return (
    <div className={css({ w: "95vw", maxW: "800px"})}>
      <h2 className={css({ mb: '3', textStyle: 'detail-title', border: "none" })}>Detail</h2>
      <Tabs defaultValue={availableCategories[0]}>
        <TabsList>
          {availableCategories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
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
            <TabsContent value={cat}>
              <StatusDetailContent data={data} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

type StatusDetailContentProps = {
  data: StatusData;
};
const subjectStyle = css({textStyle: 'detail-subject', mb: '1'});

const StatusDetailContent: React.FC<StatusDetailContentProps> = ({ data }) => {
  const { srcEvent } = data;
  const nevent = nip19.neventEncode({ id: srcEvent.id, author: srcEvent.pubkey });
  const naddr = nip19.naddrEncode({
    kind: srcEvent.kind,
    pubkey: srcEvent.pubkey,
    identifier: getFirstTagValueByName(srcEvent, "d"),
  });

  return (
    <div className={vstack({ gap: "3.5", alignItems: "start" })}>
      <div className={css({ maxW: "100%" })}>
        <h3 className={subjectStyle}>Lifetime</h3>
        <p>
          <span>{new Date(data.createdAt * 1000).toLocaleString()}</span> -{" "}
          {data.expiration && <span>{new Date(data.expiration * 1000).toLocaleString()}</span>}
        </p>
      </div>
      <div className={css({ maxW: "100%" })}>
        <h3 className={subjectStyle}>Identifiers</h3>
        <div className={vstack({ gap: "1.5", alignItems: "start" })}>
          <EventIdentifier id={nevent} />
          <EventIdentifier id={naddr} />
        </div>
      </div>
      <div className={css({ maxW: "100%" })}>
        <h3 className={subjectStyle}>Raw Event</h3>
        <pre className={css({ maxH: '300px', overflow: "scroll", fontFamily: "monospace", lineHeight: "1.05" })}>
          {JSON.stringify(srcEvent, undefined, 2)}
        </pre>
      </div>
    </div>
  );
};

const EventIdentifier: React.FC<{ id: string }> = ({  id }) => {
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
