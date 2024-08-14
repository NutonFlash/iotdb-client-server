import Logger from "./Logger";

class WorkerManager {
  constructor(workerScript, numWorkers, dbManager) {
    this.numWorkers = numWorkers;
    this.workers = [];
    this.taskQueue = [];
    this.workerStates = Array(numWorkers).fill("free"); // Track the state of each worker ("free" or "busy")
    this.workerScript = workerScript;
    this.taskPromises = new Map(); // Map to store promises associated with each worker's task
    this.dbManager = dbManager;
  }

  async initWorkers() {
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new this.workerScript();

      worker.postMessage({ workerId: i + 1 });

      // Await the worker's initialization to ensure it is ready before proceeding
      await new Promise((resolve, reject) => {
        worker.onmessage = function (event) {
          const { workerId, message } = event.data;
          if (message === "Worker initialized") {
            Logger.info(workerId, message);
            resolve();
          }
        };
        worker.onerror = function (error) {
          reject(error);
        };
      });

      worker.onmessage = this.handleWorkerMessage.bind(this);

      this.workers.push(worker); // Add the initialized worker to the workers array
    }
  }

  terminateWorkers() {
    this.workers.forEach((worker) => worker.terminate()); // Terminate all workers
    this.workers = []; // Clear the workers array
  }

  async delegateTask(taskData) {
    return new Promise((resolve, reject) => {
      // Queue the task and its associated promise handlers
      this.taskQueue.push({ taskData, resolve, reject });
      this.processTaskQueue(); // Attempt to process the task queue
    });
  }

  async processTaskQueue() {
    for (let i = 0; i < this.numWorkers; i++) {
      if (this.workerStates[i] === "free" && this.taskQueue.length > 0) {
        // If a worker is free and there are tasks in the queue, assign a task to the worker
        const { taskData, resolve, reject } = this.taskQueue.shift();
        this.workerStates[i] = "busy"; // Mark the worker as busy

        // Create a new promise for the worker's task
        const taskPromise = new Promise((taskResolve, taskReject) => {
          this.taskPromises.set(i, {
            resolve: taskResolve,
            reject: taskReject,
          });
        });

        this.workers[i].postMessage(taskData); // Send the task data to the worker

        taskPromise.then(resolve).catch(reject); // Handle the promise resolution/rejection

        break; // Exit the loop to process one task per worker at a time
      }
    }
  }

  async handleWorkerMessage(event) {
    const { workerId, message, error, data, complete } = event.data;

    if (message) {
      Logger.info(workerId, message); // Log any messages from the worker
    }
    if (data) {
      // Save data chunk in IndexedDB
      const { itemKey, collection } = data;
      await this.dbManager.write(itemKey, collection);
    }
    if (error || complete) {
      // If there's an error or the task is complete, resolve or reject the associated promise
      const promiseHandlers = this.taskPromises.get(workerId - 1);
      if (error) {
        Logger.error(workerId, error);
        promiseHandlers?.reject(); // Reject the promise if there's an error
      }
      if (complete) {
        promiseHandlers?.resolve(); // Resolve the promise if the task is complete
      }

      this.taskPromises.delete(workerId - 1); // Remove the promise handlers for this worker

      // Mark worker as free and process the next task
      this.workerStates[workerId - 1] = "free";
      this.processTaskQueue(); // Attempt to process the next task in the queue
    }
  }

  estimatePoints(interval, startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const timeDiffSec = (end - start) / 1000;

    // Estimate the number of points based on the interval type
    switch (interval) {
      case "month":
        return timeDiffSec / (60 * 60 * 24 * 31);
      case "day":
        return timeDiffSec / (60 * 60 * 24);
      case "hour":
        return timeDiffSec / (60 * 60);
      case "minute":
        return timeDiffSec / 60;
      case "second":
        return timeDiffSec;
      default:
        throw new Error(`Invalid interval: ${interval}`);
    }
  }

  fetchCascadingData(measurement, interval, startDate, endDate) {
    return new Promise(async (resolve, reject) => {
      const intervals = ["month", "day", "hour", "minute", "second"];
      const startIntervalIndex = intervals.indexOf(interval);

      if (startIntervalIndex === -1) {
        throw new Error(`Invalid interval: ${interval}`);
      }

      // Process each interval sequentially from the specified start interval down to "second"
      for (let i = startIntervalIndex; i < intervals.length; i++) {
        const currentInterval = intervals[i];
        const estimatedPoints = this.estimatePoints(
          currentInterval,
          startDate,
          endDate
        );

        const POINTS_THRESHOLD = 1000000;

        if (estimatedPoints > POINTS_THRESHOLD) {
          // If estimated points exceed the threshold, split the task into subtasks
          const subTasks = this.splitTask(
            measurement,
            currentInterval,
            startDate,
            endDate,
            estimatedPoints,
            POINTS_THRESHOLD
          );
          await Promise.all(subTasks.map((task) => this.delegateTask(task))); // Delegate each subtask to workers
        } else {
          await this.delegateTask({
            measurement,
            interval: currentInterval,
            startDate,
            endDate,
          }); // Delegate the task if it's below the threshold
        }
      }

      resolve(); // Resolve the promise once all tasks are completed
    });
  }

  splitTask(
    measurement,
    interval,
    startDate,
    endDate,
    estimatedPoints,
    threshold
  ) {
    // Calculate the number of subtasks needed based on the threshold
    const numberOfSubTasks = Math.ceil(estimatedPoints / threshold);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const subTaskDuration = (end - start) / numberOfSubTasks;

    const subTasks = [];
    for (let i = 0; i < numberOfSubTasks; i++) {
      // Calculate the start and end dates for each subtask
      const subTaskStartDate = new Date(
        start + i * subTaskDuration
      ).toISOString();
      const subTaskEndDate = new Date(
        start + (i + 1) * subTaskDuration
      ).toISOString();

      subTasks.push({
        measurement,
        interval,
        startDate: subTaskStartDate,
        endDate: subTaskEndDate,
      });
    }
    return subTasks;
  }
}

export default WorkerManager;
