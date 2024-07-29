import Plotly from 'plotly.js-dist';
import Worker from './worker.worker.js';

// const socket = new WebSocket('ws://localhost:228/wss');

const measurements = ['light', 'temperature', 'humidity', 'pressure', 'frequency'];
const startDate = "2023-07-06 00:00:00";
const endDate = "2024-07-04 23:59:59";
const traces = {};
const workers = [];
const workerCount = 20;
const workerPerMeas = Math.floor(workerCount / measurements.length);

const calculateDateRanges = (startDateStr, endDateStr, workerCount) => {
  const ranges = [];
  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)
  const totalMillis = endDate.getTime() - startDate.getTime();
  const stepMillis = totalMillis / workerCount;

  for (let i = 0; i < workerCount; i++) {
    const start = new Date(startDate.getTime() + (i * stepMillis));
    const end = new Date(startDate.getTime() + ((i + 1) * stepMillis));
    ranges.push({ startDate: start, endDate: end });
  }

  return ranges;
};


for (let i = 0; i < workerCount; i++) {
  const worker = new Worker();
  worker.onmessage = function (event) {
    const { data } = event;
    if (data.message) {
      console.log(data.message)

    }
    // const timestamps = message.timestamps;
    // const values = message.values;
    // const measurement = message.measurement;

    // if (traces[measurement]) {
    //   const extendStartTime = performance.now();
    //   Plotly.extendTraces('myDiv', {
    //     x: [timestamps],
    //     y: [values]
    //   }, [traces[measurement]]);
    //   const extendEndTime = performance.now();
    //   console.log(`Time to extend trace for ${measurement}: ${extendEndTime - extendStartTime} ms`);
    // }
  };
  workers.push(worker);
}

// socket.addEventListener('open', function (event) {
//   console.log("WebSocket is open now.");

//   const message = {
//     type: "fetch-points",
//     startDate: "2023-07-06 00:00:00",
//     endDate: "2024-07-04 23:59:59",
//     batchSize: 1000000,
//     numThreads: 10,
//     measurements: measurements.join(',')
//   };
//   socket.send(JSON.stringify(message));
// });

// let currentWorker = 0;

// socket.onmessage = async function (event) {
//   if (event.data === 'end-reading') {
//     console.log('Data reading on server completed');
//     return;
//   }

// const receiveStartTime = performance.now();
// const buffer = await event.data.arrayBuffer();
// const receiveEndTime = performance.now();
// console.log(`Time to receive message: ${receiveEndTime - receiveStartTime} ms`);

// const parseStartTime = performance.now();
// workers[currentWorker].postMessage(buffer, [buffer]);
// const parseEndTime = performance.now();
// console.log(`Time to parse message for worker ${currentWorker + 1}: ${parseEndTime - parseStartTime} ms`);

// currentWorker = (currentWorker + 1) % workerCount;
//   console.log(`Received new batch`);
// };

// socket.onclose = function () {
//   console.log('WebSocket connection closed');
// };

// socket.addEventListener('error', function (error) {
//   console.error('WebSocket Error: ', error);
// });

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

  measurements.forEach((measurement, measIndex) => {
    const dateRanges = calculateDateRanges(startDate, endDate, workerPerMeas);
    for (let workerIndex = 0; workerIndex < workerPerMeas; workerIndex++) {
      const worker = workers[measIndex * workerPerMeas + workerIndex];
      const { startDate: rangeStartDate, endDate: rangeEndDate } = dateRanges[workerIndex];
      worker.postMessage({ measurement, startDate: rangeStartDate.toISOString(), endDate: rangeEndDate.toISOString() });
    }
  });
});
