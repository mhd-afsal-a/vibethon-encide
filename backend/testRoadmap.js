const { buildRoadmap } = require("./engine");

const samples = [
  {
    label: "Both PAN and driving licence lost",
    event: "lost_documents",
    answers: { lost_item: ["pan_card", "driving_licence"] },
  },
  {
    label: "Only PAN lost",
    event: "lost_documents",
    answers: { lost_item: ["pan_card"] },
  },
  {
    label: "Death event",
    event: "death",
    answers: {},
  },
];

for (const sample of samples) {
  const steps = buildRoadmap(sample.event, sample.answers);
  console.log(`\n${sample.label}`);
  if (steps.length === 0) {
    console.log("(no steps)");
    continue;
  }
  for (const step of steps) {
    console.log(`- ${step.title}`);
  }
}
