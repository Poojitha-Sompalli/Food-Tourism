const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const inputFile = "benz-circle-restaurants.csv";

const rawData = fs.readFileSync(inputFile, "utf8");

const records = parse(rawData, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  trim: true
});

// Clean text and standardize missing values
function cleanValue(value) {
  if (!value || value.trim() === "") {
    return "Not Available";
  }

  if (value.trim().toLowerCase() === "not available") {
    return "Not Available";
  }

  return value.trim();
}

// Remove exact duplicate records using OpenStreetMap ID
const seen = new Set();
const cleanedData = [];

for (const record of records) {
  const item = {};

  for (const key of Object.keys(record)) {
    item[key] = cleanValue(record[key]);
  }

  const id = item.osm_id;

  if (id === "Not Available" || seen.has(id)) {
    continue;
  }

  seen.add(id);

  // Mark records that need more information
  const importantFields = [
    "name",
    "category",
    "latitude",
    "longitude"
  ];

  const missingFields = importantFields.filter(
    field => item[field] === "Not Available"
  );

  item.data_status =
    missingFields.length === 0
      ? "Basic details available"
      : "Needs details";

  item.missing_fields = missingFields.join("; ");

  cleanedData.push(item);
}

// Export cleaned data
const columns = [
  ...Object.keys(records[0]),
  "data_status",
  "missing_fields"
];

const csvOutput = stringify(cleanedData, {
  header: true,
  columns
});

fs.writeFileSync(
  "benz-circle-cleaned.csv",
  "\uFEFF" + csvOutput,
  "utf8"
);

console.log("Data cleaning completed!");
console.log("Original records:", records.length);
console.log("Cleaned records:", cleanedData.length);
console.log("File created: benz-circle-cleaned.csv");