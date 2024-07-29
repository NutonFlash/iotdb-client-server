// import protobuf from 'protobufjs';

// let DataBatch = null;

// protobuf.load("data.proto", function(err, root) {
//   if (err) {
//     console.error("Failed to load protobuf:", err);
//     return;
//   }
//   DataBatch = root.lookupType("data.DataBatch");
//   console.log('Proto loaded');
// });

// self.onmessage = function (event) {
//   if (!DataBatch) {
//     console.error("DataBatch type is not loaded");
//     return;
//   }

//   const buffer = event.data;
//   const message = DataBatch.decode(new Uint8Array(buffer));
//   const data = {
//     measurement: message.measurement,
//     timestamps: message.timestamps,
//     values: message.values
//   };
//   self.postMessage(data);
// };

self.onmessage = function (event) {
  const { measurement, startDate, endDate } = event.data;
  fetchData(measurement, startDate, endDate);
}
async function fetchData(measurement, startDate, endDate) {
  const url = `http://localhost:228/data?measurement=${measurement}&startDate=${startDate}&endDate=${endDate}`;

  const startTime = Date.now();

  const _startDate = new Date(startDate);
  const _endDate = new Date(endDate);

  const pointsNum = (_endDate.getTime() - _startDate.getTime()) / 1000;

  self.postMessage({ message: `Start fetchign data for measurment "${measurement}" (${startDate}-${endDate})` });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';
    let chunk;

    while (!(chunk = await reader.read()).done) {
      // result = decoder.decode(chunk.value, { stream: true });
      // console.log(`Chunk received, the size is ${new Blob([result]).size}`)
      // processChunk(result);
    }

    const endTime = Date.now();

    self.postMessage({ message: `Completely fetch ${pointsNum} points for measurment "${measurement}". Time spent: ${(endTime - startTime) / 1000}sec` });
  } catch (error) {
    self.postMessage({ message: `Fetch error for measurment "${measurement}": ${error}` });
  }
}

function processChunk(chunk) {
  // Assuming chunk is JSON formatted
  let dataBatch;

  try {
    dataBatch = JSON.parse(chunk);
  } catch (e) {
    console.error('Error parsing JSON: ', e);
    return;
  }

  if (Array.isArray(dataBatch.data)) {
    dataBatch.data.forEach(message => {
      workers[currentWorker].postMessage(message);
      currentWorker = (currentWorker + 1) % workerCount;
      console.log(`Received new batch for ${message.measurement}`);
    });
  }
}