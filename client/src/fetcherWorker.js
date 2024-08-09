import { DataRequest } from "./proto/data_pb.js";
import { SenderClient } from "./proto/data_grpc_web_pb.js";
import GorillaDecompressor from "./decompressor/GorillaDecompressor.js";
import LongArrayInput from "./decompressor/LongArrayInput.js";
import { ZstdInit } from "@oneidentity/zstd-js/decompress";

let ZstdSimple;

// Initialize the gRPC client for the data service
const dataService = new SenderClient("http://192.168.0.202:8080", null, null);

let workerId = null;

// Message handler for the web worker
self.onmessage = async function (event) {
  if (event.data.workerId !== undefined) {
    workerId = event.data.workerId;
    if (!ZstdSimple) {
      const Zstd  = await ZstdInit();
      ZstdSimple = Zstd.ZstdSimple;
      ZstdSimple.zstdFrameHeaderSizeMax = 0;
    }
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

  const pointsNum = (_endDate.getTime() - _startDate.getTime()) / 1000;
  let totalSize = 0;

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
      self.postMessage({
        workerId,
        error: `Error calling getData: ${err.message}`,
      });
    } else {
      self.postMessage({
        workerId,
        message: `Unary response: ${response.toObject()}`,
      });
    }
  });

  // Notify the main thread that data fetching has started
  self.postMessage(workerId, {
    message: `Start fetching data for measurement "${measurement}" (${startDate} - ${endDate})`,
  });

  // Stream event handlers
  stream.on("data", function (response) {
    const currentTime = Date.now();

    const rawData = response.getPoints();

    const dataSize = rawData.length; // Size in bytes
    totalSize += dataSize;

    const bytes = ZstdSimple.decompress(rawData);
    const bytesDecompress = convertToSignByteArr(bytes);
    const longArray = LongArrayInput.uint8ArrToLongArr(bytesDecompress);

    const input = new LongArrayInput(longArray);
    const decompressor = new GorillaDecompressor(input);

    while (true) {
      const pair = decompressor.readPair();
      if (pair === null) break;
      // collection.push(pair);
    }

    // Calculate delay since the last chunk
    lastTimestamp = currentTime;

    self.postMessage({
      workerId,
      message: `Fetched ${
        dataSize / 1024
      }kb of points for measurement ${measurement}`,
    });
  });

  stream.on("error", function (err) {
    self.postMessage({ workerId, error: `Error in streaming: ${err.message}` });
  });

  stream.on("end", function () {
    // Record the end time and calculate the duration
    const endTime = Date.now();
    self.postMessage({
      workerId,
      message: `Completed fetching data for ${measurement} measurement.\n\t\t\t\tTime spent: ${
        (endTime - startTime) / 1000
      } seconds\n\t\t\t\tPoints fetched: ${pointsNum}\n\t\t\t\tData size: ${totalSize}`,
    });
  });
}

function convertToSignByteArr(uint8Array) {
  const signedByteArray = new Int8Array(uint8Array.length);
  for (let i = 0; i < uint8Array.length; i++) {
    signedByteArray[i] =
      uint8Array[i] < 128 ? uint8Array[i] : uint8Array[i] - 256;
  }
  return signedByteArray;
}
