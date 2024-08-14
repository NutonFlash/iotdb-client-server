import WorkerManager from "./WorkerManager";
import FetcherWorker from "worker-loader!./fetcherWorker.js";
import IndexedDBManager from "./IndexedDBManager";

const measurements = [
  "light",
  "temperature",
  "humidity",
  "pressure",
  "frequency",
];
const startDate = "2023-07-06 00:00:00";
const endDate = "2023-08-03 00:00:00";
const numWorkers = 15;

document.addEventListener("DOMContentLoaded", async function () {
  const dbManager = new IndexedDBManager('MyDatabase', 'DataStore');
  const workerManager = new WorkerManager(FetcherWorker, numWorkers, dbManager);

  // Initialize IndexedDB
  await dbManager.init();
  // Initialize workers before starting the data fetch
  await workerManager.initWorkers();

  const promises = [];
  const startTime = Date.now(); // Capture start time to measure total duration

  measurements.forEach((measurement) => {
    // Fetch data for each measurement across different time intervals ("month", "day", etc.)
    const promise = workerManager.fetchCascadingData(
      measurement,
      "day",  // Start with "day" interval and progressively fetch smaller intervals
      startDate,
      endDate
    );
    promises.push(promise); // Collect all promises to track when all data fetching is complete
  });

  Promise.all(promises).then(() => {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Calculate total duration in seconds
    console.log(`All points were fetched for ${duration} sec`);
  });
});
