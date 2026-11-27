export const defaultLocation = { name: 'New Delhi, India', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };
export const defaults = { household: 'family', commute: 'car', filter: 'yes' };
export const households = { family: 'a family with children', sensitive: 'a household with extra sensitivity', adult: 'an adult household', community: 'a community group' };
export const commutes = { car: 'driving', transit: 'public transit', active: 'walking or cycling', home: 'working from home' };

const levels = [
  [50, 'Good', 'Outdoor activities are generally fine today.', '#93e1ae'],
  [100, 'Moderate', 'Most people can go about their day. If you’re unusually sensitive, consider taking breaks outdoors.', '#f0d782'],
  [150, 'Unhealthy for sensitive groups', 'Children, older adults and people with heart or lung disease should reduce long or intense outdoor activity.', '#f8ba8f'],
  [200, 'Unhealthy', 'Keep outdoor activity light and move strenuous exercise indoors.', '#ffb1a7'],
  [300, 'Very unhealthy', 'Move outdoor exercise indoors and keep essential time outdoors brief.', '#d0b3ff'],
  [Infinity, 'Hazardous', 'Avoid outdoor physical activity and follow local air-quality advisories.', '#ffadc4'],
];

export function airLevel(aqi) {
  return aqi == null
    ? [0, 'Unavailable', 'Check your local advisory before making outdoor plans.', '#d4e7ed']
    : levels.find(([limit]) => aqi <= limit);
}

export function makePlan(aqi, prefs) {
  const sensitive = prefs.household !== 'adult';
  const high = aqi == null || aqi > (sensitive ? 100 : 150);
  const travel = {
    car: high
      ? ['Share an essential ride', 'Coordinate school or work trips to take one car off the road. Skip idling at pickup.']
      : ['Leave the car for short trips', 'Walk or cycle on quieter streets when practical to avoid tailpipe emissions.'],
    transit: ['Take public transit', high
      ? 'Keep outdoor waits short where possible. A shared ride can replace a solo car trip.'
      : 'Combine errands with a transit stop to avoid an extra car trip.'],
    active: high
      ? ['Swap your active commute', 'Use transit or share a ride if possible. Keep exertion low on essential outdoor trips.']
      : ['Choose quieter streets', 'Walk or cycle away from major roads when possible to spend less time near exhaust.'],
    home: ['Group your errands', 'Keep working from home and combine essential errands to avoid separate car trips.'],
  }[prefs.commute];
  const activities = {
    family: ['Bring playtime indoors', 'Indoor play gives kids a way to stay active while reducing time in polluted air.'],
    sensitive: ['Move exercise indoors', 'Choose a cleaner indoor space for activity to reduce exposure during higher pollution.'],
    community: ['Move group activities inside', 'Share local alerts and use a cleaner indoor space for group exercise when air is poor.'],
    adult: ['Move your workout indoors', 'A cleaner indoor space avoids heavy breathing during poor outdoor air conditions.'],
  };
  const home = prefs.filter === 'yes'
    ? ['Run your HEPA purifier', 'Use it in the room you spend the most time in to remove airborne particles.']
    : ['Reduce indoor smoke', 'Skip incense and candles and use an outdoor-vented exhaust fan while cooking.'];
  return [
    ['Morning', 'bus', 'lavender', ...travel],
    ['Afternoon', 'sun', 'blue', ...(high ? activities[prefs.household] : ['Pick a lower-traffic route', 'Check the forecast just before heading out and choose a time with lower pollution.'])],
    ['Evening', 'home', 'mint', ...home],
  ];
}

export function estimateCO2(km) {
  return km / 1.609344 * 0.4;
}

export function lowestForecastWindow(points) {
  let best = null;
  for (let i = 0; i < points.length - 1; i++) {
    const [first, next] = points.slice(i, i + 2);
    if (first.aqi == null || next.aqi == null || next.hour - first.hour !== 1) continue;
    const average = (first.aqi + next.aqi) / 2;
    if (!best || average < best.average) best = { first, next, average };
  }
  return best;
}

export function guideAnswer(question, place, aqi, prefs, km, sample) {
  const plan = makePlan(aqi, prefs);
  const level = airLevel(aqi);
  const context = aqi == null ? `Current AQI is unavailable for ${place}. ` : `${sample ? 'Example reading' : 'Modeled reading'} for ${place} is US AQI ${aqi} (${level[1]}). `;
  if (/indoor|purif|home|hepa|ventilat|window|cook|filter/i.test(question)) {
    return `${plan[2][3]}. ${plan[2][4]} If outdoor particle pollution is high, keep windows closed. Air out your home when conditions improve. Avoid adding smoke from candles, incense, or tobacco.`;
  }
  if (/commut|car|trip|emiss|carbon|cycle|transit|co₂|co2|idling/i.test(question)) {
    return `${context}${plan[0][3]}. ${plan[0][4]} Skipping a ${km} km drive in a typical U.S. gasoline car avoids about ${estimateCO2(km).toFixed(2)} kg of tailpipe CO₂. This estimate covers the car distance you skip. Any replacement ride has its own emissions.`;
  }
  if (/day|plan|routine|outdoor|exercise|run|walk|school|smog/i.test(question)) {
    return `${context}${level[2]}\n\n${plan.map(([time, , , title, why]) => `${time} — ${title}. ${why}`).join('\n')}`;
  }
  if (/aqi|particle|pm2|air quality|hazard/i.test(question)) {
    return `${context}${level[2]} The US Air Quality Index is a scale for outdoor air pollution. PM2.5 refers to fine particles that can reach deep into the lungs. Follow your local advisories for neighborhood conditions.`;
  }
  return 'I can help with local air quality, indoor particle reduction, lower-emission travel, and daily plans. Try asking about one of those topics.';
}
