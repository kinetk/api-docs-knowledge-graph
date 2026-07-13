import { content } from "@/lib/data";
import { Section } from "@/components/ui/section";
import { SelectionProvider } from "@/components/providers/selection-provider";
import { BrandSelector } from "@/components/sections/brand-selector/brand-selector";
import { SiteFooter } from "@/components/sections/footer/site-footer";
import { Masthead } from "@/components/sections/masthead/masthead";
import { Narratives } from "@/components/sections/narratives/narratives";
import { Playbook } from "@/components/sections/playbook/playbook";
import { ShareOfVoice } from "@/components/sections/share-of-voice/share-of-voice";
import { SummaryMetrics } from "@/components/sections/summary-metrics/summary-metrics";
import { Ticker } from "@/components/sections/ticker/ticker";
import { TrendChart } from "@/components/sections/weekly-pulse/trend-chart";

export default function Home() {
  const { sections } = content;
  return (
    <>
      <Ticker />
      <main className="mx-auto max-w-295 px-8 max-[700px]:px-4.5">
        <Masthead />

        <SelectionProvider>
          <Section meta={sections.shareOfVoice}>
            <ShareOfVoice />
          </Section>
          <Section meta={sections.position} divider>
            <BrandSelector />
          </Section>
          <Section meta={sections.weeklyPulse} divider>
            <TrendChart />
          </Section>
          <Playbook />
        </SelectionProvider>

        <Section meta={sections.summaryMetrics} divider>
          <SummaryMetrics />
        </Section>
        <Section meta={sections.narratives} divider>
          <Narratives />
        </Section>

        <SiteFooter />
      </main>
    </>
  );
}
