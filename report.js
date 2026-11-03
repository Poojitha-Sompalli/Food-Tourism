const fs = require("fs");
const { parse } = require("csv-parse/sync");

const data = fs.readFileSync("benz-circle-cleaned.csv", "utf8");

const records = parse(data, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  trim: true
});

let complete = 0;
let needsDetails = 0;
const missingCounts = {};

for (const record of records) {
  if (record.data_status === "Basic details available") {
    complete++;
  } else {
    needsDetails++;
  }

  if (record.missing_fields) {
    const fields = record.missing_fields.split(";");

    for (const field of fields) {
      const name = field.trim();

      if (name) {
        missingCounts[name] = (missingCounts[name] || 0) + 1;
      }
    }
  }
}

console.log("\n--- DATA QUALITY REPORT ---");
console.log("Total records:", records.length);
console.log("Basic details available:", complete);
console.log("Needs more details:", needsDetails);

console.log("\n--- MISSING INFORMATION ---");

for (const field in missingCounts) {
  console.log(field + ": " + missingCounts[field]);
}