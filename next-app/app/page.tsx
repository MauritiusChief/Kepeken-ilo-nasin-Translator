import AppShell from "../components/Layout/AppShell";
import PageHeader from "../components/Header/PageHeader";
import DictionaryPanel from "../components/Dictionary/DictionaryPanel";
import ParserPanel from "../components/Parser/ParserPanel";
import StructureTreePanel from "../components/StructureTree/StructureTreePanel";

export default function HomePage() {
  return (
    <AppShell>
      <PageHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1.5fr]">
            <DictionaryPanel />
            <ParserPanel />
            <StructureTreePanel />
          </div>
        </div>
      </main>
    </AppShell>
  );
}
