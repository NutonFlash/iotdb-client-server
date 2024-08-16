import { DataRequest } from "./proto/data_pb.js";
import { SenderClient } from "./proto/data_grpc_web_pb.js";
import GorillaDecompressor from "./decompressor/GorillaDecompressor.js";
import LongArrayInput from "./decompressor/LongArrayInput.js";
import { ZstdInit } from "@oneidentity/zstd-js/decompress";

// Initialize the gRPC client for the data service
const dataService = new SenderClient("http://192.168.0.202:8080", null, null);

let workerId = null;
let ZstdSimple = null;

// Function to initialize Zstd if not already initialized
async function initializeZstd() {
  if (!ZstdSimple) {
    const Zstd = await ZstdInit();
    ZstdSimple = Zstd.ZstdSimple;
    ZstdSimple.zstdFrameHeaderSizeMax = 0;
  }
}

// Message handler for the web worker
self.onmessage = async function (event) {
  const {
    measurement,
    interval,
    startDate,
    endDate,
    workerId: _workerId,
  } = event.data;

  try {
    // Initialize workerId and Zstd on first message
    if (_workerId !== undefined) {
      if (workerId === null) {
        workerId = _workerId;
      }
      await initializeZstd();
      self.postMessage({ workerId, message: `Worker initialized` });
      return;
    }

    // Fetch data if measurement details are provided
    if (measurement && interval && startDate && endDate) {
      await fetchData(measurement, interval, startDate, endDate);
    } else {
      throw new Error("Invalid data provided to worker");
    }
  } catch (error) {
    self.postMessage({ workerId, error: `Error in worker: ${error.message}` });
  }
};

/**
 * Fetch data from the gRPC service and handle the stream.
 *
 * @param {string} measurement - The measurement name to fetch data for.
 * @param {string} interval - The interval for aggregation (e.g., "month", "day", "hour", "minute", "second").
 * @param {string} startDate - The start date of the data range.
 * @param {string} endDate - The end date of the data range.
 */
function fetchData(measurement, interval, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const _startDate = new Date(startDate);
    const _endDate = new Date(endDate);

    let pointsNum = 0;
    let totalSize = 0;

    // Prepare the data request for the gRPC service
    const request = new DataRequest();
    request.setMeasurement(measurement);
    request.setInterval(interval);
    request.setStartdate(_startDate.toISOString());
    request.setEnddate(_endDate.toISOString());

    const startTime = Date.now(); // Start timing the data fetching process

    // Initiate the gRPC stream
    const stream = dataService.getData(request, {}, (err, response) => {
      if (err) {
        // Handle errors in the initial RPC call
        self.postMessage({
          workerId,
          error: `Error calling getData: ${err.message}`,
        });
        return reject(err);
      }
    });

    // Notify that data fetching has started
    self.postMessage({
      workerId,
      message: `Start fetching data for measurement "${measurement}" (${startDate} - ${endDate}) with interval "${interval}"`,
    });

    // Handle incoming data chunks from the stream
    stream.on("data", function (response) {
      try {
        const rawData = response.getPoints(); // Retrieve the byte data
        const dataSize = rawData.length; // Determine the size of the data chunk
        totalSize += dataSize;

        const bytes = ZstdSimple.decompress(rawData); // Decompress the data
        const bytesDecompress = convertToSignByteArr(bytes); // Convert to signed byte array
        const longArray = LongArrayInput.uint8ArrToLongArr(bytesDecompress); // Convert to long array

        const input = new LongArrayInput(longArray); // Initialize the input for decompression
        const decompressor = new GorillaDecompressor(input); // Initialize decompressor

        const collection = [];

        while (true) {
          const pair = decompressor.readPair(); // Read each pair from the decompressed data
          if (pair === null) break; // End of data stream
          collection.push(pair);
          pointsNum++;
        }

        // Send data to WorkerManager
        self.postMessage({
          data: {
            measurement,
            interval,
            collection,
          },
        });

        // Notify about the received data chunk
        self.postMessage({
          workerId,
          message: `Fetched ${dataSize} bytes of points for measurement ${measurement} at interval "${interval}"`,
        });
      } catch (e) {
        // Handle errors during data processing
        self.postMessage({
          workerId,
          error: `Error processing data: ${e.message}`,
        });
        return reject(e);
      }
    });

    // Handle errors that occur during streaming
    stream.on("error", function (err) {
      self.postMessage({
        workerId,
        error: `Error in streaming: ${err.message}`,
      });
      return reject(err);
    });

    // Handle the end of the stream
    stream.on("end", function () {
      const endTime = Date.now(); // End timing the data fetching process
      self.postMessage({
        workerId,
        message: `Completed fetching data for ${measurement} at interval "${interval}".\n\t\t\t\tTotal time spent: ${
          (endTime - startTime) / 1000
        } seconds\n\t\t\t\tPoints fetched: ${pointsNum}\n\t\t\t\tData size: ${totalSize} bytes`,
        complete: true,
      });
      return resolve(); // Resolve the promise to indicate completion
    });
  });
}

function convertToSignByteArr(uint8Array) {
  const signedByteArray = new Int8Array(uint8Array.length);
  for (let i = 0; i < uint8Array.length; i++) {
    // Convert unsigned bytes to signed bytes
    signedByteArray[i] =
      uint8Array[i] < 128 ? uint8Array[i] : uint8Array[i] - 256;
  }
  return signedByteArray;
}
