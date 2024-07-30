class DataSplitter {
    static splitDateRange(startDateStr, endDateStr, numBatches) {
        const ranges = [];
        const startDate = new Date(startDateStr)
        const endDate = new Date(endDateStr)
        const totalMillis = endDate.getTime() - startDate.getTime();
        const stepMillis = totalMillis / numBatches;
      
        for (let i = 0; i < numBatches; i++) {
          const start = new Date(startDate.getTime() + (i * stepMillis));
          const end = new Date(startDate.getTime() + ((i + 1) * stepMillis));
          ranges.push({ startDate: start, endDate: end });
        }
      
        return ranges;
    }
  }
  
  export default DataSplitter;
  