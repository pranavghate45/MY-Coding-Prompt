import PromptProjectWizard from "@/components/PromptProjectWizard";

export const metadata = {
  title: "Prompt Generator",
};

export default function PromptGeneratorPage() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <div className="ui-page">
        <PromptProjectWizard />
      </div>
    </div>
  );
}
