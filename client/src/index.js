import Plotly from 'plotly.js-dist';
import WorkerManager from './WorkerManager';
import DataSplitter from './DataSplitter';
import FetcherWorker from 'worker-loader!./fetcherWorker.js';

// const measurements = ['light', 'temperature', 'humidity', 'pressure', 'frequency'];
const measurements = ['light'];
const startDate = "2023-07-06 00:00:00";
const endDate = "2023-07-06 23:59:59";
const traces = {};
// const numWorkers = navigator.hardwareConcurrency || 5;
const numWorkers = 1;

document.addEventListener("DOMContentLoaded", function () {
  const layout = {
    title: 'IoTDB Data',
    xaxis: { title: 'Timestamp' },
    yaxis: { title: 'Value' }
  };

  const initialTraces = measurements.map((measurement, index) => {
    traces[measurement] = index;
    return {
      x: [],
      y: [],
      mode: 'lines',
      name: measurement,
      type: 'scattergl'
    }
  });

  Plotly.newPlot('myDiv', initialTraces, layout);

  const workerManager = new WorkerManager(FetcherWorker, numWorkers);
  const dateRanges = DataSplitter.splitDateRange(startDate, endDate, numWorkers);

  workerManager.initWorkers();
  localStorage.clear();

  measurements.forEach(measurement => {
    dateRanges.forEach(range => {
      workerManager.delegateTask({ measurement, startDate: range.startDate, endDate: range.endDate });
    });
  });
});
