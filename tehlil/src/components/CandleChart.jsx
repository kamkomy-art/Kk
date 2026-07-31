const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { top: 10, right: 56, bottom: 10, left: 8 };

export default function CandleChart({ candles, ema20, ema50, bollinger, supportResistance }) {
  if (!candles || candles.length === 0) return null;

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const allPrices = [
    ...candles.flatMap((c) => [c.high, c.low]),
    ...(ema20 || []).filter((v) => v != null),
    ...(ema50 || []).filter((v) => v != null),
    ...(bollinger?.upper || []).filter((v) => v != null),
    ...(bollinger?.lower || []).filter((v) => v != null),
  ];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  const xStep = plotWidth / candles.length;
  const candleWidth = Math.max(1, xStep * 0.6);

  const x = (i) => PADDING.left + i * xStep + xStep / 2;
  const y = (price) => PADDING.top + (1 - (price - minPrice) / priceRange) * plotHeight;

  function linePath(series) {
    let path = "";
    let started = false;
    series.forEach((v, i) => {
      if (v == null) return;
      path += `${started ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)} `;
      started = true;
    });
    return path.trim();
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={styles.svg} preserveAspectRatio="none">
      {supportResistance?.map((level) => (
        <g key={`${level.type}-${level.price}`}>
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={y(level.price)}
            y2={y(level.price)}
            stroke={level.type === "resistance" ? "#f85149" : "#3fb950"}
            strokeDasharray="4 3"
            strokeWidth={1}
            opacity={0.55}
          />
          <text x={WIDTH - PADDING.right + 4} y={y(level.price) + 3} fill="#9aa4b8" fontSize="9">
            {level.price}
          </text>
        </g>
      ))}

      {bollinger?.upper && (
        <path d={linePath(bollinger.upper)} fill="none" stroke="#6e40c9" strokeWidth={1} opacity={0.5} />
      )}
      {bollinger?.lower && (
        <path d={linePath(bollinger.lower)} fill="none" stroke="#6e40c9" strokeWidth={1} opacity={0.5} />
      )}

      {ema20 && <path d={linePath(ema20)} fill="none" stroke="#58a6ff" strokeWidth={1.4} />}
      {ema50 && <path d={linePath(ema50)} fill="none" stroke="#e3b341" strokeWidth={1.4} />}

      {candles.map((c, i) => {
        const isUp = c.close >= c.open;
        const color = isUp ? "#3fb950" : "#f85149";
        const bodyTop = y(Math.max(c.open, c.close));
        const bodyBottom = y(Math.min(c.open, c.close));
        return (
          <g key={c.time}>
            <line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
            <rect
              x={x(i) - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={Math.max(1, bodyBottom - bodyTop)}
              fill={color}
            />
          </g>
        );
      })}
    </svg>
  );
}

const styles = {
  svg: {
    width: "100%",
    height: 240,
    backgroundColor: "#0f131c",
    borderRadius: 10,
    border: "1px solid #262c3b",
    marginBottom: 12,
  },
};
