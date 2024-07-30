import { DataRequest } from './proto/data_pb.js';
import { SenderClient } from './proto/data_grpc_web_pb.js';
import GorillaDecompressor from './decompressor/GorillaDecompressor.js'
import LongArrayInput from './decompressor/LongArrayInput.js'

// Initialize the gRPC client for the data service
const dataService = new SenderClient('http://192.168.56.107:8080', null, null);

let workerId = null;

// Message handler for the web worker
self.onmessage = function (event) {
  if (event.data.workerId !== undefined) {
    workerId = event.data.workerId;
    self.postMessage({ workerId, message: `Worker initialized` });
    return;
  }
  const { measurement, startDate, endDate } = event.data;
  fetchData(measurement, startDate, endDate);
};

/**
 * Fetch data from the gRPC service and handle the stream.
 *
 * @param {string} measurement - The measurement name to fetch data for.
 * @param {string} startDate - The start date of the data range.
 * @param {string} endDate - The end date of the data range.
 */
async function fetchData(measurement, startDate, endDate) {
  const collection = [];

  // Convert date strings to Date objects
  const _startDate = new Date(startDate);
  const _endDate = new Date(endDate);

  // Create a DataRequest object and set its properties
  const request = new DataRequest();
  request.setMeasurement(measurement);
  request.setStartdate(_startDate.toISOString());
  request.setEnddate(_endDate.toISOString());

  // Record the start time for performance measurement
  const startTime = Date.now();
  let lastTimestamp = startTime;

  // Start the gRPC stream
  const stream = dataService.getData(request, {}, (err, response) => {
    if (err) {
      self.postMessage({ workerId, error: `Error calling getData: ${err.message}` });
    } else {
      self.postMessage({ workerId, message: `Unary response: ${response.toObject()}` });
    }
  });

  // Notify the main thread that data fetching has started
  self.postMessage(workerId, {
    message: `Start fetching data for measurement "${measurement}" (${startDate} - ${endDate})`
  });

  const performanceMetrics = { measurement, metrics: [] };

  // Stream event handlers
  stream.on("data", function (response) {
    const currentTime = Date.now();

    const rawData = response.getPoints();
    const dataSize = rawData.length; // Size in bytes

    const longArray = LongArrayInput.uint8ArrayToLongArray(rawData);
    const input = new LongArrayInput(longArray);
    const decompressor = new GorillaDecompressor(input);

    for (let i = 0; i < rawData.length; i++) {
      const pair = decompressor.readPair();
      if (pair === null) break;
      collection.push(pair);
    }

    // Calculate delay since the last chunk
    const delay = currentTime - lastTimestamp;
    lastTimestamp = currentTime;

    // Log the performance metric
    performanceMetrics.metrics.push({ timestamp: currentTime, delay, dataSize });

    self.postMessage({ workerId, message: `Fetched ${dataSize / 1024}kb of points for measurement ${measurement}` });
  });

  stream.on('error', function (err) {
    self.postMessage({ workerId, error: `Error in streaming: ${err.message}` });
  });

  stream.on('end', function () {
    // Record the end time and calculate the duration
    const endTime = Date.now();
    self.postMessage({
      workerId,
      data: { measurement, collection },
      performanceMetrics
    });
    self.postMessage({
      workerId,
      message: `Completed fetching data for ${measurement} measurement. Time spent: ${(endTime - startTime) / 1000} seconds`,
    });
  });
}
