import ApiConfigForm from "./ApiConfigForm";
import DictionaryControls from "./DictionaryControls";
import StatusBar from "./StatusBar";

export function PageHeader() {
  return (
    <header className="border-b bg-white" data-testid="page-header">
      <div className="mx-auto max-w-[1400px] space-y-3 px-4 py-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <DictionaryControls />
          <ApiConfigForm />
        </div>
        <StatusBar />
      </div>
    </header>
  );
}

export default PageHeader;
