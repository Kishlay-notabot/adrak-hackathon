// backend/forecasting.js
// Patient Flow Forecasting Module
// Uses exponential smoothing and trend analysis for prediction

/**
 * Simple exponential smoothing forecast
 * @param {number[]} values - Historical values
 * @param {number} alpha - Smoothing factor (0-1), higher = more weight on recent data
 * @param {number} periods - Number of periods to forecast
 * @returns {number[]} Forecast values
 */
function exponentialSmoothing(values, alpha = 0.6, periods = 14) {
  if (values.length < 2) return [];

  const forecast = [];
  let level = values[0];

  for (let i = 1; i < values.length; i++) {
    const newLevel = alpha * values[i] + (1 - alpha) * level;
    level = newLevel;
  }

  // Generate future forecast
  for (let i = 0; i < periods; i++) {
    forecast.push(Math.round(level));
  }

  return forecast;
}

/**
 * Double exponential smoothing (Holt's method) with trend
 * @param {number[]} values - Historical values
 * @param {number} alpha - Level smoothing factor
 * @param {number} beta - Trend smoothing factor
 * @param {number} periods - Number of periods to forecast
 * @returns {{forecast: number[], levels: number[], trends: number[]}}
 */
function doubleExponentialSmoothing(values, alpha = 0.6, beta = 0.1, periods = 14) {
  if (values.length < 2) return { forecast: [], levels: [], trends: [] };

  const levels = [];
  const trends = [];
  const forecast = [];

  // Initialize
  levels[0] = values[0];
  trends[0] = values[1] - values[0];

  // Fit the model to historical data
  for (let i = 1; i < values.length; i++) {
    const prevLevel = levels[i - 1];
    const prevTrend = trends[i - 1];

    levels[i] = alpha * values[i] + (1 - alpha) * (prevLevel + prevTrend);
    trends[i] = beta * (levels[i] - prevLevel) + (1 - beta) * prevTrend;
  }

  // Forecast future periods
  const lastLevel = levels[levels.length - 1];
  const lastTrend = trends[trends.length - 1];

  for (let i = 1; i <= periods; i++) {
    forecast.push(Math.round(lastLevel + i * lastTrend));
  }

  return { forecast, levels, trends };
}

/**
 * Calculate moving average
 * @param {number[]} values - Historical values
 * @param {number} window - Window size for moving average
 * @returns {number[]} Moving averages
 */
function movingAverage(values, window = 7) {
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const subset = values.slice(start, i + 1);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    result.push(Math.round(avg));
  }
  return result;
}

/**
 * Calculate basic statistics
 */
function calculateStats(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * Generate patient flow forecast
 * @param {Object} inflowData - Array of {date, count} from MongoDB
 * @param {number} forecastDays - Days to forecast ahead (default: 14)
 * @returns {Promise<{historicalDates, historicalCounts, forecastDates, forecastCounts, movingAvg7d, trend, stats}>}
 */
async function generateForecast(
  inflowData,
  forecastDays = 14
) {
  // Ensure data is sorted by date
  const sortedData = inflowData.sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  if (sortedData.length < 3) {
    throw new Error(
      "Insufficient historical data for forecasting (minimum 3 data points required)"
    );
  }

  // Extract counts
  const historicalCounts = sortedData.map((d) => d.count || 0);

  // Generate forecasts using double exponential smoothing
  const { forecast, trends } = doubleExponentialSmoothing(
    historicalCounts,
    0.7,
    0.1,
    forecastDays
  );

  // Calculate moving average for trend visualization
  const ma7 = movingAverage(historicalCounts, 7);

  // Get forecast dates
  const lastDate = new Date(sortedData[sortedData.length - 1].date);
  const forecastDates = [];
  for (let i = 1; i <= forecastDays; i++) {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + i);
    forecastDates.push(d.toISOString().split("T")[0]);
  }

  // Get historical dates
  const historicalDates = sortedData.map((d) =>
    new Date(d.date).toISOString().split("T")[0]
  );

  // Calculate statistics
  const stats = calculateStats(historicalCounts);

  // Determine trend direction
  const recentTrend = trends[trends.length - 1];
  const trend = recentTrend > 0 ? "increasing" : recentTrend < 0 ? "decreasing" : "stable";

  return {
    historicalDates,
    historicalCounts,
    forecastDates,
    forecastCounts: forecast,
    movingAverage7d: ma7,
    trend,
    stats,
    lastUpdated: new Date().toISOString(),
  };
}

module.exports = {
  generateForecast,
  exponentialSmoothing,
  doubleExponentialSmoothing,
  movingAverage,
  calculateStats,
};
