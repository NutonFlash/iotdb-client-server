import WorkerManager from './WorkerManager';
import DataSplitter from './DataSplitter';
import FetcherWorker from 'worker-loader!./fetcherWorker.js';

const measurements = ['light', 'temperature', 'humidity', 'pressure', 'frequency'];
// const measurements = ['light'];
const startDate = "2023-07-06 00:00:00";
const endDate = "2024-07-06 00:00:00";
const numWorkers = 25 ;
// const numWorkers = 1;

document.addEventListener("DOMContentLoaded", async function () {
  const workerManager = new WorkerManager(FetcherWorker, numWorkers);
  const dateRanges = DataSplitter.splitDateRange(startDate, endDate, numWorkers);

  await workerManager.initWorkers();
  localStorage.clear();

  measurements.forEach(measurement => {
    dateRanges.forEach(range => {
      workerManager.delegateTask({ measurement, startDate: range.startDate, endDate: range.endDate });
    });
  });
});
