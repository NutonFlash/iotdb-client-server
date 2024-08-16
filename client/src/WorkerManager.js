import Logger from "./Logger";

class WorkerManager {
  constructor(workerScript, numWorkers) {
    this.numWorkers = numWorkers;
    this.workers = [];
    this.taskQueue = [];
    this.workerStates = Array(numWorkers).fill("free"); // Track the state of each worker ("free" or "busy")
    this.workerScript = workerScript;
    this.taskPromises = new Map(); // Map to store promises associated with each worker's task
  }

   // Initialize all workers concurrently
   async initWorkers() {
    const initPromises = Array.from({ length: this.numWorkers }).map((_, i) => {
      return this.initializeWorker(i);
    });
    await Promise.all(initPromises);
  }

  // Initialize a single worker
  initializeWorker(i) {
    return new Promise((resolve, reject) => {
      const worker = new this.workerScript();
      worker.postMessage({ workerId: i + 1 });

      worker.onmessage = (event) => {
        const { workerId, message } = event.data;
        if (message === "Worker initialized") {
          Logger.info(workerId, message);
          resolve();
        }
      };

      worker.onerror = (error) => reject(error);

      worker.onmessage = this.handleWorkerMessage.bind(this);
      this.workers.push(worker);
    });
  }

  terminateWorkers() {
    this.workers.forEach((worker) => worker.terminate()); // Terminate all workers
    this.workers = []; // Clear the workers array
  }

  delegateTask(taskData) {
    return new Promise((resolve, reject) => {
      // Queue the task and its associated promise handlers
      this.taskQueue.push({ taskData, resolve, reject });
      this.processTaskQueue(); // Attempt to process the task queue
    });
  }

  // Non-blocking task processing for all workers
  processTaskQueue() {
    this.workerStates.forEach((state, i) => {
      if (state === "free" && this.taskQueue.length > 0) {
        const { taskData, resolve, reject } = this.taskQueue.shift();
        this.workerStates[i] = "busy"; // Mark the worker as busy

        // Store the resolve/reject functions for later use when the task completes
        this.taskPromises.set(i, { resolve, reject });

        // Send the task to the worker
        this.workers[i].postMessage(taskData);
      }
    });
  }

  async handleWorkerMessage(event) {
    const { workerId, message, error, data, complete } = event.data;

    if (message) {
      Logger.info(workerId, message); // Log any messages from the worker
    }
    if (data) {
      // Reeceived data from Worker
      const { measurement, interval, collection } = data;
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

  async fetchCascadingData(measurement, interval, startDate, endDate) {
    const intervals = ["month", "day", "hour", "minute", "second"];
    const startIntervalIndex = intervals.indexOf(interval);

    if (startIntervalIndex === -1) {
      throw new Error(`Invalid interval: ${interval}`);
    }

    for (let i = startIntervalIndex; i < intervals.length; i++) {
      const currentInterval = intervals[i];
      const estimatedPoints = this.estimatePoints(
        currentInterval,
        startDate,
        endDate
      );

      const POINTS_THRESHOLD = 1000000;

      if (estimatedPoints > POINTS_THRESHOLD) {
        const subTasks = this.splitTask(
          measurement,
          currentInterval,
          startDate,
          endDate,
          estimatedPoints,
          POINTS_THRESHOLD
        );
        await Promise.all(
          subTasks.map((task) => this.delegateTask(task)) // Delegate subtasks without blocking
        );
      } else {
        await this.delegateTask({
          measurement,
          interval: currentInterval,
          startDate,
          endDate,
        });
      }
    }
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
