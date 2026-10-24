const { askJson } = require("./llm");

async function main() {
  const result = await askJson(
    'You are a calculator. Return {"sum": <number>} for the numbers given.',
    { numbers: [2, 3] },
  );
  console.log(result);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
