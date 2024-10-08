import Logger from "./Logger";

class WorkerManager {
  constructor(workerScript, numWorkers) {
    this.numWorkers = numWorkers;
    this.workers = [];
    this.taskQueue = [];
    this.workerStates = Array(numWorkers).fill("free");
    this.workerScript = workerScript;
  }

  async initWorkers() {
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new this.workerScript();

      worker.postMessage({ workerId: i + 1 });
      
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

      this.workers.push(worker);
    }
  }

  terminateWorkers() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
  }

  delegateTask(taskData) {
    this.taskQueue.push(taskData);
    this.processTaskQueue();
  }

  processTaskQueue() {
    for (let i = 0; i < this.numWorkers; i++) {
      if (this.workerStates[i] === "free" && this.taskQueue.length > 0) {
        const taskData = this.taskQueue.shift();
        this.workerStates[i] = "busy";
        this.workers[i].postMessage(taskData);
      }
    }
  }

  handleWorkerMessage(event) {
    const { workerId, message, error, data, performanceMetrics } = event.data;

    if (message) {
      Logger.info(workerId, message);
    }
    if (error) {
      Logger.error(workerId, error);
    }
    if (performanceMetrics) {
      Logger.perfomance(workerId, performanceMetrics);
    }
    if (data) {
      const { measurement, collection } = data;
    }

    // Mark worker as free and process next task
    this.workerStates[workerId] = "free";
    this.processTaskQueue();
  }
}

export default WorkerManager;
