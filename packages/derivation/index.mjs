export function explainMeetingDigestObligation() {
  return [
    {
      tier: "T1 primitive",
      item: "ObservableRun",
      obligation: "Every app run must produce structured and human-readable logs.",
    },
    {
      tier: "T2 pattern",
      item: "ReviewGate",
      obligation: "Outputs that affect external systems must enter review before publication.",
    },
    {
      tier: "T3 archetype",
      item: "JobProcessor",
      obligation: "Bulk and streaming jobs share runtime ports and artifact handling.",
    },
    {
      tier: "App extension",
      item: "MeetingDigest",
      obligation: "Transcript topics produce review-ready digest and extracted work items.",
    },
  ];
}
