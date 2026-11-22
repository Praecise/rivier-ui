import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { C, Code } from "../../_site/code";
import { Live } from "../../_site/live";
import { inline } from "../../_site/markdown";
import { CopyButton } from "../../_site/parts";
import { CATEGORIES, SITE, componentsNav, importPath, item, items, liveFor, usedBy, type Item } from "../../_site/registry";
import { DocPage } from "../../_site/shell";

export const dynamicParams = false;

export const generateStaticParams = (): { name: string }[] => items().map((entry) => ({ name: entry.name }));

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = item((await params).name);
  if (!entry) return {};
  return { title: `${entry.name}: Rivier UI`, description: entry.description, alternates: { canonical: `/components/${entry.name}` } };
}

/** The component as Markdown, for pasting into a conversation with an assistant. */
const markdownOf = (entry: Item): string =>
  [
    `# ${entry.name} (Rivier UI)`,
    "",
    entry.description,
    "",
    `When to use it: ${entry.when}`,
    "",
    `Add it: \`rivier-ui add ${entry.name}\`, or \`npx shadcn@latest add @rivier-ui/${entry.name}\` with the registry ${SITE}/r/{name}.json`,
    `Import it from: \`${importPath(entry)}\``,
    "",
    "```tsx",
    entry.example,
    "```",
    "",
    `Source and a working demonstration: ${SITE}/components/${entry.name}`,
  ].join("\n");

const ItemLinks = ({ names }: { names: string[] }) => (
  <ul>
    {names.map((name) => (
      <li key={name}>
        <a href={`/components/${name}`}>{name}</a>
      </li>
    ))}
  </ul>
);

export default async function Page({ params }: Props) {
  const all = items();
  const { name } = await params;
  const index = all.findIndex((entry) => entry.name === name);
  const entry = all[index];
  if (!entry) notFound();
  const live = liveFor(entry.name);
  const users = usedBy(entry.name);
  const category = CATEGORIES.find((group) => group.id === entry.category);
  const before = all[index - 1];
  const after = all[index + 1];
  const onPage = [
    { id: "when", title: "When to use it" },
    ...(live ? [{ id: "live", title: "See it working" }] : []),
    { id: "add", title: "Add it" },
    { id: "example", title: "Example" },
    { id: "needs", title: "What it needs" },
    { id: "source", title: "Source" },
  ];

  return (
    <DocPage
      nav={componentsNav()}
      navLabel="Components"
      eyebrow={category?.title}
      title={entry.name}
      lead={inline(entry.description)}
      onPage={onPage}
      previous={before ? { href: `/components/${before.name}`, title: before.name } : { href: "/components", title: "All components" }}
      next={after ? { href: `/components/${after.name}`, title: after.name } : undefined}
      actions={
        <>
          <CopyButton text={markdownOf(entry)} variant="outline" copied="Copied as Markdown">
            Copy as Markdown
          </CopyButton>
          {live ? (
            <Button asChild variant="ghost" size="sm">
              <a href={live.href}>
                {live.page}
                <ArrowUpRight aria-hidden="true" strokeWidth={1.5} className="rtl:-scale-x-100" />
              </a>
            </Button>
          ) : null}
        </>
      }
    >
      <h2 id="when">When to use it</h2>
      <p>{inline(entry.when)}</p>

      {live ? (
        <>
          <h2 id="live">See it working</h2>
          <p>
            The demonstration the browser checks drive, with the keyboard as well as the pointer. More of it is on the <a href={live.href}>{live.page}</a> page.
          </p>
          <div data-slot="live-frame" className="mt-5 text-sm leading-normal">
            <Live group={live.group} titles={live.titles} />
          </div>
        </>
      ) : null}

      <h2 id="add">Add it</h2>
      <Tabs defaultValue="shadcn" className="mt-4">
        <TabsList aria-label="How to add it">
          <TabsTrigger value="shadcn">shadcn command</TabsTrigger>
          <TabsTrigger value="own">Rivier UI command</TabsTrigger>
          <TabsTrigger value="hand">By hand</TabsTrigger>
        </TabsList>
        <TabsContent value="shadcn">
          <Code code={`npx shadcn@latest add @rivier-ui/${entry.name}`} language="sh" />
          <p>
            The registry is named once in <C>components.json</C>: see <a href="/docs/installation#shadcn">Installation</a>.
          </p>
        </TabsContent>
        <TabsContent value="own">
          <Code code={`npm run ui -- add ${entry.name} dir=<project>`} language="sh" />
          <p>
            From a copy of the library. It keeps the file's header and imports the theme: see <a href="/docs/command">The command</a>.
          </p>
        </TabsContent>
        <TabsContent value="hand">
          <p>
            Copy the <a href="#source">source</a> below to <C>src/{entry.target}</C>, add what it needs, and install its packages.
          </p>
          {entry.dependencies.length > 0 ? <Code code={`npm install ${entry.dependencies.join(" ")}`} language="sh" /> : null}
        </TabsContent>
      </Tabs>

      <h2 id="example">Example</h2>
      <p>
        Import it from <C>{importPath(entry)}</C>.
      </p>
      <Code code={entry.example} copyLabel="Copy the example" />

      <h2 id="needs">What it needs</h2>
      <p>
        {entry.client ? "A client component: it uses state, effects or browser behaviour. " : "Plain markup: it can stay a server component. "}
        {entry.dependencies.length > 0 ? (
          <>
            Packages:{" "}
            {entry.dependencies.map((dependency, at) => (
              <span key={dependency}>
                {at > 0 ? ", " : ""}
                <C>{dependency}</C>
              </span>
            ))}
            .
          </>
        ) : (
          "No packages beyond React."
        )}
      </p>
      {entry.registryDependencies.length > 0 ? (
        <>
          <h3>It imports</h3>
          <ItemLinks names={entry.registryDependencies} />
        </>
      ) : null}
      {users.length > 0 ? (
        <>
          <h3>It is used by</h3>
          <ItemLinks names={users} />
        </>
      ) : null}

      <h2 id="source">Source</h2>
      <p>
        The whole file. Once copied it is yours: the <a href={`/r/${entry.name}.json`}>registry item</a> holds the same text.
      </p>
      <Code code={entry.source} title={`src/${entry.target}`} copyLabel="Copy the source" tall />
    </DocPage>
  );
}
