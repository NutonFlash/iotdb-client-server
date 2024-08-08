import { DataRequest } from './proto/data_pb.js';
import { SenderClient } from './proto/data_grpc_web_pb.js';
import GorillaDecompressor from './decompressor/GorillaDecompressor.js';
import LongArrayInput from './decompressor/LongArrayInput.js';

// Initialize the gRPC client for the data service
const dataService = new SenderClient('http://192.168.0.202:8080', null, null);

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

    const bytes = convertToSignByteArr(rawData);

    // let byteArrStr = '[';
    // bytes.forEach((byte, index) => byteArrStr += index !== bytes.length - 1 ? `${byte}, ` : byte);
    // byteArrStr += ']';

    // self.postMessage({ workerId, message: `Compressed data as byte[]: ${byteArrStr}` });

    const longArray = LongArrayInput.uint8ArrToLongArr(bytes);

    // let longArrStr = '[';
    // longArray.forEach((long, index) => longArrStr += index !== longArray.length - 1 ? `${long.toString(10)}, ` : long.toString(10));
    // longArrStr += ']';

    // self.postMessage({ workerId, message: `Compressed data as long[]: ${longArrStr}` });

    const input = new LongArrayInput(longArray);
    const decompressor = new GorillaDecompressor(input);

    while (true) {
      const pair = decompressor.readPair();
      if (pair === null) break;
      collection.push(pair);
    }

    const collectionStr = JSON.stringify(collection, null, 1);
    self.postMessage({ workerId, message: `collection" ${collectionStr}` });

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

function convertToSignByteArr(uint8Array) {
  const signedByteArray = new Int8Array(uint8Array.length);
  for (let i = 0; i < uint8Array.length; i++) {
    signedByteArray[i] = uint8Array[i] < 128 ? uint8Array[i] : uint8Array[i] - 256;
  }
  return signedByteArray;
}