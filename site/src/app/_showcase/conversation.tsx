"use client";
// Showcase: thread, message, streaming text, status line, composer, part frame.
// The "assistant" here is a timer that deals out words: the components hold no model and no transport.

import { Copy, FileText, RotateCcw, ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Composer,
  ComposerAttachButton,
  ComposerAttachment,
  ComposerAttachments,
  ComposerInput,
  ComposerSubmit,
  ComposerToolbar,
  ComposerVoiceButton,
} from "@/components/ui/composer";
import { Message, MessageAction, MessageActions, MessageAvatar, MessageBody, MessageContent, MessageMeta, MessageSuggestion, MessageSuggestions } from "@/components/ui/message";
import { PartFrame, PartFrameContent, PartFrameExpand, PartFrameFooter, PartFrameHeader, PartFrameTitle, type PartFrameState } from "@/components/ui/part-frame";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { StatusLine, StatusLineAction } from "@/components/ui/status-line";
import { StreamingText } from "@/components/ui/streaming-text";
import { Thread, ThreadContent, ThreadEmpty, ThreadJump, ThreadTurn } from "@/components/ui/thread";
import { Demo } from "./demo";

type Entry = { id: number; from: "user" | "assistant" | "system"; text: string; streaming?: boolean; failed?: boolean; spoken?: string };

const SHORT = "Three places are open at one on Saturday. The nearest is a ten minute walk, has a garden at the back, and takes a table of four without booking ahead.";
const SENTENCE = "The walk follows the river past the old mill, turns up through the market, and comes out by the garden gate, where there is shade until late in the afternoon. ";
const LONG = SENTENCE.repeat(14).trim();
const SENT_AT = Date.UTC(2026, 10, 14, 11, 5);

const START: Entry[] = [
  { id: 1, from: "system", text: "Saturday 14 November" },
  { id: 2, from: "user", text: "Somewhere quiet for lunch on Saturday?" },
  { id: 3, from: "assistant", text: "Two places fit. One is by the river, one is in the old town." },
  { id: 4, from: "user", text: "مكان هادئ قرب النهر", failed: true },
];

/** Deals `text` out word by word. Returns a function that stops it. */
function deal(text: string, every: number, onText: (soFar: string) => void, onEnd: () => void): () => void {
  const words = text.split(" ");
  let count = 0;
  const timer = window.setInterval(() => {
    count += 1;
    onText(words.slice(0, count).join(" "));
    if (count >= words.length) {
      window.clearInterval(timer);
      onEnd();
    }
  }, every);
  return () => window.clearInterval(timer);
}

function ThreadDemo() {
  const [entries, setEntries] = useState<Entry[]>(START);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("nothing");
  const nextId = useRef(100);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), []);

  const patch = (id: number, change: Partial<Entry>): void => setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...change } : entry)));

  const send = (text: string): void => {
    const long = /long/i.test(text);
    const reply = nextId.current + 1;
    setEntries((current) => [...current, { id: nextId.current, from: "user", text }]);
    nextId.current += 2;
    setBusy(true);
    setStatus("Searching");
    const wait = window.setTimeout(() => {
      setStatus("Writing a reply");
      setEntries((current) => [...current, { id: reply, from: "assistant", text: "", streaming: true, ...(long ? { spoken: "The long reply is ready." } : {}) }]);
      cancel.current = deal(
        long ? LONG : SHORT,
        long ? 25 : 90,
        (soFar) => patch(reply, { text: soFar }),
        () => {
          patch(reply, { streaming: false });
          setBusy(false);
          setStatus("Done");
        },
      );
    }, 500);
    cancel.current = () => window.clearTimeout(wait);
  };

  const stop = (): void => {
    cancel.current?.();
    setEntries((current) => current.map((entry) => (entry.streaming ? { ...entry, streaming: false } : entry)));
    setBusy(false);
    setStatus("Stopped");
  };

  const lastReply = entries.findLast((entry) => entry.from === "assistant");
  const lastOwn = entries.findLast((entry) => entry.from === "user");

  return (
    <div className="flex flex-col gap-3">
      <Thread aria-label="Conversation with the assistant" resumeKey={lastOwn?.id ?? null} className="h-[26rem] rounded-surface border">
        <ThreadContent>
          {entries.length === 0 ? <ThreadEmpty>Ask anything to begin.</ThreadEmpty> : null}
          {entries.map((entry) => (
            <ThreadTurn key={entry.id} label={entry.from === "user" ? "You" : entry.from === "assistant" ? "Assistant" : "Note"}>
              <Message from={entry.from}>
                {entry.from === "assistant" ? (
                  <MessageAvatar>
                    <Avatar size="sm" aria-hidden="true">
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  </MessageAvatar>
                ) : null}
                <MessageBody>
                  <MessageContent>
                    {entry.from === "assistant" ? (
                      <StreamingText text={entry.text} streaming={entry.streaming ?? false} announceWhenDone={entry.spoken ?? true} />
                    ) : (
                      entry.text
                    )}
                  </MessageContent>
                  {entry.from === "user" ? (
                    <MessageMeta time={SENT_AT} locale="en-GB" timeFormat={{ hour: "numeric", minute: "2-digit", timeZone: "UTC" }} status={entry.failed ? "failed" : "sent"}>
                      {entry.failed ? (
                        <button type="button" className="rounded-control px-1 underline underline-offset-4" onClick={() => patch(entry.id, { failed: false })}>
                          Try again
                        </button>
                      ) : null}
                    </MessageMeta>
                  ) : null}
                  {entry.from === "assistant" && !entry.streaming && entry.text !== "" ? (
                    <MessageActions aria-label="Actions for this reply" visible={entry.id === lastReply?.id ? "always" : "hover"}>
                      <MessageAction aria-label="Copy" onClick={() => setCopied(`reply ${entry.id}`)}>
                        <Copy aria-hidden="true" strokeWidth={1.5} />
                      </MessageAction>
                      <MessageAction aria-label="Good reply">
                        <ThumbsUp aria-hidden="true" strokeWidth={1.5} />
                      </MessageAction>
                      <MessageAction aria-label="Try again">
                        <RotateCcw aria-hidden="true" strokeWidth={1.5} />
                      </MessageAction>
                    </MessageActions>
                  ) : null}
                  {entry.id === 3 ? (
                    <MessageSuggestions aria-label="Suggested replies">
                      <MessageSuggestion disabled={busy} onClick={() => send("By the river")}>
                        By the river
                      </MessageSuggestion>
                      <MessageSuggestion disabled={busy} onClick={() => send("Give me the long version")}>
                        Give me the long version
                      </MessageSuggestion>
                    </MessageSuggestions>
                  ) : null}
                </MessageBody>
              </Message>
            </ThreadTurn>
          ))}
        </ThreadContent>
        <ThreadJump>Jump to latest</ThreadJump>
      </Thread>

      <StatusLine working={busy}>{status}</StatusLine>

      <Composer onSubmit={send} busy={busy} onStop={stop}>
        <ComposerInput aria-label="Message to the assistant" placeholder="Ask anything" />
        <ComposerToolbar>
          <ComposerSubmit />
        </ComposerToolbar>
      </Composer>
      <p className="text-sm text-muted-foreground">
        Messages: <span data-testid="count">{entries.length}</span>. Copied: <span data-testid="copied">{copied}</span>.
      </p>
    </div>
  );
}

function StreamingDemo() {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(0);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), []);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={streaming}
          onClick={() => {
            setText("");
            setStreaming(true);
            cancel.current = deal(SHORT, 40, setText, () => setStreaming(false));
          }}
        >
          Stream a reply
        </Button>
      </div>
      <p className="min-h-24 text-base leading-relaxed" data-testid="stream">
        <StreamingText text={text} streaming={streaming} reveal="word" announceWhenDone="Three places found." onDone={() => setDone((count) => count + 1)} />
      </p>
      <p className="text-sm text-muted-foreground">
        Finished <span data-testid="done">{done}</span> time{done === 1 ? "" : "s"}. A screen reader hears only “Three places found.”, once.
      </p>
    </div>
  );
}

const STATUSES = ["", "Searching three sources", "Reading the results", "Writing a reply", "Done"];

function StatusDemo() {
  const [step, setStep] = useState(0);
  const [stopped, setStopped] = useState(false);
  const working = step > 0 && step < STATUSES.length - 1 && !stopped;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setStopped(false);
            setStep((current) => (current + 1) % STATUSES.length);
          }}
        >
          Next status
        </Button>
      </div>
      <div className="rounded-surface border px-3 py-1" data-testid="status-box">
        <StatusLine working={working} indicator="spinner" action={working ? <StatusLineAction onClick={() => setStopped(true)}>Stop</StatusLineAction> : null}>
          {stopped ? "Stopped" : STATUSES[step]}
        </StatusLine>
      </div>
      <StatusLine working>Three dots: the default mark</StatusLine>
    </div>
  );
}

function ComposerDemo() {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState("nothing yet");
  const [files, setFiles] = useState<string[]>(["plan.pdf"]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [stops, setStops] = useState(0);
  return (
    <div className="flex flex-col gap-4">
      <Composer
        value={value}
        onValueChange={setValue}
        busy={busy}
        allowEmpty={files.length > 0}
        onStop={() => {
          setStops((count) => count + 1);
          setBusy(false);
        }}
        onSubmit={(text) => {
          setSent(`${text || "(no text)"}${files.length > 0 ? ` + ${files.join(", ")}` : ""}`);
          setFiles([]);
        }}
      >
        {files.length > 0 ? (
          <ComposerAttachments aria-label="Attachments">
            {files.map((file) => (
              <ComposerAttachment key={file} removeLabel={`Remove ${file}`} onRemove={() => setFiles((current) => current.filter((name) => name !== file))}>
                <FileText aria-hidden="true" strokeWidth={1.5} />
                {file}
              </ComposerAttachment>
            ))}
          </ComposerAttachments>
        ) : null}
        <ComposerInput aria-label="Message" placeholder="Write a message" maxRows={4} />
        <ComposerToolbar>
          <ComposerAttachButton aria-label="Attach a sample file" onClick={() => setFiles((current) => [...current, `photo-${current.length + 1}.jpg`])} />
          <ComposerVoiceButton pressed={listening} onPressedChange={setListening} />
          <ComposerSubmit />
        </ComposerToolbar>
      </Composer>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" aria-pressed={busy} onClick={() => setBusy((current) => !current)}>
          A reply is on its way
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Typed: <span data-testid="typed">{JSON.stringify(value)}</span>. Sent: <span data-testid="sent">{sent}</span>. Stopped <span data-testid="stops">{stops}</span> times.
      </p>
    </div>
  );
}

const STATES: PartFrameState[] = ["loading", "live", "pending", "final"];

function Plan({ roomy = false }: { roomy?: boolean }) {
  return (
    <ol className={roomy ? "flex flex-col gap-4 text-base" : "flex flex-col gap-2 text-sm"}>
      <li>10:00 Walk along the river</li>
      <li>13:00 Lunch in the garden</li>
      <li>15:30 The old mill</li>
    </ol>
  );
}

function PartFrameDemo() {
  const [state, setState] = useState<PartFrameState>("live");
  const [replaced, setReplaced] = useState(false);
  const newer = useRef<HTMLElement>(null);
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl value={state} onValueChange={(next) => setState(next as PartFrameState)} aria-label="State of the first frame" size="sm" className="w-full">
        {STATES.map((item) => (
          <SegmentedControlItem key={item} value={item} disabled={replaced} className="capitalize">
            {item}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <PartFrame data-testid="frame-a" state={replaced ? "superseded" : state} labels={{ final: "Confirmed" }} replacementRef={newer} supersededBy={<a href="#plan-b" className="underline underline-offset-4">See the new plan</a>}>
        <PartFrameHeader>
          <PartFrameTitle>Plan for Saturday</PartFrameTitle>
          <PartFrameExpand title="Plan for Saturday">
            <Plan roomy />
          </PartFrameExpand>
        </PartFrameHeader>
        <PartFrameContent className="min-h-32">
          <Plan />
        </PartFrameContent>
        <PartFrameFooter>
          <Button size="sm" variant="outline" disabled={state === "final"} onClick={() => setReplaced(true)}>
            Move lunch to 14:00
          </Button>
        </PartFrameFooter>
      </PartFrame>

      {replaced ? (
        <PartFrame ref={newer} id="plan-b" data-testid="frame-b">
          <PartFrameHeader>
            <PartFrameTitle>Plan for Saturday, lunch at 14:00</PartFrameTitle>
          </PartFrameHeader>
          <PartFrameContent className="min-h-32">
            <Plan />
          </PartFrameContent>
          <PartFrameFooter>
            <Button size="sm" variant="ghost" onClick={() => setReplaced(false)}>
              Undo
            </Button>
          </PartFrameFooter>
        </PartFrame>
      ) : null}
    </div>
  );
}

export function Conversation() {
  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Thread, messages and composer" className="@3xl:col-span-2">
        <ThreadDemo />
      </Demo>
      <Demo title="Streaming text">
        <StreamingDemo />
      </Demo>
      <Demo title="Status line">
        <StatusDemo />
      </Demo>
      <Demo title="Composer">
        <ComposerDemo />
      </Demo>
      <Demo title="Part frame">
        <PartFrameDemo />
      </Demo>
    </div>
  );
}
