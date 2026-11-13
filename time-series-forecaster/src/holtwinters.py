"""Small NumPy Holt-Winters (additive trend + additive seasonality) fallback.
Used only when statsmodels is not installed. Original implementation."""
import numpy as np

def fit_forecast(y, seasonal_periods=7, horizon=30, alpha=0.3, beta=0.1, gamma=0.2):
    y = np.asarray(y, dtype=float)
    n = len(y)
    m = seasonal_periods
    level = float(np.mean(y[:m]))
    trend = float((np.mean(y[m:2*m]) - np.mean(y[:m])) / m)
    season = np.array([y[i] - level for i in range(m)], dtype=float)
    fitted = np.zeros(n)
    for t in range(n):
        s = season[t % m]
        if t == 0:
            fitted[t] = level + trend + s
            continue
        prev_level, prev_trend = level, trend
        level = alpha * (y[t] - s) + (1 - alpha) * (prev_level + prev_trend)
        trend = beta * (level - prev_level) + (1 - beta) * prev_trend
        season[t % m] = gamma * (y[t] - level) + (1 - gamma) * s
        fitted[t] = level + trend + season[t % m]
    resid = y - fitted
    sigma = float(np.std(resid)) if n > m else 1.0
    forecast, lower, upper = [], [], []
    for h in range(1, horizon + 1):
        f = level + h * trend + season[(n + h - 1) % m]
        band = 1.96 * sigma * np.sqrt(h)
        forecast.append(float(f)); lower.append(float(f - band)); upper.append(float(f + band))
    return forecast, lower, upper, fitted, sigma
