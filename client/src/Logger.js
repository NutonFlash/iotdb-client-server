class Logger {
  static getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  static info(workerId, message) {
    const time = Logger.getCurrentTime();
    console.log(`${time} [INFO] Thread-${workerId} ${message}`);
  }

  static error(workerId, error) {
    const time = Logger.getCurrentTime();
    console.error(`${time} [ERROR] Thread-${workerId} ${error}`);
  }

  static perfomance(workerId, { measurement, metrics }) {
    const time = Logger.getCurrentTime();
    console.log(`${time} [PERFORMANCE] Thread-${workerId}`, metrics);
    Logger.storeMetrics(measurement, metrics);
  }

  static storeMetrics(measurement, metrics) {
    try {
      const currMetricsStr = localStorage.getItem('metrics');
      const currMetrics = currMetricsStr ? JSON.parse(currMetricsStr) : {};

      if (currMetrics[measurement]) {
        currMetrics[measurement].push(...metrics);
      } else {
        currMetrics[measurement] = metrics;
      }

      localStorage.setItem('metrics', JSON.stringify(currMetrics));
    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }
}

export default Logger;
